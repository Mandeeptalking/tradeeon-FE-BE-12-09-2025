from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
import asyncio
import os
from datetime import datetime

from apps.api.binance_client import BinanceClient
from apps.api.models import (
    SymbolListResponse, TickerResponse, KlineResponse, 
    OrderBookResponse, TradesResponse, MarketDataResponse
)
from apps.api.routers import connections, portfolio, analytics, market, bots, orders, indicators, alerts, dashboard, condition_registry
from apps.api.middleware.rate_limiting import rate_limit_middleware, cleanup_rate_limits
from apps.api.metrics import get_metrics_response, record_api_request
from apps.api.utils.errors import (
    TradeeonError, create_error_response, create_success_response
)
from fastapi.responses import JSONResponse
from datetime import datetime
import logging

app = FastAPI(
    title="Tradeeon API",
    description="Backend API for Tradeeon trading platform with Binance integration",
    version="1.0.0",
    redirect_slashes=False  # Prevent automatic redirects for trailing slashes
)

# Configure CORS - get allowed origins from environment variable
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,https://www.tradeeon.com,https://tradeeon.com")
allowed_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

# In production, allow all Tradeeon domains
if os.getenv("ENVIRONMENT") == "production":
    allowed_origins.extend([
        "https://www.tradeeon.com",
        "https://tradeeon.com",
        "http://localhost:5173",  # Keep localhost for development
    ])
    # Remove duplicates
    allowed_origins = list(set(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Can be multiple origins: "http://localhost:5173,https://www.tradeeon.com"
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token", "Origin", "Accept", "Accept-Language"],
    expose_headers=["X-Request-ID"],
)

# Add rate limiting middleware
app.middleware("http")(rate_limit_middleware)

# Include routers
app.include_router(connections.router, prefix="/connections", tags=["connections"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
app.include_router(dashboard.router, tags=["dashboard"])
app.include_router(analytics.router, tags=["analytics"])
app.include_router(market.router, tags=["market"])
app.include_router(bots.router, tags=["bots"])
app.include_router(orders.router, tags=["orders"])
app.include_router(indicators.router, tags=["indicators"])
app.include_router(alerts.router)
app.include_router(condition_registry.router, tags=["conditions"])

logger = logging.getLogger(__name__)

# Global exception handler for TradeeonError
@app.exception_handler(TradeeonError)
async def tradeeon_error_handler(request, exc: TradeeonError):
    """Handle TradeeonError exceptions with standardized response"""
    logger.error(f"TradeeonError: {exc.code} - {exc.message}", exc_info=True)
    response = create_error_response(exc)
    response["timestamp"] = int(datetime.now().timestamp())
    return JSONResponse(
        status_code=exc.status_code,
        content=response
    )

# Global exception handler for all other exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle unexpected exceptions"""
    error_type = type(exc).__name__
    error_message = str(exc)
    logger.error(f"❌ Unexpected error: {error_type}: {error_message}", exc_info=True)
    logger.error(f"   Request path: {request.url.path}")
    logger.error(f"   Request method: {request.method}")
    
    response = {
        "success": False,
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred"
        },
        "timestamp": int(datetime.now().timestamp())
    }
    # Show error details in development or if explicitly enabled
    is_dev = os.getenv("ENVIRONMENT") != "production" or os.getenv("SHOW_ERROR_DETAILS") == "true"
    if is_dev:
        response["error"]["details"] = {
            "exception": error_message,
            "type": error_type
        }
        # Include full error message in dev
        response["error"]["message"] = f"An unexpected error occurred: {error_message}"
    return JSONResponse(
        status_code=500,
        content=response
    )

async def run_alert_runner():
    """Background task to run alert evaluation loop."""
    try:
        from apps.api.modules.alerts.runner import run_once
        from apps.api.modules.alerts.datasource import CandleSource
        from apps.api.modules.alerts.alert_manager import AlertManager
        
        src = CandleSource()
        manager = AlertManager(src)
        
        # Run alert evaluation loop
        while True:
            try:
                await run_once(manager)
                await asyncio.sleep(1.0)  # Poll every second
            except Exception as e:
                logger.error(f"Error in alert runner loop: {e}", exc_info=True)
                await asyncio.sleep(5.0)  # Wait longer on error
    except Exception as e:
        logger.error(f"Failed to start alert runner: {e}", exc_info=True)

@app.on_event("startup")
async def startup_event():
    """Start background tasks on startup and validate environment."""
    # Validate critical environment variables
    required_vars = ["SUPABASE_JWT_SECRET"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        # Don't fail startup in development, but log warning
        if os.getenv("ENVIRONMENT") == "production":
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    # Validate database connection
    from apps.api.clients.supabase_client import supabase
    if supabase is None:
        logger.error("❌ Database connection failed - Supabase client is None")
        if os.getenv("ENVIRONMENT") == "production":
            raise RuntimeError("Cannot start in production without database connection")
        else:
            logger.warning("⚠️  Running without database - some features will be unavailable")
    else:
        # Test database connection
        try:
            result = supabase.table("users").select("id").limit(1).execute()
            logger.info("✅ Database connection verified successfully")
        except Exception as e:
            logger.error(f"❌ Database connection test failed: {e}")
            if os.getenv("ENVIRONMENT") == "production":
                raise RuntimeError(f"Database connection test failed: {e}")
    
    # Initialize bot execution service
    try:
        # Add bots directory to path for imports
        # Import bot services - try multiple import strategies
        import sys
        bots_path = os.path.join(os.path.dirname(__file__), '..', 'bots')
        bots_path = os.path.abspath(bots_path)
        
        # Add bots path to sys.path first
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        # Try importing - use direct imports since we added to path
        try:
            from bot_execution_service import bot_execution_service
            from db_service import db_service
        except ImportError as e:
            logger.error(f"Failed to import bot services: {e}", exc_info=True)
            # Try absolute import as fallback
            try:
                from apps.bots.bot_execution_service import bot_execution_service
                from apps.bots.db_service import db_service
            except ImportError as fallback_error:
                logger.error(f"Fallback import also failed: {fallback_error}", exc_info=True)
                bot_execution_service = None
                db_service = None
        
        # Verify services are available
        if bot_execution_service is None:
            logger.error("❌ Bot execution service failed to initialize")
            if os.getenv("ENVIRONMENT") == "production":
                raise RuntimeError("Bot execution service is required in production")
        else:
            logger.info("✅ Bot execution service initialized successfully")
        
        if db_service is None:
            logger.error("❌ Database service failed to initialize")
            if os.getenv("ENVIRONMENT") == "production":
                raise RuntimeError("Database service is required in production")
        elif not db_service.enabled:
            logger.warning("⚠️  Database service is disabled - bot persistence will not work")
        else:
            logger.info("✅ Database service initialized and enabled")
        
        # Store services in app state for access in routers
        app.state.bot_execution_service = bot_execution_service
        app.state.db_service = db_service
        logger.info("✅ Bot services registered in app state")
        
        # Recover active bots from database
        if bot_execution_service and db_service and db_service.enabled:
            try:
                recovered = await bot_execution_service.recover_active_bots()
                if recovered > 0:
                    logger.info(f"✅ Recovered {recovered} active bot(s) from database")
            except Exception as recovery_error:
                logger.error(f"❌ Error during bot recovery: {recovery_error}", exc_info=True)
                # Don't fail startup if recovery fails, but log the error
        
    except ImportError as e:
        logger.error(f"❌ Failed to import bot services: {e}", exc_info=True)
        if os.getenv("ENVIRONMENT") == "production":
            raise RuntimeError(f"Failed to import bot services: {e}")
        else:
            logger.warning("⚠️  Running without bot services - bot operations will fail")
            app.state.bot_execution_service = None
            app.state.db_service = None
    except Exception as e:
        logger.error(f"❌ Error initializing bot services: {e}", exc_info=True)
        if os.getenv("ENVIRONMENT") == "production":
            raise RuntimeError(f"Error initializing bot services: {e}")
        else:
            logger.warning("⚠️  Running without bot services - bot operations will fail")
            app.state.bot_execution_service = None
            app.state.db_service = None
    
    # Start background tasks
    asyncio.create_task(cleanup_rate_limits())
    
    # Start alert runner if enabled
    if os.getenv("ALERT_RUNNER_ENABLED", "true").lower() == "true":
        asyncio.create_task(run_alert_runner())
        logger.info("Alert runner started")

@app.get("/health")
async def health_check():
    """Health check endpoint with database and bot service status"""
    from apps.api.clients.supabase_client import supabase
    
    health_status = {
        "status": "ok",
        "timestamp": int(datetime.now().timestamp()),
        "database": "connected" if supabase is not None else "disconnected",
        "bot_execution_service": "available" if hasattr(app.state, 'bot_execution_service') and app.state.bot_execution_service is not None else "unavailable",
        "db_service": "enabled" if hasattr(app.state, 'db_service') and app.state.db_service and app.state.db_service.enabled else "disabled"
    }
    
    # Test database connection if available
    if supabase is not None:
        try:
            supabase.table("users").select("id").limit(1).execute()
            health_status["database"] = "connected"
        except Exception as e:
            health_status["database"] = "error"
            health_status["database_error"] = str(e)
    
    # Check bot execution service
    if hasattr(app.state, 'bot_execution_service') and app.state.bot_execution_service is not None:
        try:
            # Simple check - see if service has running_bots attribute
            if hasattr(app.state.bot_execution_service, 'running_bots'):
                health_status["bot_execution_service"] = "available"
                running_bots = app.state.bot_execution_service.running_bots
                health_status["running_bots_count"] = len(running_bots)
                health_status["running_bot_ids"] = list(running_bots.keys())
            else:
                health_status["bot_execution_service"] = "error"
        except Exception as e:
            health_status["bot_execution_service"] = "error"
            health_status["bot_service_error"] = str(e)
    
    # Determine overall status
    if health_status["database"] == "error" or health_status["bot_execution_service"] == "error":
        health_status["status"] = "degraded"
    elif health_status["database"] == "disconnected" or health_status["bot_execution_service"] == "unavailable":
        health_status["status"] = "degraded"
    
    return health_status

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return get_metrics_response()

@app.get("/me")
async def get_current_user():
    """Get current user information"""
    return {"user": None}

@app.get("/debug/routes")
async def debug_routes():
    """Debug endpoint to list all registered routes"""
    routes = []
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": getattr(route, "name", None)
            })
    return {"routes": routes, "total": len(routes)}

# ==================== BINANCE API ENDPOINTS ====================

@app.get("/api/symbols", response_model=SymbolListResponse)
async def get_all_symbols():
    """Get all available trading symbols from Binance"""
    try:
        async with BinanceClient() as client:
            symbols = await client.get_all_symbols()
            
            return SymbolListResponse(
                success=True,
                symbols=symbols,
                count=len(symbols),
                timestamp=int(datetime.now().timestamp())
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch symbols: {str(e)}")

@app.get("/api/ticker/24hr", response_model=TickerResponse)
async def get_24hr_ticker(symbol: Optional[str] = Query(None, description="Symbol to get ticker for (e.g., BTCUSDT)")):
    """Get 24hr ticker price change statistics"""
    try:
        async with BinanceClient() as client:
            ticker_data = await client.get_ticker_24hr(symbol)
            
            if isinstance(ticker_data, dict):
                ticker_data = [ticker_data]
            
            formatted_tickers = [client.format_ticker_data(ticker) for ticker in ticker_data]
            
            return TickerResponse(
                success=True,
                tickers=formatted_tickers,
                timestamp=int(datetime.now().timestamp())
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch ticker data: {str(e)}")

@app.get("/api/ticker/price", response_model=MarketDataResponse)
async def get_ticker_price(symbol: Optional[str] = Query(None, description="Symbol to get price for (e.g., BTCUSDT)")):
    """Get latest price for a symbol or all symbols"""
    try:
        async with BinanceClient() as client:
            price_data = await client.get_ticker_price(symbol)
            
            return MarketDataResponse(
                success=True,
                data=price_data,
                timestamp=int(datetime.now().timestamp())
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch price data: {str(e)}")

@app.get("/api/klines", response_model=KlineResponse)
async def get_klines(
    symbol: str = Query(..., description="Symbol to get klines for (e.g., BTCUSDT)"),
    interval: str = Query("1h", description="Kline interval (1m, 5m, 15m, 1h, 4h, 1d)"),
    limit: int = Query(100, description="Number of klines to retrieve (max 1000)")
):
    """Get kline/candlestick data for a symbol"""
    try:
        async with BinanceClient() as client:
            kline_data = await client.get_klines(symbol, interval, limit)
            formatted_klines = client.format_kline_data(kline_data)
            
            return KlineResponse(
                success=True,
                symbol=symbol,
                interval=interval,
                klines=formatted_klines,
                timestamp=int(datetime.now().timestamp())
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch kline data: {str(e)}")

@app.get("/api/depth", response_model=OrderBookResponse)
async def get_orderbook(
    symbol: str = Query(..., description="Symbol to get orderbook for (e.g., BTCUSDT)"),
    limit: int = Query(100, description="Number of orders to retrieve (5, 10, 20, 50, 100, 500, 1000, 5000)")
):
    """Get order book for a symbol"""
    try:
        async with BinanceClient() as client:
            orderbook_data = await client.get_orderbook(symbol, limit)
            
            return OrderBookResponse(
                success=True,
                symbol=symbol,
                orderbook=orderbook_data,
                timestamp=int(datetime.now().timestamp())
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch orderbook: {str(e)}")

@app.get("/api/trades", response_model=TradesResponse)
async def get_recent_trades(
    symbol: str = Query(..., description="Symbol to get trades for (e.g., BTCUSDT)"),
    limit: int = Query(100, description="Number of trades to retrieve (max 1000)")
):
    """Get recent trades for a symbol"""
    try:
        async with BinanceClient() as client:
            trades_data = await client.get_recent_trades(symbol, limit)
            
            formatted_trades = [
                {
                    "id": int(trade["id"]),
                    "price": float(trade["price"]),
                    "qty": float(trade["qty"]),
                    "quote_qty": float(trade["quoteQty"]),
                    "time": int(trade["time"]),
                    "is_buyer_maker": trade["isBuyerMaker"],
                    "is_best_match": trade["isBestMatch"]
                }
                for trade in trades_data
            ]
            
            return TradesResponse(
                success=True,
                symbol=symbol,
                trades=formatted_trades,
                timestamp=int(datetime.now().timestamp())
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trades: {str(e)}")

@app.get("/api/aggTrades", response_model=TradesResponse)
async def get_aggregate_trades(
    symbol: str = Query(..., description="Symbol to get aggregate trades for (e.g., BTCUSDT)"),
    limit: int = Query(100, description="Number of trades to retrieve (max 1000)")
):
    """Get compressed/aggregate trades list"""
    try:
        async with BinanceClient() as client:
            trades_data = await client.get_aggregate_trades(symbol, limit)
            
            formatted_trades = [
                {
                    "id": int(trade["a"]),
                    "price": float(trade["p"]),
                    "qty": float(trade["q"]),
                    "quote_qty": float(trade["p"]) * float(trade["q"]),
                    "time": int(trade["T"]),
                    "is_buyer_maker": trade["m"],
                    "is_best_match": trade["M"]
                }
                for trade in trades_data
            ]
            
            return TradesResponse(
                success=True,
                symbol=symbol,
                trades=formatted_trades,
                timestamp=int(datetime.now().timestamp())
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch aggregate trades: {str(e)}")

# ==================== FRONTEND SPECIFIC ENDPOINTS ====================

@app.get("/api/market/overview")
async def get_market_overview():
    """Get market overview for the frontend charts page"""
    try:
        async with BinanceClient() as client:
            # Get top cryptocurrencies
            top_symbols = ["BTCUSDT", "ETHUSDT", "ADAUSDT", "SOLUSDT"]
            ticker_data = await client.get_ticker_24hr()
            
            # Filter for top symbols
            market_data = []
            for ticker in ticker_data:
                if ticker["symbol"] in top_symbols:
                    formatted_ticker = client.format_ticker_data(ticker)
                    market_data.append({
                        "symbol": formatted_ticker["symbol"],
                        "price": formatted_ticker["price"],
                        "change": formatted_ticker["price_change"],
                        "change_percent": formatted_ticker["price_change_percent"],
                        "volume": formatted_ticker["volume"]
                    })
            
            return {
                "success": True,
                "data": market_data,
                "timestamp": int(datetime.now().timestamp())
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market overview: {str(e)}")

@app.get("/api/chart/data/{symbol}")
async def get_chart_data(
    symbol: str = Path(..., description="Symbol for chart data"),
    interval: str = Query("1h", description="Chart interval"),
    limit: int = Query(50, description="Number of data points")
):
    """Get chart data formatted for frontend consumption"""
    try:
        async with BinanceClient() as client:
            kline_data = await client.get_klines(symbol, interval, limit)
            formatted_klines = client.format_kline_data(kline_data)
            
            # Format for frontend chart component
            chart_data = [
                {
                    "timestamp": kline["open_time"],
                    "value": kline["close"],
                    "label": datetime.fromtimestamp(kline["open_time"] / 1000).strftime("%H:%M")
                }
                for kline in formatted_klines
            ]
            
            return {
                "success": True,
                "symbol": symbol,
                "interval": interval,
                "data": chart_data,
                "timestamp": int(datetime.now().timestamp())
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chart data: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

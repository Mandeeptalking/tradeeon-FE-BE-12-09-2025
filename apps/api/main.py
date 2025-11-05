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
from apps.api.routers import connections, portfolio, analytics, market, bots, orders, indicators, alerts
from apps.api.middleware.rate_limiting import rate_limit_middleware, cleanup_rate_limits
from apps.api.metrics import get_metrics_response, record_api_request

app = FastAPI(
    title="Tradeeon API",
    description="Backend API for Tradeeon trading platform with Binance integration",
    version="1.0.0"
)

# Configure CORS - get allowed origins from environment variable
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in cors_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Can be multiple origins: "http://localhost:5173,https://your-app.netlify.app"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware
app.middleware("http")(rate_limit_middleware)

# Include routers
app.include_router(connections.router, prefix="/connections", tags=["connections"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
app.include_router(analytics.router, tags=["analytics"])
app.include_router(market.router, tags=["market"])
app.include_router(bots.router, tags=["bots"])
app.include_router(orders.router, tags=["orders"])
app.include_router(indicators.router, tags=["indicators"])
app.include_router(alerts.router)

@app.on_event("startup")
async def startup_event():
    """Start background tasks on startup."""
    asyncio.create_task(cleanup_rate_limits())

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": int(datetime.now().timestamp())}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return get_metrics_response()

@app.get("/me")
async def get_current_user():
    """Get current user information"""
    return {"user": None}

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

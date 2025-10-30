"""Metrics endpoints for analytics service."""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any, Optional
import pandas as pd
import logging
from datetime import datetime

try:
    from ..core import BinanceClient, OHLCVLoader, MathOps, settings
    from ..core.cache import get_cached_response, cache_response, generate_cache_key, cache_enabled
    from ..models import (
        CorrelationResponse, SpreadZScoreResponse, 
        CorrelationParams, SpreadZScoreParams,
        TimeSeriesPoint
    )
except ImportError:
    # For running directly
    from core import BinanceClient, OHLCVLoader, MathOps, settings
    from core.cache import get_cached_response, cache_response, generate_cache_key, cache_enabled
    from models import (
        CorrelationResponse, SpreadZScoreResponse,
        CorrelationParams, SpreadZScoreParams, 
        TimeSeriesPoint
    )

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/metrics", tags=["metrics"])


async def get_binance_client() -> BinanceClient:
    """Dependency to get Binance client."""
    async with BinanceClient() as client:
        yield client


async def get_ohlcv_loader(client: BinanceClient = Depends(get_binance_client)) -> OHLCVLoader:
    """Dependency to get OHLCV loader."""
    return OHLCVLoader(client)


@router.get("/price/{symbol}")
async def get_price_metrics(
    symbol: str,
    interval: str = Query(default=None, description="Timeframe (1m, 5m, 1h, 1d, etc.)"),
    limit: int = Query(default=None, description="Number of candles to fetch"),
    client: BinanceClient = Depends(get_binance_client)
):
    """Get basic price metrics for a symbol."""
    try:
        # Get 24hr ticker
        ticker_data = await client.get_24hr_ticker(symbol.upper())
        if not ticker_data:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        
        ticker = ticker_data[0]
        
        return {
            "symbol": symbol.upper(),
            "price": float(ticker["lastPrice"]),
            "price_change": float(ticker["priceChange"]),
            "price_change_percent": float(ticker["priceChangePercent"]),
            "high_24h": float(ticker["highPrice"]),
            "low_24h": float(ticker["lowPrice"]),
            "volume_24h": float(ticker["volume"]),
            "quote_volume_24h": float(ticker["quoteVolume"]),
            "trades_count_24h": int(ticker["count"]),
            "open_price": float(ticker["openPrice"]),
            "weighted_avg_price": float(ticker["weightedAvgPrice"])
        }
    except Exception as e:
        logger.error(f"Error getting price metrics for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/technical/{symbol}")
async def get_technical_indicators(
    symbol: str,
    interval: str = Query(default=None, description="Timeframe (1m, 5m, 1h, 1d, etc.)"),
    limit: int = Query(default=None, description="Number of candles to fetch"),
    loader: OHLCVLoader = Depends(get_ohlcv_loader)
):
    """Get technical indicators for a symbol."""
    try:
        interval = interval or settings.default_timeframe
        limit = limit or settings.default_lookback
        
        # Load OHLCV data
        df = await loader.load_ohlcv(symbol, interval, limit)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")
        
        # Calculate indicators
        close_prices = df['close']
        
        # Moving averages
        sma_20 = MathOps.sma(close_prices, 20)
        sma_50 = MathOps.sma(close_prices, 50)
        ema_12 = MathOps.ema(close_prices, 12)
        ema_26 = MathOps.ema(close_prices, 26)
        
        # Bollinger Bands
        bb = MathOps.bollinger_bands(close_prices)
        
        # RSI
        rsi = MathOps.rsi(close_prices)
        
        # MACD
        macd = MathOps.macd(close_prices)
        
        # Volatility
        volatility = MathOps.volatility(close_prices)
        
        # Get latest values
        latest_idx = df.index[-1]
        
        return {
            "symbol": symbol.upper(),
            "timestamp": latest_idx.isoformat(),
            "price": float(close_prices.iloc[-1]),
            "indicators": {
                "sma_20": float(sma_20.iloc[-1]) if not pd.isna(sma_20.iloc[-1]) else None,
                "sma_50": float(sma_50.iloc[-1]) if not pd.isna(sma_50.iloc[-1]) else None,
                "ema_12": float(ema_12.iloc[-1]) if not pd.isna(ema_12.iloc[-1]) else None,
                "ema_26": float(ema_26.iloc[-1]) if not pd.isna(ema_26.iloc[-1]) else None,
                "bollinger": {
                    "upper": float(bb['upper'].iloc[-1]) if not pd.isna(bb['upper'].iloc[-1]) else None,
                    "middle": float(bb['middle'].iloc[-1]) if not pd.isna(bb['middle'].iloc[-1]) else None,
                    "lower": float(bb['lower'].iloc[-1]) if not pd.isna(bb['lower'].iloc[-1]) else None,
                    "width": float(bb['width'].iloc[-1]) if not pd.isna(bb['width'].iloc[-1]) else None,
                    "position": float(bb['position'].iloc[-1]) if not pd.isna(bb['position'].iloc[-1]) else None
                },
                "rsi": float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None,
                "macd": {
                    "macd": float(macd['macd'].iloc[-1]) if not pd.isna(macd['macd'].iloc[-1]) else None,
                    "signal": float(macd['signal'].iloc[-1]) if not pd.isna(macd['signal'].iloc[-1]) else None,
                    "histogram": float(macd['histogram'].iloc[-1]) if not pd.isna(macd['histogram'].iloc[-1]) else None
                },
                "volatility": float(volatility.iloc[-1]) if not pd.isna(volatility.iloc[-1]) else None
            }
        }
    except Exception as e:
        logger.error(f"Error getting technical indicators for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk/{symbol}")
async def get_risk_metrics(
    symbol: str,
    interval: str = Query(default=None, description="Timeframe (1m, 5m, 1h, 1d, etc.)"),
    limit: int = Query(default=None, description="Number of candles to fetch"),
    confidence_level: float = Query(default=0.05, description="Confidence level for VaR calculation"),
    loader: OHLCVLoader = Depends(get_ohlcv_loader)
):
    """Get risk metrics for a symbol."""
    try:
        interval = interval or settings.default_timeframe
        limit = limit or settings.default_lookback
        
        # Load OHLCV data
        df = await loader.load_ohlcv(symbol, interval, limit)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")
        
        # Calculate returns
        returns = loader.calculate_returns(df)
        log_returns = loader.calculate_log_returns(df)
        
        if returns.empty:
            raise HTTPException(status_code=400, detail="Insufficient data for risk calculations")
        
        # Risk metrics
        volatility = MathOps.volatility(returns, window=20, annualize=True)
        sharpe = MathOps.sharpe_ratio(returns)
        max_dd = MathOps.max_drawdown(df['close'])
        var = MathOps.var(returns, confidence_level)
        cvar = MathOps.cvar(returns, confidence_level)
        calmar = MathOps.calmar_ratio(returns)
        
        return {
            "symbol": symbol.upper(),
            "timestamp": df.index[-1].isoformat(),
            "risk_metrics": {
                "volatility_annualized": float(volatility.iloc[-1]) if not pd.isna(volatility.iloc[-1]) else None,
                "sharpe_ratio": float(sharpe) if not pd.isna(sharpe) else None,
                "max_drawdown": float(max_dd['max_drawdown']) if max_dd['max_drawdown'] is not None else None,
                "max_drawdown_date": max_dd['max_drawdown_date'].isoformat() if max_dd['max_drawdown_date'] is not None else None,
                "var_5_percent": float(var) if not pd.isna(var) else None,
                "cvar_5_percent": float(cvar) if not pd.isna(cvar) else None,
                "calmar_ratio": float(calmar) if not pd.isna(calmar) else None,
                "returns_stats": {
                    "mean": float(returns.mean()),
                    "std": float(returns.std()),
                    "skewness": float(returns.skew()),
                    "kurtosis": float(returns.kurtosis())
                }
            }
        }
    except Exception as e:
        logger.error(f"Error getting risk metrics for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/correlation-matrix")
async def get_correlation_matrix(
    symbols: List[str] = Query(description="List of symbols to analyze"),
    interval: str = Query(default=None, description="Timeframe (1m, 5m, 1h, 1d, etc.)"),
    limit: int = Query(default=None, description="Number of candles to fetch"),
    loader: OHLCVLoader = Depends(get_ohlcv_loader)
):
    """Get correlation matrix for multiple symbols."""
    try:
        if not symbols or len(symbols) < 2:
            raise HTTPException(status_code=400, detail="At least 2 symbols required")
        
        interval = interval or settings.default_timeframe
        limit = limit or settings.default_lookback
        
        # Load data for all symbols  
        data_dict = await loader.load_multiple_symbols(symbols, interval, limit)
        
        # Create DataFrame with returns
        returns_data = {}
        for symbol, df in data_dict.items():
            if not df.empty:
                returns = loader.calculate_returns(df)
                if not returns.empty:
                    returns_data[symbol] = returns
        
        if len(returns_data) < 2:
            raise HTTPException(status_code=400, detail="Insufficient data for correlation analysis")
        
        # Align data and calculate correlation
        returns_df = pd.DataFrame(returns_data)
        returns_df = returns_df.dropna()
        
        if returns_df.empty:
            raise HTTPException(status_code=400, detail="No overlapping data found")
        
        correlation_matrix = MathOps.correlation_matrix(returns_df)
        covariance_matrix = MathOps.covariance_matrix(returns_df)
        
        return {
            "symbols": list(returns_df.columns),
            "period": f"{len(returns_df)} observations",
            "correlation_matrix": correlation_matrix.to_dict(),
            "covariance_matrix": covariance_matrix.to_dict(),
            "summary_stats": {
                "avg_correlation": float(correlation_matrix.values[correlation_matrix.values != 1.0].mean()),
                "max_correlation": float(correlation_matrix.values[correlation_matrix.values != 1.0].max()),
                "min_correlation": float(correlation_matrix.values[correlation_matrix.values != 1.0].min())
            }
        }
    except Exception as e:
        logger.error(f"Error calculating correlation matrix: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/correlation", response_model=CorrelationResponse)
async def get_rolling_correlation(
    symbolA: str = Query(..., description="First trading symbol"),
    symbolB: str = Query(..., description="Second trading symbol"),
    interval: str = Query(default="1h", description="Time interval"),
    limit: int = Query(default=1000, ge=10, le=1000, description="Number of candles to fetch"),
    window: int = Query(default=100, ge=5, le=500, description="Rolling window size"),
    cache: bool = Query(default=False, description="Enable caching"),
    loader: OHLCVLoader = Depends(get_ohlcv_loader)
):
    """
    Calculate rolling Pearson correlation between two symbols using log returns.
    
    Returns the latest correlation value and the full time series.
    """
    try:
        # Validate parameters using Pydantic model
        params = CorrelationParams(
            symbolA=symbolA,
            symbolB=symbolB,
            interval=interval,
            limit=limit,
            window=window,
            cache=cache
        )
        
        # Check cache if enabled
        cache_key = None
        if cache and cache_enabled():
            cache_params = {
                "endpoint": "correlation",
                "symbolA": params.symbolA,
                "symbolB": params.symbolB,
                "interval": params.interval,
                "limit": params.limit,
                "window": params.window
            }
            cache_key = generate_cache_key("correlation", cache_params)
            cached_response = await get_cached_response(cache_key)
            if cached_response:
                logger.info(f"Returning cached correlation for {params.symbolA}/{params.symbolB}")
                return CorrelationResponse(**cached_response)
        
        logger.info(f"Computing rolling correlation for {params.symbolA}/{params.symbolB}")
        
        # Load OHLCV data for both symbols
        data_a = await loader.load_ohlcv(params.symbolA, params.interval, params.limit)
        data_b = await loader.load_ohlcv(params.symbolB, params.interval, params.limit)
        
        if data_a.empty or data_b.empty:
            raise HTTPException(
                status_code=404, 
                detail=f"No data found for symbols {params.symbolA} or {params.symbolB}"
            )
        
        # Check if we have enough data after alignment
        # Align the data first to see actual overlap
        aligned_a, aligned_b = data_a['close'].align(data_b['close'], join='inner')
        
        if len(aligned_a) < params.window + 5:
            raise HTTPException(
                status_code=422,
                detail=f"Insufficient data: {len(aligned_a)} points available, need at least {params.window + 5} for window size {params.window}"
            )
        
        # Calculate rolling correlation
        correlation_series = MathOps.rolling_pearson_corr(
            aligned_a, aligned_b, params.window
        )
        
        if correlation_series.empty:
            raise HTTPException(
                status_code=422,
                detail="Could not calculate correlation - insufficient overlapping data"
            )
        
        # Prepare response
        latest_value = None
        series_data = []
        
        if not correlation_series.empty:
            # Get latest non-NaN value
            valid_corr = correlation_series.dropna()
            if not valid_corr.empty:
                latest_value = float(valid_corr.iloc[-1])
            
            # Convert to time series points
            for timestamp, value in correlation_series.dropna().items():
                series_data.append(TimeSeriesPoint(
                    t=timestamp.to_pydatetime(),
                    value=float(value)
                ))
        
        response_data = {
            "symbolA": params.symbolA,
            "symbolB": params.symbolB,
            "interval": params.interval,
            "window": params.window,
            "latest": latest_value,
            "series": series_data
        }
        
        # Cache the response if enabled
        if cache and cache_enabled() and cache_key:
            await cache_response(cache_key, response_data, ttl_seconds=30)
        
        return CorrelationResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating rolling correlation: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/spread-zscore", response_model=SpreadZScoreResponse)
async def get_spread_zscore(
    symbolA: str = Query(..., description="First trading symbol (numerator)"),
    symbolB: str = Query(..., description="Second trading symbol (denominator)"),
    interval: str = Query(default="1h", description="Time interval"),
    limit: int = Query(default=1000, ge=10, le=1000, description="Number of candles to fetch"),
    window: int = Query(default=100, ge=5, le=500, description="Rolling window size"),
    method: str = Query(default="ols", regex="^(ratio|ols)$", description="Spread calculation method"),
    cache: bool = Query(default=False, description="Enable caching"),
    loader: OHLCVLoader = Depends(get_ohlcv_loader)
):
    """
    Calculate z-score of spread between two symbols.
    
    Supports both simple ratio and OLS hedge spread methods.
    Returns the latest z-score value, full time series, and method metadata.
    """
    try:
        # Validate parameters using Pydantic model
        params = SpreadZScoreParams(
            symbolA=symbolA,
            symbolB=symbolB,
            interval=interval,
            limit=limit,
            window=window,
            method=method,  # type: ignore
            cache=cache
        )
        
        # Check cache if enabled
        cache_key = None
        if cache and cache_enabled():
            cache_params = {
                "endpoint": "spread_zscore",
                "symbolA": params.symbolA,
                "symbolB": params.symbolB,
                "interval": params.interval,
                "limit": params.limit,
                "window": params.window,
                "method": params.method
            }
            cache_key = generate_cache_key("spread_zscore", cache_params)
            cached_response = await get_cached_response(cache_key)
            if cached_response:
                logger.info(f"Returning cached spread z-score for {params.symbolA}/{params.symbolB}")
                return SpreadZScoreResponse(**cached_response)
        
        logger.info(f"Computing spread z-score for {params.symbolA}/{params.symbolB} using {params.method} method")
        
        # Load OHLCV data for both symbols
        data_a = await loader.load_ohlcv(params.symbolA, params.interval, params.limit)
        data_b = await loader.load_ohlcv(params.symbolB, params.interval, params.limit)
        
        if data_a.empty or data_b.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for symbols {params.symbolA} or {params.symbolB}"
            )
        
        # Check if we have enough data after alignment
        aligned_a, aligned_b = data_a['close'].align(data_b['close'], join='inner')
        
        if len(aligned_a) < params.window + 5:
            raise HTTPException(
                status_code=422,
                detail=f"Insufficient data: {len(aligned_a)} points available, need at least {params.window + 5} for window size {params.window}"
            )
        
        # Calculate spread z-score
        zscore_series, meta = MathOps.spread_zscore(
            aligned_a, aligned_b, params.window, params.method
        )
        
        if zscore_series.empty:
            raise HTTPException(
                status_code=422,
                detail="Could not calculate spread z-score - insufficient overlapping data"
            )
        
        # Prepare response
        latest_value = None
        series_data = []
        
        if not zscore_series.empty:
            # Get latest non-NaN value
            valid_zscore = zscore_series.dropna()
            if not valid_zscore.empty:
                latest_value = float(valid_zscore.iloc[-1])
            
            # Convert to time series points
            for timestamp, value in zscore_series.dropna().items():
                series_data.append(TimeSeriesPoint(
                    t=timestamp.to_pydatetime(),
                    value=float(value)
                ))
        
        response_data = {
            "symbolA": params.symbolA,
            "symbolB": params.symbolB,
            "interval": params.interval,
            "window": params.window,
            "method": params.method,
            "latest": latest_value,
            "meta": meta,
            "series": series_data
        }
        
        # Cache the response if enabled
        if cache and cache_enabled() and cache_key:
            await cache_response(cache_key, response_data, ttl_seconds=30)
        
        return SpreadZScoreResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating spread z-score: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

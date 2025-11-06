"""Analytics endpoints for correlation and spread analysis."""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any, Optional, Literal
import pandas as pd
import logging
from datetime import datetime
import sys
import os

# Add the analytics backend to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../backend/analytics'))

try:
    from core import BinanceClient, OHLCVLoader, MathOps
    analytics_available = True
except ImportError as e:
    # Fallback for when analytics backend is not available
    logging.error(f"Analytics backend not available: {e}")
    BinanceClient = None
    OHLCVLoader = None
    MathOps = None
    analytics_available = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def validate_analytics_available():
    """Check if analytics service is available."""
    if not analytics_available:
        raise HTTPException(status_code=503, detail="Analytics service not available")


async def get_binance_client():
    """Dependency to get Binance client."""
    validate_analytics_available()
    async with BinanceClient() as client:
        yield client


async def get_ohlcv_loader(client = Depends(get_binance_client)):
    """Dependency to get OHLCV loader."""
    return OHLCVLoader(client)


@router.get("/correlation")
async def get_rolling_correlation(
    symbolA: str = Query(..., description="First trading symbol"),
    symbolB: str = Query(..., description="Second trading symbol"),
    interval: str = Query(default="1h", description="Time interval"),
    limit: int = Query(default=1000, ge=10, le=1000, description="Number of candles to fetch"),
    window: int = Query(default=100, ge=5, le=500, description="Rolling window size"),
    loader = Depends(get_ohlcv_loader)
):
    """
    Calculate rolling Pearson correlation between two symbols using log returns.
    
    Returns the latest correlation value and the full time series.
    """
    validate_analytics_available()
    
    try:
        # Basic parameter validation
        if not symbolA or not symbolB:
            raise HTTPException(status_code=400, detail="Both symbolA and symbolB are required")
        
        if symbolA.upper().strip() == symbolB.upper().strip():
            raise HTTPException(status_code=400, detail="Symbols must be different")
        
        if window < 5 or window > 500:
            raise HTTPException(status_code=400, detail="Window must be between 5 and 500")
        
        if limit < 10 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 10 and 1000")
        
        # Normalize symbols
        symbolA = symbolA.upper().strip()
        symbolB = symbolB.upper().strip()
        
        logger.info(f"Computing rolling correlation for {symbolA}/{symbolB}")
        
        # Load OHLCV data for both symbols
        data_a = await loader.load_ohlcv(symbolA, interval, limit)
        data_b = await loader.load_ohlcv(symbolB, interval, limit)
        
        if data_a.empty or data_b.empty:
            raise HTTPException(
                status_code=404, 
                detail=f"No data found for symbols {symbolA} or {symbolB}"
            )
        
        # Check if we have enough data after alignment
        aligned_a, aligned_b = data_a['close'].align(data_b['close'], join='inner')
        
        if len(aligned_a) < window + 5:
            raise HTTPException(
                status_code=422,
                detail=f"Insufficient data: {len(aligned_a)} points available, need at least {window + 5} for window size {window}"
            )
        
        # Calculate rolling correlation
        correlation_series = MathOps.rolling_pearson_corr(
            aligned_a, aligned_b, window
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
                series_data.append({
                    "t": timestamp.isoformat(),
                    "value": float(value)
                })
        
        return {
            "success": True,
            "symbolA": symbolA,
            "symbolB": symbolB,
            "interval": interval,
            "window": window,
            "latest": latest_value,
            "series": series_data,
            "timestamp": int(datetime.now().timestamp())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating rolling correlation: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/spread-zscore")
async def get_spread_zscore(
    symbolA: str = Query(..., description="First trading symbol (numerator)"),
    symbolB: str = Query(..., description="Second trading symbol (denominator)"),
    interval: str = Query(default="1h", description="Time interval"),
    limit: int = Query(default=1000, ge=10, le=1000, description="Number of candles to fetch"),
    window: int = Query(default=100, ge=5, le=500, description="Rolling window size"),
    method: str = Query(default="ols", regex="^(ratio|ols)$", description="Spread calculation method"),
    loader = Depends(get_ohlcv_loader)
):
    """
    Calculate z-score of spread between two symbols.
    
    Supports both simple ratio and OLS hedge spread methods.
    Returns the latest z-score value, full time series, and method metadata.
    """
    validate_analytics_available()
    
    try:
        # Basic parameter validation
        if not symbolA or not symbolB:
            raise HTTPException(status_code=400, detail="Both symbolA and symbolB are required")
        
        if symbolA.upper().strip() == symbolB.upper().strip():
            raise HTTPException(status_code=400, detail="Symbols must be different")
        
        if window < 5 or window > 500:
            raise HTTPException(status_code=400, detail="Window must be between 5 and 500")
        
        if limit < 10 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 10 and 1000")
        
        if method not in ["ratio", "ols"]:
            raise HTTPException(status_code=400, detail="Method must be 'ratio' or 'ols'")
        
        # Normalize symbols
        symbolA = symbolA.upper().strip()
        symbolB = symbolB.upper().strip()
        
        logger.info(f"Computing spread z-score for {symbolA}/{symbolB} using {method} method")
        
        # Load OHLCV data for both symbols
        data_a = await loader.load_ohlcv(symbolA, interval, limit)
        data_b = await loader.load_ohlcv(symbolB, interval, limit)
        
        if data_a.empty or data_b.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for symbols {symbolA} or {symbolB}"
            )
        
        # Check if we have enough data after alignment
        aligned_a, aligned_b = data_a['close'].align(data_b['close'], join='inner')
        
        if len(aligned_a) < window + 5:
            raise HTTPException(
                status_code=422,
                detail=f"Insufficient data: {len(aligned_a)} points available, need at least {window + 5} for window size {window}"
            )
        
        # Calculate spread z-score
        zscore_series, meta = MathOps.spread_zscore(
            aligned_a, aligned_b, window, method
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
                series_data.append({
                    "t": timestamp.isoformat(),
                    "value": float(value)
                })
        
        return {
            "success": True,
            "symbolA": symbolA,
            "symbolB": symbolB,
            "interval": interval,
            "window": window,
            "method": method,
            "latest": latest_value,
            "meta": meta,
            "series": series_data,
            "timestamp": int(datetime.now().timestamp())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating spread z-score: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

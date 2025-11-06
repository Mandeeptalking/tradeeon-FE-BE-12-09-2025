"""Binance API client for data retrieval."""

import asyncio
from typing import List, Dict, Any, Optional, Union
import httpx
import logging
import time
import random
from fastapi import HTTPException

from .config import settings

logger = logging.getLogger(__name__)


class BinanceClient:
    """Async Binance API client with retry/backoff."""
    
    # TV-style interval mapping to Binance format
    INTERVAL_MAP = {
        '1m': '1m',
        '3m': '3m', 
        '5m': '5m',
        '15m': '15m',
        '30m': '30m',
        '1h': '1h',
        '4h': '4h',
        '1d': '1d',
        # Additional common intervals
        '2h': '2h',
        '6h': '6h',
        '8h': '8h',
        '12h': '12h',
        '3d': '3d',
        '1w': '1w',
        '1M': '1M'
    }
    
    def __init__(self, base_url: str = None):
        """Initialize the Binance client."""
        self.base_url = base_url or settings.binance_base_url
        self.session: Optional[httpx.AsyncClient] = None
        self.max_retries = 3
        self.base_delay = 1.0  # Base delay for exponential backoff
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=30.0,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
            headers={
                "User-Agent": "Tradeeon-Analytics/1.0",
                "Accept": "application/json"
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.aclose()
    
    def _validate_symbol(self, symbol: str) -> str:
        """Validate and normalize symbol."""
        if not symbol:
            raise HTTPException(status_code=400, detail="Symbol cannot be empty")
        
        # Strip spaces and convert to uppercase
        normalized = symbol.strip().upper()
        
        if not normalized:
            raise HTTPException(status_code=400, detail="Invalid symbol format")
        
        # Basic validation - should contain only letters and numbers
        if not normalized.replace('/', '').replace('-', '').isalnum():
            raise HTTPException(status_code=400, detail=f"Invalid symbol format: {symbol}")
        
        # Remove common separators that Binance doesn't use
        normalized = normalized.replace('/', '').replace('-', '')
        
        return normalized
    
    def _validate_interval(self, interval: str) -> str:
        """Validate and map interval to Binance format."""
        if not interval:
            raise HTTPException(status_code=400, detail="Interval cannot be empty")
        
        interval = interval.strip().lower()
        
        # Map TV-style intervals to Binance format
        if interval in self.INTERVAL_MAP:
            return self.INTERVAL_MAP[interval]
        
        # If not in map, check if it's already a valid Binance interval
        valid_intervals = set(self.INTERVAL_MAP.values())
        if interval in valid_intervals:
            return interval
        
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid interval: {interval}. Supported: {list(self.INTERVAL_MAP.keys())}"
        )
    
    async def _make_request_with_retry(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make HTTP request with exponential backoff retry."""
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                response = await self.session.get(endpoint, params=params)
                
                # Handle rate limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 60))
                    if attempt < self.max_retries:
                        logger.warning(f"Rate limited, waiting {retry_after}s before retry {attempt + 1}")
                        await asyncio.sleep(retry_after)
                        continue
                    else:
                        raise HTTPException(
                            status_code=429,
                            detail="Rate limit exceeded. Please try again later."
                        )
                
                # Handle other HTTP errors
                if response.status_code >= 400:
                    error_data = {}
                    try:
                        error_data = response.json()
                    except:
                        pass
                    
                    error_msg = error_data.get('msg', f"HTTP {response.status_code}")
                    error_code = error_data.get('code', response.status_code)
                    
                    if response.status_code == 400:
                        raise HTTPException(status_code=400, detail=f"Bad request: {error_msg}")
                    elif response.status_code == 404:
                        raise HTTPException(status_code=404, detail=f"Not found: {error_msg}")
                    else:
                        raise HTTPException(status_code=response.status_code, detail=error_msg)
                
                response.raise_for_status()
                return response.json()
                
            except httpx.RequestError as e:
                last_exception = e
                if attempt < self.max_retries:
                    # Exponential backoff with jitter
                    delay = self.base_delay * (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"Request failed (attempt {attempt + 1}): {e}. Retrying in {delay:.2f}s")
                    await asyncio.sleep(delay)
                    continue
                else:
                    logger.error(f"Request failed after {self.max_retries + 1} attempts: {e}")
                    raise HTTPException(
                        status_code=503,
                        detail=f"Service temporarily unavailable: {str(e)}"
                    )
            except HTTPException:
                # Re-raise HTTP exceptions without retry
                raise
            except Exception as e:
                last_exception = e
                if attempt < self.max_retries:
                    delay = self.base_delay * (2 ** attempt)
                    logger.warning(f"Unexpected error (attempt {attempt + 1}): {e}. Retrying in {delay:.2f}s")
                    await asyncio.sleep(delay)
                    continue
                else:
                    logger.error(f"Unexpected error after {self.max_retries + 1} attempts: {e}")
                    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
        
        # This should never be reached, but just in case
        raise HTTPException(
            status_code=500,
            detail=f"Request failed after all retries: {str(last_exception)}"
        )
    
    async def fetch_klines(
        self,
        symbol: str,
        interval: str,
        limit: int = 500,
        end_ts_ms: Optional[int] = None
    ) -> List[List[Union[int, str]]]:
        """
        Fetch kline/candlestick data from Binance.
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTCUSDT')
            interval: Timeframe (1m, 5m, 1h, 1d, etc.)
            limit: Number of klines to fetch (max 1000)
            end_ts_ms: End timestamp in milliseconds (optional)
            
        Returns:
            List of klines, each kline is a list with:
            [open_time, open, high, low, close, volume, close_time, ...]
            
        Raises:
            HTTPException: On validation errors or API failures
        """
        # Validate inputs
        symbol = self._validate_symbol(symbol)
        interval = self._validate_interval(interval)
        
        if limit <= 0 or limit > 1000:
            raise HTTPException(
                status_code=400,
                detail="Limit must be between 1 and 1000"
            )
        
        # Prepare request parameters
        params = {
            "symbol": symbol,
            "interval": interval,
            "limit": limit
        }
        
        if end_ts_ms is not None:
            if end_ts_ms <= 0:
                raise HTTPException(status_code=400, detail="Invalid end timestamp")
            params["endTime"] = end_ts_ms
        
        try:
            logger.info(f"Fetching klines for {symbol} {interval} (limit: {limit})")
            data = await self._make_request_with_retry("/api/v3/klines", params)
            
            if not isinstance(data, list):
                raise HTTPException(
                    status_code=500,
                    detail="Unexpected response format from Binance API"
                )
            
            logger.info(f"Successfully fetched {len(data)} klines for {symbol}")
            return data
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to fetch klines for {symbol}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")
    
    async def get_exchange_info(self) -> Dict[str, Any]:
        """Get exchange information including trading pairs."""
        try:
            response = await self.session.get("/api/v3/exchangeInfo")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get exchange info: {e}")
            raise
    
    async def get_24hr_ticker(self, symbol: str = None) -> List[Dict[str, Any]]:
        """Get 24hr ticker price change statistics."""
        try:
            params = {"symbol": symbol} if symbol else {}
            response = await self.session.get("/api/v3/ticker/24hr", params=params)
            response.raise_for_status()
            data = response.json()
            return [data] if symbol else data
        except httpx.HTTPError as e:
            logger.error(f"Failed to get 24hr ticker: {e}")
            raise
    
    async def get_klines(
        self,
        symbol: str,
        interval: str = "1h",
        limit: int = 500,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None
    ) -> List[List[Any]]:
        """Get kline/candlestick data."""
        try:
            params = {
                "symbol": symbol,
                "interval": interval,
                "limit": min(limit, 1000)  # Binance max is 1000
            }
            
            if start_time:
                params["startTime"] = start_time
            if end_time:
                params["endTime"] = end_time
                
            response = await self.session.get("/api/v3/klines", params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get klines for {symbol}: {e}")
            raise
    
    async def get_orderbook(self, symbol: str, limit: int = 100) -> Dict[str, Any]:
        """Get order book depth."""
        try:
            params = {
                "symbol": symbol,
                "limit": min(limit, 5000)  # Binance max is 5000
            }
            response = await self.session.get("/api/v3/depth", params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get orderbook for {symbol}: {e}")
            raise
    
    async def get_recent_trades(self, symbol: str, limit: int = 500) -> List[Dict[str, Any]]:
        """Get recent trades."""
        try:
            params = {
                "symbol": symbol,
                "limit": min(limit, 1000)  # Binance max is 1000
            }
            response = await self.session.get("/api/v3/trades", params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get recent trades for {symbol}: {e}")
            raise

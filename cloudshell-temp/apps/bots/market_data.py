"""Market Data Service - Fetches data from Binance for bot execution."""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import pandas as pd
import sys
import os

# Add api directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))
from binance_client import BinanceClient

logger = logging.getLogger(__name__)


class MarketDataService:
    """Service for fetching market data from Binance."""
    
    def __init__(self):
        self.binance_client = None
        
    async def initialize(self):
        """Initialize Binance client."""
        self.binance_client = BinanceClient()
        await self.binance_client.__aenter__()
        
    async def cleanup(self):
        """Cleanup Binance client."""
        if self.binance_client:
            await self.binance_client.__aexit__(None, None, None)
            
    async def get_current_price(self, symbol: str) -> float:
        """Get current price for a symbol."""
        try:
            price_data = await self.binance_client.get_ticker_price(symbol)
            if isinstance(price_data, list) and len(price_data) > 0:
                return float(price_data[0].get("price", 0))
            elif isinstance(price_data, dict):
                return float(price_data.get("price", 0))
            return 0.0
        except Exception as e:
            logger.error(f"Error fetching price for {symbol}: {e}")
            return 0.0
            
    async def get_klines_as_dataframe(self, symbol: str, interval: str, 
                                     limit: int = 500) -> pd.DataFrame:
        """Get klines and convert to DataFrame."""
        try:
            klines = await self.binance_client.get_klines(symbol, interval, limit)
            
            if not klines:
                return pd.DataFrame()
                
            # Format: [open_time, open, high, low, close, volume, close_time, ...]
            df = pd.DataFrame(klines, columns=[
                'open_time', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                'taker_buy_quote', 'ignore'
            ])
            
            # Convert to numeric
            df['open'] = pd.to_numeric(df['open'])
            df['high'] = pd.to_numeric(df['high'])
            df['low'] = pd.to_numeric(df['low'])
            df['close'] = pd.to_numeric(df['close'])
            df['volume'] = pd.to_numeric(df['volume'])
            df['open_time'] = pd.to_datetime(df['open_time'], unit='ms')
            
            return df
        except Exception as e:
            logger.error(f"Error fetching klines for {symbol}: {e}")
            return pd.DataFrame()
            
    async def get_multiple_symbols_data(self, symbols: List[str], 
                                       interval: str = "1h", 
                                       limit: int = 100) -> Dict[str, pd.DataFrame]:
        """Get klines for multiple symbols."""
        market_data = {}
        for symbol in symbols:
            df = await self.get_klines_as_dataframe(symbol, interval, limit)
            if not df.empty:
                market_data[symbol] = df
        return market_data
        
    async def get_24hr_ticker(self, symbol: Optional[str] = None) -> Dict[str, Any]:
        """Get 24hr ticker data."""
        try:
            ticker_data = await self.binance_client.get_ticker_24hr(symbol)
            return ticker_data
        except Exception as e:
            logger.error(f"Error fetching 24hr ticker: {e}")
            return {}



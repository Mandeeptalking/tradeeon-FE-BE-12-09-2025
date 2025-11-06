"""OHLCV data loader and processor."""

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Union
import logging
from fastapi import HTTPException

from .binance_client import BinanceClient
from .config import settings

logger = logging.getLogger(__name__)


class OHLCVLoader:
    """Load and process OHLCV data from Binance."""
    
    def __init__(self, binance_client: BinanceClient):
        """Initialize with Binance client."""
        self.client = binance_client
    
    def klines_to_df(self, klines: List[List[Union[int, str]]]) -> pd.DataFrame:
        """
        Convert Binance klines data to pandas DataFrame.
        
        Args:
            klines: List of klines from Binance API, each kline is a list with:
                   [open_time, open, high, low, close, volume, close_time, 
                    quote_asset_volume, number_of_trades, taker_buy_base_asset_volume,
                    taker_buy_quote_asset_volume, ignore]
                   
        Returns:
            DataFrame with columns: open_time, open, high, low, close, volume, close_time
            - open_time is set as index (datetime, UTC)
            - close and volume are float
            
        Raises:
            HTTPException: On data processing errors
        """
        if not klines:
            return pd.DataFrame(columns=['open', 'high', 'low', 'close', 'volume', 'close_time'])
        
        try:
            # Convert to DataFrame with all columns first
            df = pd.DataFrame(klines, columns=[
                'open_time', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_asset_volume', 'number_of_trades',
                'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
            ])
            
            # Convert price and volume columns to float
            price_volume_columns = ['open', 'high', 'low', 'close', 'volume']
            for col in price_volume_columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            
            # Convert timestamps to datetime (UTC)
            df['open_time'] = pd.to_datetime(pd.to_numeric(df['open_time']), unit='ms', utc=True)
            df['close_time'] = pd.to_datetime(pd.to_numeric(df['close_time']), unit='ms', utc=True)
            
            # Select only required columns
            df = df[['open_time', 'open', 'high', 'low', 'close', 'volume', 'close_time']]
            
            # Set open_time as index
            df.set_index('open_time', inplace=True)
            
            # Validate data
            if df.empty:
                logger.warning("Converted DataFrame is empty")
                return df
            
            # Check for any NaN values in critical columns
            critical_cols = ['open', 'high', 'low', 'close', 'volume']
            nan_counts = df[critical_cols].isna().sum()
            if nan_counts.any():
                logger.warning(f"Found NaN values in data: {nan_counts[nan_counts > 0].to_dict()}")
            
            # Ensure proper data types
            df['close'] = df['close'].astype(float)
            df['volume'] = df['volume'].astype(float)
            
            logger.info(f"Successfully converted {len(df)} klines to DataFrame")
            return df
            
        except Exception as e:
            logger.error(f"Failed to convert klines to DataFrame: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process klines data: {str(e)}"
            )
    
    async def load_ohlcv(
        self,
        symbol: str,
        interval: str,
        limit: int = 500,
        end_ts_ms: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Load OHLCV data from Binance and return as pandas DataFrame.
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTCUSDT')
            interval: Timeframe (1m, 5m, 1h, 1d, etc.)
            limit: Number of klines to fetch (default: 500, max: 1000)
            end_ts_ms: End timestamp in milliseconds (optional)
            
        Returns:
            DataFrame with OHLCV data, indexed by open_time (datetime, UTC)
            
        Raises:
            HTTPException: On validation errors or API failures
        """
        try:
            # Use default values if not provided
            if not interval:
                interval = settings.default_timeframe
            if limit <= 0:
                limit = settings.default_lookback
            
            logger.info(f"Loading OHLCV data for {symbol} {interval} (limit: {limit})")
            
            # Fetch klines from Binance
            klines = await self.client.fetch_klines(
                symbol=symbol,
                interval=interval,
                limit=limit,
                end_ts_ms=end_ts_ms
            )
            
            # Convert to DataFrame
            df = self.klines_to_df(klines)
            
            if df.empty:
                logger.warning(f"No data returned for {symbol} {interval}")
                return df
            
            # Log data summary
            logger.info(
                f"Loaded {len(df)} candles for {symbol} {interval} "
                f"from {df.index[0]} to {df.index[-1]}"
            )
            
            return df
            
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Failed to load OHLCV data for {symbol} {interval}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load OHLCV data: {str(e)}"
            )
    
    async def load_multiple_symbols(
        self,
        symbols: List[str],
        interval: str = None,
        limit: int = None
    ) -> Dict[str, pd.DataFrame]:
        """Load OHLCV data for multiple symbols."""
        results = {}
        
        for symbol in symbols:
            try:
                df = await self.load_ohlcv(symbol, interval, limit)
                results[symbol] = df
            except Exception as e:
                logger.error(f"Failed to load data for {symbol}: {e}")
                results[symbol] = pd.DataFrame()
        
        return results
    
    def resample_ohlcv(self, df: pd.DataFrame, new_interval: str) -> pd.DataFrame:
        """Resample OHLCV data to a different timeframe."""
        if df.empty:
            return df
        
        # Define resampling rules
        agg_dict = {
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
            'volume': 'sum',
            'quote_asset_volume': 'sum',
            'number_of_trades': 'sum',
            'taker_buy_base_asset_volume': 'sum',
            'taker_buy_quote_asset_volume': 'sum'
        }
        
        try:
            # Convert interval to pandas frequency
            freq_map = {
                '1m': '1T', '3m': '3T', '5m': '5T', '15m': '15T', '30m': '30T',
                '1h': '1H', '2h': '2H', '4h': '4H', '6h': '6H', '8h': '8H', '12h': '12H',
                '1d': '1D', '3d': '3D', '1w': '1W', '1M': '1M'
            }
            
            pandas_freq = freq_map.get(new_interval, new_interval)
            resampled = df.resample(pandas_freq).agg(agg_dict)
            
            # Remove rows with NaN values (incomplete periods)
            resampled = resampled.dropna()
            
            logger.info(f"Resampled to {new_interval}, got {len(resampled)} candles")
            return resampled
            
        except Exception as e:
            logger.error(f"Failed to resample data: {e}")
            raise
    
    def calculate_returns(self, df: pd.DataFrame, column: str = 'close') -> pd.Series:
        """Calculate returns from price data."""
        if df.empty or column not in df.columns:
            return pd.Series()
        
        return df[column].pct_change().dropna()
    
    def calculate_log_returns(self, df: pd.DataFrame, column: str = 'close') -> pd.Series:
        """Calculate log returns from price data."""
        if df.empty or column not in df.columns:
            return pd.Series()
        
        return np.log(df[column] / df[column].shift(1)).dropna()

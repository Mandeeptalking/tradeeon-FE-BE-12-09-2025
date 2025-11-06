from typing import Literal, Dict, Any, Optional
import pandas as pd
import datetime as dt
import numpy as np

class TestCandleSource:
    """
    Test implementation of CandleSource that generates sample data
    for testing the alert system without requiring real market data.
    """
    
    def __init__(self):
        self.sample_data = {}
        self._generate_sample_data()
    
    def _generate_sample_data(self):
        """Generate sample OHLCV data for testing"""
        symbols = ["BTCUSDT", "ETHUSDT", "ADAUSDT"]
        timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"]
        
        for symbol in symbols:
            self.sample_data[symbol] = {}
            for tf in timeframes:
                self.sample_data[symbol][tf] = self._create_sample_candles(symbol, tf)
    
    def _create_sample_candles(self, symbol: str, timeframe: str) -> pd.DataFrame:
        """Create sample candle data"""
        # Generate timestamps
        end_time = pd.Timestamp.now(tz='UTC')
        if timeframe == "1m":
            periods = 1000
            freq = "1T"
        elif timeframe == "5m":
            periods = 500
            freq = "5T"
        elif timeframe == "15m":
            periods = 300
            freq = "15T"
        elif timeframe == "1h":
            periods = 200
            freq = "1H"
        elif timeframe == "4h":
            periods = 100
            freq = "4H"
        elif timeframe == "1d":
            periods = 50
            freq = "1D"
        else:
            periods = 100
            freq = "1T"
        
        timestamps = pd.date_range(end=end_time, periods=periods, freq=freq)
        
        # Generate realistic price data
        base_price = 50000 if symbol == "BTCUSDT" else 3000 if symbol == "ETHUSDT" else 0.5
        
        # Random walk for price
        np.random.seed(42)  # For reproducible results
        returns = np.random.normal(0, 0.02, periods)  # 2% volatility
        prices = [base_price]
        
        for ret in returns[1:]:
            new_price = prices[-1] * (1 + ret)
            prices.append(max(new_price, base_price * 0.1))  # Prevent negative prices
        
        # Generate OHLCV
        data = []
        for i, (ts, price) in enumerate(zip(timestamps, prices)):
            # Generate realistic OHLC from close price
            volatility = 0.01
            high = price * (1 + np.random.uniform(0, volatility))
            low = price * (1 - np.random.uniform(0, volatility))
            open_price = prices[i-1] if i > 0 else price
            
            # Ensure OHLC relationships
            high = max(high, open_price, price)
            low = min(low, open_price, price)
            
            volume = np.random.uniform(1000000, 10000000)
            
            data.append({
                'time': ts,
                'open': round(open_price, 2),
                'high': round(high, 2),
                'low': round(low, 2),
                'close': round(price, 2),
                'volume': round(volume, 0)
            })
        
        return pd.DataFrame(data)

    def get_recent(self, symbol: str, timeframe: str, limit: int = 500) -> pd.DataFrame:
        """
        Return last N candles for (symbol,timeframe) as DataFrame.
        """
        if symbol not in self.sample_data:
            return pd.DataFrame()
        
        if timeframe not in self.sample_data[symbol]:
            return pd.DataFrame()
        
        df = self.sample_data[symbol][timeframe].copy()
        return df.tail(limit)

    def upsample_or_downsample(self, df: pd.DataFrame, to_tf: str) -> pd.DataFrame:
        """
        If alert condition timeframe ≠ base timeframe, convert via resample.
        Assumes df.time is UTC and monotonic; use OHLCV resample rules.
        """
        if df.empty:
            return df

        # Ensure datetime index
        if not isinstance(df.index, pd.DatetimeIndex):
            df = df.copy()
            df["time"] = pd.to_datetime(df["time"], utc=True, errors="coerce")
            df = df.set_index("time")

        rule = self._tf_to_pandas_rule(to_tf)
        o = df["open"].resample(rule).first()
        h = df["high"].resample(rule).max()
        l = df["low"].resample(rule).min()
        c = df["close"].resample(rule).last()
        v = df["volume"].resample(rule).sum()
        out = pd.concat([o,h,l,c,v], axis=1)
        out.columns = ["open","high","low","close","volume"]
        out = out.dropna(how="any")
        out = out.reset_index().rename(columns={"index":"time"})
        return out

    def _tf_to_pandas_rule(self, tf: str) -> str:
        # very basic mapping; extend as needed
        if tf.endswith("m"):
            return f"{tf[:-1]}T"          # minutes
        if tf.endswith("h"):
            return f"{tf[:-1]}H"          # hours
        if tf.endswith("d"):
            return f"{tf[:-1]}D"          # days
        if tf == "same":
            return "1T"
        return "1T"

# Use test implementation for now
CandleSource = TestCandleSource

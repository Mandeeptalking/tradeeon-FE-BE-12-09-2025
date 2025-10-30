"""Data provider for fetching market data."""

import asyncio
import aiohttp
from typing import List, Optional
from models import PriceData

class BinanceDataProvider:
    """Data provider for Binance market data."""
    
    def __init__(self):
        self.base_url = "https://api.binance.com/api/v3"
    
    async def get_klines(
        self, 
        symbol: str, 
        interval: str, 
        limit: int = 1000
    ) -> List[PriceData]:
        """Fetch kline data from Binance."""
        
        url = f"{self.base_url}/klines"
        params = {
            'symbol': symbol,
            'interval': interval,
            'limit': limit
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_klines(data)
                else:
                    raise Exception(f"Failed to fetch data: {response.status}")
    
    def _parse_klines(self, klines_data: List[List]) -> List[PriceData]:
        """Parse klines data from Binance API."""
        
        price_data = []
        for kline in klines_data:
            price_data.append(PriceData(
                timestamp=int(kline[0]),  # Open time
                open=float(kline[1]),     # Open price
                high=float(kline[2]),     # High price
                low=float(kline[3]),      # Low price
                close=float(kline[4]),    # Close price
                volume=float(kline[5])    # Volume
            ))
        
        return price_data

class MockDataProvider:
    """Mock data provider for testing."""
    
    def __init__(self):
        self.base_price = 50000.0
        self.volatility = 0.02
    
    async def get_klines(
        self, 
        symbol: str, 
        interval: str, 
        limit: int = 1000
    ) -> List[PriceData]:
        """Generate mock kline data."""
        
        import random
        import time
        
        price_data = []
        current_price = self.base_price
        current_time = int(time.time() * 1000) - (limit * 60000)  # 1 minute intervals
        
        for i in range(limit):
            # Generate realistic price movement
            change = random.gauss(0, self.volatility)
            current_price *= (1 + change)
            
            # Generate OHLC data
            open_price = current_price
            high_price = open_price * (1 + abs(random.gauss(0, 0.005)))
            low_price = open_price * (1 - abs(random.gauss(0, 0.005)))
            close_price = open_price * (1 + random.gauss(0, 0.002))
            volume = random.uniform(100, 1000)
            
            price_data.append(PriceData(
                timestamp=current_time,
                open=open_price,
                high=high_price,
                low=low_price,
                close=close_price,
                volume=volume
            ))
            
            current_time += 60000  # Add 1 minute
            current_price = close_price
        
        return price_data

class DataProviderFactory:
    """Factory for creating data providers."""
    
    @staticmethod
    def create_provider(provider_type: str = "binance"):
        """Create data provider instance."""
        
        if provider_type == "binance":
            return BinanceDataProvider()
        elif provider_type == "mock":
            return MockDataProvider()
        else:
            raise ValueError(f"Unknown provider type: {provider_type}")



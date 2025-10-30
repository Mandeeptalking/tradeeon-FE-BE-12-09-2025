import asyncio
import aiohttp
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import json

class BinanceClient:
    def __init__(self):
        self.base_url = "https://api.binance.com"
        self.ws_url = "wss://stream.binance.com:9443/ws"
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make HTTP request to Binance API"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        url = f"{self.base_url}{endpoint}"
        async with self.session.get(url, params=params) as response:
            if response.status == 200:
                return await response.json()
            else:
                raise Exception(f"Binance API error: {response.status}")
    
    async def get_exchange_info(self) -> Dict:
        """Get exchange information including all trading symbols"""
        return await self._make_request("/api/v3/exchangeInfo")
    
    async def get_all_symbols(self) -> List[Dict]:
        """Get all available trading symbols"""
        exchange_info = await self.get_exchange_info()
        symbols = []
        
        for symbol_info in exchange_info.get("symbols", []):
            if symbol_info.get("status") == "TRADING":
                symbols.append({
                    "symbol": symbol_info["symbol"],
                    "baseAsset": symbol_info["baseAsset"],
                    "quoteAsset": symbol_info["quoteAsset"],
                    "status": symbol_info["status"],
                    "isSpotTradingAllowed": symbol_info.get("isSpotTradingAllowed", False),
                    "isMarginTradingAllowed": symbol_info.get("isMarginTradingAllowed", False),
                    "filters": symbol_info.get("filters", [])
                })
        
        return symbols
    
    async def get_ticker_24hr(self, symbol: str = None) -> List[Dict]:
        """Get 24hr ticker price change statistics"""
        endpoint = "/api/v3/ticker/24hr"
        params = {"symbol": symbol} if symbol else None
        return await self._make_request(endpoint, params)
    
    async def get_ticker_price(self, symbol: str = None) -> List[Dict]:
        """Get latest price for a symbol or all symbols"""
        endpoint = "/api/v3/ticker/price"
        params = {"symbol": symbol} if symbol else None
        return await self._make_request(endpoint, params)
    
    async def get_klines(self, symbol: str, interval: str, limit: int = 100, start_time: int = None, end_time: int = None) -> List[List]:
        """Get kline/candlestick data"""
        params = {
            "symbol": symbol,
            "interval": interval,
            "limit": limit
        }
        
        if start_time:
            params["startTime"] = start_time
        if end_time:
            params["endTime"] = end_time
        
        return await self._make_request("/api/v3/klines", params)
    
    async def get_orderbook(self, symbol: str, limit: int = 100) -> Dict:
        """Get order book for a symbol"""
        params = {"symbol": symbol, "limit": limit}
        return await self._make_request("/api/v3/depth", params)
    
    async def get_recent_trades(self, symbol: str, limit: int = 100) -> List[Dict]:
        """Get recent trades for a symbol"""
        params = {"symbol": symbol, "limit": limit}
        return await self._make_request("/api/v3/trades", params)
    
    async def get_aggregate_trades(self, symbol: str, limit: int = 100) -> List[Dict]:
        """Get compressed/aggregate trades list"""
        params = {"symbol": symbol, "limit": limit}
        return await self._make_request("/api/v3/aggTrades", params)
    
    def format_kline_data(self, kline_data: List[List]) -> List[Dict]:
        """Format kline data into readable format"""
        formatted_data = []
        for kline in kline_data:
            formatted_data.append({
                "open_time": int(kline[0]),
                "open": float(kline[1]),
                "high": float(kline[2]),
                "low": float(kline[3]),
                "close": float(kline[4]),
                "volume": float(kline[5]),
                "close_time": int(kline[6]),
                "quote_asset_volume": float(kline[7]),
                "number_of_trades": int(kline[8]),
                "taker_buy_base_asset_volume": float(kline[9]),
                "taker_buy_quote_asset_volume": float(kline[10]),
                "ignore": kline[11]
            })
        return formatted_data
    
    def format_ticker_data(self, ticker_data: Dict) -> Dict:
        """Format ticker data for frontend consumption"""
        return {
            "symbol": ticker_data["symbol"],
            "price": float(ticker_data["lastPrice"]),
            "price_change": float(ticker_data["priceChange"]),
            "price_change_percent": float(ticker_data["priceChangePercent"]),
            "weighted_avg_price": float(ticker_data["weightedAvgPrice"]),
            "prev_close_price": float(ticker_data["prevClosePrice"]),
            "last_qty": float(ticker_data["lastQty"]),
            "bid_price": float(ticker_data["bidPrice"]),
            "ask_price": float(ticker_data["askPrice"]),
            "open_price": float(ticker_data["openPrice"]),
            "high_price": float(ticker_data["highPrice"]),
            "low_price": float(ticker_data["lowPrice"]),
            "volume": float(ticker_data["volume"]),
            "quote_volume": float(ticker_data["quoteVolume"]),
            "open_time": int(ticker_data["openTime"]),
            "close_time": int(ticker_data["closeTime"]),
            "first_id": int(ticker_data["firstId"]),
            "last_id": int(ticker_data["lastId"]),
            "count": int(ticker_data["count"])
        }

# Global Binance client instance
binance_client = BinanceClient()



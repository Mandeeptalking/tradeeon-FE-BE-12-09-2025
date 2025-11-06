"""Binance market data source with REST and WebSocket integration."""

import asyncio
import aiohttp
import websockets
import json
import logging
from typing import Dict, List, Optional, Callable, Any
from datetime import datetime, timedelta

from shared.contracts.market import Candle
from shared.enums import Interval

logger = logging.getLogger(__name__)


class BinanceSource:
    """Binance market data source with rate limiting and reconnection."""
    
    def __init__(self, base_url: str = "https://api.binance.com", ws_url: str = "wss://stream.binance.com:9443/ws"):
        self.base_url = base_url
        self.ws_url = ws_url
        self.session: Optional[aiohttp.ClientSession] = None
        self.ws_connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.subscriptions: Dict[str, List[str]] = {}  # symbol:interval -> [streams]
        self.callbacks: Dict[str, Callable] = {}
        self._rate_limiter = asyncio.Semaphore(10)  # 10 concurrent requests
        self._running = False
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()
        if self.session:
            await self.session.close()
    
    async def start(self):
        """Start the Binance data source."""
        self._running = True
        logger.info("Binance source started")
    
    async def stop(self):
        """Stop the Binance data source."""
        self._running = False
        
        # Close all WebSocket connections
        for ws in self.ws_connections.values():
            await ws.close()
        self.ws_connections.clear()
        
        logger.info("Binance source stopped")
    
    async def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make rate-limited HTTP request to Binance API."""
        async with self._rate_limiter:
            if not self.session:
                raise RuntimeError("Session not initialized")
            
            url = f"{self.base_url}{endpoint}"
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise Exception(f"Binance API error: {response.status}")
    
    async def get_exchange_info(self) -> Dict:
        """Get exchange information."""
        return await self._make_request("/api/v3/exchangeInfo")
    
    async def get_symbols(self) -> List[Dict]:
        """Get all trading symbols."""
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
                })
        
        return symbols
    
    async def get_klines(self, symbol: str, interval: str, limit: int = 1000, start_time: int = None, end_time: int = None) -> List[Candle]:
        """Get historical kline data."""
        params = {
            "symbol": symbol,
            "interval": interval,
            "limit": limit
        }
        
        if start_time:
            params["startTime"] = start_time
        if end_time:
            params["endTime"] = end_time
        
        data = await self._make_request("/api/v3/klines", params)
        
        candles = []
        for kline in data:
            candle = Candle(
                t=int(kline[0]),
                o=float(kline[1]),
                h=float(kline[2]),
                l=float(kline[3]),
                c=float(kline[4]),
                v=float(kline[5]),
                x=bool(kline[6])  # Is kline closed
            )
            candles.append(candle)
        
        return candles
    
    async def subscribe_kline_stream(self, symbol: str, interval: str, callback: Callable[[Candle], None]):
        """Subscribe to kline stream for a symbol/interval."""
        stream_name = f"{symbol.lower()}@kline_{interval}"
        subscription_key = f"{symbol}:{interval}"
        
        if subscription_key in self.subscriptions:
            logger.info(f"Already subscribed to {stream_name}")
            return
        
        self.subscriptions[subscription_key] = [stream_name]
        self.callbacks[stream_name] = callback
        
        # Start WebSocket connection if not exists
        if stream_name not in self.ws_connections:
            await self._start_websocket_stream([stream_name])
        
        logger.info(f"Subscribed to kline stream: {stream_name}")
    
    async def unsubscribe_kline_stream(self, symbol: str, interval: str):
        """Unsubscribe from kline stream."""
        stream_name = f"{symbol.lower()}@kline_{interval}"
        subscription_key = f"{symbol}:{interval}"
        
        if subscription_key in self.subscriptions:
            del self.subscriptions[subscription_key]
        
        if stream_name in self.callbacks:
            del self.callbacks[stream_name]
        
        # Close WebSocket if no more subscriptions
        if stream_name in self.ws_connections:
            await self.ws_connections[stream_name].close()
            del self.ws_connections[stream_name]
        
        logger.info(f"Unsubscribed from kline stream: {stream_name}")
    
    async def _start_websocket_stream(self, streams: List[str]):
        """Start WebSocket stream for given streams."""
        stream_param = "/".join(streams)
        ws_url = f"{self.ws_url}/{stream_param}"
        
        try:
            ws = await websockets.connect(ws_url)
            
            # Store connection for each stream
            for stream in streams:
                self.ws_connections[stream] = ws
            
            # Start message handler
            asyncio.create_task(self._handle_websocket_messages(ws, streams))
            
            logger.info(f"WebSocket connected: {ws_url}")
            
        except Exception as e:
            logger.error(f"Failed to connect WebSocket {ws_url}: {e}")
            # Retry after delay
            await asyncio.sleep(5)
            if self._running:
                await self._start_websocket_stream(streams)
    
    async def _handle_websocket_messages(self, ws: websockets.WebSocketServerProtocol, streams: List[str]):
        """Handle incoming WebSocket messages."""
        try:
            async for message in ws:
                if not self._running:
                    break
                
                try:
                    data = json.loads(message)
                    
                    # Handle kline messages
                    if data.get("e") == "kline":
                        kline_data = data["k"]
                        stream_name = f"{kline_data['s'].lower()}@kline_{kline_data['i']}"
                        
                        if stream_name in self.callbacks:
                            candle = Candle(
                                t=int(kline_data["t"]),
                                o=float(kline_data["o"]),
                                h=float(kline_data["h"]),
                                l=float(kline_data["l"]),
                                c=float(kline_data["c"]),
                                v=float(kline_data["v"]),
                                x=bool(kline_data["x"])
                            )
                            
                            # Call registered callback
                            await self.callbacks[stream_name](candle)
                    
                    # Handle other message types
                    elif data.get("e") == "24hrTicker":
                        logger.debug(f"Received ticker update: {data['s']}")
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse WebSocket message: {e}")
                except Exception as e:
                    logger.error(f"Error processing WebSocket message: {e}")
        
        except websockets.exceptions.ConnectionClosed:
            logger.warning("WebSocket connection closed")
            # Reconnect if still running
            if self._running:
                await asyncio.sleep(5)
                await self._start_websocket_stream(streams)
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            if self._running:
                await asyncio.sleep(5)
                await self._start_websocket_stream(streams)


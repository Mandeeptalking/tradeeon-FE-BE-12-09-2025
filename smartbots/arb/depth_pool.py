"""
Depth Pool Manager for managing a rotating set of depth streams.
Maintains VWAP depth for a small rotating set of symbols with LRU eviction.
"""

import asyncio
import websockets
import json
import time
from typing import Dict, Set, Optional, List, Tuple
from collections import OrderedDict

class DepthPoolManager:
    """Manages a pool of depth streams with LRU eviction."""
    
    def __init__(self, max_symbols: int = 120, levels: int = 5, interval_ms: int = 100):
        """
        Initialize depth pool manager.
        
        Args:
            max_symbols: Maximum number of symbols to track
            levels: Number of depth levels to maintain (5, 10, or 20)
            interval_ms: Update interval for depth streams
        """
        self.max_symbols = max_symbols
        self.levels = levels
        self.interval_ms = interval_ms
        
        # LRU tracking: symbol -> last_used_at
        self.last_used: Dict[str, float] = {}
        
        # Order books: symbol -> {"bids": [(price, qty), ...], "asks": [(price, qty), ...], "last_update": timestamp}
        self.orderbooks: Dict[str, Dict] = {}
        
        # Active WebSocket connections
        self.websockets: Dict[str, websockets.WebSocketServerProtocol] = {}
        
        # Symbols currently being tracked
        self.tracked_symbols: Set[str] = set()
        
        self.is_running = False
    
    async def ensure(self, symbols: Set[str]) -> None:
        """
        Ensure symbols are in the depth pool.
        Adds symbols if pool has space, evicts LRU symbols if needed.
        
        Args:
            symbols: Set of symbols to ensure are tracked
        """
        symbols_to_add = symbols - self.tracked_symbols
        
        if not symbols_to_add:
            return
        
        # Update last used time for existing symbols
        for symbol in symbols & self.tracked_symbols:
            self.last_used[symbol] = time.time()
        
        # Calculate how many symbols we can add
        available_slots = self.max_symbols - len(self.tracked_symbols)
        symbols_to_add = list(symbols_to_add)[:available_slots]
        
        # If we need to evict, do it first
        if len(symbols_to_add) > available_slots:
            await self._evict_symbols(len(symbols_to_add) - available_slots)
        
        # Add new symbols
        for symbol in symbols_to_add:
            await self._add_symbol(symbol)
    
    async def evict(self, symbols: Set[str]) -> None:
        """
        Evict specific symbols from the pool.
        
        Args:
            symbols: Set of symbols to evict
        """
        for symbol in symbols & self.tracked_symbols:
            await self._remove_symbol(symbol)
    
    def get_orderbook(self, symbol: str) -> Optional[Dict]:
        """
        Get order book for a symbol.
        
        Args:
            symbol: Trading pair symbol
            
        Returns:
            Order book dict with bids/asks or None if not tracked
        """
        if symbol not in self.tracked_symbols:
            return None
        
        # Update last used time
        self.last_used[symbol] = time.time()
        
        return self.orderbooks.get(symbol)
    
    async def _add_symbol(self, symbol: str) -> None:
        """Add a symbol to the depth pool."""
        try:
            symbol_lower = symbol.lower()
            stream_url = f"wss://stream.binance.com:9443/ws/{symbol_lower}@depth{self.levels}@{self.interval_ms}ms"
            
            print(f"  📊 Adding depth stream: {symbol} (levels={self.levels})")
            
            websocket = await websockets.connect(stream_url)
            self.websockets[symbol] = websocket
            self.tracked_symbols.add(symbol)
            self.last_used[symbol] = time.time()
            
            # Initialize empty orderbook
            self.orderbooks[symbol] = {
                "bids": [],
                "asks": [],
                "last_update": 0
            }
            
            # Start listening for messages
            asyncio.create_task(self._listen_for_depth_messages(symbol, websocket))
            
        except Exception as e:
            print(f"❌ Failed to add depth stream for {symbol}: {e}")
    
    async def _remove_symbol(self, symbol: str) -> None:
        """Remove a symbol from the depth pool."""
        if symbol in self.websockets:
            try:
                await self.websockets[symbol].close()
                del self.websockets[symbol]
            except Exception as e:
                print(f"❌ Error closing depth stream for {symbol}: {e}")
        
        self.tracked_symbols.discard(symbol)
        self.last_used.pop(symbol, None)
        self.orderbooks.pop(symbol, None)
        
        print(f"  📊 Removed depth stream: {symbol}")
    
    async def _evict_symbols(self, count: int) -> None:
        """Evict LRU symbols from the pool."""
        if count <= 0:
            return
        
        # Sort by last used time (oldest first)
        sorted_symbols = sorted(self.last_used.items(), key=lambda x: x[1])
        
        symbols_to_evict = [symbol for symbol, _ in sorted_symbols[:count]]
        
        for symbol in symbols_to_evict:
            await self._remove_symbol(symbol)
    
    async def _listen_for_depth_messages(self, symbol: str, websocket: websockets.WebSocketServerProtocol) -> None:
        """Listen for depth messages for a specific symbol."""
        try:
            async for message in websocket:
                await self._process_depth_message(symbol, message)
        except websockets.exceptions.ConnectionClosed:
            print(f"🔌 Depth stream closed for {symbol}")
            await self._remove_symbol(symbol)
        except asyncio.CancelledError:
            print(f"ℹ️  Depth stream cancelled for {symbol}")
        except Exception as e:
            print(f"❌ Depth stream error for {symbol}: {e}")
    
    async def _process_depth_message(self, symbol: str, message: str) -> None:
        """Process depth message for a symbol."""
        try:
            data = json.loads(message)
            
            # Extract bids and asks
            bids = [(float(price), float(qty)) for price, qty in data.get('bids', [])]
            asks = [(float(price), float(qty)) for price, qty in data.get('asks', [])]
            
            # Update orderbook
            self.orderbooks[symbol] = {
                "bids": bids,
                "asks": asks,
                "last_update": time.time()
            }
            
            # Update last used time
            self.last_used[symbol] = time.time()
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            print(f"❌ Invalid depth message for {symbol}: {e}")
    
    def get_pool_stats(self) -> Dict:
        """Get statistics about the depth pool."""
        return {
            "tracked_symbols": len(self.tracked_symbols),
            "max_symbols": self.max_symbols,
            "levels": self.levels,
            "interval_ms": self.interval_ms,
            "active_streams": len(self.websockets)
        }
    
    async def cleanup(self) -> None:
        """Clean up all WebSocket connections."""
        for symbol in list(self.tracked_symbols):
            await self._remove_symbol(symbol)
        print("🧹 Depth pool cleaned up")


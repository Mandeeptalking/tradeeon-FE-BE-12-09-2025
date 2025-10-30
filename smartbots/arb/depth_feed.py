"""
Binance partial depth feed for order book data.
"""

import asyncio
import json
import time
import random
from typing import Dict, List, Tuple, Set, Optional
import websockets


class DepthFeed:
    """Real-time depth feed from Binance partial depth streams."""
    
    def __init__(self):
        self.orderbooks: Dict[str, Dict] = {}
        self.websockets: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.is_running = False
        self.subscribed_symbols: Set[str] = set()
        self.levels = 5
        self.max_concurrent = 120
        
    async def subscribe(self, symbols: Set[str], levels: int = 5, max_concurrent: int = 120) -> None:
        """
        Subscribe to partial depth streams for given symbols.
        
        Args:
            symbols: Set of trading pair symbols
            levels: Depth levels (5, 10, or 20)
            max_concurrent: Maximum concurrent WebSocket connections
        """
        self.levels = levels
        self.max_concurrent = max_concurrent
        
        # Prioritize symbols (simple heuristic: prefer high liquidity pairs)
        prioritized_symbols = self._prioritize_symbols(symbols)
        
        # Limit subscriptions based on max_concurrent
        symbols_to_subscribe = list(prioritized_symbols)[:max_concurrent]
        remaining_symbols = set(prioritized_symbols[max_concurrent:])
        
        print(f"🔍 Subscribing to {len(symbols_to_subscribe)} depth streams (levels={levels})")
        if remaining_symbols:
            print(f"⚠️  {len(remaining_symbols)} symbols will use top-of-book fallback")
        
        self.is_running = True
        self.subscribed_symbols = set(symbols_to_subscribe)
        
        # Start WebSocket connections
        tasks = []
        for symbol in symbols_to_subscribe:
            task = asyncio.create_task(self._subscribe_symbol(symbol))
            tasks.append(task)
            
            # Add small delay to avoid overwhelming Binance
            await asyncio.sleep(0.01)
        
        # Wait for all connections to be established
        try:
            await asyncio.gather(*tasks, return_exceptions=True)
        except Exception as e:
            print(f"❌ Error in depth subscriptions: {e}")
    
    def _prioritize_symbols(self, symbols: Set[str]) -> List[str]:
        """
        Prioritize symbols for depth subscription.
        
        Args:
            symbols: Set of all required symbols
            
        Returns:
            List of symbols sorted by priority
        """
        # High liquidity anchors (prefer these)
        high_liquidity = {"USDT", "BTC", "ETH", "BNB", "SOL", "XRP"}
        
        # Sort symbols by priority
        def priority_score(symbol: str) -> int:
            score = 0
            # Check if symbol contains high liquidity assets
            for asset in high_liquidity:
                if asset in symbol:
                    score += 10
            # Prefer USDT pairs
            if symbol.endswith("USDT"):
                score += 5
            return score
        
        return sorted(symbols, key=priority_score, reverse=True)
    
    async def _subscribe_symbol(self, symbol: str) -> None:
        """Subscribe to depth stream for a single symbol."""
        symbol_lower = symbol.lower()
        stream_url = f"wss://stream.binance.com:9443/ws/{symbol_lower}@depth{self.levels}@100ms"
        
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries and self.is_running:
            try:
                print(f"🔌 Connecting to depth stream: {symbol}")
                websocket = await websockets.connect(stream_url)
                self.websockets[symbol] = websocket
                
                # Initialize orderbook
                self.orderbooks[symbol] = {
                    "bids": [],
                    "asks": [],
                    "last_update": 0
                }
                
                # Listen for messages
                await self._listen_symbol(websocket, symbol)
                
            except Exception as e:
                retry_count += 1
                if retry_count < max_retries:
                    delay = min(2 ** retry_count + random.uniform(0, 1), 30)
                    print(f"⚠️  Retry {retry_count}/{max_retries} for {symbol} in {delay:.1f}s")
                    await asyncio.sleep(delay)
                else:
                    print(f"❌ Failed to connect {symbol} after {max_retries} retries: {e}")
                    break
    
    async def _listen_symbol(self, websocket, symbol: str) -> None:
        """Listen for depth updates for a specific symbol."""
        try:
            async for message in websocket:
                if not self.is_running:
                    break
                    
                await self._process_depth_message(message, symbol)
                
        except websockets.exceptions.ConnectionClosed:
            print(f"🔌 Depth stream closed for {symbol}")
        except Exception as e:
            print(f"❌ Error in depth stream for {symbol}: {e}")
        finally:
            if symbol in self.websockets:
                del self.websockets[symbol]
            if symbol in self.orderbooks:
                del self.orderbooks[symbol]
    
    async def _process_depth_message(self, message: str, symbol: str) -> None:
        """Process incoming depth message."""
        try:
            data = json.loads(message)
            
            # Handle depth update format
            bids = [(float(price), float(qty)) for price, qty in data.get('bids', [])]
            asks = [(float(price), float(qty)) for price, qty in data.get('asks', [])]
            
            # Validate and sort order book
            bids = [(p, q) for p, q in bids if p > 0 and q > 0]
            asks = [(p, q) for p, q in asks if p > 0 and q > 0]
            
            # Sort bids (highest first) and asks (lowest first)
            bids.sort(key=lambda x: x[0], reverse=True)
            asks.sort(key=lambda x: x[0])
            
            # Update order book
            if symbol in self.orderbooks:
                self.orderbooks[symbol].update({
                    "bids": bids,
                    "asks": asks,
                    "last_update": int(time.time() * 1000)
                })
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            # Skip invalid messages
            pass
    
    def get_orderbook(self, symbol: str) -> Optional[Dict]:
        """
        Get order book for a symbol.
        
        Args:
            symbol: Trading pair symbol
            
        Returns:
            Order book dictionary or None if not available
        """
        return self.orderbooks.get(symbol)
    
    def has_orderbook(self, symbol: str) -> bool:
        """Check if order book is available for symbol."""
        return symbol in self.orderbooks and len(self.orderbooks[symbol]['bids']) > 0
    
    def get_orderbook_count(self) -> int:
        """Get number of available order books."""
        return len([s for s, ob in self.orderbooks.items() if len(ob['bids']) > 0])
    
    def get_subscribed_symbols(self) -> Set[str]:
        """Get set of subscribed symbols."""
        return self.subscribed_symbols.copy()
    
    def is_subscribed(self, symbol: str) -> bool:
        """Check if symbol is subscribed to depth feed."""
        return symbol in self.subscribed_symbols
    
    async def disconnect(self) -> None:
        """Disconnect all WebSocket connections."""
        self.is_running = False
        
        # Close all WebSocket connections
        for symbol, websocket in self.websockets.items():
            try:
                await websocket.close()
            except Exception:
                pass
        
        self.websockets.clear()
        self.orderbooks.clear()
        self.subscribed_symbols.clear()
        
        print("🔌 All depth streams disconnected")


# Global depth feed instance
_depth_feed = None


async def get_depth_feed() -> DepthFeed:
    """Get or create global depth feed instance."""
    global _depth_feed
    if _depth_feed is None:
        _depth_feed = DepthFeed()
    return _depth_feed


async def subscribe_to_depth(symbols: Set[str], levels: int = 5, max_concurrent: int = 120) -> DepthFeed:
    """Subscribe to depth streams and return feed instance."""
    feed = await get_depth_feed()
    await feed.subscribe(symbols, levels, max_concurrent)
    return feed


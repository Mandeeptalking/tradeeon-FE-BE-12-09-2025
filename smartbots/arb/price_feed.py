"""
Binance WebSocket price feed for real-time market data.
"""

import asyncio
import json
import websockets
from typing import Dict, Optional, Set
import time


class PriceFeed:
    """Real-time price feed from Binance WebSocket."""
    
    def __init__(self):
        self.quotes: Dict[str, Dict[str, float]] = {}
        self.websocket = None
        self.is_connected = False
        self.last_update = 0
        self.required_symbols = set()
        
    async def connect_bookticker(self, symbols: Optional[Set[str]] = None) -> None:
        """
        Connect to Binance !ticker@arr stream for ALL spot symbols.
        
        Args:
            symbols: Optional set of symbols to filter for (not used for !ticker@arr)
        """
        try:
            self.required_symbols = symbols or set()
            
            # Use !ticker@arr stream - gets ALL spot symbols in one stream
            stream_url = "wss://stream.binance.com:9443/stream?streams=!ticker@arr"
            
            print(f"🔌 Connecting to Binance !ticker@arr stream...")
            print("⏱️  Note: Updates every 1 second for all spot symbols")
            
            self.websocket = await websockets.connect(stream_url)
            self.is_connected = True
            print("✅ !ticker@arr WebSocket connected successfully!")
            
            # Start listening for messages in background task
            asyncio.create_task(self._listen_for_messages())
            
        except Exception as e:
            print(f"❌ Failed to connect to WebSocket: {e}")
            self.is_connected = False
            raise
    
    async def _listen_for_messages(self) -> None:
        """Listen for incoming WebSocket messages."""
        message_count = 0
        try:
            async for message in self.websocket:
                message_count += 1
                if message_count <= 3:
                    print(f"  📨 Raw message #{message_count}: {message[:100]}...")
                await self._process_message(message)
        except websockets.exceptions.ConnectionClosed:
            print("🔌 WebSocket connection closed")
            self.is_connected = False
        except asyncio.CancelledError:
            print("ℹ️ WebSocket message listening cancelled")
            self.is_connected = False
        except Exception as e:
            print(f"❌ WebSocket error: {e}")
            self.is_connected = False
    
    async def _process_message(self, message: str) -> None:
        """Process incoming WebSocket message."""
        try:
            data = json.loads(message)
            
            # !ticker@arr stream format: combined stream with nested data
            if 'stream' in data and 'data' in data:
                # Combined stream format
                stream_name = data.get('stream', '')
                if stream_name != '!ticker@arr':
                    return
                
                ticker_array = data.get('data', [])
                if not isinstance(ticker_array, list):
                    return
                
                # Process each ticker in the array
                for ticker_data in ticker_array:
                    await self._process_single_ticker(ticker_data)
            else:
                # Direct array format (fallback)
                if isinstance(data, list):
                    for ticker_data in data:
                        await self._process_single_ticker(ticker_data)
                else:
                    # Single ticker format (fallback)
                    await self._process_single_ticker(data)
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            # Skip invalid messages, but log for debugging
            print(f"❌ Invalid message: {e} - {message[:100]}...")
            pass
    
    async def _process_single_ticker(self, ticker_data: dict) -> None:
        """Process a single ticker from the array."""
        try:
            symbol = ticker_data.get('s')
            if not symbol:
                return
            
            # Filter symbols if we have a specific set required (and it's not empty)
            if self.required_symbols and symbol not in self.required_symbols:
                return
            
            # !ticker@arr format: 'b' = best bid price, 'a' = best ask price
            bid = float(ticker_data.get('b', 0))
            ask = float(ticker_data.get('a', 0))
            
            # Validate bid/ask data
            if bid <= 0 or ask <= 0 or ask <= bid:
                return
            
            # Update quotes with timestamp from event
            event_time = ticker_data.get('E', int(time.time() * 1000))
            self.quotes[symbol] = {
                'bid': bid,
                'ask': ask,
                'ts': event_time
            }
            
            self.last_update = time.time()
            
            # Debug: Show first few symbols
            if len(self.quotes) <= 10:
                print(f"  📈 Received: {symbol} - Bid: {bid:.4f}, Ask: {ask:.4f}")
            
        except (KeyError, ValueError, TypeError) as e:
            # Skip invalid ticker data
            pass
    
    def get_quote(self, symbol: str) -> Optional[Dict[str, float]]:
        """
        Get current quote for a symbol.
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTCUSDT')
            
        Returns:
            Quote dictionary with 'bid', 'ask', 'ts' or None if not available
        """
        return self.quotes.get(symbol)
    
    def get_all_quotes(self) -> Dict[str, Dict[str, float]]:
        """Get all current quotes."""
        return self.quotes.copy()
    
    def has_quote(self, symbol: str) -> bool:
        """Check if quote is available for symbol."""
        return symbol in self.quotes
    
    def get_quote_count(self) -> int:
        """Get total number of available quotes."""
        return len(self.quotes)
    
    def is_stale(self, max_age_seconds: float = 30.0) -> bool:
        """Check if quotes are stale."""
        return time.time() - self.last_update > max_age_seconds
    
    def coverage(self, required_symbols: Optional[Set[str]] = None) -> float:
        """
        Calculate coverage percentage of required symbols.
        
        Args:
            required_symbols: Set of symbols we need quotes for. If None, uses all quotes.
            
        Returns:
            Coverage percentage (0.0 to 1.0)
        """
        if not required_symbols:
            return 1.0 if self.quotes else 0.0
        
        current_time = time.time()
        stale_threshold = 3.0  # 3 seconds
        
        fresh_quotes = 0
        for symbol in required_symbols:
            if symbol in self.quotes:
                quote_time = self.quotes[symbol]['ts'] / 1000.0
                if current_time - quote_time <= stale_threshold:
                    fresh_quotes += 1
        
        return fresh_quotes / len(required_symbols) if required_symbols else 0.0
    
    def get_fresh_quotes(self, required_symbols: Set[str], max_age_seconds: float = 3.0) -> Dict[str, Dict[str, float]]:
        """
        Get fresh quotes for required symbols (not stale).
        
        Args:
            required_symbols: Set of symbols we need
            max_age_seconds: Maximum age of quotes to consider fresh
            
        Returns:
            Dictionary of fresh quotes
        """
        current_time = time.time()
        fresh_quotes = {}
        
        for symbol in required_symbols:
            if symbol in self.quotes:
                quote_time = self.quotes[symbol]['ts'] / 1000.0
                if current_time - quote_time <= max_age_seconds:
                    fresh_quotes[symbol] = self.quotes[symbol]
        
        return fresh_quotes
    
    async def disconnect(self) -> None:
        """Disconnect from WebSocket."""
        if self.websocket:
            await self.websocket.close()
            self.is_connected = False
            print("🔌 WebSocket disconnected")


# Global price feed instance
_price_feed = None


async def get_price_feed() -> PriceFeed:
    """Get or create global price feed instance."""
    global _price_feed
    if _price_feed is None:
        _price_feed = PriceFeed()
    return _price_feed


async def connect_to_binance(symbols: Optional[Set[str]] = None) -> PriceFeed:
    """Connect to Binance and return price feed instance."""
    feed = await get_price_feed()
    if not feed.is_connected:
        await feed.connect_bookticker(symbols)
    return feed

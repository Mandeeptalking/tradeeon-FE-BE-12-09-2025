import asyncio
import websockets
import json
import time
from typing import Dict, Optional, Set, List
from collections import defaultdict

class MultiPriceFeed:
    """Multi-connection price feed to handle more symbols."""
    
    def __init__(self, max_connections: int = 3):
        self.quotes: Dict[str, Dict[str, float]] = {}
        self.websockets: List[websockets.WebSocketServerProtocol] = []
        self.is_connected = False
        self.last_update = 0
        self.required_symbols = set()
        self.max_connections = max_connections
        
    async def connect_multi_stream(self, symbols: Set[str]) -> None:
        """
        Connect to multiple WebSocket streams to handle more symbols.
        
        Args:
            symbols: Set of symbols to subscribe to
        """
        try:
            self.required_symbols = symbols
            
            # Split symbols into chunks of 50 (WebSocket limit per connection)
            symbol_chunks = self._chunk_symbols(list(symbols), 50)
            
            print(f"🔌 Setting up {len(symbol_chunks)} WebSocket connections for {len(symbols)} symbols...")
            
            # Create multiple connections
            for i, chunk in enumerate(symbol_chunks[:self.max_connections]):
                await self._create_connection(chunk, i)
                
            self.is_connected = True
            print(f"✅ Connected to {len(self.websockets)} WebSocket streams!")
            
        except Exception as e:
            print(f"❌ Failed to connect: {e}")
            self.is_connected = False
            raise
    
    def _chunk_symbols(self, symbols: List[str], chunk_size: int) -> List[List[str]]:
        """Split symbols into chunks of specified size."""
        chunks = []
        for i in range(0, len(symbols), chunk_size):
            chunks.append(symbols[i:i + chunk_size])
        return chunks
    
    async def _create_connection(self, symbols: List[str], connection_id: int) -> None:
        """Create a single WebSocket connection for a chunk of symbols."""
        try:
            # Prioritize major pairs first
            major_pairs = [
                'btcusdt', 'ethusdt', 'bnbusdt', 'adausdt', 'solusdt', 'xrpusdt', 
                'dogeusdt', 'maticusdt', 'avaxusdt', 'linkusdt', 'ltcusdt', 'atomusdt',
                'uniusdt', 'ftmusdt', 'nearusdt', 'algousdt', 'vetusdt', 'icpusdt',
                'sandusdt', 'manausdt', 'axsusdt', 'flowusdt', 'apeusdt', 'chzusdt'
            ]
            
            # Build streams for this connection
            streams = []
            
            # Add major pairs first (if not already added)
            for pair in major_pairs[:20]:
                if pair in [s.lower() for s in symbols]:
                    streams.append(f"{pair}@ticker")
            
            # Add remaining symbols from this chunk
            for symbol in symbols:
                symbol_lower = symbol.lower()
                if symbol_lower not in [s.split('@')[0] for s in streams]:
                    streams.append(f"{symbol_lower}@ticker")
            
            if not streams:
                print(f"⚠️  Connection {connection_id}: No streams to connect to")
                return
                
            stream_url = f"wss://stream.binance.com:9443/stream?streams={'/'.join(streams)}"
            print(f"🔌 Connection {connection_id}: {len(streams)} streams")
            
            websocket = await websockets.connect(stream_url)
            self.websockets.append(websocket)
            
            # Start listening for messages in background task
            asyncio.create_task(self._listen_for_messages(websocket, connection_id))
            
        except Exception as e:
            print(f"❌ Connection {connection_id} failed: {e}")
    
    async def _listen_for_messages(self, websocket: websockets.WebSocketServerProtocol, connection_id: int) -> None:
        """Listen for incoming WebSocket messages."""
        message_count = 0
        try:
            async for message in websocket:
                message_count += 1
                if message_count <= 2:
                    print(f"  📨 Connection {connection_id} message #{message_count}: {message[:80]}...")
                await self._process_message(message, connection_id)
        except websockets.exceptions.ConnectionClosed:
            print(f"🔌 Connection {connection_id} closed")
        except asyncio.CancelledError:
            print(f"ℹ️  Connection {connection_id} message listening cancelled")
        except Exception as e:
            print(f"❌ Connection {connection_id} error: {e}")
    
    async def _process_message(self, message: str, connection_id: int) -> None:
        """Process incoming WebSocket message."""
        try:
            data = json.loads(message)
            
            # Handle different message formats
            if 'data' in data:
                ticker_data = data['data']
            else:
                ticker_data = data
            
            symbol = ticker_data.get('s')
            if not symbol:
                return
            
            # Filter symbols if we have a specific set required
            if self.required_symbols and symbol not in self.required_symbols:
                return
            
            # Ticker stream has different field names than bookTicker
            bid = float(ticker_data.get('b', 0))
            ask = float(ticker_data.get('a', 0))
            
            # Validate bid/ask data
            if bid <= 0 or ask <= 0 or ask <= bid:
                return
            
            # Update quotes
            self.quotes[symbol] = {
                'bid': bid,
                'ask': ask,
                'ts': int(time.time() * 1000)
            }
            
            self.last_update = time.time()
            
            # Debug: Show first few messages
            if len(self.quotes) <= 10:
                print(f"  📈 Connection {connection_id}: {symbol} - Bid: {bid:.4f}, Ask: {ask:.4f}")
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            # Skip invalid messages
            pass

    def get_quote(self, symbol: str) -> Optional[Dict[str, float]]:
        """Get current quote for a symbol."""
        return self.quotes.get(symbol)

    def get_quote_count(self) -> int:
        """Returns the number of symbols for which quotes are available."""
        return len(self.quotes)

    def get_all_quotes(self) -> Dict[str, Dict[str, float]]:
        """Returns all stored quotes."""
        return self.quotes

    async def disconnect(self) -> None:
        """Disconnects all WebSocket connections."""
        for i, websocket in enumerate(self.websockets):
            try:
                await websocket.close()
                print(f"🔌 Connection {i} disconnected")
            except Exception as e:
                print(f"❌ Error disconnecting connection {i}: {e}")
        
        self.websockets.clear()
        self.is_connected = False
        print("🔌 All WebSocket connections disconnected")

# Convenience function
async def connect_to_binance_multi(symbols: Optional[Set[str]] = None, max_connections: int = 3) -> MultiPriceFeed:
    """
    Connect to Binance with multiple WebSocket streams.
    
    Args:
        symbols: Optional set of symbols to subscribe to
        max_connections: Maximum number of WebSocket connections (default: 3)
    
    Returns:
        MultiPriceFeed instance
    """
    price_feed = MultiPriceFeed(max_connections=max_connections)
    await price_feed.connect_multi_stream(symbols or set())
    return price_feed


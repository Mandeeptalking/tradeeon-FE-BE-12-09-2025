"""WebSocket server for streaming market data to clients."""

import asyncio
import json
import logging
from typing import Dict, Set, Optional
import websockets
from websockets.server import WebSocketServerProtocol

from shared.contracts.market import Snapshot, IndicatorUpdate, KlineUpdate
from apps.streamer.hub import ChannelsHub
from apps.streamer.contracts import StreamRequest

logger = logging.getLogger(__name__)


class StreamWebSocketServer:
    """WebSocket server for streaming market data."""
    
    def __init__(self, channels_hub: ChannelsHub):
        self.channels_hub = channels_hub
        self.clients: Dict[str, WebSocketServerProtocol] = {}
        self.client_subscriptions: Dict[str, Set[str]] = {}  # client_id -> set of channel_keys
        self._running = False
    
    async def start(self, host: str = "localhost", port: int = 8765):
        """Start the WebSocket server."""
        self._running = True
        
        async with websockets.serve(
            self._handle_client,
            host,
            port,
            ping_interval=30,
            ping_timeout=10
        ):
            logger.info(f"Stream WebSocket server started on {host}:{port}")
            await asyncio.Future()  # Run forever
    
    async def stop(self):
        """Stop the WebSocket server."""
        self._running = False
        
        # Close all client connections
        for client in self.clients.values():
            await client.close()
        
        self.clients.clear()
        self.client_subscriptions.clear()
        
        logger.info("Stream WebSocket server stopped")
    
    async def _handle_client(self, websocket: WebSocketServerProtocol, path: str):
        """Handle new WebSocket client connection."""
        client_id = f"client_{id(websocket)}"
        self.clients[client_id] = websocket
        self.client_subscriptions[client_id] = set()
        
        logger.info(f"Client {client_id} connected from {websocket.remote_address}")
        
        try:
            async for message in websocket:
                await self._handle_message(client_id, message)
        
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client {client_id} disconnected")
        except Exception as e:
            logger.error(f"Error handling client {client_id}: {e}")
        finally:
            await self._cleanup_client(client_id)
    
    async def _handle_message(self, client_id: str, message: str):
        """Handle incoming message from client."""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            
            if message_type == "subscribe":
                await self._handle_subscribe(client_id, data)
            elif message_type == "unsubscribe":
                await self._handle_unsubscribe(client_id, data)
            elif message_type == "ping":
                await self._send_message(client_id, {"type": "pong"})
            else:
                logger.warning(f"Unknown message type: {message_type}")
        
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON message from {client_id}")
        except Exception as e:
            logger.error(f"Error processing message from {client_id}: {e}")
    
    async def _handle_subscribe(self, client_id: str, data: Dict):
        """Handle subscription request."""
        try:
            symbol = data["symbol"]
            interval = data["interval"]
            indicators = data.get("indicators", "").split(",") if data.get("indicators") else []
            indicators = [ind.strip() for ind in indicators if ind.strip()]
            
            # Subscribe to channel
            channel_key = await self.channels_hub.subscribe(client_id, symbol, interval, indicators)
            self.client_subscriptions[client_id].add(channel_key)
            
            # Send initial snapshot
            snapshot = await self.channels_hub.get_snapshot(symbol, interval)
            if snapshot:
                await self._send_message(client_id, snapshot.dict())
            
            logger.info(f"Client {client_id} subscribed to {symbol}:{interval}")
        
        except KeyError as e:
            await self._send_error(client_id, f"Missing required field: {e}")
        except Exception as e:
            await self._send_error(client_id, f"Subscription failed: {e}")
    
    async def _handle_unsubscribe(self, client_id: str, data: Dict):
        """Handle unsubscription request."""
        try:
            symbol = data["symbol"]
            interval = data["interval"]
            
            await self.channels_hub.unsubscribe(client_id, symbol, interval)
            channel_key = f"{symbol}:{interval}"
            self.client_subscriptions[client_id].discard(channel_key)
            
            logger.info(f"Client {client_id} unsubscribed from {symbol}:{interval}")
        
        except KeyError as e:
            await self._send_error(client_id, f"Missing required field: {e}")
        except Exception as e:
            await self._send_error(client_id, f"Unsubscription failed: {e}")
    
    async def _send_message(self, client_id: str, message: Dict):
        """Send message to client."""
        if client_id in self.clients:
            try:
                await self.clients[client_id].send(json.dumps(message))
            except websockets.exceptions.ConnectionClosed:
                logger.warning(f"Client {client_id} connection closed")
                await self._cleanup_client(client_id)
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {e}")
    
    async def _send_error(self, client_id: str, error: str):
        """Send error message to client."""
        await self._send_message(client_id, {
            "type": "error",
            "message": error
        })
    
    async def _cleanup_client(self, client_id: str):
        """Clean up client resources."""
        # Unsubscribe from all channels
        for channel_key in self.client_subscriptions.get(client_id, set()):
            symbol, interval = channel_key.split(":")
            await self.channels_hub.unsubscribe(client_id, symbol, interval)
        
        # Remove client
        if client_id in self.clients:
            del self.clients[client_id]
        if client_id in self.client_subscriptions:
            del self.client_subscriptions[client_id]
    
    async def broadcast_to_channel(self, symbol: str, interval: str, message: Dict):
        """Broadcast message to all subscribers of a channel."""
        channel_key = f"{symbol}:{interval}"
        
        for client_id, subscriptions in self.client_subscriptions.items():
            if channel_key in subscriptions:
                await self._send_message(client_id, message)
    
    async def get_client_count(self) -> int:
        """Get number of connected clients."""
        return len(self.clients)
    
    async def get_subscription_count(self, symbol: str, interval: str) -> int:
        """Get number of subscribers for a channel."""
        return await self.channels_hub.get_subscriber_count(symbol, interval)


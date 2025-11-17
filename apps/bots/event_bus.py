"""
Event Bus for Condition Triggers - Redis Pub/Sub Implementation

Publishes condition trigger events to Redis channels.
Bots can subscribe to these channels to receive notifications.
"""

import asyncio
import json
import logging
import os
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime

logger = logging.getLogger(__name__)

# Try to import Redis
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available. Install with: pip install redis")


class EventBus:
    """
    Redis-based event bus for condition triggers.
    
    Features:
    - Publish condition trigger events
    - Subscribe to condition channels
    - Pattern-based subscriptions
    - Automatic reconnection
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize event bus.
        
        Args:
            redis_url: Redis connection URL (default: from env or redis://localhost:6379)
        """
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
        self.connected = False
        self.subscribers: Dict[str, List[Callable]] = {}
        self.running = False
        
    async def connect(self) -> bool:
        """Connect to Redis."""
        if not REDIS_AVAILABLE:
            logger.warning("Redis not available - event bus disabled")
            return False
        
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            
            # Test connection
            await self.redis_client.ping()
            self.connected = True
            logger.info(f"✅ Event bus connected to Redis: {self.redis_url}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from Redis."""
        if self.pubsub:
            await self.pubsub.unsubscribe()
            await self.pubsub.close()
            self.pubsub = None
        
        if self.redis_client:
            await self.redis_client.close()
            self.redis_client = None
        
        self.connected = False
        logger.info("Event bus disconnected from Redis")
    
    async def publish(self, channel: str, event: Dict[str, Any]) -> bool:
        """
        Publish an event to a Redis channel.
        
        Args:
            channel: Channel name (e.g., "condition.187efde11d740283")
            event: Event data dictionary
        
        Returns:
            True if published successfully, False otherwise
        """
        if not self.connected or not self.redis_client:
            logger.debug(f"Event bus not connected - skipping publish to {channel}")
            return False
        
        try:
            # Add metadata to event
            event_with_meta = {
                **event,
                "published_at": datetime.now().isoformat(),
                "channel": channel
            }
            
            # Serialize event
            event_json = json.dumps(event_with_meta)
            
            # Publish to Redis
            subscribers_count = await self.redis_client.publish(channel, event_json)
            
            logger.debug(f"Published event to {channel} ({subscribers_count} subscribers)")
            return True
            
        except Exception as e:
            logger.error(f"Error publishing event to {channel}: {e}")
            return False
    
    async def subscribe(self, channel: str, callback: Callable[[Dict[str, Any]], None]):
        """
        Subscribe to a Redis channel.
        
        Args:
            channel: Channel name to subscribe to
            callback: Async function to call when event received
        """
        if not self.connected or not self.redis_client:
            logger.warning(f"Cannot subscribe - event bus not connected")
            return
        
        try:
            # Initialize pubsub if needed
            if not self.pubsub:
                self.pubsub = self.redis_client.pubsub()
            
            # Add callback to subscribers list
            if channel not in self.subscribers:
                self.subscribers[channel] = []
                # Subscribe to channel
                await self.pubsub.subscribe(channel)
                logger.info(f"Subscribed to channel: {channel}")
            
            self.subscribers[channel].append(callback)
            logger.debug(f"Added callback for channel {channel} (total: {len(self.subscribers[channel])})")
            
        except Exception as e:
            logger.error(f"Error subscribing to {channel}: {e}")
    
    async def unsubscribe(self, channel: str, callback: Optional[Callable] = None):
        """
        Unsubscribe from a Redis channel.
        
        Args:
            channel: Channel name to unsubscribe from
            callback: Specific callback to remove (if None, removes all)
        """
        if not self.pubsub:
            return
        
        try:
            if callback:
                # Remove specific callback
                if channel in self.subscribers:
                    if callback in self.subscribers[channel]:
                        self.subscribers[channel].remove(callback)
                        logger.debug(f"Removed callback from channel {channel}")
            else:
                # Remove all callbacks and unsubscribe
                if channel in self.subscribers:
                    del self.subscribers[channel]
                    await self.pubsub.unsubscribe(channel)
                    logger.info(f"Unsubscribed from channel: {channel}")
        except Exception as e:
            logger.error(f"Error unsubscribing from {channel}: {e}")
    
    async def psubscribe(self, pattern: str, callback: Callable[[Dict[str, Any]], None]):
        """
        Subscribe to channels matching a pattern.
        
        Args:
            pattern: Redis pattern (e.g., "condition.*")
            callback: Async function to call when event received
        """
        if not self.connected or not self.redis_client:
            logger.warning(f"Cannot subscribe - event bus not connected")
            return
        
        try:
            # Initialize pubsub if needed
            if not self.pubsub:
                self.pubsub = self.redis_client.pubsub()
            
            # Add callback to pattern subscribers
            pattern_key = f"pattern:{pattern}"
            if pattern_key not in self.subscribers:
                self.subscribers[pattern_key] = []
                # Subscribe to pattern
                await self.pubsub.psubscribe(pattern)
                logger.info(f"Subscribed to pattern: {pattern}")
            
            self.subscribers[pattern_key].append(callback)
            logger.debug(f"Added callback for pattern {pattern} (total: {len(self.subscribers[pattern_key])})")
            
        except Exception as e:
            logger.error(f"Error subscribing to pattern {pattern}: {e}")
    
    async def start_listening(self):
        """Start listening for events and calling callbacks."""
        if not self.pubsub:
            logger.warning("Cannot start listening - not subscribed to any channels")
            return
        
        self.running = True
        logger.info("Started listening for events...")
        
        try:
            while self.running:
                try:
                    # Get message with timeout
                    message = await asyncio.wait_for(
                        self.pubsub.get_message(ignore_subscribe_messages=True),
                        timeout=1.0
                    )
                    
                    if message:
                        await self._handle_message(message)
                
                except asyncio.TimeoutError:
                    # Timeout is normal - continue listening
                    continue
                except Exception as e:
                    logger.error(f"Error in event loop: {e}")
                    await asyncio.sleep(1)
        
        except Exception as e:
            logger.error(f"Error in listening loop: {e}")
        finally:
            self.running = False
            logger.info("Stopped listening for events")
    
    async def _handle_message(self, message: Dict):
        """Handle incoming message from Redis."""
        try:
            message_type = message.get("type")
            
            if message_type == "message":
                # Regular channel subscription
                channel = message.get("channel")
                data = message.get("data")
                
                if channel in self.subscribers:
                    event = json.loads(data)
                    # Call all callbacks for this channel
                    for callback in self.subscribers[channel]:
                        try:
                            await callback(event)
                        except Exception as e:
                            logger.error(f"Error in callback for {channel}: {e}")
            
            elif message_type == "pmessage":
                # Pattern subscription
                pattern = message.get("pattern")
                channel = message.get("channel")
                data = message.get("data")
                
                pattern_key = f"pattern:{pattern}"
                if pattern_key in self.subscribers:
                    event = json.loads(data)
                    # Call all callbacks for this pattern
                    for callback in self.subscribers[pattern_key]:
                        try:
                            await callback(event)
                        except Exception as e:
                            logger.error(f"Error in pattern callback for {pattern}: {e}")
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode event JSON: {e}")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    def stop_listening(self):
        """Stop listening for events."""
        self.running = False
        logger.info("Stopping event listener...")
    
    async def get_channel_subscribers_count(self, channel: str) -> int:
        """Get number of subscribers for a channel."""
        if not self.connected or not self.redis_client:
            return 0
        
        try:
            # Use PUBSUB NUMSUB command
            result = await self.redis_client.pubsub_numsub(channel)
            return result.get(channel, 0) if isinstance(result, dict) else 0
        except Exception as e:
            logger.error(f"Error getting subscriber count: {e}")
            return 0


# Convenience function to create event bus
async def create_event_bus(redis_url: Optional[str] = None) -> Optional[EventBus]:
    """
    Create and connect an event bus instance.
    
    Returns:
        EventBus instance if Redis is available, None otherwise
    """
    if not REDIS_AVAILABLE:
        logger.warning("Redis not available - event bus disabled")
        return None
    
    event_bus = EventBus(redis_url)
    connected = await event_bus.connect()
    
    if connected:
        return event_bus
    else:
        logger.warning("Failed to connect to Redis - event bus disabled")
        return None


"""ChannelsHub - manages market data channels and indicator computation."""

import asyncio
import logging
from typing import Dict, List, Optional, Set
from collections import deque
import time

from shared.contracts.market import Candle, IndicatorPoint, Snapshot, IndicatorUpdate, KlineUpdate
from shared.contracts.signals import Signal
from apps.streamer.contracts import ChannelConfig, ChannelState, StreamRequest
from backend.indicator_engine.registry import IndicatorRegistry
from backend.indicator_engine.core.ring_buffer import RingBuffer

logger = logging.getLogger(__name__)


class ChannelsHub:
    """Central hub for managing market data channels and indicator computation."""
    
    def __init__(self, indicator_registry: IndicatorRegistry):
        self.indicator_registry = indicator_registry
        self.channels: Dict[str, ChannelState] = {}
        self.channel_configs: Dict[str, ChannelConfig] = {}
        self.subscribers: Dict[str, Set[str]] = {}  # client_id -> set of channel_keys
        self._lock = asyncio.Lock()
        
    def _get_channel_key(self, symbol: str, interval: str) -> str:
        """Generate unique channel key."""
        return f"{symbol}:{interval}"
    
    async def create_channel(self, symbol: str, interval: str, indicators: List[str] = None) -> str:
        """Create a new market data channel."""
        channel_key = self._get_channel_key(symbol, interval)
        
        async with self._lock:
            if channel_key in self.channels:
                logger.info(f"Channel {channel_key} already exists")
                return channel_key
            
            # Initialize channel state
            channel_state = ChannelState(
                symbol=symbol,
                interval=interval,
                candles=[],
                indicators={},
                last_update=int(time.time() * 1000)
            )
            
            # Initialize indicator buffers
            if indicators:
                for indicator_spec in indicators:
                    indicator_name = indicator_spec.split('(')[0]  # Extract name from "RSI(14)"
                    if indicator_name in self.indicator_registry.indicators:
                        channel_state.indicators[indicator_spec] = []
            
            self.channels[channel_key] = channel_state
            
            # Create channel config
            config = ChannelConfig(
                symbol=symbol,
                interval=interval,
                indicators=indicators or [],
                buffer_size=10000
            )
            self.channel_configs[channel_key] = config
            
            logger.info(f"Created channel {channel_key} with indicators: {indicators}")
            return channel_key
    
    async def subscribe(self, client_id: str, symbol: str, interval: str, indicators: List[str] = None) -> str:
        """Subscribe client to a market data channel."""
        channel_key = await self.create_channel(symbol, interval, indicators)
        
        async with self._lock:
            # Add client to channel subscribers
            if channel_key not in self.subscribers:
                self.subscribers[channel_key] = set()
            self.subscribers[channel_key].add(client_id)
            
            # Track client subscriptions
            if client_id not in self.subscribers:
                self.subscribers[client_id] = set()
            self.subscribers[client_id].add(channel_key)
            
            # Update subscriber count
            self.channels[channel_key].subscriber_count = len(self.subscribers[channel_key])
            
            logger.info(f"Client {client_id} subscribed to {channel_key}")
            return channel_key
    
    async def unsubscribe(self, client_id: str, symbol: str, interval: str):
        """Unsubscribe client from a market data channel."""
        channel_key = self._get_channel_key(symbol, interval)
        
        async with self._lock:
            if channel_key in self.subscribers:
                self.subscribers[channel_key].discard(client_id)
                self.channels[channel_key].subscriber_count = len(self.subscribers[channel_key])
                
                # Clean up empty channels
                if not self.subscribers[channel_key]:
                    await self._cleanup_channel(channel_key)
            
            # Remove from client subscriptions
            if client_id in self.subscribers:
                self.subscribers[client_id].discard(channel_key)
            
            logger.info(f"Client {client_id} unsubscribed from {channel_key}")
    
    async def _cleanup_channel(self, channel_key: str):
        """Clean up empty channel."""
        if channel_key in self.channels:
            del self.channels[channel_key]
        if channel_key in self.channel_configs:
            del self.channel_configs[channel_key]
        if channel_key in self.subscribers:
            del self.subscribers[channel_key]
        logger.info(f"Cleaned up empty channel {channel_key}")
    
    async def update_candle(self, symbol: str, interval: str, candle: Candle):
        """Update channel with new candle data."""
        channel_key = self._get_channel_key(symbol, interval)
        
        async with self._lock:
            if channel_key not in self.channels:
                logger.warning(f"Received candle for non-existent channel {channel_key}")
                return
            
            channel = self.channels[channel_key]
            
            # Update candle buffer (ring buffer behavior)
            channel.candles.append(candle)
            if len(channel.candles) > channel_configs[channel_key].buffer_size:
                channel.candles.pop(0)
            
            # Update indicators incrementally
            await self._update_indicators(channel_key, candle)
            
            # Update timestamp
            channel.last_update = int(time.time() * 1000)
            
            logger.debug(f"Updated channel {channel_key} with candle at {candle.t}")
    
    async def _update_indicators(self, channel_key: str, candle: Candle):
        """Update indicators for a channel with new candle."""
        channel = self.channels[channel_key]
        config = self.channel_configs[channel_key]
        
        for indicator_spec in config.indicators:
            try:
                # Parse indicator specification (e.g., "RSI(14)")
                indicator_name = indicator_spec.split('(')[0]
                params_str = indicator_spec.split('(')[1].rstrip(')') if '(' in indicator_spec else ""
                params = [float(p.strip()) for p in params_str.split(',')] if params_str else []
                
                # Get indicator from registry
                indicator_class = self.indicator_registry.get_indicator(indicator_name)
                if not indicator_class:
                    logger.warning(f"Unknown indicator: {indicator_name}")
                    continue
                
                # Create indicator instance if not exists
                if indicator_spec not in channel.indicators:
                    channel.indicators[indicator_spec] = []
                
                # Compute indicator value
                indicator_buffer = channel.indicators[indicator_spec]
                
                # Convert candles to pandas Series for indicator computation
                import pandas as pd
                if len(channel.candles) >= indicator_class.min_lookback:
                    # Get recent candles for indicator computation
                    recent_candles = channel.candles[-indicator_class.min_lookback:]
                    close_prices = [c.c for c in recent_candles]
                    
                    # Compute indicator value
                    indicator_value = indicator_class.compute(close_prices, *params)
                    
                    # Create indicator point
                    point = IndicatorPoint(
                        t=candle.t,
                        value=indicator_value
                    )
                    
                    # Update indicator buffer
                    indicator_buffer.append(point)
                    if len(indicator_buffer) > config.buffer_size:
                        indicator_buffer.pop(0)
                    
                    logger.debug(f"Updated {indicator_spec} = {indicator_value} for {channel_key}")
                
            except Exception as e:
                logger.error(f"Error updating indicator {indicator_spec}: {e}")
    
    async def get_snapshot(self, symbol: str, interval: str) -> Optional[Snapshot]:
        """Get current snapshot of channel data."""
        channel_key = self._get_channel_key(symbol, interval)
        
        async with self._lock:
            if channel_key not in self.channels:
                return None
            
            channel = self.channels[channel_key]
            
            return Snapshot(
                symbol=symbol,
                interval=interval,
                candles=channel.candles.copy(),
                indicators={k: v.copy() for k, v in channel.indicators.items()},
                timestamp=channel.last_update
            )
    
    async def get_channel_state(self, symbol: str, interval: str) -> Optional[ChannelState]:
        """Get current channel state."""
        channel_key = self._get_channel_key(symbol, interval)
        return self.channels.get(channel_key)
    
    async def get_active_channels(self) -> List[str]:
        """Get list of active channel keys."""
        async with self._lock:
            return list(self.channels.keys())
    
    async def get_subscriber_count(self, symbol: str, interval: str) -> int:
        """Get number of subscribers for a channel."""
        channel_key = self._get_channel_key(symbol, interval)
        if channel_key in self.channels:
            return self.channels[channel_key].subscriber_count
        return 0


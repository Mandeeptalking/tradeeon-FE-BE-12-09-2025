"""
Indicator Engine - Main Orchestrator

Manages indicator calculations, WebSocket subscriptions, and API endpoints.
Provides incremental computation with proper event handling.
"""

from typing import Dict, List, Optional, Callable, Any, Tuple
import asyncio
import time
import logging
from dataclasses import dataclass, field
from ..core.ring_buffer import RingBufferStore, NormalizedKline
from ..core.base_indicator import BaseIndicator, IndicatorResult
from ..core.registry import IndicatorRegistry

logger = logging.getLogger(__name__)


@dataclass
class StreamSubscription:
    """WebSocket stream subscription"""
    symbol: str
    timeframe: str
    indicators: List[str] = field(default_factory=list)
    max_bars: int = 1000
    created_at: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)


@dataclass
class IndicatorInstance:
    """Running indicator instance"""
    indicator: BaseIndicator
    symbol: str
    timeframe: str
    created_at: float = field(default_factory=time.time)
    last_result: Optional[IndicatorResult] = None


class IndicatorEngine:
    """
    Main Indicator Engine
    
    Orchestrates:
    - Ring buffer storage for kline data
    - Indicator calculations and caching
    - WebSocket subscriptions and streaming
    - REST API data serving
    """
    
    def __init__(self, buffer_size: int = 1000):
        self.buffer_store = RingBufferStore(buffer_size)
        self.registry = IndicatorRegistry()
        
        # Active indicator instances keyed by (symbol, timeframe, indicator_id)
        self.indicators: Dict[Tuple[str, str, str], IndicatorInstance] = {}
        
        # WebSocket subscriptions
        self.subscriptions: Dict[str, StreamSubscription] = {}
        
        # Event callbacks
        self.on_tick_callbacks: List[Callable] = []
        self.on_bar_close_callbacks: List[Callable] = []
        
        # Performance tracking
        self.stats = {
            'total_ticks': 0,
            'total_bars': 0,
            'indicator_calculations': 0,
            'last_reset': time.time()
        }
    
    def register_indicator(self, indicator_id: str, indicator_class: type, **params) -> str:
        """Register an indicator type in the registry"""
        return self.registry.register(indicator_id, indicator_class, **params)
    
    def create_indicator_instance(
        self, 
        symbol: str, 
        timeframe: str, 
        indicator_id: str,
        **params
    ) -> str:
        """Create a running indicator instance"""
        if not self.registry.is_registered(indicator_id):
            raise ValueError(f"Indicator {indicator_id} not registered")
        
        # Create indicator instance
        indicator_class = self.registry.get_indicator_class(indicator_id)
        indicator = indicator_class(**params)
        
        # Store instance
        instance_key = (symbol, timeframe, indicator_id)
        self.indicators[instance_key] = IndicatorInstance(
            indicator=indicator,
            symbol=symbol,
            timeframe=timeframe
        )
        
        logger.info(f"Created indicator instance: {symbol}_{timeframe}_{indicator_id}")
        return f"{symbol}_{timeframe}_{indicator_id}"
    
    def process_kline(self, symbol: str, timeframe: str, kline: NormalizedKline) -> Dict[str, Any]:
        """
        Process new kline data through buffer and indicators
        
        Returns:
            Dict with events and results for WebSocket streaming
        """
        # Add to ring buffer
        is_new_bar, is_update = self.buffer_store.add_kline(symbol, timeframe, kline)
        
        # Process through indicators
        indicator_results = {}
        stream_key = (symbol, timeframe)
        
        for (sym, tf, indicator_id), instance in self.indicators.items():
            if sym == symbol and tf == timeframe:
                try:
                    if is_new_bar:
                        # New bar - finalize previous calculation
                        result = instance.indicator.finalize_bar(kline)
                    else:
                        # Same bar - update calculation
                        result = instance.indicator.update_last(kline)
                    
                    instance.last_result = result
                    indicator_results[indicator_id] = result
                    self.stats['indicator_calculations'] += 1
                    
                except Exception as e:
                    logger.error(f"Error calculating {indicator_id} for {symbol}_{timeframe}: {e}")
        
        # Update stats
        if is_new_bar:
            self.stats['total_bars'] += 1
        if is_update:
            self.stats['total_ticks'] += 1
        
        # Prepare event data
        event_data = {
            'symbol': symbol,
            'timeframe': timeframe,
            'kline': kline.to_dict(),
            'is_new_bar': is_new_bar,
            'is_update': is_update,
            'indicators': {
                indicator_id: result.get_all_values() 
                for indicator_id, result in indicator_results.items()
                if result.is_complete
            },
            'timestamp': kline.timestamp
        }
        
        # Trigger callbacks
        if is_update:
            for callback in self.on_tick_callbacks:
                try:
                    callback(event_data)
                except Exception as e:
                    logger.error(f"Error in tick callback: {e}")
        
        if is_new_bar:
            for callback in self.on_bar_close_callbacks:
                try:
                    callback(event_data)
                except Exception as e:
                    logger.error(f"Error in bar close callback: {e}")
        
        return event_data
    
    def get_chart_snapshot(
        self, 
        symbol: str, 
        timeframe: str, 
        indicators: List[str] = None,
        max_bars: int = 1000
    ) -> Dict[str, Any]:
        """
        Get chart snapshot for REST API
        
        Returns data formatted for KLineCharts consumption
        """
        indicators = indicators or []
        
        # Get kline data from buffer
        klines = self.buffer_store.get_all_klines(symbol, timeframe)
        
        # Limit to max_bars
        if len(klines) > max_bars:
            klines = klines[-max_bars:]
        
        # Format klines for KLineCharts
        chart_data = []
        for kline in klines:
            chart_data.append({
                'timestamp': kline.timestamp,
                'open': kline.open,
                'high': kline.high,
                'low': kline.low,
                'close': kline.close,
                'volume': kline.volume
            })
        
        # Get indicator data
        indicator_data = {}
        for indicator_id in indicators:
            instance_key = (symbol, timeframe, indicator_id)
            if instance_key in self.indicators:
                instance = self.indicators[instance_key]
                
                # Get indicator values for all klines
                indicator_values = []
                temp_indicator = instance.indicator.__class__(**instance.indicator.calc_params)
                
                for i, kline in enumerate(klines):
                    if i == 0:
                        result = temp_indicator.finalize_bar(kline)
                    else:
                        result = temp_indicator.finalize_bar(kline)
                    
                    # Mask warmup period
                    if temp_indicator.is_warmed_up():
                        indicator_values.append({
                            'timestamp': kline.timestamp,
                            **result.get_all_values()
                        })
                    else:
                        # During warmup - return null values
                        null_values = {name: None for name in result.outputs.keys()}
                        indicator_values.append({
                            'timestamp': kline.timestamp,
                            **null_values
                        })
                
                indicator_data[indicator_id] = {
                    'name': instance.indicator.get_name(),
                    'spec': instance.indicator.get_spec().__dict__,
                    'values': indicator_values
                }
        
        return {
            'symbol': symbol,
            'timeframe': timeframe,
            'klines': chart_data,
            'indicators': indicator_data,
            'total_bars': len(chart_data),
            'timestamp': int(time.time() * 1000),
            'warmup_masked': True
        }
    
    def add_subscription(
        self, 
        subscription_id: str,
        symbol: str,
        timeframe: str, 
        indicators: List[str] = None,
        max_bars: int = 1000
    ):
        """Add WebSocket subscription"""
        indicators = indicators or []
        
        self.subscriptions[subscription_id] = StreamSubscription(
            symbol=symbol,
            timeframe=timeframe,
            indicators=indicators,
            max_bars=max_bars
        )
        
        # Ensure indicator instances exist
        for indicator_id in indicators:
            instance_key = (symbol, timeframe, indicator_id)
            if instance_key not in self.indicators:
                # Create with default params - should be configurable
                self.create_indicator_instance(symbol, timeframe, indicator_id)
        
        logger.info(f"Added subscription: {subscription_id} for {symbol}_{timeframe}")
    
    def remove_subscription(self, subscription_id: str):
        """Remove WebSocket subscription"""
        if subscription_id in self.subscriptions:
            del self.subscriptions[subscription_id]
            logger.info(f"Removed subscription: {subscription_id}")
    
    def get_subscription_data(self, subscription_id: str, event_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get filtered data for specific subscription"""
        if subscription_id not in self.subscriptions:
            return None
        
        subscription = self.subscriptions[subscription_id]
        
        # Check if this event matches subscription
        if (event_data['symbol'] != subscription.symbol or 
            event_data['timeframe'] != subscription.timeframe):
            return None
        
        # Filter indicators
        filtered_indicators = {}
        for indicator_id in subscription.indicators:
            if indicator_id in event_data['indicators']:
                filtered_indicators[indicator_id] = event_data['indicators'][indicator_id]
        
        # Update activity
        subscription.last_activity = time.time()
        
        return {
            'subscription_id': subscription_id,
            'symbol': event_data['symbol'],
            'timeframe': event_data['timeframe'],
            'kline': event_data['kline'],
            'indicators': filtered_indicators,
            'is_new_bar': event_data['is_new_bar'],
            'is_update': event_data['is_update'],
            'timestamp': event_data['timestamp']
        }
    
    def cleanup_inactive_subscriptions(self, max_age_seconds: int = 3600):
        """Remove inactive subscriptions"""
        current_time = time.time()
        inactive_ids = []
        
        for sub_id, subscription in self.subscriptions.items():
            if current_time - subscription.last_activity > max_age_seconds:
                inactive_ids.append(sub_id)
        
        for sub_id in inactive_ids:
            self.remove_subscription(sub_id)
        
        return len(inactive_ids)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get engine performance statistics"""
        uptime = time.time() - self.stats['last_reset']
        
        return {
            **self.stats,
            'uptime_seconds': uptime,
            'active_buffers': len(self.buffer_store.buffers),
            'active_indicators': len(self.indicators),
            'active_subscriptions': len(self.subscriptions),
            'ticks_per_second': self.stats['total_ticks'] / max(uptime, 1),
            'bars_per_second': self.stats['total_bars'] / max(uptime, 1),
            'calculations_per_second': self.stats['indicator_calculations'] / max(uptime, 1)
        }
    
    def reset_stats(self):
        """Reset performance statistics"""
        self.stats = {
            'total_ticks': 0,
            'total_bars': 0,
            'indicator_calculations': 0,
            'last_reset': time.time()
        }


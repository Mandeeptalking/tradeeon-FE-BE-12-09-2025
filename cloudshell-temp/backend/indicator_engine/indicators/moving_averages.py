"""
Moving Average Indicators

Implements EMA (Exponential Moving Average) and SMA (Simple Moving Average)
with proper incremental computation and parity with reference implementations.
"""

from typing import Dict, Any, List
import math
from ..core.base_indicator import (
    BaseIndicator, MovingAverageBase, IndicatorResult, IndicatorOutput, 
    IndicatorSpec, SeriesType, PaneType
)
from ..core.ring_buffer import NormalizedKline


class EMA(MovingAverageBase):
    """
    Exponential Moving Average (EMA)
    
    Formula: EMA = (Price * Alpha) + (Previous_EMA * (1 - Alpha))
    Alpha = 2 / (Period + 1)
    
    Incremental computation optimized for real-time updates.
    """
    
    def __init__(self, period: int = 14, source: str = "close"):
        super().__init__(period=period, source=source)
        self.alpha = 2.0 / (period + 1)
        self.ema_value: float = 0.0
        self.is_initialized = False
    
    def _create_spec(self) -> IndicatorSpec:
        return IndicatorSpec(
            name="EMA",
            version="1.0.0",
            pane=PaneType.PRICE,
            series_type=SeriesType.LINE,
            calc_params={"period": 14, "source": "close"},
            outputs=["ema"],
            figures={
                "ema": {
                    "color": "#FF9800",
                    "lineWidth": 2,
                    "style": "solid"
                }
            },
            warmup=1,  # EMA can start calculating from first bar
            autoscale=True,
            tooltip=f"Exponential Moving Average ({self.period})"
        )
    
    def update_last(self, kline: NormalizedKline) -> IndicatorResult:
        """Update EMA with new tick data (same timestamp)"""
        current_price = self._get_source_value(kline)
        
        if not self.is_initialized:
            # First value - use current price as initial EMA
            self.ema_value = current_price
            self.is_initialized = True
        else:
            # Update EMA: EMA = (Price * Alpha) + (Previous_EMA * (1 - Alpha))
            self.ema_value = (current_price * self.alpha) + (self.ema_value * (1 - self.alpha))
        
        self.last_timestamp = kline.timestamp
        
        return IndicatorResult(
            outputs={
                "ema": IndicatorOutput(
                    name="ema",
                    value=self.ema_value,
                    timestamp=kline.timestamp,
                    series_type=SeriesType.LINE,
                    color="#FF9800"
                )
            },
            timestamp=kline.timestamp,
            is_complete=self.is_initialized
        )
    
    def finalize_bar(self, kline: NormalizedKline) -> IndicatorResult:
        """Finalize EMA calculation when bar closes"""
        # For EMA, finalize is same as update since it's already calculated
        result = self.update_last(kline)
        
        if self.is_initialized:
            self.warmup_count += 1
        
        return result
    
    def reset(self):
        """Reset EMA state"""
        super().reset()
        self.ema_value = 0.0
        self.is_initialized = False


class SMA(MovingAverageBase):
    """
    Simple Moving Average (SMA)
    
    Formula: SMA = Sum(Prices) / Period
    
    Uses efficient sliding window for incremental computation.
    """
    
    def __init__(self, period: int = 14, source: str = "close"):
        super().__init__(period=period, source=source)
        self.price_sum = 0.0
        self.current_value: float = 0.0
    
    def _create_spec(self) -> IndicatorSpec:
        return IndicatorSpec(
            name="SMA",
            version="1.0.0", 
            pane=PaneType.PRICE,
            series_type=SeriesType.LINE,
            calc_params={"period": 14, "source": "close"},
            outputs=["sma"],
            figures={
                "sma": {
                    "color": "#2196F3",
                    "lineWidth": 2,
                    "style": "solid"
                }
            },
            warmup=self.period,
            autoscale=True,
            tooltip=f"Simple Moving Average ({self.period})"
        )
    
    def update_last(self, kline: NormalizedKline) -> IndicatorResult:
        """Update SMA with new tick data (same timestamp)"""
        current_price = self._get_source_value(kline)
        
        if len(self.values) == 0:
            # First value
            self.values.append(current_price)
            self.price_sum = current_price
        else:
            # Update last value (same timestamp)
            old_price = self.values[-1]
            self.values[-1] = current_price
            self.price_sum = self.price_sum - old_price + current_price
        
        # Calculate SMA
        if len(self.values) >= self.period:
            self.current_value = self.price_sum / self.period
            is_complete = True
        else:
            self.current_value = self.price_sum / len(self.values)  # Partial SMA
            is_complete = False
        
        self.last_timestamp = kline.timestamp
        
        return IndicatorResult(
            outputs={
                "sma": IndicatorOutput(
                    name="sma",
                    value=self.current_value if len(self.values) > 0 else None,
                    timestamp=kline.timestamp,
                    series_type=SeriesType.LINE,
                    color="#2196F3"
                )
            },
            timestamp=kline.timestamp,
            is_complete=is_complete
        )
    
    def finalize_bar(self, kline: NormalizedKline) -> IndicatorResult:
        """Finalize SMA calculation when bar closes"""
        current_price = self._get_source_value(kline)
        
        if len(self.values) == 0:
            # First bar
            self.values.append(current_price)
            self.price_sum = current_price
        elif kline.timestamp == self.last_timestamp:
            # Update existing bar
            old_price = self.values[-1]
            self.values[-1] = current_price
            self.price_sum = self.price_sum - old_price + current_price
        else:
            # New bar
            self.values.append(current_price)
            self.price_sum += current_price
            
            # Remove oldest value if we exceed period
            if len(self.values) > self.period:
                old_price = self.values.pop(0)
                self.price_sum -= old_price
        
        # Calculate final SMA
        if len(self.values) >= self.period:
            self.current_value = self.price_sum / self.period
            is_complete = True
            self.warmup_count = max(self.warmup_count, self.period)
        else:
            self.current_value = self.price_sum / len(self.values)
            is_complete = False
            self.warmup_count = len(self.values)
        
        self.last_timestamp = kline.timestamp
        
        return IndicatorResult(
            outputs={
                "sma": IndicatorOutput(
                    name="sma",
                    value=self.current_value,
                    timestamp=kline.timestamp,
                    series_type=SeriesType.LINE,
                    color="#2196F3"
                )
            },
            timestamp=kline.timestamp,
            is_complete=is_complete
        )


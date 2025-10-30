"""
Indicator Engine - Backend Module

A high-performance indicator calculation engine with:
- Ring-buffer storage keyed by (symbol, timeframe)  
- Indicator registry with comprehensive specifications
- Incremental compute interface for real-time updates
- Built-in indicators (EMA, SMA, RSI, MACD, etc.)

Usage:
    from indicator_engine import IndicatorEngine, IndicatorRegistry
    from indicator_engine.indicators import EMA, SMA
    
    engine = IndicatorEngine()
    engine.register_indicator('EMA_14', EMA(period=14))
    engine.update_tick('BTCUSDT', '1m', candle_data)
"""

from .core.engine import IndicatorEngine
from .core.registry import IndicatorRegistry, IndicatorSpec
from .core.ring_buffer import RingBufferStore
from .core.base_indicator import BaseIndicator, IndicatorOutput
from .indicators.moving_averages import EMA, SMA

__version__ = "1.0.0"
__all__ = [
    "IndicatorEngine",
    "IndicatorRegistry", 
    "IndicatorSpec",
    "RingBufferStore",
    "BaseIndicator",
    "IndicatorOutput",
    "EMA",
    "SMA"
]


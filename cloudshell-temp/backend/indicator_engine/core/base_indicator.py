"""
Base Indicator Interface for Indicator Engine

Defines the common interface and data structures for all technical indicators.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
import math
from .ring_buffer import NormalizedKline


class SeriesType(Enum):
    """Types of indicator series"""
    LINE = "line"
    HISTOGRAM = "histogram" 
    AREA = "area"
    CANDLESTICK = "candlestick"
    SCATTER = "scatter"


class PaneType(Enum):
    """Chart pane types"""
    PRICE = "price"  # Same pane as price chart
    SEPARATE = "separate"  # Separate pane below price
    OVERLAY = "overlay"  # Overlay on price chart


@dataclass
class IndicatorOutput:
    """Single output value from an indicator"""
    name: str  # Output name (e.g., "ema", "upper", "lower")
    value: Optional[float]  # Calculated value (None if not enough data)
    timestamp: int  # Timestamp of the calculation
    series_type: SeriesType = SeriesType.LINE
    color: str = "#2196F3"  # Default blue
    
    def is_valid(self) -> bool:
        """Check if output has valid value"""
        return self.value is not None and not math.isnan(self.value)


@dataclass 
class IndicatorResult:
    """Complete result from an indicator calculation"""
    outputs: Dict[str, IndicatorOutput]  # Named outputs
    timestamp: int  # Timestamp of calculation
    is_complete: bool = True  # False if not enough data for calculation
    
    def get_value(self, name: str) -> Optional[float]:
        """Get value by output name"""
        output = self.outputs.get(name)
        return output.value if output else None
    
    def get_all_values(self) -> Dict[str, float]:
        """Get all valid values as dict"""
        return {
            name: output.value 
            for name, output in self.outputs.items() 
            if output.is_valid()
        }


@dataclass
class IndicatorSpec:
    """Indicator specification for registry"""
    name: str  # Indicator name (e.g., "EMA")
    version: str  # Version (e.g., "1.0.0")
    pane: PaneType  # Chart pane type
    series_type: SeriesType  # Default series type
    calc_params: Dict[str, Any]  # Calculation parameters
    outputs: List[str]  # Output names
    figures: Dict[str, Dict[str, Any]]  # Figure specifications for each output
    warmup: int  # Minimum bars needed for valid calculation
    autoscale: bool = True  # Auto-scale the pane
    tooltip: str = ""  # Tooltip description
    
    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate calculation parameters"""
        for key, default_value in self.calc_params.items():
            if key not in params:
                continue
            param_value = params[key]
            if not isinstance(param_value, type(default_value)):
                return False
        return True


class BaseIndicator(ABC):
    """
    Base class for all technical indicators
    
    Implements incremental computation interface:
    - update_last(): Update calculation with new tick data (same timestamp)
    - finalize_bar(): Finalize calculation when bar closes (new timestamp)
    """
    
    def __init__(self, **calc_params):
        self.calc_params = calc_params
        self.spec = self._create_spec()
        self.warmup_count = 0
        self.last_timestamp = 0
        self._validate_params()
    
    @abstractmethod
    def _create_spec(self) -> IndicatorSpec:
        """Create indicator specification"""
        pass
    
    def _validate_params(self):
        """Validate calculation parameters against spec"""
        if not self.spec.validate_params(self.calc_params):
            raise ValueError(f"Invalid parameters for {self.spec.name}: {self.calc_params}")
    
    @abstractmethod
    def update_last(self, kline: NormalizedKline) -> IndicatorResult:
        """
        Update indicator with new tick data (same timestamp)
        
        This is called when the current candle is being updated with new price/volume.
        Should update the most recent calculation without adding new data points.
        
        Args:
            kline: Updated kline data for current timestamp
            
        Returns:
            IndicatorResult with updated values
        """
        pass
    
    @abstractmethod  
    def finalize_bar(self, kline: NormalizedKline) -> IndicatorResult:
        """
        Finalize calculation when bar closes (new timestamp)
        
        This is called when a candle closes and a new candle starts.
        Should finalize the previous calculation and prepare for next bar.
        
        Args:
            kline: Final kline data for the closed bar
            
        Returns:
            IndicatorResult with finalized values
        """
        pass
    
    @abstractmethod
    def reset(self):
        """Reset indicator state"""
        pass
    
    def is_warmed_up(self) -> bool:
        """Check if indicator has enough data for valid calculations"""
        return self.warmup_count >= self.spec.warmup
    
    def get_spec(self) -> IndicatorSpec:
        """Get indicator specification"""
        return self.spec
    
    def get_name(self) -> str:
        """Get indicator name"""
        return self.spec.name
    
    def get_outputs(self) -> List[str]:
        """Get output names"""
        return self.spec.outputs
    
    def get_warmup_period(self) -> int:
        """Get warmup period"""
        return self.spec.warmup


class MovingAverageBase(BaseIndicator):
    """Base class for moving average indicators"""
    
    def __init__(self, period: int = 14, source: str = "close", **kwargs):
        self.period = period
        self.source = source
        self.values: List[float] = []
        super().__init__(period=period, source=source, **kwargs)
    
    def _get_source_value(self, kline: NormalizedKline) -> float:
        """Extract source value from kline"""
        if self.source == "close":
            return kline.close
        elif self.source == "open":
            return kline.open
        elif self.source == "high":
            return kline.high
        elif self.source == "low":
            return kline.low
        elif self.source == "hl2":
            return (kline.high + kline.low) / 2
        elif self.source == "hlc3":
            return (kline.high + kline.low + kline.close) / 3
        elif self.source == "ohlc4":
            return (kline.open + kline.high + kline.low + kline.close) / 4
        else:
            return kline.close
    
    def reset(self):
        """Reset moving average state"""
        self.values = []
        self.warmup_count = 0
        self.last_timestamp = 0


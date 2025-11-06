"""Indicator registry - single source of truth for all technical indicators."""

import logging
from typing import Dict, List, Optional, Type, Any
from abc import ABC, abstractmethod
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class Indicator(ABC):
    """Base class for all technical indicators."""
    
    def __init__(self, name: str, min_lookback: int, outputs: List[str], pane: str = "main"):
        self.name = name
        self.min_lookback = min_lookback
        self.outputs = outputs
        self.pane = pane  # "main" or "sub"
    
    @abstractmethod
    def compute(self, data: List[float], *params) -> Any:
        """Compute indicator value(s) from price data."""
        pass
    
    def validate_params(self, params: List[float]) -> bool:
        """Validate indicator parameters."""
        return True


class RSIIndicator(Indicator):
    """Relative Strength Index indicator."""
    
    def __init__(self):
        super().__init__("RSI", 15, ["rsi"], "sub")
    
    def compute(self, data: List[float], period: float = 14) -> float:
        """Compute RSI value."""
        if len(data) < self.min_lookback:
            return None
        
        series = pd.Series(data)
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=int(period)).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=int(period)).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None


class EMAIndicator(Indicator):
    """Exponential Moving Average indicator."""
    
    def __init__(self):
        super().__init__("EMA", 2, ["ema"], "main")
    
    def compute(self, data: List[float], period: float = 20) -> float:
        """Compute EMA value."""
        if len(data) < self.min_lookback:
            return None
        
        series = pd.Series(data)
        ema = series.ewm(span=int(period)).mean()
        
        return float(ema.iloc[-1]) if not pd.isna(ema.iloc[-1]) else None


class SMAIndicator(Indicator):
    """Simple Moving Average indicator."""
    
    def __init__(self):
        super().__init__("SMA", 2, ["sma"], "main")
    
    def compute(self, data: List[float], period: float = 20) -> float:
        """Compute SMA value."""
        if len(data) < self.min_lookback:
            return None
        
        series = pd.Series(data)
        sma = series.rolling(window=int(period)).mean()
        
        return float(sma.iloc[-1]) if not pd.isna(sma.iloc[-1]) else None


class MACDIndicator(Indicator):
    """MACD indicator."""
    
    def __init__(self):
        super().__init__("MACD", 27, ["macd", "signal", "histogram"], "sub")
    
    def compute(self, data: List[float], fast: float = 12, slow: float = 26, signal: float = 9) -> Dict[str, float]:
        """Compute MACD values."""
        if len(data) < self.min_lookback:
            return None
        
        series = pd.Series(data)
        
        # Calculate EMAs
        ema_fast = series.ewm(span=int(fast)).mean()
        ema_slow = series.ewm(span=int(slow)).mean()
        
        # MACD line
        macd = ema_fast - ema_slow
        
        # Signal line
        signal_line = macd.ewm(span=int(signal)).mean()
        
        # Histogram
        histogram = macd - signal_line
        
        return {
            "macd": float(macd.iloc[-1]) if not pd.isna(macd.iloc[-1]) else None,
            "signal": float(signal_line.iloc[-1]) if not pd.isna(signal_line.iloc[-1]) else None,
            "histogram": float(histogram.iloc[-1]) if not pd.isna(histogram.iloc[-1]) else None
        }


class BollingerBandsIndicator(Indicator):
    """Bollinger Bands indicator."""
    
    def __init__(self):
        super().__init__("BB", 21, ["upper", "middle", "lower"], "main")
    
    def compute(self, data: List[float], period: float = 20, std_dev: float = 2) -> Dict[str, float]:
        """Compute Bollinger Bands values."""
        if len(data) < self.min_lookback:
            return None
        
        series = pd.Series(data)
        
        # Middle band (SMA)
        middle = series.rolling(window=int(period)).mean()
        
        # Standard deviation
        std = series.rolling(window=int(period)).std()
        
        # Upper and lower bands
        upper = middle + (std * std_dev)
        lower = middle - (std * std_dev)
        
        return {
            "upper": float(upper.iloc[-1]) if not pd.isna(upper.iloc[-1]) else None,
            "middle": float(middle.iloc[-1]) if not pd.isna(middle.iloc[-1]) else None,
            "lower": float(lower.iloc[-1]) if not pd.isna(lower.iloc[-1]) else None
        }


class IndicatorRegistry:
    """Registry for all available technical indicators."""
    
    def __init__(self):
        self.indicators: Dict[str, Indicator] = {}
        self._initialized = False
    
    async def initialize(self):
        """Initialize the indicator registry."""
        if self._initialized:
            return
        
        # Register built-in indicators
        self.register_indicator(RSIIndicator())
        self.register_indicator(EMAIndicator())
        self.register_indicator(SMAIndicator())
        self.register_indicator(MACDIndicator())
        self.register_indicator(BollingerBandsIndicator())
        
        self._initialized = True
        logger.info(f"Indicator registry initialized with {len(self.indicators)} indicators")
    
    def register_indicator(self, indicator: Indicator):
        """Register a new indicator."""
        self.indicators[indicator.name] = indicator
        logger.debug(f"Registered indicator: {indicator.name}")
    
    def get_indicator(self, name: str) -> Optional[Indicator]:
        """Get indicator by name."""
        return self.indicators.get(name)
    
    def list_indicators(self) -> List[str]:
        """List all available indicator names."""
        return list(self.indicators.keys())
    
    def get_indicator_info(self, name: str) -> Optional[Dict[str, Any]]:
        """Get indicator information."""
        indicator = self.get_indicator(name)
        if not indicator:
            return None
        
        return {
            "name": indicator.name,
            "min_lookback": indicator.min_lookback,
            "outputs": indicator.outputs,
            "pane": indicator.pane
        }
    
    def parse_indicator_spec(self, spec: str) -> Optional[Dict[str, Any]]:
        """Parse indicator specification string (e.g., 'RSI(14)', 'EMA(20)')."""
        try:
            if '(' in spec:
                name = spec.split('(')[0].strip()
                params_str = spec.split('(')[1].rstrip(')').strip()
                params = [float(p.strip()) for p in params_str.split(',')] if params_str else []
            else:
                name = spec.strip()
                params = []
            
            indicator = self.get_indicator(name)
            if not indicator:
                return None
            
            return {
                "indicator": indicator,
                "params": params,
                "spec": spec
            }
        
        except Exception as e:
            logger.error(f"Error parsing indicator spec '{spec}': {e}")
            return None
    
    def validate_indicator_spec(self, spec: str) -> bool:
        """Validate indicator specification."""
        parsed = self.parse_indicator_spec(spec)
        return parsed is not None
    
    def compute_indicator(self, spec: str, data: List[float]) -> Any:
        """Compute indicator value from specification and data."""
        parsed = self.parse_indicator_spec(spec)
        if not parsed:
            return None
        
        indicator = parsed["indicator"]
        params = parsed["params"]
        
        try:
            return indicator.compute(data, *params)
        except Exception as e:
            logger.error(f"Error computing indicator {spec}: {e}")
            return None


# Global registry instance
registry = IndicatorRegistry()


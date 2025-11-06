"""Pydantic models for indicator engine."""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union
from enum import Enum

class IndicatorCategory(str, Enum):
    TREND = "trend"
    MOMENTUM = "momentum"
    VOLATILITY = "volatility"
    VOLUME = "volume"
    CUSTOM = "custom"

class IndicatorType(str, Enum):
    OVERLAY = "overlay"  # Plots on main chart
    OSCILLATOR = "oscillator"  # Plots in sub-pane

class PriceData(BaseModel):
    """Price data structure."""
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float

class IndicatorConfig(BaseModel):
    """Indicator configuration."""
    id: str
    name: str
    description: str
    category: IndicatorCategory
    type: IndicatorType
    talib_function: str
    parameters: Dict[str, Any]
    outputs: List[str]
    colors: Dict[str, str]
    level_lines: Optional[Dict[str, float]] = None

class IndicatorRequest(BaseModel):
    """Request to calculate indicator."""
    symbol: str
    interval: str
    indicator: str
    parameters: Dict[str, Union[int, float]]
    data_points: int = Field(default=1000, ge=10, le=5000)

class IndicatorResponse(BaseModel):
    """Response with calculated indicator values."""
    symbol: str
    interval: str
    indicator: str
    parameters: Dict[str, Union[int, float]]
    values: List[Dict[str, Union[int, float]]]
    success: bool
    error: Optional[str] = None

class RealtimeSubscription(BaseModel):
    """Real-time indicator subscription."""
    symbol: str
    interval: str
    indicator: str
    parameters: Dict[str, Union[int, float]]

class IndicatorUpdate(BaseModel):
    """Real-time indicator update."""
    symbol: str
    interval: str
    indicator: str
    timestamp: int
    values: Dict[str, float]



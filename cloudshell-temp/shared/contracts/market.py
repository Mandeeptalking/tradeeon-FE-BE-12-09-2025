"""Market data contracts - single source of truth for candles and indicators."""

from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from enum import Enum


class Candle(BaseModel):
    """Standardized candle/bar data."""
    t: int = Field(..., description="Timestamp in milliseconds")
    o: float = Field(..., description="Open price")
    h: float = Field(..., description="High price") 
    l: float = Field(..., description="Low price")
    c: float = Field(..., description="Close price")
    v: float = Field(..., description="Volume")
    x: bool = Field(..., description="Is candle closed/final")
    
    class Config:
        json_encoders = {
            datetime: lambda v: int(v.timestamp() * 1000)
        }


class IndicatorPoint(BaseModel):
    """Single point in an indicator time series."""
    t: int = Field(..., description="Timestamp in milliseconds")
    value: Union[float, Dict[str, float]] = Field(..., description="Indicator value(s)")
    
    class Config:
        json_encoders = {
            datetime: lambda v: int(v.timestamp() * 1000)
        }


class Snapshot(BaseModel):
    """Initial snapshot of candles + computed indicators."""
    type: str = Field(default="snapshot", description="Message type")
    symbol: str = Field(..., description="Trading symbol")
    interval: str = Field(..., description="Time interval")
    candles: List[Candle] = Field(..., description="Historical candles")
    indicators: Dict[str, List[IndicatorPoint]] = Field(..., description="Indicator time series")
    timestamp: int = Field(..., description="Snapshot timestamp")


class IndicatorUpdate(BaseModel):
    """Incremental indicator update."""
    type: str = Field(default="indicators:update", description="Message type")
    symbol: str = Field(..., description="Trading symbol")
    interval: str = Field(..., description="Time interval")
    values: Dict[str, IndicatorPoint] = Field(..., description="Latest indicator values")
    timestamp: int = Field(..., description="Update timestamp")


class KlineUpdate(BaseModel):
    """New candle data (form/close)."""
    type: str = Field(default="kline", description="Message type")
    symbol: str = Field(..., description="Trading symbol")
    interval: str = Field(..., description="Time interval")
    candle: Candle = Field(..., description="New candle data")
    timestamp: int = Field(..., description="Update timestamp")


class StreamMessage(BaseModel):
    """Union type for all stream messages."""
    message: Union[Snapshot, IndicatorUpdate, KlineUpdate]
    
    class Config:
        discriminator = "type"


"""Pydantic models for API responses and validation."""

from datetime import datetime
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, validator


class TimeSeriesPoint(BaseModel):
    """A single time series data point."""
    t: datetime = Field(..., description="Timestamp in ISO format")
    value: float = Field(..., description="Numeric value")


class CorrelationResponse(BaseModel):
    """Response model for correlation endpoint."""
    symbolA: str = Field(..., description="First symbol")
    symbolB: str = Field(..., description="Second symbol") 
    interval: str = Field(..., description="Time interval")
    window: int = Field(..., description="Rolling window size")
    latest: Optional[float] = Field(None, description="Latest correlation value")
    series: List[TimeSeriesPoint] = Field(default_factory=list, description="Time series data")
    
    class Config:
        json_schema_extra = {
            "example": {
                "symbolA": "BTCUSDT",
                "symbolB": "ETHUSDT", 
                "interval": "1h",
                "window": 100,
                "latest": 0.83,
                "series": [
                    {"t": "2025-09-17T10:00:00Z", "value": 0.81},
                    {"t": "2025-09-17T11:00:00Z", "value": 0.83}
                ]
            }
        }


class SpreadZScoreResponse(BaseModel):
    """Response model for spread z-score endpoint."""
    symbolA: str = Field(..., description="First symbol (numerator)")
    symbolB: str = Field(..., description="Second symbol (denominator)")
    interval: str = Field(..., description="Time interval")
    window: int = Field(..., description="Rolling window size")
    method: Literal["ratio", "ols"] = Field(..., description="Spread calculation method")
    latest: Optional[float] = Field(None, description="Latest z-score value")
    meta: Dict[str, Any] = Field(default_factory=dict, description="Method-specific metadata")
    series: List[TimeSeriesPoint] = Field(default_factory=list, description="Time series data")
    
    class Config:
        json_schema_extra = {
            "example": {
                "symbolA": "ETHUSDT",
                "symbolB": "BTCUSDT",
                "interval": "1h", 
                "window": 100,
                "method": "ols",
                "latest": 2.35,
                "meta": {"beta": 1.15},
                "series": [
                    {"t": "2025-09-17T10:00:00Z", "value": 2.1},
                    {"t": "2025-09-17T11:00:00Z", "value": 2.35}
                ]
            }
        }


class CorrelationParams(BaseModel):
    """Validation model for correlation endpoint parameters."""
    symbolA: str = Field(..., min_length=1, description="First trading symbol")
    symbolB: str = Field(..., min_length=1, description="Second trading symbol")
    interval: str = Field(default="1h", description="Time interval")
    limit: int = Field(default=1000, ge=10, le=1000, description="Number of candles to fetch")
    window: int = Field(default=100, ge=5, le=500, description="Rolling window size")
    cache: bool = Field(default=False, description="Enable caching")
    
    @validator('symbolA', 'symbolB')
    def validate_symbols(cls, v):
        """Validate symbol format."""
        if not v or not v.strip():
            raise ValueError("Symbol cannot be empty")
        return v.strip().upper()
    
    @validator('symbolB')
    def symbols_must_be_different(cls, v, values):
        """Ensure symbols are different."""
        if 'symbolA' in values and v == values['symbolA']:
            raise ValueError("Symbols must be different")
        return v


class SpreadZScoreParams(BaseModel):
    """Validation model for spread z-score endpoint parameters."""
    symbolA: str = Field(..., min_length=1, description="First trading symbol (numerator)")
    symbolB: str = Field(..., min_length=1, description="Second trading symbol (denominator)")
    interval: str = Field(default="1h", description="Time interval")
    limit: int = Field(default=1000, ge=10, le=1000, description="Number of candles to fetch")
    window: int = Field(default=100, ge=5, le=500, description="Rolling window size")
    method: Literal["ratio", "ols"] = Field(default="ols", description="Spread calculation method")
    cache: bool = Field(default=False, description="Enable caching")
    
    @validator('symbolA', 'symbolB')
    def validate_symbols(cls, v):
        """Validate symbol format."""
        if not v or not v.strip():
            raise ValueError("Symbol cannot be empty")
        return v.strip().upper()
    
    @validator('symbolB')
    def symbols_must_be_different(cls, v, values):
        """Ensure symbols are different."""
        if 'symbolA' in values and v == values['symbolA']:
            raise ValueError("Symbols must be different")
        return v

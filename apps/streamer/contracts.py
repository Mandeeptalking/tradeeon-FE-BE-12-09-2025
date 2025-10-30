"""Streamer-specific contracts."""

from pydantic import BaseModel, Field
from typing import Dict, List, Set, Optional
from shared.contracts.market import Candle, IndicatorPoint


class ChannelConfig(BaseModel):
    """Configuration for a market data channel."""
    symbol: str = Field(..., description="Trading symbol")
    interval: str = Field(..., description="Time interval")
    indicators: List[str] = Field(default_factory=list, description="Requested indicators")
    buffer_size: int = Field(default=10000, description="Ring buffer size")
    subscribers: Set[str] = Field(default_factory=set, description="Active subscriber IDs")


class ChannelState(BaseModel):
    """Current state of a market data channel."""
    symbol: str = Field(..., description="Trading symbol")
    interval: str = Field(..., description="Time interval")
    candles: List[Candle] = Field(default_factory=list, description="Ring buffer of candles")
    indicators: Dict[str, List[IndicatorPoint]] = Field(default_factory=dict, description="Indicator buffers")
    last_update: int = Field(..., description="Last update timestamp")
    subscriber_count: int = Field(default=0, description="Number of active subscribers")


class StreamRequest(BaseModel):
    """WebSocket stream request."""
    symbol: str = Field(..., description="Trading symbol")
    interval: str = Field(..., description="Time interval")
    indicators: Optional[str] = Field(None, description="Comma-separated indicator list")
    client_id: Optional[str] = Field(None, description="Client identifier")


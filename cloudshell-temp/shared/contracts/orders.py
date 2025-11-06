"""Order and execution contracts."""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum


class OrderType(str, Enum):
    """Order types."""
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"


class OrderStatus(str, Enum):
    """Order status."""
    PENDING = "pending"
    SUBMITTED = "submitted"
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"


class OrderIntent(BaseModel):
    """Order intent from bot to broker."""
    bot_id: str = Field(..., description="Bot identifier")
    run_id: Optional[str] = Field(None, description="Bot run identifier")
    symbol: str = Field(..., description="Trading symbol")
    side: str = Field(..., description="Order side (buy/sell)")
    qty: float = Field(..., description="Order quantity")
    order_type: OrderType = Field(..., description="Order type")
    price: Optional[float] = Field(None, description="Limit price")
    stop_price: Optional[float] = Field(None, description="Stop price")
    time_in_force: str = Field(default="GTC", description="Time in force")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional order data")
    
    class Config:
        use_enum_values = True


class ExecutionReport(BaseModel):
    """Order execution report from broker."""
    order_id: str = Field(..., description="Internal order ID")
    exchange_order_id: Optional[str] = Field(None, description="Exchange order ID")
    bot_id: str = Field(..., description="Bot identifier")
    run_id: Optional[str] = Field(None, description="Bot run identifier")
    symbol: str = Field(..., description="Trading symbol")
    side: str = Field(..., description="Order side")
    status: OrderStatus = Field(..., description="Order status")
    qty: float = Field(..., description="Order quantity")
    filled_qty: float = Field(default=0.0, description="Filled quantity")
    avg_price: Optional[float] = Field(None, description="Average fill price")
    limit_price: Optional[float] = Field(None, description="Limit price")
    stop_price: Optional[float] = Field(None, description="Stop price")
    fees: Optional[float] = Field(None, description="Total fees")
    created_at: int = Field(..., description="Order creation timestamp")
    updated_at: int = Field(..., description="Last update timestamp")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional execution data")
    
    class Config:
        use_enum_values = True


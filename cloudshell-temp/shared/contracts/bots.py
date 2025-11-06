"""Bot management contracts."""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum


class BotStatus(str, Enum):
    """Bot status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"
    PAUSED = "paused"


class BotType(str, Enum):
    """Bot types."""
    DCA = "dca"
    RSI_AMO = "rsi_amo"
    ARBITRAGE = "arbitrage"
    GRID = "grid"
    MOMENTUM = "momentum"


class BotConfig(BaseModel):
    """Bot configuration."""
    bot_id: str = Field(..., description="Unique bot identifier")
    user_id: str = Field(..., description="User identifier")
    name: str = Field(..., description="Bot name")
    bot_type: BotType = Field(..., description="Bot type")
    status: BotStatus = Field(default=BotStatus.INACTIVE, description="Bot status")
    symbol: str = Field(..., description="Primary trading symbol")
    interval: str = Field(default="1m", description="Time interval")
    config: Dict[str, Any] = Field(..., description="Bot-specific configuration")
    required_capital: Optional[float] = Field(None, description="Required capital")
    max_position_size: Optional[float] = Field(None, description="Maximum position size")
    risk_per_trade: Optional[float] = Field(None, description="Risk per trade %")
    created_at: int = Field(..., description="Creation timestamp")
    updated_at: int = Field(..., description="Last update timestamp")
    
    class Config:
        use_enum_values = True


class BotRun(BaseModel):
    """Bot run instance."""
    run_id: str = Field(..., description="Unique run identifier")
    bot_id: str = Field(..., description="Bot identifier")
    user_id: str = Field(..., description="User identifier")
    status: BotStatus = Field(..., description="Run status")
    started_at: int = Field(..., description="Start timestamp")
    ended_at: Optional[int] = Field(None, description="End timestamp")
    total_trades: int = Field(default=0, description="Total trades executed")
    total_pnl: float = Field(default=0.0, description="Total P&L")
    max_drawdown: float = Field(default=0.0, description="Maximum drawdown")
    sharpe_ratio: Optional[float] = Field(None, description="Sharpe ratio")
    meta: Optional[Dict[str, Any]] = Field(None, description="Run metadata")
    
    class Config:
        use_enum_values = True


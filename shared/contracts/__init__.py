"""Shared contracts across all Tradeeon services."""

from .market import Candle, Snapshot, IndicatorUpdate, IndicatorPoint
from .signals import Signal, SignalType, SignalSide
from .orders import OrderIntent, OrderType, OrderStatus, ExecutionReport
from .bots import BotConfig, BotRun, BotStatus

__all__ = [
    # Market contracts
    "Candle", "Snapshot", "IndicatorUpdate", "IndicatorPoint",
    # Signal contracts  
    "Signal", "SignalType", "SignalSide",
    # Order contracts
    "OrderIntent", "OrderType", "OrderStatus", "ExecutionReport",
    # Bot contracts
    "BotConfig", "BotRun", "BotStatus",
]


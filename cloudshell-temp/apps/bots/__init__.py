"""DCA Bot execution services."""

from .dca_executor import DCABotExecutor, execute_dca_bot
from .regime_detector import MarketRegimeDetector
from .support_resistance import SupportResistanceDetector
from .profit_taker import ProfitTaker
from .emergency_brake import EmergencyBrake
from .bot_runner import BotRunner
from .bot_manager import BotManager, bot_manager
from .market_data import MarketDataService
from .paper_trading import PaperTradingEngine

__all__ = [
    "DCABotExecutor",
    "execute_dca_bot",
    "MarketRegimeDetector",
    "SupportResistanceDetector",
    "ProfitTaker",
    "EmergencyBrake",
    "BotRunner",
    "BotManager",
    "bot_manager",
    "MarketDataService",
    "PaperTradingEngine"
]


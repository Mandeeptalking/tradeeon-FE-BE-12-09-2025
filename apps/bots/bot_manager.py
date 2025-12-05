"""Bot Manager - Manages running bot instances."""

import logging
import sys
import os
from typing import Dict, Optional
from bot_runner import BotRunner

# Add db_service to path
sys.path.insert(0, os.path.dirname(__file__))
try:
    from .db_service import db_service
except ImportError:
    db_service = None

logger = logging.getLogger(__name__)


class BotManager:
    """Manages active bot runners."""
    
    _instance = None
    _runners: Dict[str, BotRunner] = {}
    _bot_configs: Dict[str, dict] = {}  # Store bot configs by bot_id (fallback)
    _run_ids: Dict[str, str] = {}  # Map bot_id to run_id
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BotManager, cls).__new__(cls)
        return cls._instance
    
    def store_bot_config(self, bot_id: str, config: dict):
        """Store bot configuration in memory and database."""
        # Always store in memory (for fallback)
        self._bot_configs[bot_id] = config
        logger.info(f"Stored bot config for {bot_id} (in memory)")
        
    def get_bot_config(self, bot_id: str) -> Optional[dict]:
        """Get stored bot configuration from memory or database."""
        # First try memory
        if bot_id in self._bot_configs:
            return self._bot_configs[bot_id]
        
        # Fallback to database if available
        if db_service:
            bot_data = db_service.get_bot(bot_id)
            if bot_data:
                return bot_data.get("config")
        
        return None
    
    def set_run_id(self, bot_id: str, run_id: str):
        """Store run_id for a bot."""
        self._run_ids[bot_id] = run_id
        
    def get_run_id(self, bot_id: str) -> Optional[str]:
        """Get run_id for a bot."""
        return self._run_ids.get(bot_id)
        
    def get_runner(self, bot_id: str) -> Optional[BotRunner]:
        """Get active bot runner."""
        return self._runners.get(bot_id)
        
    def add_runner(self, bot_id: str, runner: BotRunner):
        """Add bot runner to active runners."""
        self._runners[bot_id] = runner
        logger.info(f"Added runner for bot {bot_id}")
        
    def remove_runner(self, bot_id: str):
        """Remove bot runner."""
        if bot_id in self._runners:
            del self._runners[bot_id]
            logger.info(f"Removed runner for bot {bot_id}")
            
    def list_active_bots(self) -> list:
        """List all active bot IDs."""
        return list(self._runners.keys())


# Global instance
bot_manager = BotManager()


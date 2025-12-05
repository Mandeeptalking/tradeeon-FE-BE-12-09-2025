"""Bot Runner - Continuously runs DCA bots with paper trading."""

import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import sys
import os

# Add paths
bots_path = os.path.dirname(__file__)
if bots_path not in sys.path:
    sys.path.insert(0, bots_path)

from .dca_executor import DCABotExecutor
try:
    from .db_service import db_service
except ImportError:
    db_service = None

logger = logging.getLogger(__name__)


class BotRunner:
    """Runs DCA bots continuously."""
    
    def __init__(self, bot_config: Dict[str, Any], paper_trading: bool = True,
                 initial_balance: float = 10000.0, interval_seconds: int = 60,
                 bot_id: Optional[str] = None, user_id: Optional[str] = None, run_id: Optional[str] = None):
        self.bot_config = bot_config
        self.paper_trading = paper_trading
        self.initial_balance = initial_balance
        self.interval_seconds = interval_seconds
        self.bot_id = bot_id
        self.user_id = user_id
        self.run_id = run_id
        
        self.executor: Optional[DCABotExecutor] = None
        self.running = False
        self.task: Optional[asyncio.Task] = None
        self.iteration_count = 0
        self.total_trades = 0
        
    async def start(self):
        """Start the bot runner."""
        if self.running:
            logger.warning("Bot runner already running")
            return
            
        logger.info(f"Starting bot runner for: {self.bot_config.get('botName')}")
        
        # Create bot run in database if bot_id and user_id are available
        if not self.run_id and self.bot_id and self.user_id and db_service:
            self.run_id = db_service.create_bot_run(
                bot_id=self.bot_id,
                user_id=self.user_id,
                status="running"
            )
            if self.run_id:
                logger.info(f"Created bot run {self.run_id} in database")
            
            # Update bot status to running
            db_service.update_bot_status(self.bot_id, "running")
        
        # Initialize executor
        self.executor = DCABotExecutor(
            self.bot_config,
            paper_trading=self.paper_trading,
            initial_balance=self.initial_balance
        )
        # Pass run_id and user_id to executor for database operations
        if self.run_id:
            self.executor.run_id = self.run_id
        if self.user_id:
            self.executor.user_id = self.user_id
        if self.bot_id:
            self.executor.bot_id = self.bot_id
            
        await self.executor.initialize()
        
        self.running = True
        
        # Start execution loop
        self.task = asyncio.create_task(self._run_loop())
        logger.info("✅ Bot runner started")
        
    async def stop(self):
        """Stop the bot runner."""
        if not self.running:
            return
            
        logger.info("Stopping bot runner...")
        self.running = False
        
        # Update bot run status in database
        if self.run_id and db_service:
            stats = await self.executor.get_statistics() if self.executor else {}
            db_service.update_bot_run(
                run_id=self.run_id,
                status="stopped",
                total_trades=self.total_trades,
                total_pnl=stats.get("total_pnl", 0)
            )
            
        # Update bot status
        if self.bot_id and db_service:
            db_service.update_bot_status(self.bot_id, "stopped")
        
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
                
        if self.executor:
            await self.executor.cleanup()
            
        logger.info("Bot runner stopped")
        
    async def _run_loop(self):
        """Main execution loop."""
        while self.running:
            try:
                self.iteration_count += 1
                logger.info(f"🔄 Execution iteration {self.iteration_count} for {self.bot_config.get('botName')}")
                
                await self.executor.execute_once()
                
                # Get updated statistics
                stats = await self.executor.get_statistics()
                
                # Update bot run statistics in database periodically
                if self.run_id and db_service and self.iteration_count % 5 == 0:
                    db_service.update_bot_run(
                        run_id=self.run_id,
                        total_trades=self.total_trades,
                        total_pnl=stats.get("total_pnl", 0)
                    )
                
                # Log statistics periodically
                if self.iteration_count % 5 == 0 and stats:
                    logger.info(f"📊 Statistics: Balance=${stats.get('current_balance', 0):.2f}, "
                              f"Positions={stats.get('open_positions', 0)}, "
                              f"P&L=${stats.get('total_pnl', 0):.2f} ({stats.get('total_return_pct', 0):.2f}%)")
                
                # Wait before next iteration
                await asyncio.sleep(self.interval_seconds)
                
            except asyncio.CancelledError:
                logger.info("Bot runner cancelled")
                break
            except Exception as e:
                logger.error(f"Error in bot execution loop: {e}", exc_info=True)
                await asyncio.sleep(self.interval_seconds)  # Wait before retry
                
    async def get_status(self) -> Dict[str, Any]:
        """Get current bot status."""
        if not self.executor:
            return {"status": "not_initialized"}
            
        stats = await self.executor.get_statistics()
        stats.update({
            "status": self.executor.status,
            "paused": self.executor.paused,
            "running": self.running
        })
        
        return stats


"""
Bot Execution Service - Manages running bot executors.
"""

import asyncio
import logging
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
import sys
import os

# Add paths
bots_path = os.path.dirname(__file__)
if bots_path not in sys.path:
    sys.path.insert(0, bots_path)

try:
    from dca_executor import DCABotExecutor
    from db_service import db_service
except ImportError as e:
    logging.error(f"Failed to import required modules: {e}")
    DCABotExecutor = None
    db_service = None

logger = logging.getLogger(__name__)


class BotExecutionService:
    """
    Service to manage running bot executors.
    
    This service:
    - Tracks running bots
    - Manages bot executor lifecycle
    - Handles bot execution loops
    - Updates bot status in database
    """
    
    def __init__(self):
        self.running_bots: Dict[str, DCABotExecutor] = {}
        self.bot_tasks: Dict[str, asyncio.Task] = {}
        self.bot_configs: Dict[str, Dict[str, Any]] = {}
        self.execution_intervals: Dict[str, int] = {}  # seconds
        
    async def start_bot(
        self, 
        bot_id: str, 
        bot_config: Dict[str, Any],
        mode: str = "paper",
        initial_balance: float = 10000.0,
        interval_seconds: int = 60,
        run_id: Optional[str] = None
    ) -> bool:
        """
        Start a bot in paper or live mode.
        
        Args:
            bot_id: Bot identifier
            bot_config: Bot configuration dictionary
            mode: "paper" or "live"
            initial_balance: Initial balance for paper trading
            interval_seconds: Execution interval in seconds
            
        Returns:
            True if started successfully, False otherwise
        """
        if bot_id in self.running_bots:
            logger.warning(f"Bot {bot_id} is already running")
            return False
        
        if not DCABotExecutor:
            logger.error("DCABotExecutor not available")
            return False
        
        try:
            # Validate mode
            if mode not in ["paper", "live"]:
                logger.error(f"Invalid mode: {mode}. Must be 'paper' or 'live'")
                return False
            
            if mode == "live":
                logger.error("Live trading not implemented yet")
                return False
            
            # Create bot executor
            logger.info(f"Creating DCA bot executor for {bot_id} in {mode} mode")
            executor = DCABotExecutor(
                bot_config=bot_config,
                paper_trading=True,  # Always paper for now
                initial_balance=initial_balance
            )
            
            # Set bot_id, user_id, and run_id if available
            executor.bot_id = bot_id
            executor.user_id = bot_config.get("user_id")
            executor.run_id = run_id  # Set run_id on executor
            
            # Update paper trading engine with run_id
            if executor.trading_engine:
                executor.trading_engine.run_id = run_id
            
            # Initialize executor
            await executor.initialize()
            
            # Store executor and config
            self.running_bots[bot_id] = executor
            self.bot_configs[bot_id] = bot_config
            self.execution_intervals[bot_id] = interval_seconds
            
            # Start execution loop in background
            task = asyncio.create_task(self._execute_bot_loop(bot_id, interval_seconds))
            self.bot_tasks[bot_id] = task
            
            # Update bot status in database
            if db_service:
                db_service.update_bot_status(bot_id, "running")
            
            logger.info(f"✅ Bot {bot_id} started successfully in {mode} mode")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start bot {bot_id}: {e}", exc_info=True)
            # Cleanup on error
            if bot_id in self.running_bots:
                del self.running_bots[bot_id]
            if bot_id in self.bot_configs:
                del self.bot_configs[bot_id]
            if bot_id in self.bot_tasks:
                self.bot_tasks[bot_id].cancel()
                del self.bot_tasks[bot_id]
            return False
    
    async def _execute_bot_loop(self, bot_id: str, interval_seconds: int):
        """Execute bot in a loop with specified interval."""
        executor = self.running_bots.get(bot_id)
        if not executor:
            logger.error(f"Executor not found for bot {bot_id}")
            return
        
        logger.info(f"Starting execution loop for bot {bot_id} (interval: {interval_seconds}s)")
        
        try:
            iteration_count = 0
            last_execution_time = None
            next_execution_time = None
            
            while bot_id in self.running_bots:
                try:
                    iteration_count += 1
                    last_execution_time = datetime.now()
                    
                    # Log iteration start
                    if db_service and executor.bot_id and executor.user_id:
                        db_service.log_event(
                            bot_id=executor.bot_id,
                            run_id=getattr(executor, 'run_id', None),
                            user_id=executor.user_id,
                            event_type="iteration_start",
                            event_category="system",
                            message=f"Bot execution iteration #{iteration_count}",
                            details={"iteration": iteration_count, "interval_seconds": interval_seconds}
                        )
                    
                    # Execute one iteration
                    await executor.execute_once()
                    
                    # Log iteration complete
                    if db_service and executor.bot_id and executor.user_id:
                        db_service.log_event(
                            bot_id=executor.bot_id,
                            run_id=getattr(executor, 'run_id', None),
                            user_id=executor.user_id,
                            event_type="iteration_complete",
                            event_category="system",
                            message=f"Bot execution iteration #{iteration_count} completed",
                            details={"iteration": iteration_count}
                        )
                    
                    # Calculate next execution time
                    next_execution_time = last_execution_time + timedelta(seconds=interval_seconds)
                    
                    # Store execution times on executor for status queries
                    executor.last_execution_time = last_execution_time
                    executor.next_execution_time = next_execution_time
                    executor.iteration_count = iteration_count
                    
                    # Wait for next iteration
                    await asyncio.sleep(interval_seconds)
                    
                except asyncio.CancelledError:
                    logger.info(f"Execution loop for bot {bot_id} cancelled")
                    break
                except Exception as e:
                    logger.error(f"Error in execution loop for bot {bot_id}: {e}", exc_info=True)
                    # Continue loop after error (don't stop bot)
                    await asyncio.sleep(interval_seconds)
                    
        except Exception as e:
            logger.error(f"Fatal error in execution loop for bot {bot_id}: {e}", exc_info=True)
        finally:
            # Cleanup
            if bot_id in self.running_bots:
                del self.running_bots[bot_id]
            if bot_id in self.bot_configs:
                del self.bot_configs[bot_id]
            if bot_id in self.execution_intervals:
                del self.execution_intervals[bot_id]
            
            # Only update status to "stopped" if bot was actually running/paused
            # Don't change status if bot was "inactive" or already "stopped"
            if db_service:
                try:
                    bot_data = db_service.get_bot(bot_id)
                    current_status = bot_data.get("status") if bot_data else None
                    # Only update to stopped if bot was running or paused
                    if current_status in ["running", "paused"]:
                        db_service.update_bot_status(bot_id, "stopped")
                        logger.info(f"Updated bot {bot_id} status from {current_status} to stopped (execution loop ended)")
                    else:
                        logger.debug(f"Bot {bot_id} status is {current_status}, not updating to stopped")
                except Exception as status_error:
                    logger.error(f"Failed to check/update bot status in finally block: {status_error}")
            
            logger.info(f"Execution loop for bot {bot_id} stopped")
    
    async def stop_bot(self, bot_id: str) -> bool:
        """Stop a running bot."""
        if bot_id not in self.running_bots:
            logger.warning(f"Bot {bot_id} is not running")
            return False
        
        try:
            # Cancel execution task
            if bot_id in self.bot_tasks:
                task = self.bot_tasks[bot_id]
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                del self.bot_tasks[bot_id]
            
            # Remove executor
            if bot_id in self.running_bots:
                del self.running_bots[bot_id]
            
            # Cleanup configs
            if bot_id in self.bot_configs:
                del self.bot_configs[bot_id]
            if bot_id in self.execution_intervals:
                del self.execution_intervals[bot_id]
            
            # Update status in database
            if db_service:
                db_service.update_bot_status(bot_id, "stopped")
            
            logger.info(f"✅ Bot {bot_id} stopped successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop bot {bot_id}: {e}", exc_info=True)
            return False
    
    async def pause_bot(self, bot_id: str) -> bool:
        """Pause a running bot."""
        if bot_id not in self.running_bots:
            logger.warning(f"Bot {bot_id} is not running")
            return False
        
        try:
            executor = self.running_bots[bot_id]
            executor.paused = True
            
            # Update status in database
            if db_service:
                db_service.update_bot_status(bot_id, "paused")
            
            logger.info(f"✅ Bot {bot_id} paused")
            return True
            
        except Exception as e:
            logger.error(f"Failed to pause bot {bot_id}: {e}", exc_info=True)
            return False
    
    async def resume_bot(self, bot_id: str) -> bool:
        """Resume a paused bot."""
        if bot_id not in self.running_bots:
            logger.warning(f"Bot {bot_id} is not running")
            return False
        
        try:
            executor = self.running_bots[bot_id]
            executor.paused = False
            
            # Update status in database
            if db_service:
                db_service.update_bot_status(bot_id, "running")
            
            logger.info(f"✅ Bot {bot_id} resumed")
            return True
            
        except Exception as e:
            logger.error(f"Failed to resume bot {bot_id}: {e}", exc_info=True)
            return False
    
    def get_bot_status(self, bot_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a bot."""
        executor = self.running_bots.get(bot_id)
        if not executor:
            return None
        
        return {
            "bot_id": bot_id,
            "status": executor.status,
            "paused": executor.paused,
            "paper_trading": executor.paper_trading,
            "running": True
        }
    
    def is_running(self, bot_id: str) -> bool:
        """Check if a bot is currently running."""
        return bot_id in self.running_bots


# Global instance
bot_execution_service = BotExecutionService()



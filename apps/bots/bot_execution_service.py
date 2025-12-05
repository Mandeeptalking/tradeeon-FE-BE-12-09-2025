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
            
            # For live mode, verify user has Binance connection
            # Note: Actual API key validation happens in TradingService._initialize_binance_client()
            # This is just a preliminary check
            if mode == "live":
                try:
                    import sys
                    import os
                    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))
                    from clients.supabase_client import supabase
                    
                    if supabase:
                        user_id = bot_config.get("user_id")
                        connection_id = bot_config.get("config", {}).get("connection_id")
                        connection_nickname = bot_config.get("config", {}).get("connection_nickname")
                        
                        # Build query
                        query = supabase.table("exchange_keys").select("id, nickname, status").eq(
                            "user_id", user_id
                        ).eq("exchange", "binance").eq("is_active", True)
                        
                        if connection_id:
                            query = query.eq("id", connection_id)
                        elif connection_nickname:
                            query = query.eq("nickname", connection_nickname)
                        
                        connection_result = query.execute()
                        
                        if not connection_result.data:
                            error_msg = "No active Binance connection found."
                            if connection_id:
                                error_msg += f" Connection ID '{connection_id}' not found or inactive."
                            elif connection_nickname:
                                error_msg += f" Connection with nickname '{connection_nickname}' not found or inactive."
                            error_msg += " Please connect your Binance account in the Connections page."
                            logger.error(f"User {user_id} does not have active Binance connection")
                            raise RuntimeError(error_msg)
                        
                        # Log which connection will be used
                        conn = connection_result.data[0]
                        logger.info(
                            f"Found Binance connection for live trading: "
                            f"ID={conn.get('id')}, Nickname={conn.get('nickname', 'N/A')}, "
                            f"Status={conn.get('status', 'unknown')}"
                        )
                    else:
                        logger.warning("Supabase not available, cannot verify Binance connection")
                except RuntimeError:
                    # Re-raise RuntimeError as-is (these are user-friendly messages)
                    raise
                except Exception as e:
                    logger.error(f"Error verifying Binance connection: {e}", exc_info=True)
                    raise RuntimeError(f"Failed to verify Binance connection: {str(e)}")
            
            # Create bot executor
            logger.info(f"Creating DCA bot executor for {bot_id} in {mode} mode")
            executor = DCABotExecutor(
                bot_config=bot_config,
                paper_trading=(mode == "paper"),
                initial_balance=initial_balance
            )
            
            # Set bot_id, user_id, and run_id if available
            executor.bot_id = bot_id
            executor.user_id = bot_config.get("user_id")
            executor.run_id = run_id  # Set run_id on executor
            
            # Update trading service with run_id (unified for both paper and live)
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
            error_type = type(e).__name__
            error_message = str(e)
            logger.error(f"Failed to start bot {bot_id}: {error_type}: {error_message}", exc_info=True)
            logger.error(f"   Bot config keys: {list(bot_config.keys()) if bot_config else 'None'}")
            logger.error(f"   Bot ID: {bot_id}, User ID: {bot_config.get('user_id') if bot_config else 'None'}")
            # Cleanup on error
            if bot_id in self.running_bots:
                del self.running_bots[bot_id]
            if bot_id in self.bot_configs:
                del self.bot_configs[bot_id]
            if bot_id in self.bot_tasks:
                self.bot_tasks[bot_id].cancel()
                del self.bot_tasks[bot_id]
            # Re-raise the exception with more context so it can be caught and handled properly
            raise RuntimeError(f"Failed to start bot {bot_id}: {error_message}") from e
    
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
                    
                    # Don't log every iteration - too noisy. Only log significant events (orders, errors, etc.)
                    # Execute one iteration
                    await executor.execute_once()
                    
                    # Calculate next execution time
                    next_execution_time = last_execution_time + timedelta(seconds=interval_seconds)
                    
                    # Store execution times on executor for status queries
                    executor.last_execution_time = last_execution_time
                    executor.next_execution_time = next_execution_time
                    executor.iteration_count = iteration_count
                    
                    # Save state periodically (every 10 iterations or every 10 minutes)
                    if iteration_count % 10 == 0:
                        try:
                            self.save_bot_state(bot_id)
                        except Exception as save_error:
                            logger.warning(f"Failed to save bot state: {save_error}")
                    
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
    
    def save_bot_state(self, bot_id: str) -> bool:
        """
        Save current bot execution state to database.
        
        Args:
            bot_id: Bot identifier
            
        Returns:
            True if saved successfully, False otherwise
        """
        if bot_id not in self.running_bots or not db_service:
            return False
        
        try:
            executor = self.running_bots[bot_id]
            run_id = getattr(executor, 'run_id', None)
            
            # Collect state information
            state = {
                "bot_id": bot_id,
                "run_id": run_id,
                "iteration_count": getattr(executor, 'iteration_count', 0),
                "last_execution_time": getattr(executor, 'last_execution_time', None),
                "next_execution_time": getattr(executor, 'next_execution_time', None),
                "paused": getattr(executor, 'paused', False),
                "interval_seconds": self.execution_intervals.get(bot_id, 60),
                "saved_at": datetime.now().isoformat()
            }
            
            # Get trading engine state if available
            if hasattr(executor, 'trading_engine') and executor.trading_engine:
                state["trading_engine"] = {
                    "balance": executor.trading_engine.get_balance(),
                    "positions": getattr(executor.trading_engine, 'positions', {}),
                }
            
            # Save to database
            return db_service.save_bot_state(bot_id, run_id, state)
        except Exception as e:
            logger.error(f"Failed to save bot state for {bot_id}: {e}", exc_info=True)
            return False
    
    async def restore_bot_from_state(
        self,
        bot_id: str,
        bot_config: Dict[str, Any],
        state: Optional[Dict[str, Any]] = None,
        mode: str = "paper"
    ) -> bool:
        """
        Restore a bot from saved state after server restart.
        
        Args:
            bot_id: Bot identifier
            bot_config: Bot configuration
            state: Saved state dictionary (optional, will load from DB if not provided)
            mode: Trading mode ("paper" or "live")
            
        Returns:
            True if restored successfully, False otherwise
        """
        if bot_id in self.running_bots:
            logger.warning(f"Bot {bot_id} is already running, skipping restore")
            return False
        
        if not DCABotExecutor:
            logger.error("DCABotExecutor not available")
            return False
        
        try:
            # Load state from database if not provided
            if state is None and db_service:
                state = db_service.load_bot_state(bot_id)
            
            # Extract state information (use defaults if state is empty)
            if state is None:
                state = {}
            
            run_id = state.get("run_id")
            interval_seconds = state.get("interval_seconds", 60)
            paused = state.get("paused", False)
            
            # Get initial balance from state or use default (only for paper mode)
            initial_balance = 10000.0
            if mode == "paper" and state.get("trading_engine", {}).get("balance"):
                initial_balance = state["trading_engine"]["balance"]
            
            # Create executor
            logger.info(f"Restoring DCA bot executor for {bot_id} from saved state (mode: {mode})")
            executor = DCABotExecutor(
                bot_config=bot_config,
                paper_trading=(mode == "paper"),
                initial_balance=initial_balance
            )
            
            # Set identifiers
            executor.bot_id = bot_id
            executor.user_id = bot_config.get("user_id")
            executor.run_id = run_id
            
            # Restore state
            executor.iteration_count = state.get("iteration_count", 0)
            executor.paused = paused
            
            # Restore trading engine state if available
            if hasattr(executor, 'trading_engine') and executor.trading_engine:
                trading_state = state.get("trading_engine", {})
                if "positions" in trading_state:
                    executor.trading_engine.positions = trading_state["positions"]
            
            # Initialize executor
            await executor.initialize()
            
            # Store executor and config
            self.running_bots[bot_id] = executor
            self.bot_configs[bot_id] = bot_config
            self.execution_intervals[bot_id] = interval_seconds
            
            # Start execution loop
            task = asyncio.create_task(self._execute_bot_loop(bot_id, interval_seconds))
            self.bot_tasks[bot_id] = task
            
            # Update bot status
            if db_service:
                status = "paused" if paused else "running"
                db_service.update_bot_status(bot_id, status)
            
            logger.info(f"✅ Bot {bot_id} restored from state successfully (status: {'paused' if paused else 'running'})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to restore bot {bot_id} from state: {e}", exc_info=True)
            return False
    
    async def recover_active_bots(self) -> int:
        """
        Recover all active bots from database on startup.
        
        Returns:
            Number of bots successfully recovered
        """
        if not db_service or not db_service.enabled:
            logger.warning("Database service not available, skipping bot recovery")
            return 0
        
        try:
            active_bots = db_service.get_active_bots_for_recovery()
            recovered_count = 0
            
            for bot_data in active_bots:
                bot_id = bot_data.get("bot_id")
                bot_config = bot_data.get("config", {})
                status = bot_data.get("status", "inactive")
                
                if status not in ["running", "paused"]:
                    continue
                
                # Restore bot (will load state internally if needed)
                # Determine mode from bot config or default to paper
                mode = bot_config.get("tradingMode", "paper")
                if mode not in ["paper", "live"]:
                    mode = "paper"  # Default to paper if invalid
                restored = await self.restore_bot_from_state(
                    bot_id=bot_id,
                    bot_config=bot_config,
                    state=None,  # Will load from DB
                    mode=mode
                )
                
                if restored:
                    recovered_count += 1
                    logger.info(f"✅ Recovered bot {bot_id} (status: {status})")
                else:
                    logger.warning(f"⚠️  Failed to recover bot {bot_id}, updating status to stopped")
                    db_service.update_bot_status(bot_id, "stopped")
            
            logger.info(f"✅ Bot recovery complete: {recovered_count}/{len(active_bots)} bots recovered")
            return recovered_count
            
        except Exception as e:
            logger.error(f"Error during bot recovery: {e}", exc_info=True)
            return 0
    
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
    
    async def get_bot_status_info(self, bot_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed status information for a bot."""
        if bot_id not in self.running_bots:
            return None
        
        executor = self.running_bots.get(bot_id)
        if not executor:
            return None
        
        interval_seconds = self.execution_intervals.get(bot_id, 60)
        
        # Get execution times
        last_execution = getattr(executor, 'last_execution_time', None)
        next_execution = getattr(executor, 'next_execution_time', None)
        iteration_count = getattr(executor, 'iteration_count', 0)
        
        # Get executor statistics
        stats = {}
        try:
            if hasattr(executor, 'get_statistics'):
                if asyncio.iscoroutinefunction(executor.get_statistics):
                    stats = await executor.get_statistics()
                else:
                    stats = executor.get_statistics()
        except Exception as e:
            logger.error(f"Error getting bot statistics: {e}")
            stats = {}
        
        # Calculate time until next execution
        time_until_next = None
        if next_execution:
            time_until_next = max(0, (next_execution - datetime.now()).total_seconds())
        
        # Check if bot is healthy (has executed recently)
        is_healthy = True
        if last_execution:
            time_since_last = (datetime.now() - last_execution).total_seconds()
            # Consider unhealthy if no execution in 3x the interval
            if time_since_last > (interval_seconds * 3):
                is_healthy = False
        
        return {
            "running_in_memory": True,
            "executor_status": executor.status if hasattr(executor, 'status') else "unknown",
            "paused": executor.paused if hasattr(executor, 'paused') else False,
            "interval_seconds": interval_seconds,
            "iteration_count": iteration_count,
            "last_execution_time": last_execution.isoformat() if last_execution else None,
            "next_execution_time": next_execution.isoformat() if next_execution else None,
            "time_until_next_seconds": time_until_next,
            "is_healthy": is_healthy,
            "statistics": stats,
            "last_dca_times": {
                pair: dt.isoformat() if dt else None
                for pair, dt in (executor.last_dca_time.items() if hasattr(executor, 'last_dca_time') else {})
            }
        }


# Global instance
bot_execution_service = BotExecutionService()



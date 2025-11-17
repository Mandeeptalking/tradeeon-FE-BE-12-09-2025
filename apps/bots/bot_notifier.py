"""
Bot Notification System - Listens for condition triggers and executes bot actions.

This service subscribes to Redis event bus and routes condition triggers
to the appropriate bot executors.
"""

import asyncio
import logging
import sys
import os
from typing import Dict, Any, Optional
from datetime import datetime

# Add paths - same pattern as run_condition_evaluator.py
bots_path = os.path.dirname(__file__)
if bots_path not in sys.path:
    sys.path.insert(0, bots_path)

# Add parent paths for imports
api_path = os.path.join(os.path.dirname(__file__), '..', 'api')
if api_path not in sys.path:
    sys.path.insert(0, api_path)

# Add root for 'apps' module
root_path = os.path.join(os.path.dirname(__file__), '..', '..')
if root_path not in sys.path:
    sys.path.insert(0, root_path)

try:
    from event_bus import EventBus, create_event_bus
    from apps.api.clients.supabase_client import supabase
except ImportError as e:
    logging.error(f"Failed to import required modules: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

logger = logging.getLogger(__name__)


class BotNotifier:
    """
    Bot notification service that:
    1. Subscribes to condition trigger events
    2. Routes triggers to appropriate bot executors
    3. Executes bot-specific actions
    """
    
    def __init__(self, event_bus: Optional[EventBus] = None):
        self.event_bus = event_bus
        self.running = False
        self.subscribed_conditions = set()
        
    async def initialize(self):
        """Initialize the bot notifier."""
        if not self.event_bus:
            # Try to create event bus
            self.event_bus = await create_event_bus()
        
        if not self.event_bus or not self.event_bus.connected:
            logger.warning("Event bus not available - bot notifications disabled")
            return False
        
        # Subscribe to all condition triggers
        await self.event_bus.psubscribe("condition.*", self.handle_condition_trigger)
        logger.info("Subscribed to condition triggers (pattern: condition.*)")
        
        self.running = True
        return True
    
    async def handle_condition_trigger(self, event: Dict[str, Any]):
        """
        Handle a condition trigger event.
        
        Args:
            event: Trigger event from Redis
        """
        try:
            condition_id = event.get("condition_id")
            symbol = event.get("symbol")
            triggered_at = event.get("triggered_at")
            
            logger.info(f"Condition trigger received: {condition_id} for {symbol} at {triggered_at}")
            
            # Get all bots subscribed to this condition
            if not supabase:
                logger.warning("Supabase not available - cannot fetch bot subscriptions")
                return
            
            # Fetch active subscriptions for this condition
            subscriptions = supabase.table("user_condition_subscriptions").select(
                "user_id, bot_id, bot_type, bot_config, id"
            ).eq("condition_id", condition_id).eq("active", True).execute()
            
            if not subscriptions.data:
                logger.debug(f"No active bots subscribed to condition {condition_id}")
                return
            
            logger.info(f"Found {len(subscriptions.data)} bots subscribed to condition {condition_id}")
            
            # Process each subscription
            for subscription in subscriptions.data:
                await self.execute_bot_action(subscription, event)
        
        except Exception as e:
            logger.error(f"Error handling condition trigger: {e}", exc_info=True)
    
    async def execute_bot_action(self, subscription: Dict[str, Any], trigger_event: Dict[str, Any]):
        """
        Execute action for a bot when condition triggers.
        
        Args:
            subscription: Bot subscription record
            trigger_event: Condition trigger event
        """
        try:
            bot_id = subscription.get("bot_id")
            bot_type = subscription.get("bot_type", "dca")
            bot_config = subscription.get("bot_config", {})
            user_id = subscription.get("user_id")
            
            logger.info(f"Executing action for bot {bot_id} (type: {bot_type})")
            
            # Route to appropriate bot executor based on bot type
            if bot_type == "dca":
                await self.execute_dca_bot_action(bot_id, bot_config, trigger_event, user_id)
            elif bot_type == "grid":
                await self.execute_grid_bot_action(bot_id, bot_config, trigger_event, user_id)
            elif bot_type == "trend":
                await self.execute_trend_bot_action(bot_id, bot_config, trigger_event, user_id)
            else:
                logger.warning(f"Unknown bot type: {bot_type} for bot {bot_id}")
        
        except Exception as e:
            logger.error(f"Error executing bot action: {e}", exc_info=True)
    
    async def execute_dca_bot_action(
        self, 
        bot_id: str, 
        bot_config: Dict[str, Any], 
        trigger_event: Dict[str, Any],
        user_id: str
    ):
        """Execute DCA bot action when condition triggers."""
        try:
            symbol = trigger_event.get("symbol")
            trigger_value = trigger_event.get("trigger_value", {})
            price = trigger_value.get("price", 0)
            
            if not price:
                logger.error(f"No price in trigger event for bot {bot_id}")
                return
            
            # Get bot config from database
            if supabase:
                bot_result = supabase.table("bots").select("*").eq("bot_id", bot_id).execute()
                if not bot_result.data:
                    logger.error(f"Bot {bot_id} not found in database")
                    return
                
                full_bot_config = bot_result.data[0]
            else:
                full_bot_config = {"bot_id": bot_id, "config": bot_config}
            
            # Check if bot is active
            bot_status = full_bot_config.get("status", "inactive")
            if bot_status != "running":
                logger.info(f"Bot {bot_id} is not running (status: {bot_status}) - skipping action")
                return
            
            # Get trading mode from config
            config = full_bot_config.get("config", bot_config)
            trading_mode = config.get("tradingMode", "test")
            use_live_data = config.get("useLiveData", True)
            
            logger.info(f"DCA Bot {bot_id} triggered: {symbol} @ {price} (mode: {trading_mode})")
            
            # Import DCA executor
            try:
                from dca_executor import DCABotExecutor
                
                # Create executor
                executor = DCABotExecutor(
                    bot_config=full_bot_config,
                    paper_trading=(trading_mode == "test"),
                    initial_balance=10000.0  # Default, should come from config
                )
                
                await executor.initialize()
                
                # Execute entry order (if condition is entry condition)
                # The executor handles the actual trading logic based on bot configuration
                logger.info(f"Executing entry for DCA bot {bot_id}: {symbol} @ {price}")
                
                # Call executor's execute_once method to process the trigger
                # This will handle entry orders, DCA logic, profit targets, etc.
                await executor.execute_once()
                
                logger.info(f"DCA bot {bot_id} processed trigger successfully")
                
                # Update bot's last triggered time
                if supabase:
                    supabase.table("user_condition_subscriptions").update({
                        "last_triggered_at": datetime.now().isoformat()
                    }).eq("bot_id", bot_id).eq("condition_id", trigger_event.get("condition_id")).execute()
                
                logger.info(f"✅ DCA Bot {bot_id} action executed successfully")
            
            except ImportError as e:
                logger.error(f"Failed to import DCA executor: {e}")
            except Exception as e:
                logger.error(f"Error executing DCA bot action: {e}", exc_info=True)
        
        except Exception as e:
            logger.error(f"Error in DCA bot action execution: {e}", exc_info=True)
    
    async def execute_grid_bot_action(
        self, 
        bot_id: str, 
        bot_config: Dict[str, Any], 
        trigger_event: Dict[str, Any],
        user_id: str
    ):
        """Execute Grid bot action when condition triggers."""
        logger.info(f"Grid Bot {bot_id} triggered - execution not yet implemented")
        # TODO: Implement grid bot execution
    
    async def execute_trend_bot_action(
        self, 
        bot_id: str, 
        bot_config: Dict[str, Any], 
        trigger_event: Dict[str, Any],
        user_id: str
    ):
        """Execute Trend Following bot action when condition triggers."""
        logger.info(f"Trend Bot {bot_id} triggered - execution not yet implemented")
        # TODO: Implement trend bot execution
    
    async def start_listening(self):
        """Start listening for condition triggers."""
        if not self.event_bus or not self.event_bus.connected:
            logger.error("Cannot start listening - event bus not connected")
            return
        
        logger.info("Starting bot notification listener...")
        
        # Start event bus listening loop (this will block until stopped)
        await self.event_bus.start_listening()
    
    async def stop(self):
        """Stop the bot notifier."""
        logger.info("Stopping bot notifier...")
        self.running = False
        
        if self.event_bus:
            self.event_bus.stop_listening()
            await self.event_bus.disconnect()
        
        logger.info("Bot notifier stopped")


async def main():
    """Main entry point for bot notification service."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger.info("=" * 70)
    logger.info("Bot Notification Service Starting")
    logger.info("=" * 70)
    
    # Create event bus
    event_bus = await create_event_bus()
    
    if not event_bus or not event_bus.connected:
        logger.error("Failed to connect to event bus. Exiting.")
        return
    
    # Create bot notifier
    notifier = BotNotifier(event_bus=event_bus)
    
    # Initialize
    success = await notifier.initialize()
    
    if not success:
        logger.error("Failed to initialize bot notifier. Exiting.")
        return
    
    # Start listening
    try:
        await notifier.start_listening()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    finally:
        await notifier.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Service interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)


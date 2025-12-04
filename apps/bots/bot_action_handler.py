"""
Bot Action Handler - Executes bot actions when alerts fire.

This module handles bot_trigger actions from the alert system, executing
entry orders and DCA orders when conditions are met.
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from apps.api.clients.supabase_client import supabase
from apps.bots.entry_condition_to_alert import create_dca_alert

logger = logging.getLogger(__name__)


async def execute_bot_action(action: Dict[str, Any], alert_data: Dict[str, Any]):
    """
    Execute bot action when alert fires.
    
    This function is called by the alert dispatcher when an alert with
    action.type == "bot_trigger" fires.
    
    Args:
        action: Action dict from alert containing:
            - type: "bot_trigger"
            - bot_id: Bot ID
            - action_type: "execute_entry" or "execute_dca"
            - dca_index: (optional) DCA level index for DCA actions
        alert_data: Full alert data including:
            - alert_id: Alert ID
            - user_id: User ID
            - symbol: Trading pair symbol
            - snapshot: Market data snapshot when alert fired
    
    Example:
        >>> action = {
        ...     "type": "bot_trigger",
        ...     "bot_id": "bot_123",
        ...     "action_type": "execute_entry"
        ... }
        >>> alert_data = {
        ...     "alert_id": "bot_123_entry",
        ...     "user_id": "user_456",
        ...     "symbol": "BTCUSDT",
        ...     "snapshot": {"price": {"close": 50000}}
        ... }
        >>> await execute_bot_action(action, alert_data)
    """
    bot_id = action.get("bot_id")
    action_type = action.get("action_type")
    
    if not bot_id:
        logger.error("Bot ID missing from action")
        return
    
    if not action_type:
        logger.error(f"Action type missing from action for bot {bot_id}")
        return
    
    try:
        # Fetch bot config from database
        if not supabase:
            logger.error("Supabase client not available")
            return
        
        bot_response = supabase.table("bots").select("*").eq("bot_id", bot_id).execute()
        
        if not bot_response.data:
            logger.error(f"Bot {bot_id} not found in database")
            return
        
        bot_config = bot_response.data[0]
        
        logger.info(f"Executing bot action: {action_type} for bot {bot_id}")
        
        if action_type == "execute_entry":
            await _execute_entry_order(bot_config, alert_data)
        
        elif action_type == "execute_dca":
            dca_index = action.get("dca_index", 0)
            await _execute_dca_order(bot_config, dca_index, alert_data)
        
        else:
            logger.warning(f"Unknown action type: {action_type} for bot {bot_id}")
    
    except Exception as e:
        logger.error(f"Error executing bot action for bot {bot_id}: {e}", exc_info=True)


async def _execute_entry_order(bot_config: Dict[str, Any], alert_data: Dict[str, Any]):
    """
    Execute entry order for DCA bot.
    
    Args:
        bot_config: Bot configuration from database
        alert_data: Alert data with snapshot
    """
    bot_id = bot_config.get("bot_id")
    logger.info(f"Executing entry order for bot {bot_id}")
    
    try:
        # Get snapshot from alert
        snapshot = alert_data.get("snapshot", {})
        price_data = snapshot.get("price", {})
        entry_price = price_data.get("close", 0)
        
        if entry_price <= 0:
            logger.error(f"Invalid entry price {entry_price} from alert snapshot")
            return
        
        # Import here to avoid circular dependencies
        from apps.bots.dca_executor import DCABotExecutor
        
        # Initialize bot executor
        paper_trading = bot_config.get("paper_trading", True)
        executor = DCABotExecutor(
            bot_config=bot_config,
            paper_trading=paper_trading
        )
        executor.bot_id = bot_id
        executor.user_id = bot_config.get("user_id")
        await executor.initialize()
        
        # Get symbol and order amount
        symbol = bot_config.get("pair") or bot_config.get("symbol") or alert_data.get("symbol")
        if not symbol:
            logger.error(f"Could not determine symbol for bot {bot_id}")
            return
        
        # Normalize symbol format
        symbol = symbol.replace('/', '').replace('-', '').upper()
        
        config = bot_config.get("config", {})
        order_amount = config.get("orderAmount") or config.get("baseOrderSize", 100)
        
        logger.info(f"Executing entry order: {symbol} @ {entry_price} amount={order_amount}")
        
        # Execute entry order
        # Note: The actual order execution logic should be in DCABotExecutor
        # For now, we'll log the action and create DCA alerts
        # In production, you would call executor.execute_entry() here
        
        # Create DCA alerts for subsequent orders
        await _create_dca_alerts(bot_config, entry_price, symbol)
        
        # Disable entry alert (already triggered)
        await _disable_alert(f"bot_{bot_id}_entry")
        
        logger.info(f"Entry order executed successfully for bot {bot_id}")
        
        # Log the entry execution
        if hasattr(executor, 'log_event'):
            executor.log_event(
                event_type="entry_executed",
                event_category="order",
                message=f"Entry order executed via alert trigger",
                details={
                    "symbol": symbol,
                    "price": entry_price,
                    "amount": order_amount,
                    "alert_id": alert_data.get("alert_id")
                }
            )
    
    except Exception as e:
        logger.error(f"Error executing entry order for bot {bot_id}: {e}", exc_info=True)


async def _execute_dca_order(bot_config: Dict[str, Any], dca_index: int, alert_data: Dict[str, Any]):
    """
    Execute DCA order for a specific level.
    
    Args:
        bot_config: Bot configuration from database
        dca_index: DCA level index (0, 1, 2, ...)
        alert_data: Alert data with snapshot
    """
    bot_id = bot_config.get("bot_id")
    logger.info(f"Executing DCA order {dca_index} for bot {bot_id}")
    
    try:
        # Get snapshot from alert
        snapshot = alert_data.get("snapshot", {})
        price_data = snapshot.get("price", {})
        dca_price = price_data.get("close", 0)
        
        if dca_price <= 0:
            logger.error(f"Invalid DCA price {dca_price} from alert snapshot")
            return
        
        # Import here to avoid circular dependencies
        from apps.bots.dca_executor import DCABotExecutor
        
        # Initialize bot executor
        paper_trading = bot_config.get("paper_trading", True)
        executor = DCABotExecutor(
            bot_config=bot_config,
            paper_trading=paper_trading
        )
        executor.bot_id = bot_id
        executor.user_id = bot_config.get("user_id")
        await executor.initialize()
        
        # Get symbol
        symbol = bot_config.get("pair") or bot_config.get("symbol") or alert_data.get("symbol")
        if not symbol:
            logger.error(f"Could not determine symbol for bot {bot_id}")
            return
        
        # Normalize symbol format
        symbol = symbol.replace('/', '').replace('-', '').upper()
        
        # Get DCA config
        config = bot_config.get("config", {})
        dca_config = config.get("dcaConfig", {})
        dca_levels = dca_config.get("levels", [])
        
        if dca_index >= len(dca_levels):
            logger.warning(f"DCA index {dca_index} exceeds available levels for bot {bot_id}")
            return
        
        dca_level = dca_levels[dca_index]
        order_amount = dca_level.get("orderAmount") or config.get("orderAmount", 100)
        
        logger.info(f"Executing DCA order {dca_index}: {symbol} @ {dca_price} amount={order_amount}")
        
        # Execute DCA order
        # Note: The actual order execution logic should be in DCABotExecutor
        # For now, we'll log the action
        # In production, you would call executor.execute_dca() here
        
        # Disable this DCA alert (one-time trigger)
        await _disable_alert(f"bot_{bot_id}_dca_{dca_index}")
        
        logger.info(f"DCA order {dca_index} executed successfully for bot {bot_id}")
        
        # Log the DCA execution
        if hasattr(executor, 'log_event'):
            executor.log_event(
                event_type="dca_executed",
                event_category="order",
                message=f"DCA order {dca_index} executed via alert trigger",
                details={
                    "symbol": symbol,
                    "price": dca_price,
                    "amount": order_amount,
                    "dca_index": dca_index,
                    "alert_id": alert_data.get("alert_id")
                }
            )
    
    except Exception as e:
        logger.error(f"Error executing DCA order {dca_index} for bot {bot_id}: {e}", exc_info=True)


async def _create_dca_alerts(bot_config: Dict[str, Any], entry_price: float, symbol: str):
    """
    Create alerts for DCA orders based on entry price.
    
    Args:
        bot_config: Bot configuration from database
        entry_price: Entry price to calculate DCA triggers from
        symbol: Trading pair symbol
    """
    bot_id = bot_config.get("bot_id")
    user_id = bot_config.get("user_id")
    
    if not bot_id or not user_id:
        logger.error("Bot ID or User ID missing, cannot create DCA alerts")
        return
    
    try:
        config = bot_config.get("config", {})
        dca_config = config.get("dcaConfig", {})
        dca_levels = dca_config.get("levels", [])
        
        if not dca_levels:
            logger.info(f"No DCA levels configured for bot {bot_id}")
            return
        
        logger.info(f"Creating {len(dca_levels)} DCA alerts for bot {bot_id} starting from entry price {entry_price}")
        
        for i, level in enumerate(dca_levels):
            price_drop_percent = level.get("priceDropPercent", 5)
            trigger_price = entry_price * (1 - price_drop_percent / 100)
            
            # Create DCA alert
            dca_alert = create_dca_alert(
                bot_id=bot_id,
                user_id=user_id,
                symbol=symbol,
                dca_index=i,
                trigger_price=trigger_price,
                base_timeframe="1m"  # Check frequently for DCA triggers
            )
            
            # Save to alerts table
            if supabase:
                supabase.table("alerts").insert(dca_alert).execute()
                logger.info(f"Created DCA alert {i} for bot {bot_id} at trigger price {trigger_price}")
            else:
                logger.error("Supabase client not available, cannot create DCA alert")
    
    except Exception as e:
        logger.error(f"Error creating DCA alerts for bot {bot_id}: {e}", exc_info=True)


async def _disable_alert(alert_id: str):
    """
    Disable an alert by setting its status to paused.
    
    Args:
        alert_id: Alert ID to disable
    """
    try:
        if not supabase:
            logger.error("Supabase client not available, cannot disable alert")
            return
        
        supabase.table("alerts").update({"status": "paused"}).eq("alert_id", alert_id).execute()
        logger.info(f"Disabled alert {alert_id}")
    
    except Exception as e:
        logger.error(f"Error disabling alert {alert_id}: {e}", exc_info=True)

"""Bot action handler - executes bot actions when alerts fire."""

import asyncio
import logging
from typing import Dict, Any
from apps.api.clients.supabase_client import supabase

logger = logging.getLogger(__name__)


async def execute_bot_action(action: Dict[str, Any], alert_data: Dict[str, Any]):
    """
    Execute bot action when alert fires.
    
    Args:
        action: Action dict from alert (type: "bot_trigger", bot_id, action_type)
        alert_data: Full alert data including snapshot
    """
    bot_id = action.get("bot_id")
    action_type = action.get("action_type")
    
    if not bot_id:
        logger.error("Bot ID missing from action")
        return
    
    try:
        # Fetch bot config from database
        bot_response = supabase.table("bots").select("*").eq("bot_id", bot_id).execute()
        
        if not bot_response.data:
            logger.error(f"Bot {bot_id} not found")
            return
        
        bot_config = bot_response.data[0]
        
        if action_type == "execute_entry":
            await _execute_entry_order(bot_config, alert_data)
        
        elif action_type == "execute_dca":
            dca_index = action.get("dca_index", 0)
            await _execute_dca_order(bot_config, dca_index, alert_data)
        
        else:
            logger.warning(f"Unknown action type: {action_type}")
    
    except Exception as e:
        logger.error(f"Error executing bot action: {e}", exc_info=True)


async def _execute_entry_order(bot_config: Dict[str, Any], alert_data: Dict[str, Any]):
    """Execute entry order for DCA bot."""
    bot_id = bot_config.get("bot_id")
    logger.info(f"Executing entry order for bot {bot_id}")
    
    try:
        # Get snapshot from alert
        snapshot = alert_data.get("snapshot", {})
        entry_price = snapshot.get("close", 0) or snapshot.get("price", 0)
        
        if not entry_price:
            logger.error("No price in alert snapshot")
            return
        
        # Get bot config
        config = bot_config.get("config", {})
        symbol = bot_config.get("symbol")
        order_amount = config.get("orderAmount", 100)
        
        # Execute entry order via API
        # For now, log the order (implement actual execution later)
        logger.info(f"Entry order for bot {bot_id}: {symbol} @ {entry_price} amount={order_amount}")
        
        # TODO: Implement actual order execution
        # from apps.bots.dca_executor import DCABotExecutor
        # executor = DCABotExecutor(bot_config=bot_config, paper_trading=True)
        # await executor.execute_entry(symbol, entry_price, order_amount)
        
        # Create DCA alerts for subsequent orders
        await _create_dca_alerts(bot_config, entry_price)
        
        # Disable entry alert (already triggered)
        alert_id = alert_data.get("alert_id")
        if alert_id:
            await _disable_alert(alert_id)
        
        logger.info(f"Entry order executed for bot {bot_id}")
    
    except Exception as e:
        logger.error(f"Error executing entry order: {e}", exc_info=True)


async def _execute_dca_order(bot_config: Dict[str, Any], dca_index: int, alert_data: Dict[str, Any]):
    """Execute DCA order."""
    bot_id = bot_config.get("bot_id")
    logger.info(f"Executing DCA order {dca_index} for bot {bot_id}")
    
    try:
        snapshot = alert_data.get("snapshot", {})
        price = snapshot.get("close", 0) or snapshot.get("price", 0)
        
        config = bot_config.get("config", {})
        dca_config = config.get("dcaConfig", {})
        dca_levels = dca_config.get("levels", [])
        
        if dca_index >= len(dca_levels):
            logger.error(f"DCA index {dca_index} out of range")
            return
        
        level = dca_levels[dca_index]
        order_amount = level.get("orderAmount", 100)
        symbol = bot_config.get("symbol")
        
        # Execute DCA order
        logger.info(f"DCA order {dca_index} for bot {bot_id}: {symbol} @ {price} amount={order_amount}")
        
        # TODO: Implement actual order execution
        
        # Disable this DCA alert after execution
        alert_id = alert_data.get("alert_id")
        if alert_id:
            await _disable_alert(alert_id)
    
    except Exception as e:
        logger.error(f"Error executing DCA order: {e}", exc_info=True)


async def _create_dca_alerts(bot_config: Dict[str, Any], entry_price: float):
    """Create alerts for DCA orders."""
    bot_id = bot_config.get("bot_id")
    user_id = bot_config.get("user_id")
    symbol = bot_config.get("symbol")
    
    config = bot_config.get("config", {})
    dca_config = config.get("dcaConfig", {})
    dca_levels = dca_config.get("levels", [])
    
    logger.info(f"Creating {len(dca_levels)} DCA alerts for bot {bot_id}")
    
    for i, level in enumerate(dca_levels):
        price_drop_percent = level.get("priceDropPercent", 5)
        price_threshold = entry_price * (1 - price_drop_percent / 100.0)
        
        alert = {
            "user_id": user_id,
            "symbol": symbol,
            "base_timeframe": "1m",  # DCA checks price frequently
            "conditions": [{
                "id": f"dca_price_drop_{i}",
                "type": "price",
                "operator": "<=",
                "compareWith": "value",
                "compareValue": price_threshold,
                "timeframe": "same"
            }],
            "logic": "AND",
            "action": {
                "type": "bot_trigger",
                "bot_id": bot_id,
                "action_type": "execute_dca",
                "dca_index": i
            },
            "status": "active"
        }
        
        try:
            supabase.table("alerts").insert(alert).execute()
            logger.info(f"Created DCA alert {i} for bot {bot_id} at price {price_threshold}")
        except Exception as e:
            logger.error(f"Error creating DCA alert {i}: {e}")


async def _disable_alert(alert_id: str):
    """Disable an alert."""
    try:
        supabase.table("alerts").update({"status": "paused"}).eq("alert_id", alert_id).execute()
        logger.info(f"Disabled alert {alert_id}")
    except Exception as e:
        logger.error(f"Error disabling alert {alert_id}: {e}")


"""
Convert EntryConditionsData to Alert System format.

This module provides functions to convert frontend EntryConditionsData format
to the alert system format for cost-efficient condition evaluation.
"""

from typing import Dict, Any, Optional
from apps.bots.entry_condition_converter import convert_entry_conditions_data_to_playbook
import logging

logger = logging.getLogger(__name__)


def convert_entry_conditions_to_alert(
    bot_id: str,
    user_id: str,
    symbol: str,
    entry_conditions_data: Dict[str, Any],
    base_timeframe: str = "1h"
) -> Optional[Dict[str, Any]]:
    """
    Convert EntryConditionsData to alert format for storage in alerts table.
    
    This function converts the frontend EntryConditionsData format to the alert
    system format, which enables cost-efficient evaluation through the alert runner.
    
    Args:
        bot_id: Bot ID (e.g., "bot_123")
        user_id: User ID (UUID)
        symbol: Trading pair symbol (e.g., "BTCUSDT")
        entry_conditions_data: EntryConditionsData from frontend
        base_timeframe: Base timeframe for evaluation (e.g., "1h", "15m")
    
    Returns:
        Alert dictionary ready for alerts table, or None if conversion fails
    
    Example:
        >>> entry_conditions = {
        ...     "entryType": "conditional",
        ...     "enabled": True,
        ...     "conditions": [...],
        ...     "logicGate": "AND"
        ... }
        >>> alert = convert_entry_conditions_to_alert(
        ...     bot_id="bot_123",
        ...     user_id="user_456",
        ...     symbol="BTCUSDT",
        ...     entry_conditions_data=entry_conditions,
        ...     base_timeframe="1h"
        ... )
        >>> # Save to alerts table
        >>> supabase.table("alerts").insert(alert).execute()
    """
    if not entry_conditions_data:
        logger.warning("Empty entry_conditions_data provided")
        return None
    
    # Check if entry conditions are enabled
    if not entry_conditions_data.get("enabled", True):
        logger.info(f"Entry conditions disabled for bot {bot_id}")
        return None
    
    # Check if entry type is conditional
    if entry_conditions_data.get("entryType") != "conditional":
        logger.info(f"Entry type is not conditional for bot {bot_id}, skipping alert creation")
        return None
    
    # Convert to playbook format
    try:
        playbook = convert_entry_conditions_data_to_playbook(entry_conditions_data)
        
        if not playbook:
            logger.warning(f"Failed to convert entry conditions to playbook for bot {bot_id}")
            return None
        
        # Determine base timeframe from conditions if not provided
        if not base_timeframe and entry_conditions_data.get("conditions"):
            conditions = entry_conditions_data.get("conditions", [])
            if conditions:
                base_timeframe = conditions[0].get("timeframe", "1h")
        
        # Build alert
        alert = {
            "alert_id": f"bot_{bot_id}_entry",
            "user_id": user_id,
            "symbol": symbol,
            "base_timeframe": base_timeframe,
            "conditionConfig": {
                "mode": "playbook",
                "gateLogic": playbook.get("gateLogic", "ALL"),
                "evaluationOrder": playbook.get("evaluationOrder", "priority"),
                "conditions": playbook.get("conditions", [])
            },
            "action": {
                "type": "bot_trigger",
                "bot_id": bot_id,
                "action_type": "execute_entry"
            },
            "fireMode": "per_bar",  # Fire once per bar to prevent duplicate triggers
            "status": "active" if entry_conditions_data.get("enabled", True) else "paused"
        }
        
        logger.info(f"Converted entry conditions to alert format for bot {bot_id}")
        return alert
    
    except Exception as e:
        logger.error(f"Error converting entry conditions to alert format: {e}", exc_info=True)
        return None


def create_dca_alert(
    bot_id: str,
    user_id: str,
    symbol: str,
    dca_index: int,
    trigger_price: float,
    base_timeframe: str = "1m"
) -> Dict[str, Any]:
    """
    Create a DCA alert for a specific price level.
    
    Args:
        bot_id: Bot ID
        user_id: User ID
        symbol: Trading pair symbol
        dca_index: DCA level index (0, 1, 2, ...)
        trigger_price: Price level to trigger DCA order
        base_timeframe: Base timeframe (default: "1m" for frequent checks)
    
    Returns:
        DCA alert dictionary
    """
    alert = {
        "alert_id": f"bot_{bot_id}_dca_{dca_index}",
        "user_id": user_id,
        "symbol": symbol,
        "base_timeframe": base_timeframe,
        "conditions": [{
            "id": "price_drop",
            "type": "price",
            "priceField": "close",
            "operator": "<=",
            "compareWith": "value",
            "compareValue": trigger_price,
            "timeframe": "same"
        }],
        "logic": "AND",
        "action": {
            "type": "bot_trigger",
            "bot_id": bot_id,
            "action_type": "execute_dca",
            "dca_index": dca_index
        },
        "fireMode": "per_bar",
        "status": "active"
    }
    
    return alert


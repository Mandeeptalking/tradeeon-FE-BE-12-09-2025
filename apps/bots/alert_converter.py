"""Convert DCA bot entry conditions to alert system format."""

from typing import Dict, Any, List

def convert_bot_entry_to_alert_conditions(
    entry_condition: Dict[str, Any],
    condition_type: str
) -> List[Dict[str, Any]]:
    """
    Convert DCA bot entry condition to alert system format.
    
    Args:
        entry_condition: Bot entry condition from frontend
        condition_type: Type of condition (RSI, MA, MACD, Price Action, etc.)
    
    Returns:
        List of alert conditions
    """
    conditions = []
    
    if condition_type == "RSI Conditions":
        conditions.append({
            "id": "rsi_entry",
            "type": "indicator",
            "indicator": "RSI",
            "component": "RSI",
            "operator": _map_operator(entry_condition.get("operator", "less_than")),
            "compareWith": "value",
            "compareValue": entry_condition.get("value", 30),
            "timeframe": entry_condition.get("timeframe", "15m"),
            "settings": {"length": entry_condition.get("period", 14)}
        })
    
    elif condition_type == "Moving Average (MA)":
        ma_type = entry_condition.get("maType", "EMA")
        fast_ma = entry_condition.get("fastMA", 9)
        slow_ma = entry_condition.get("slowMA", 26)
        operator = entry_condition.get("operator", "crosses_above")
        
        # MA crossover: Fast MA crosses above/below Slow MA
        conditions.append({
            "id": "ma_crossover",
            "type": "indicator",
            "indicator": ma_type,
            "component": f"{ma_type}_fast",
            "operator": _map_operator(operator),
            "compareWith": "indicator_component",
            "rhs": {
                "indicator": ma_type,
                "component": f"{ma_type}_slow",
                "settings": {"period": slow_ma}
            },
            "timeframe": entry_condition.get("timeframe", "15m"),
            "settings": {"period": fast_ma}
        })
    
    elif condition_type == "Price Action":
        ma_type = entry_condition.get("priceMaType", "EMA")
        ma_length = entry_condition.get("maLength", 20)
        percentage = entry_condition.get("pricePercentage", 1.0)
        operator = entry_condition.get("operator", "crosses_above")
        compare_value = entry_condition.get("compareValue") or entry_condition.get("value")
        
        if compare_value:
            # Price compared to fixed value
            conditions.append({
                "id": "price_action",
                "type": "price",
                "operator": _map_operator(operator),
                "compareWith": "value",
                "compareValue": compare_value,
                "timeframe": entry_condition.get("timeframe", "15m")
            })
        else:
            # Price compared to MA
            conditions.append({
                "id": "price_ma",
                "type": "price",
                "operator": _map_operator(operator),
                "compareWith": "indicator_component",
                "rhs": {
                    "indicator": ma_type,
                    "component": ma_type,
                    "settings": {"period": ma_length}
                },
                "timeframe": entry_condition.get("timeframe", "15m")
            })
    
    elif condition_type == "MACD Conditions":
        component = entry_condition.get("macdComponent", "histogram")
        fast = entry_condition.get("fastPeriod", 12)
        slow = entry_condition.get("slowPeriod", 26)
        signal = entry_condition.get("signalPeriod", 9)
        
        conditions.append({
            "id": "macd_condition",
            "type": "indicator",
            "indicator": "MACD",
            "component": component,
            "operator": _map_operator(entry_condition.get("operator", "crosses_above")),
            "compareWith": "value",
            "compareValue": entry_condition.get("value", 0),
            "timeframe": entry_condition.get("timeframe", "15m"),
            "settings": {
                "fast": fast,
                "slow": slow,
                "signal": signal
            }
        })
    
    elif condition_type == "MFI Conditions":
        conditions.append({
            "id": "mfi_condition",
            "type": "indicator",
            "indicator": "MFI",
            "component": "MFI",
            "operator": _map_operator(entry_condition.get("operator", "less_than")),
            "compareWith": "value",
            "compareValue": entry_condition.get("value", 20),
            "timeframe": entry_condition.get("timeframe", "15m"),
            "settings": {"length": entry_condition.get("mfiPeriod", 14)}
        })
    
    elif condition_type == "CCI Conditions":
        conditions.append({
            "id": "cci_condition",
            "type": "indicator",
            "indicator": "CCI",
            "component": "CCI",
            "operator": _map_operator(entry_condition.get("operator", "less_than")),
            "compareWith": "value",
            "compareValue": entry_condition.get("value", -100),
            "timeframe": entry_condition.get("timeframe", "15m"),
            "settings": {"length": entry_condition.get("cciPeriod", 14)}
        })
    
    return conditions


def convert_playbook_conditions_to_alert(
    playbook_conditions: List[Dict[str, Any]],
    base_timeframe: str
) -> Dict[str, Any]:
    """
    Convert playbook conditions to alert playbook format.
    
    Args:
        playbook_conditions: List of playbook conditions from frontend
        base_timeframe: Base timeframe for the alert
    
    Returns:
        Alert conditionConfig with playbook mode
    """
    conditions = []
    
    for idx, cond in enumerate(playbook_conditions):
        condition = cond.get("condition", {})
        condition_type = cond.get("conditionType")
        
        # Convert single condition
        alert_conditions = convert_bot_entry_to_alert_conditions(
            condition,
            condition_type
        )
        
        # Add playbook metadata
        for alert_cond in alert_conditions:
            alert_cond["priority"] = cond.get("priority", idx + 1)
            alert_cond["logic"] = cond.get("logic", "AND")
            alert_cond["validityDuration"] = cond.get("validityDuration")
            alert_cond["validityDurationUnit"] = cond.get("validityDurationUnit", "bars")
        
        conditions.extend(alert_conditions)
    
    return {
        "mode": "playbook",
        "conditions": conditions,
        "gateLogic": "ALL",  # All conditions must be true
        "evaluationOrder": "priority"
    }


def _map_operator(bot_operator: str) -> str:
    """Map bot operator to alert system operator."""
    mapping = {
        "less_than": "<",
        "greater_than": ">",
        "less_than_or_equal": "<=",
        "greater_than_or_equal": ">=",
        "equals": "equals",
        "crosses_above": "crosses_above",
        "crosses_below": "crosses_below",
        "between": "between"
    }
    return mapping.get(bot_operator, ">")



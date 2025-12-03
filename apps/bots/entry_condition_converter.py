"""
Convert EntryConditions component format to evaluator format.

This converter maps the frontend EntryCondition format (from EntryConditions.tsx)
to the backend evaluator format (used by backend/evaluator.py).
"""

from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


def convert_entry_condition_to_evaluator_format(entry_condition: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a single EntryCondition from frontend format to evaluator format.
    
    Frontend format (EntryCondition):
    {
        "id": "condition_1",
        "name": "RSI Crosses Below Oversold",
        "enabled": true,
        "indicator": "RSI",
        "component": "rsi_line",
        "operator": "crosses_below_oversold",
        "period": 14,
        "oversoldLevel": 30,
        "timeframe": "1h",
        "order": 1,
        "durationBars": 3,
        ...
    }
    
    Evaluator format:
    {
        "type": "indicator",
        "indicator": "RSI",
        "component": "RSI",
        "operator": "crosses_below",
        "compareWith": "value",
        "compareValue": 30,
        "timeframe": "1h",
        "settings": {"length": 14}
    }
    """
    if not entry_condition.get("enabled", True):
        return None
    
    indicator = entry_condition.get("indicator", "").upper()
    component = entry_condition.get("component", "")
    operator = entry_condition.get("operator", "")
    period = entry_condition.get("period")
    
    # Check if this is a price action condition
    if indicator == "PRICE" or indicator == "PRICE ACTION":
        return _convert_price_action_condition(entry_condition)
    
    # Check if this is a volume condition
    # OBV and VWAP are volume indicators, but Volume itself is pure volume condition
    if indicator == "VOLUME":
        return _convert_volume_condition(entry_condition)
    
    # Map operator from semantic to evaluator format
    mapped_operator, compare_with, compare_value = _map_operator_and_comparison(
        operator, entry_condition, indicator
    )
    
    # Build base condition
    condition = {
        "type": "indicator",  # EntryCondition is always indicator-based
        "indicator": indicator,
        "component": _map_component_name(indicator, component),
        "operator": mapped_operator,
        "compareWith": compare_with,
        "timeframe": entry_condition.get("timeframe", "1h"),
    }
    
    # Add comparison value
    if compare_value is not None:
        condition["compareValue"] = compare_value
    
    # Handle "between" operator - needs lowerBound and upperBound
    if mapped_operator == "between":
        lower_bound = entry_condition.get("lowerBound")
        upper_bound = entry_condition.get("upperBound")
        if lower_bound is not None:
            condition["lowerBound"] = lower_bound
        if upper_bound is not None:
            condition["upperBound"] = upper_bound
        # Remove compareValue for between operator
        condition.pop("compareValue", None)
    
    # Add settings (indicator parameters)
    settings = {}
    if period is not None:
        settings["length"] = period
    
    # Add indicator-specific settings
    if indicator == "MACD":
        if entry_condition.get("fastPeriod"):
            settings["fast"] = entry_condition["fastPeriod"]
        if entry_condition.get("slowPeriod"):
            settings["slow"] = entry_condition["slowPeriod"]
        if entry_condition.get("signalPeriod"):
            settings["signal"] = entry_condition["signalPeriod"]
    elif indicator == "STOCHASTIC":
        if entry_condition.get("kPeriod"):
            settings["kPeriod"] = entry_condition["kPeriod"]
        if entry_condition.get("dPeriod"):
            settings["dPeriod"] = entry_condition["dPeriod"]
    elif indicator in ["EMA", "SMA", "WMA", "TEMA", "HULL"]:
        # For MA crossovers, check if comparing with another MA
        if entry_condition.get("comparisonPeriod") and entry_condition.get("comparisonMaType"):
            # This is an MA crossover condition
            condition["compareWith"] = "indicator_component"
            condition["rhs"] = {
                "indicator": entry_condition["comparisonMaType"],
                "component": entry_condition["comparisonMaType"],
                "settings": {"length": entry_condition["comparisonPeriod"]}
            }
            # Remove compareValue for MA comparisons
            condition.pop("compareValue", None)
    
    if settings:
        condition["settings"] = settings
    
    return condition


def convert_entry_conditions_data_to_playbook(entry_conditions_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert EntryConditionsData to evaluator playbook format.
    
    Frontend format (EntryConditionsData):
    {
        "entryType": "conditional",
        "enabled": true,
        "conditions": [EntryCondition, ...],
        "logicGate": "AND"
    }
    
    Evaluator playbook format:
    {
        "gateLogic": "ALL",  # "ALL" = AND, "ANY" = OR
        "evaluationOrder": "priority",  # or "sequential"
        "conditions": [
            {
                "id": "condition_1",
                "priority": 1,
                "enabled": true,
                "condition": {...},
                "logic": "AND",
                "validityDuration": 3,
                "validityDurationUnit": "bars"
            }
        ]
    }
    """
    if not entry_conditions_data.get("enabled", False):
        return None
    
    conditions_list = entry_conditions_data.get("conditions", [])
    if not conditions_list:
        return None
    
    # Map logic gate
    logic_gate = entry_conditions_data.get("logicGate", "AND")
    gate_logic = "ALL" if logic_gate == "AND" else "ANY"
    
    # Build playbook conditions
    playbook_conditions = []
    for idx, entry_condition in enumerate(conditions_list):
        if not entry_condition.get("enabled", True):
            continue
        
        # Convert condition format
        evaluator_condition = convert_entry_condition_to_evaluator_format(entry_condition)
        if not evaluator_condition:
            continue
        
        # Build playbook condition entry
        playbook_condition = {
            "id": entry_condition.get("id", f"cond_{idx}"),
            "priority": entry_condition.get("order", idx + 1),
            "enabled": True,
            "condition": evaluator_condition,
            "logic": "AND",  # Default connector logic
        }
        
        # Add duration bars if specified
        duration_bars = entry_condition.get("durationBars")
        if duration_bars is not None and duration_bars > 0:
            playbook_condition["validityDuration"] = duration_bars
            playbook_condition["validityDurationUnit"] = "bars"
        
        playbook_conditions.append(playbook_condition)
    
    if not playbook_conditions:
        return None
    
    return {
        "gateLogic": gate_logic,
        "evaluationOrder": "priority",  # Use order field for sequencing
        "conditions": playbook_conditions
    }


def _map_operator_and_comparison(
    operator: str, 
    entry_condition: Dict[str, Any],
    indicator: str
):
    """
    Map semantic operator to evaluator operator and extract comparison value.
    
    Returns: (operator, compareWith, compareValue)
    """
    operator_lower = operator.lower()
    
    # RSI-specific operators
    if "crosses_below_oversold" in operator_lower:
        oversold = entry_condition.get("oversoldLevel", 30)
        return "crosses_below", "value", oversold
    
    if "crosses_above_overbought" in operator_lower:
        overbought = entry_condition.get("overboughtLevel", 70)
        return "crosses_above", "value", overbought
    
    if "below_oversold" in operator_lower or operator_lower == "less_than_oversold":
        oversold = entry_condition.get("oversoldLevel", 30)
        return "<", "value", oversold
    
    if "above_overbought" in operator_lower or operator_lower == "greater_than_overbought":
        overbought = entry_condition.get("overboughtLevel", 70)
        return ">", "value", overbought
    
    # MA crossover operators
    if "crosses_above_ma" in operator_lower:
        return "crosses_above", "indicator_component", None
    
    if "crosses_below_ma" in operator_lower:
        return "crosses_below", "indicator_component", None
    
    if "greater_than_ma" in operator_lower:
        return ">", "indicator_component", None
    
    if "less_than_ma" in operator_lower:
        return "<", "indicator_component", None
    
    # Generic operators
    operator_mapping = {
        "crosses_above": ("crosses_above", "value", entry_condition.get("value")),
        "crosses_below": ("crosses_below", "value", entry_condition.get("value")),
        "greater_than": (">", "value", entry_condition.get("value")),
        "less_than": ("<", "value", entry_condition.get("value")),
        "greater_than_or_equal": (">=", "value", entry_condition.get("value")),
        "less_than_or_equal": ("<=", "value", entry_condition.get("value")),
        "equals": ("equals", "value", entry_condition.get("value")),
        "between": ("between", "value", None),  # Uses lowerBound/upperBound
    }
    
    # Try exact match first
    if operator_lower in operator_mapping:
        op, comp_with, comp_val = operator_mapping[operator_lower]
        return op, comp_with, comp_val
    
    # Default fallback
    logger.warning(f"Unknown operator: {operator}, defaulting to '>'")
    return ">", "value", entry_condition.get("value")


def _map_component_name(indicator: str, component: str) -> str:
    """
    Map frontend component name to evaluator component name.
    
    Frontend uses names like "rsi_line", "macd_line", "macd_histogram"
    Evaluator expects names like "RSI", "MACD", "MACD_Histogram"
    """
    if not component:
        return indicator
    
    component_lower = component.lower()
    
    # RSI
    if indicator == "RSI":
        if "rsi" in component_lower or "line" in component_lower:
            return "RSI"
        return "RSI"
    
    # MACD
    if indicator == "MACD":
        if "histogram" in component_lower:
            return "MACD_Histogram"
        elif "signal" in component_lower:
            return "MACD_Signal"
        elif "line" in component_lower or "macd" in component_lower:
            return "MACD"
        return "MACD"
    
    # Moving Averages
    if indicator in ["EMA", "SMA", "WMA", "TEMA", "HULL"]:
        if "line" in component_lower or indicator.lower() in component_lower:
            return indicator
        return indicator
    
    # Other indicators - use component as-is or default to indicator name
    if component:
        # Try to capitalize properly
        return component.replace("_", " ").title().replace(" ", "_")
    
    return indicator


def _convert_price_action_condition(entry_condition: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert price action condition to evaluator format.
    
    Price action conditions compare price (open, high, low, close) to:
    - Fixed values
    - Previous candle components
    - Pattern detection (inside bar, engulfing, etc.)
    """
    operator = entry_condition.get("priceActionOperator") or entry_condition.get("operator", "")
    price_field = entry_condition.get("priceField", "close")  # close, open, high, low
    compare_with = entry_condition.get("priceActionCompareWith") or entry_condition.get("compareTo", "value")
    
    # Map new Price Action operators to evaluator operators
    operator_mapping = {
        # Level-based
        "crosses_above_level": "crosses_above",
        "crosses_below_level": "crosses_below",
        "greater_than": ">",
        "less_than": "<",
        "equal_to": "equals",
        "not_equal": "not_equal",  # May need special handling
        # Price-to-price
        "crosses_above_close": "crosses_above",
        "crosses_below_close": "crosses_below",
        "crosses_above_high": "crosses_above",
        "crosses_below_low": "crosses_below",
        "close_gt_prev_close": ">",
        "close_lt_prev_close": "<",
        # Pattern-based (will need special handling in evaluator)
        "inside_bar": "pattern",
        "outside_bar": "pattern",
        "bullish_engulfing": "pattern",
        "bearish_engulfing": "pattern",
        "doji": "pattern",
        "hammer": "pattern",
        "gap_up": "pattern",
        "gap_down": "pattern",
        "higher_high": "pattern",
        "higher_low": "pattern",
        "lower_high": "pattern",
        "lower_low": "pattern",
    }
    
    mapped_operator = operator_mapping.get(operator.lower(), ">")
    
    condition = {
        "type": "price",
        "priceField": price_field,
        "operator": mapped_operator,
        "timeframe": entry_condition.get("timeframe", "1h"),
        "priceActionOperator": operator,  # Keep original for pattern detection
    }
    
    # Pattern-based operators
    pattern_operators = [
        "inside_bar", "outside_bar", "bullish_engulfing", "bearish_engulfing",
        "doji", "hammer", "gap_up", "gap_down",
        "higher_high", "higher_low", "lower_high", "lower_low"
    ]
    
    if operator.lower() in pattern_operators:
        condition["compareWith"] = "none"
        condition["patternType"] = operator.lower()
        return condition
    
    # Price-to-price operators
    price_to_price_ops = [
        "crosses_above_close", "crosses_below_close",
        "crosses_above_high", "crosses_below_low",
        "close_gt_prev_close", "close_lt_prev_close"
    ]
    
    if operator.lower() in price_to_price_ops:
        if operator.lower() in ["crosses_above_close", "crosses_below_close"]:
            condition["compareWith"] = "price_field"
            condition["rhsPriceField"] = "close"
        elif operator.lower() in ["crosses_above_high", "crosses_below_low"]:
            condition["compareWith"] = "price_field"
            condition["rhsPriceField"] = "high" if "high" in operator.lower() else "low"
        elif operator.lower() == "close_gt_prev_close":
            condition["compareWith"] = "previous_price"
            condition["rhsPriceField"] = "close"
        elif operator.lower() == "close_lt_prev_close":
            condition["compareWith"] = "previous_price"
            condition["rhsPriceField"] = "close"
        return condition
    
    # Level-based operators
    if compare_with == "value":
        condition["compareWith"] = "value"
        compare_value = entry_condition.get("compareValue") or entry_condition.get("value")
        if compare_value is not None:
            condition["compareValue"] = compare_value
    
    elif compare_with in ["previous_open", "previous_close", "previous_high", "previous_low"]:
        condition["compareWith"] = "previous_price"
        field_map = {
            "previous_open": "open",
            "previous_close": "close",
            "previous_high": "high",
            "previous_low": "low"
        }
        condition["rhsPriceField"] = field_map.get(compare_with, "close")
    
    return condition


def _convert_volume_condition(entry_condition: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert volume condition to evaluator format.
    
    Volume conditions compare volume to:
    - Fixed values
    - Average volume (moving average)
    - Previous volume
    - Volume indicators (OBV, VWAP)
    """
    indicator = entry_condition.get("indicator", "").upper()
    operator = entry_condition.get("operator", "")
    # Use compareToVolume if available, otherwise compareTo, default to value
    compare_to = entry_condition.get("compareToVolume") or entry_condition.get("compareTo", "value")  # value, avg_volume, previous, indicator
    
    # Map operator
    operator_mapping = {
        "crosses_above": "crosses_above",
        "crosses_below": "crosses_below",
        "greater_than": ">",
        "less_than": "<",
        "greater_than_or_equal": ">=",
        "less_than_or_equal": "<=",
        "equals": "equals",
        "between": "between",
        "spike": ">",  # Volume spike = volume > X% above average
    }
    mapped_operator = operator_mapping.get(operator.lower(), ">")
    
    condition = {
        "type": "volume",
        "operator": mapped_operator,
        "timeframe": entry_condition.get("timeframe", "1h"),
    }
    
    if compare_to == "value":
        # Compare to fixed value
        condition["compareWith"] = "value"
        if entry_condition.get("value") is not None:
            condition["compareValue"] = entry_condition["value"]
        
        if mapped_operator == "between":
            if entry_condition.get("lowerBound") is not None:
                condition["lowerBound"] = entry_condition["lowerBound"]
            if entry_condition.get("upperBound") is not None:
                condition["upperBound"] = entry_condition["upperBound"]
            condition.pop("compareValue", None)
    
    elif compare_to == "avg_volume":
        # Compare to average volume (moving average)
        condition["compareWith"] = "indicator_component"
        period = entry_condition.get("period", 20)
        percentage = entry_condition.get("percentage", 0)  # e.g., 150% = 1.5x average
        
        condition["rhs"] = {
            "indicator": "VOLUME_MA",
            "component": "VOLUME_MA",
            "settings": {"length": period}
        }
        
        if percentage != 0:
            condition["percentage"] = percentage
    
    elif compare_to == "previous":
        # Compare to previous bar's volume
        condition["compareWith"] = "previous_volume"
    
    elif compare_to == "indicator" and indicator in ["OBV", "VWAP"]:
        # Compare volume to volume indicator
        condition["compareWith"] = "indicator_component"
        condition["rhs"] = {
            "indicator": indicator,
            "component": indicator,
            "settings": entry_condition.get("settings", {})
        }
    
    return condition


def convert_for_dca_executor(entry_conditions_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert EntryConditionsData to format expected by dca_executor._evaluate_entry_conditions().
    
    This is a convenience function that converts to the playbook format
    that dca_executor expects.
    """
    playbook = convert_entry_conditions_data_to_playbook(entry_conditions_data)
    
    if not playbook:
        return {"mode": "simple", "condition": None}
    
    # dca_executor expects format:
    # {
    #     "mode": "playbook",
    #     "gateLogic": "ALL",
    #     "conditions": [...]
    # }
    return {
        "mode": "playbook",
        "gateLogic": playbook["gateLogic"],
        "conditions": playbook["conditions"]
    }


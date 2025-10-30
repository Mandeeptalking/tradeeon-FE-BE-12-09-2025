"""
Condition Evaluator for Alert System

Evaluates trading conditions against market data and indicator values.
Supports various operators and comparison types.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, Union
import logging

logger = logging.getLogger(__name__)

def evaluate_condition(df: pd.DataFrame, row_index: int, condition: Dict[str, Any]) -> bool:
    """
    Evaluate a single condition against market data.
    
    Args:
        df: DataFrame with OHLCV data and indicator columns
        row_index: Index of the row to evaluate (usually the latest)
        condition: Condition dictionary with type, operator, etc.
    
    Returns:
        bool: True if condition is met, False otherwise
    """
    if row_index >= len(df) or row_index < 0:
        return False
    
    try:
        row = df.iloc[row_index]
        condition_type = condition.get("type", "indicator")
        operator = condition.get("operator", ">")
        compare_with = condition.get("compareWith", "value")
        
        if condition_type == "indicator":
            return _evaluate_indicator_condition(row, condition, operator, compare_with)
        elif condition_type == "price":
            return _evaluate_price_condition(row, condition, operator, compare_with)
        elif condition_type == "volume":
            return _evaluate_volume_condition(row, condition, operator, compare_with)
        else:
            logger.warning(f"Unknown condition type: {condition_type}")
            return False
            
    except Exception as e:
        logger.error(f"Error evaluating condition: {e}")
        return False

def _evaluate_indicator_condition(row: pd.Series, condition: Dict[str, Any], operator: str, compare_with: str) -> bool:
    """Evaluate indicator-based condition"""
    indicator = condition.get("indicator")
    component = condition.get("component", indicator)
    
    if not indicator or not component:
        return False
    
    # Get indicator value from row
    indicator_value = _get_indicator_value(row, indicator, component)
    if indicator_value is None:
        return False
    
    # Get comparison value
    if compare_with == "value":
        compare_value = condition.get("compareValue")
        if compare_value is None:
            return False
        return _apply_operator(indicator_value, compare_value, operator)
    
    elif compare_with == "indicator_component":
        rhs = condition.get("rhs")
        if not rhs:
            return False
        
        rhs_indicator = rhs.get("indicator")
        rhs_component = rhs.get("component", rhs_indicator)
        
        rhs_value = _get_indicator_value(row, rhs_indicator, rhs_component)
        if rhs_value is None:
            return False
        
        return _apply_operator(indicator_value, rhs_value, operator)
    
    elif compare_with == "price":
        price_value = _get_price_value(row, condition.get("priceField", "close"))
        if price_value is None:
            return False
        return _apply_operator(indicator_value, price_value, operator)
    
    return False

def _evaluate_price_condition(row: pd.Series, condition: Dict[str, Any], operator: str, compare_with: str) -> bool:
    """Evaluate price-based condition"""
    price_field = condition.get("priceField", "close")
    price_value = _get_price_value(row, price_field)
    
    if price_value is None:
        return False
    
    if compare_with == "value":
        compare_value = condition.get("compareValue")
        if compare_value is None:
            return False
        return _apply_operator(price_value, compare_value, operator)
    
    elif compare_with == "indicator_component":
        rhs = condition.get("rhs")
        if not rhs:
            return False
        
        rhs_indicator = rhs.get("indicator")
        rhs_component = rhs.get("component", rhs_indicator)
        
        rhs_value = _get_indicator_value(row, rhs_indicator, rhs_component)
        if rhs_value is None:
            return False
        
        # Handle percentage offset for price action conditions
        percentage = condition.get("percentage")
        if percentage is not None and percentage != 0:
            # Apply percentage adjustment to the indicator value
            # For "above": EMA * (1 + percentage/100), e.g., EMA * 1.05
            # For "below": EMA * (1 - percentage/100), e.g., EMA * 0.95
            if operator in ["closes_above", "crosses_above", ">", ">="]:
                # Price is above: add percentage to MA
                rhs_value = rhs_value * (1 + percentage / 100)
            elif operator in ["closes_below", "crosses_below", "<", "<="]:
                # Price is below: subtract percentage from MA
                rhs_value = rhs_value * (1 - percentage / 100)
        
        return _apply_operator(price_value, rhs_value, operator)
    
    return False

def _evaluate_volume_condition(row: pd.Series, condition: Dict[str, Any], operator: str, compare_with: str) -> bool:
    """Evaluate volume-based condition"""
    volume_value = _get_price_value(row, "volume")
    
    if volume_value is None:
        return False
    
    if compare_with == "value":
        compare_value = condition.get("compareValue")
        if compare_value is None:
            return False
        return _apply_operator(volume_value, compare_value, operator)
    
    elif compare_with == "indicator_component":
        rhs = condition.get("rhs")
        if not rhs:
            return False
        
        rhs_indicator = rhs.get("indicator")
        rhs_component = rhs.get("component", rhs_indicator)
        
        rhs_value = _get_indicator_value(row, rhs_indicator, rhs_component)
        if rhs_value is None:
            return False
        
        return _apply_operator(volume_value, rhs_value, operator)
    
    return False

def _get_indicator_value(row: pd.Series, indicator: str, component: str) -> Optional[float]:
    """Get indicator value from row data"""
    # Try different column naming conventions
    possible_columns = [
        f"{indicator}_{component}",
        f"{indicator}_{component.lower()}",
        f"{indicator.lower()}_{component.lower()}",
        f"{indicator}_{component.replace(' ', '_')}",
        f"{indicator}_{component.replace(' ', '_').lower()}",
        component,
        component.lower(),
        indicator,
        indicator.lower()
    ]
    
    # Special handling for MACD components
    if indicator.upper() == "MACD":
        macd_mapping = {
            "macd_line": ["MACD_macd_line", "MACD_MACD Line", "MACD_MACD", "MACD"],
            "signal_line": ["MACD_signal_line", "MACD_Signal Line", "MACD_Signal"],
            "histogram": ["MACD_histogram", "MACD_Histogram"],
            "zero_line": ["MACD_zero_line", "MACD_Zero Line"]
        }
        if component.lower() in macd_mapping:
            possible_columns = macd_mapping[component.lower()] + possible_columns
    
    # Special handling for Moving Average Fast/Slow components
    if component.lower() in ["fast", "slow"]:
        possible_columns = [
            f"{indicator}_{component.capitalize()}",
            f"{indicator}_{component.lower()}",
            f"{indicator}_{component.lower()}_{indicator}",
        ] + possible_columns
    
    for col in possible_columns:
        if col in row.index and pd.notna(row[col]):
            try:
                return float(row[col])
            except (ValueError, TypeError):
                continue
    
    return None

def _get_price_value(row: pd.Series, field: str) -> Optional[float]:
    """Get price/volume value from row data"""
    if field in row.index and pd.notna(row[field]):
        try:
            return float(row[field])
        except (ValueError, TypeError):
            pass
    return None

def _apply_operator(left: float, right: float, operator: str) -> bool:
    """Apply comparison operator"""
    try:
        if operator == ">":
            return left > right
        elif operator == "<":
            return left < right
        elif operator == ">=":
            return left >= right
        elif operator == "<=":
            return left <= right
        elif operator == "equals":
            return abs(left - right) < 1e-10  # Float comparison with tolerance
        elif operator == "crosses_above" or operator == "closes_above":
            # For crosses/closes above: price must be greater than threshold
            return left > right
        elif operator == "crosses_below" or operator == "closes_below":
            # For crosses/closes below: price must be less than threshold
            return left < right
        else:
            logger.warning(f"Unknown operator: {operator}")
            return False
    except Exception as e:
        logger.error(f"Error applying operator {operator}: {e}")
        return False


def evaluate_playbook(
    df: pd.DataFrame,
    playbook: Dict[str, Any],
    condition_states: Dict[str, Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Evaluate a condition playbook with priority, validity duration, and AND/OR logic.
    
    Args:
        df: DataFrame with OHLCV data and indicator columns
        playbook: Playbook configuration with gateLogic, evaluationOrder, and conditions
        condition_states: Optional dict to track condition validity durations {condition_id: {triggered_at, valid_until}}
    
    Returns:
        Dict with:
            - triggered: bool
            - satisfied_conditions: list of condition IDs that are true
            - failed_conditions: list of condition IDs that are false
            - condition_results: dict mapping condition_id to evaluation result
            - condition_states: updated condition states dict
    """
    if condition_states is None:
        condition_states = {}
    
    gate_logic = playbook.get("gateLogic", "ALL")  # "ALL" or "ANY"
    evaluation_order = playbook.get("evaluationOrder", "priority")  # "priority" or "sequential"
    conditions = playbook.get("conditions", [])
    
    if not conditions:
        return {
            "triggered": False,
            "satisfied_conditions": [],
            "failed_conditions": [],
            "condition_results": {},
            "condition_states": condition_states
        }
    
    # Sort conditions by priority or keep sequential order
    sorted_conditions = sorted(conditions, key=lambda c: c.get("priority", 999)) if evaluation_order == "priority" else conditions
    
    condition_results = {}
    satisfied_conditions = []
    failed_conditions = []
    current_time = df.iloc[-1]["time"] if len(df) > 0 else None
    
    # Track validity duration per condition
    for condition_item in sorted_conditions:
        condition_id = condition_item.get("id", "")
        condition = condition_item.get("condition", {})
        enabled = condition_item.get("enabled", True)
        validity_duration = condition_item.get("validityDuration")
        validity_unit = condition_item.get("validityDurationUnit", "bars")
        
        if not enabled:
            condition_results[condition_id] = {"ok": False, "reason": "disabled"}
            continue
        
        # Check if condition is still valid from previous trigger
        condition_state = condition_states.get(condition_id, {})
        if validity_duration and validity_duration > 0:
            validity_type = condition_state.get("validity_type")
            if validity_type == "minutes":
                valid_until = condition_state.get("valid_until")
                if valid_until and current_time:
                    if pd.to_datetime(current_time) <= pd.to_datetime(valid_until):
                        # Condition is still valid (time-based)
                        condition_results[condition_id] = {"ok": True, "reason": "still_valid"}
                        satisfied_conditions.append(condition_id)
                        continue
            elif validity_type == "bars":
                triggered_bar_idx = condition_state.get("triggered_bar_idx")
                valid_for_bars = condition_state.get("valid_for_bars")
                if triggered_bar_idx is not None and valid_for_bars is not None:
                    current_bar_idx = len(df) - 1
                    bars_since_trigger = current_bar_idx - triggered_bar_idx
                    if bars_since_trigger <= valid_for_bars:
                        # Condition is still valid (bar-based)
                        condition_results[condition_id] = {"ok": True, "reason": "still_valid"}
                        satisfied_conditions.append(condition_id)
                        continue
        
        # Evaluate condition
        row_index = len(df) - 1
        condition_ok = evaluate_condition(df, row_index, condition)
        
        condition_results[condition_id] = {"ok": condition_ok, "reason": "evaluated"}
        
        if condition_ok:
            satisfied_conditions.append(condition_id)
            
            # Update validity duration if condition is true
            if validity_duration and validity_duration > 0:
                if validity_unit == "bars":
                    # Valid for N bars - track by bar index
                    # Store the bar index when triggered, valid until that index + duration
                    if current_time is not None and len(df) > 0:
                        triggered_bar_idx = len(df) - 1
                        condition_states[condition_id] = {
                            "triggered_at": current_time,
                            "triggered_bar_idx": triggered_bar_idx,
                            "valid_for_bars": validity_duration,
                            "validity_type": "bars"
                        }
                else:  # minutes
                    # Valid for N minutes
                    if current_time:
                        valid_until = pd.to_datetime(current_time) + pd.Timedelta(minutes=validity_duration)
                        condition_states[condition_id] = {
                            "triggered_at": current_time,
                            "valid_until": valid_until,
                            "validity_type": "minutes"
                        }
        else:
            failed_conditions.append(condition_id)
            # Reset validity if condition becomes false
            if condition_id in condition_states:
                del condition_states[condition_id]
    
    # Apply per-condition AND/OR logic (sequential evaluation with connectors)
    # This builds a logical chain: condition1 AND condition2 OR condition3, etc.
    if len(sorted_conditions) > 0:
        final_result = None
        for i, condition_item in enumerate(sorted_conditions):
            if not condition_item.get("enabled", True):
                continue
                
            condition_id = condition_item.get("id", "")
            condition_ok = condition_results.get(condition_id, {}).get("ok", False)
            logic = condition_item.get("logic", "AND")  # Logic connecting to previous condition (only used for 2nd+ conditions)
            
            if i == 0:
                # First condition (always included)
                final_result = condition_ok
            else:
                # Apply logic with previous result
                if logic == "AND":
                    final_result = final_result and condition_ok
                else:  # OR
                    final_result = final_result or condition_ok
        
        # Apply gate logic to determine if playbook triggers
        if gate_logic == "ALL":
            # ALL: final_result must be True (meaning all conditions in chain passed)
            triggered = final_result if final_result is not None else False
        else:  # "ANY"
            # ANY: At least one condition must be satisfied
            # For ANY gate, the per-condition logic chain still applies
            # But we also check if any individual condition is satisfied
            triggered = (final_result if final_result is not None else False) or len(satisfied_conditions) > 0
    else:
        triggered = False
    
    return {
        "triggered": triggered,
        "satisfied_conditions": satisfied_conditions,
        "failed_conditions": failed_conditions,
        "condition_results": condition_results,
        "condition_states": condition_states
    }



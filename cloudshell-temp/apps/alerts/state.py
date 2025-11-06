from typing import Dict, Tuple, Any
from collections import defaultdict

# last fired bar-time per alert
_last_fired: Dict[str, Any] = {}
# memo for computed indicators per (symbol, timeframe, bar_key) to avoid recompute
_indicator_memo: Dict[Tuple[str,str,str], dict] = defaultdict(dict)
# condition states for playbook validity duration tracking {alert_id: {condition_id: {triggered_at, valid_until}}}
_condition_states: Dict[str, Dict[str, Dict[str, Any]]] = defaultdict(dict)

def get_last_fired(alert_id: str):
    return _last_fired.get(alert_id)

def set_last_fired(alert_id: str, bar_time):
    _last_fired[alert_id] = bar_time

def get_indicator_memo(key: Tuple[str,str,str]):
    return _indicator_memo.get(key)

def get_condition_states(alert_id: str) -> Dict[str, Dict[str, Any]]:
    """Get condition states for an alert (for validity duration tracking)"""
    return _condition_states.get(alert_id, {})

def set_condition_states(alert_id: str, states: Dict[str, Dict[str, Any]]):
    """Set condition states for an alert (for validity duration tracking)"""
    _condition_states[alert_id] = states

def set_indicator_memo(key: Tuple[str,str,str], val: dict):
    _indicator_memo[key] = val



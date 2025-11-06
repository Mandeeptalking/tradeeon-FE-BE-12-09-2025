from dataclasses import dataclass
from typing import Optional, Dict, Any, List, Literal

Operator = Literal[">","<",">=","<=","equals","crosses_above","crosses_below"]
CompareWith = Literal["value","indicator_component","price"]

@dataclass
class IndicatorRef:
    indicator: str
    component: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

@dataclass
class Condition:
    id: str
    type: Literal["indicator","price","volume"]
    operator: Operator
    compareWith: CompareWith
    compareValue: Optional[float] = None
    rhs: Optional[IndicatorRef] = None
    indicator: Optional[str] = None
    component: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    timeframe: str = "same"

@dataclass
class ActionNotify:
    type: Literal["notify"] = "notify"

@dataclass
class ActionWebhook:
    type: Literal["webhook"] = "webhook"
    url: str = ""

Action = ActionNotify | ActionWebhook  # extend later

@dataclass
class AlertCreate:
    symbol: str
    base_timeframe: str
    conditions: List[Condition]
    logic: Literal["AND","OR"] = "AND"
    action: Any = None
    status: Literal["active","paused"] = "active"




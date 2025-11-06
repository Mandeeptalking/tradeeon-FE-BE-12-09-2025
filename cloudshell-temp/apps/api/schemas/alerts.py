from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Literal, List, Dict, Any, Union

Operator = Literal[">","<",">=","<=","equals","crosses_above","crosses_below"]
CompareWith = Literal["value","indicator_component","price"]
FireMode = Literal["per_bar","per_close","per_tick"]

class IndicatorRef(BaseModel):
    indicator: str
    component: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class Condition(BaseModel):
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

class ActionNotify(BaseModel):
    type: Literal["notify"] = "notify"

class ActionWebhook(BaseModel):
    type: Literal["webhook"] = "webhook"
    url: HttpUrl

class ActionBot(BaseModel):
    type: Literal["bot"] = "bot"
    bot_id: str

Action = Union[ActionNotify, ActionWebhook, ActionBot]

class AlertCreate(BaseModel):
    symbol: str
    base_timeframe: str
    conditions: List[Condition] = Field(..., min_items=1)
    logic: Literal["AND","OR"] = "AND"
    action: Action = ActionNotify()
    status: Literal["active","paused"] = "active"
    fireMode: FireMode = "per_bar"

class AlertRow(AlertCreate):
    alert_id: str
    user_id: str
    created_at: Optional[str] = None
    last_triggered_at: Optional[str] = None

class AlertUpdate(BaseModel):
    symbol: Optional[str] = None
    base_timeframe: Optional[str] = None
    conditions: Optional[List[Condition]] = None
    logic: Optional[Literal["AND","OR"]] = None
    action: Optional[Action] = None
    status: Optional[Literal["active","paused"]] = None

class AlertLogRow(BaseModel):
    id: int
    alert_id: str
    triggered_at: str
    payload: Dict[str, Any]

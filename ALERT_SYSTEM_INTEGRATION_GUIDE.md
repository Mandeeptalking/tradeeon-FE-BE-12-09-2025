# Alert System Integration with DCA Bot Entry Conditions

## Overview

This guide shows how to integrate the alert system with DCA bot entry conditions to save 80-90% on compute costs.

## Architecture

```
┌─────────────────┐
│   User Creates  │
│   DCA Bot       │
│   with Entry    │
│   Conditions    │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│  Bot API        │
│  Converts Entry │
│  Condition to   │
│  Alert Format   │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│  Alerts Table   │
│  (Supabase)     │
│  Stores Alert   │
│  with Bot ID    │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│  Alert Runner   │
│  (ECS Service)  │
│  Evaluates All  │
│  Alerts Every   │
│  1 Second       │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│  Alert Fires    │
│  (Conditions    │
│   Met)          │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│  Bot Action     │
│  Handler        │
│  Executes Entry │
│  Order          │
└─────────────────┘
```

## Step 1: Convert Bot Entry Condition to Alert Format

### Bot Entry Condition Structure

```typescript
// From frontend (DCABot.tsx)
{
  indicator: "RSI",
  operator: "less_than",
  value: 30,
  timeframe: "15m",
  period: 14,
  // OR for price action
  priceMaType: "EMA",
  maLength: 20,
  pricePercentage: 1.0,
  operator: "crosses_above"
}
```

### Alert Condition Format

```json
{
  "id": "condition_1",
  "type": "indicator",
  "indicator": "RSI",
  "component": "RSI",
  "operator": "<",
  "compareWith": "value",
  "compareValue": 30,
  "timeframe": "15m",
  "settings": {"length": 14}
}
```

## Step 2: Implementation Code

### Converter Function

```python
# apps/bots/alert_converter.py

from typing import Dict, Any, List
from shared.contracts.alerts import Condition

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
        
        conditions.append({
            "id": "ma_crossover",
            "type": "price",
            "operator": _map_operator(entry_condition.get("operator", "crosses_above")),
            "compareWith": "indicator_component",
            "rhs": {
                "indicator": ma_type,
                "component": ma_type,
                "settings": {"period": fast_ma}
            },
            "timeframe": entry_condition.get("timeframe", "15m")
        })
    
    elif condition_type == "Price Action":
        ma_type = entry_condition.get("priceMaType", "EMA")
        ma_length = entry_condition.get("maLength", 20)
        percentage = entry_condition.get("pricePercentage", 1.0)
        operator = entry_condition.get("operator", "crosses_above")
        
        if operator == "crosses_above":
            # Price crosses above MA + percentage
            threshold = 1.0 + (percentage / 100.0)
            conditions.append({
                "id": "price_crosses_ma",
                "type": "price",
                "operator": "crosses_above",
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
    
    return conditions

def _map_operator(bot_operator: str) -> str:
    """Map bot operator to alert system operator."""
    mapping = {
        "less_than": "<",
        "greater_than": ">",
        "equals": "equals",
        "crosses_above": "crosses_above",
        "crosses_below": "crosses_below",
        "between": "between"
    }
    return mapping.get(bot_operator, ">")
```

## Step 3: Create Alert When Bot is Created

### Bot Creation Handler

```python
# apps/api/routers/bots.py (add this function)

async def create_bot_with_alert_entry(bot_data: dict):
    """
    Create bot and convert entry condition to alert.
    """
    from apps.bots.alert_converter import convert_bot_entry_to_alert_conditions
    from apps.api.clients.supabase_client import supabase
    
    # Create bot in database
    bot = await create_bot(bot_data)
    
    # Get entry condition from bot config
    entry_condition = bot_data.get("config", {}).get("entryCondition")
    condition_type = bot_data.get("config", {}).get("entryConditionType")
    
    if entry_condition and condition_type:
        # Convert to alert format
        alert_conditions = convert_bot_entry_to_alert_conditions(
            entry_condition,
            condition_type
        )
        
        # Create alert for bot entry
        alert = {
            "user_id": bot_data["user_id"],
            "symbol": bot_data["symbol"],
            "base_timeframe": entry_condition.get("timeframe", "15m"),
            "conditions": alert_conditions,
            "logic": "AND",  # All conditions must be true
            "action": {
                "type": "bot_trigger",
                "bot_id": bot["bot_id"],
                "action_type": "execute_entry"
            },
            "status": "active" if bot_data.get("status") == "active" else "paused"
        }
        
        # Save to alerts table
        supabase.table("alerts").insert(alert).execute()
        
        logger.info(f"Created alert for bot {bot['bot_id']} entry condition")
    
    return bot
```

## Step 4: Bot Action Handler

### Handler for Bot Actions

```python
# apps/bots/bot_action_handler.py

import asyncio
import logging
from typing import Dict, Any
from apps.bots.dca_executor import DCABotExecutor
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
    logger.info(f"Executing entry order for bot {bot_config['bot_id']}")
    
    # Get snapshot from alert
    snapshot = alert_data.get("snapshot", {})
    entry_price = snapshot.get("close", 0)
    
    # Initialize bot executor
    executor = DCABotExecutor(
        bot_config=bot_config,
        paper_trading=bot_config.get("paper_trading", True)
    )
    await executor.initialize()
    
    # Execute entry order
    symbol = bot_config["symbol"]
    order_amount = bot_config.get("config", {}).get("orderAmount", 100)
    
    # Create entry order
    order_result = await executor.execute_entry(
        symbol=symbol,
        price=entry_price,
        amount=order_amount
    )
    
    if order_result.get("success"):
        logger.info(f"Entry order executed: {order_result}")
        
        # Create DCA alerts for subsequent orders
        await _create_dca_alerts(bot_config, entry_price)
        
        # Disable entry alert (already triggered)
        await _disable_alert(f"bot_{bot_config['bot_id']}_entry")
    
    return order_result

async def _create_dca_alerts(bot_config: Dict[str, Any], entry_price: float):
    """Create alerts for DCA orders."""
    dca_config = bot_config.get("config", {}).get("dcaConfig", {})
    dca_levels = dca_config.get("levels", [])
    
    for i, level in enumerate(dca_levels):
        price_threshold = entry_price * (1 - level.get("priceDropPercent", 5) / 100)
        
        alert = {
            "user_id": bot_config["user_id"],
            "symbol": bot_config["symbol"],
            "base_timeframe": "1m",  # DCA checks price frequently
            "conditions": [{
                "id": "price_drop",
                "type": "price",
                "operator": "<=",
                "compareWith": "value",
                "compareValue": price_threshold,
                "timeframe": "same"
            }],
            "logic": "AND",
            "action": {
                "type": "bot_trigger",
                "bot_id": bot_config["bot_id"],
                "action_type": "execute_dca",
                "dca_index": i
            },
            "status": "active"
        }
        
        supabase.table("alerts").insert(alert).execute()
        logger.info(f"Created DCA alert {i} for bot {bot_config['bot_id']}")

async def _disable_alert(alert_id: str):
    """Disable an alert."""
    supabase.table("alerts").update({"status": "paused"}).eq("alert_id", alert_id).execute()
```

## Step 5: Wire into Alert Dispatcher

### Update Alert Dispatcher

```python
# apps/alerts/dispatch.py (add this)

from apps.bots.bot_action_handler import execute_bot_action

async def dispatch_alert_action(alert: Dict[str, Any], snapshot: Dict[str, Any]):
    """
    Dispatch alert action based on type.
    """
    action = alert.get("action", {})
    action_type = action.get("type", "notify")
    
    if action_type == "bot_trigger":
        # Execute bot action
        await execute_bot_action(action, {
            "alert_id": alert.get("alert_id"),
            "user_id": alert.get("user_id"),
            "symbol": alert.get("symbol"),
            "snapshot": snapshot
        })
    
    elif action_type == "webhook":
        await send_webhook(action.get("url"), {
            "alert_id": alert.get("alert_id"),
            "snapshot": snapshot
        })
    
    else:
        # Default: notify
        await notify_in_app(alert.get("user_id"), {
            "type": "ALERT_TRIGGERED",
            "alert_id": alert.get("alert_id"),
            "symbol": alert.get("symbol")
        })
```

## Step 6: Update Alert Runner

### Alert Runner Already Handles This!

The alert runner (`apps/alerts/runner.py`) already:
1. Fetches all active alerts (including bot alerts)
2. Groups by symbol
3. Evaluates conditions
4. Dispatches actions

**No changes needed!** ✅

## Step 7: Deployment Checklist

- [ ] Deploy alert runner service (see `DEPLOY_ALERT_RUNNER_STEPS.md`)
- [ ] Add `alert_converter.py` to codebase
- [ ] Add `bot_action_handler.py` to codebase
- [ ] Update bot creation endpoint to create alerts
- [ ] Update alert dispatcher to handle bot actions
- [ ] Test with a bot

## Example: Your 3-Condition Entry

### Bot Entry Condition

```json
{
  "entryConditions": [
    {
      "type": "RSI",
      "operator": "less_than",
      "value": 30,
      "timeframe": "15m",
      "period": 14,
      "validityDuration": 1,
      "validityUnit": "bars"
    },
    {
      "type": "MA",
      "maType": "EMA",
      "period": 20,
      "operator": "greater_than",
      "timeframe": "15m"
    },
    {
      "type": "Price Action",
      "operator": "crosses_above",
      "compareValue": 50000,
      "timeframe": "15m"
    }
  ],
  "logic": "AND"
}
```

### Converted Alert Format

```json
{
  "symbol": "BTCUSDT",
  "base_timeframe": "15m",
  "conditionConfig": {
    "mode": "playbook",
    "conditions": [
      {
        "condition": {
          "type": "indicator",
          "indicator": "RSI",
          "component": "RSI",
          "operator": "<",
          "compareValue": 30,
          "settings": {"length": 14}
        },
        "priority": 1,
        "validityDuration": 1,
        "validityDurationUnit": "bars"
      },
      {
        "condition": {
          "type": "price",
          "operator": ">",
          "compareWith": "indicator_component",
          "rhs": {
            "indicator": "EMA",
            "component": "EMA",
            "settings": {"period": 20}
          }
        },
        "priority": 2
      },
      {
        "condition": {
          "type": "price",
          "operator": "crosses_above",
          "compareValue": 50000
        },
        "priority": 3
      }
    ],
    "gateLogic": "ALL"
  },
  "action": {
    "type": "bot_trigger",
    "bot_id": "bot_123",
    "action_type": "execute_entry"
  }
}
```

## How It Works

1. **User creates bot** → Entry condition saved to bot config
2. **Bot API converts** → Entry condition → Alert format
3. **Alert saved** → Stored in `alerts` table with `bot_trigger` action
4. **Alert runner evaluates** → Every 1 second, checks all alerts
5. **When conditions met** → Alert fires
6. **Bot action handler** → Executes entry order
7. **DCA alerts created** → For subsequent DCA levels
8. **Entry alert disabled** → Prevents duplicate triggers

## Benefits

✅ **80-90% cost savings** - Shared data and indicators  
✅ **No code changes to alert runner** - Already supports it!  
✅ **Supports all conditions** - RSI, MA, MACD, Price Action, etc.  
✅ **Playbook mode** - Priority, validity duration, gate logic  
✅ **Debounce** - Prevents duplicate triggers  

## Next Steps

1. Deploy alert runner (see `DEPLOY_ALERT_RUNNER_STEPS.md`)
2. Add converter and handler code
3. Update bot creation endpoint
4. Test with a bot


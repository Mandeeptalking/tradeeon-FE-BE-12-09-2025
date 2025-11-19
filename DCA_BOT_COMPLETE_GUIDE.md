# Complete DCA Bot System Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [User Association & Multi-Bot Support](#user-association--multi-bot-support)
3. [Live Data Fetching](#live-data-fetching)
4. [Alert Integration](#alert-integration)
5. [Condition Creation & Execution](#condition-creation--execution)
6. [Logging System](#logging-system)
7. [Complete Flow Diagram](#complete-flow-diagram)

---

## 1. Overview

The DCA (Dollar Cost Averaging) bot system is a comprehensive trading automation platform that allows users to:
- Create multiple bots per user
- Execute DCA strategies with advanced features
- Integrate with the alert system for condition-based trading
- Track all activities through comprehensive logging

---

## 2. User Association & Multi-Bot Support

### Database Schema

**Bots Table** (`public.bots`):
```sql
CREATE TABLE public.bots (
    bot_id TEXT PRIMARY KEY,                    -- e.g., "dca_bot_1234567890"
    user_id UUID REFERENCES public.users(id),   -- Links bot to user
    name TEXT NOT NULL,                         -- Bot name
    bot_type TEXT NOT NULL,                     -- 'dca', 'rsi_amo', 'grid', etc.
    status TEXT NOT NULL,                       -- 'active', 'inactive', 'running', 'stopped', 'error', 'paused'
    symbol TEXT NOT NULL,                       -- Trading pair (e.g., "BTCUSDT")
    interval TEXT NOT NULL,                     -- Time interval (e.g., "1m", "1h")
    config JSONB NOT NULL,                     -- Full bot configuration
    required_capital DECIMAL(20,8),            -- Required capital
    max_position_size DECIMAL(20,8),           -- Max position size
    risk_per_trade DECIMAL(5,4),              -- Risk per trade (0.01 = 1%)
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### Key Points:

1. **One User → Many Bots**: Each bot has a `user_id` foreign key, allowing unlimited bots per user
2. **Bot ID Format**: `bot_id` is TEXT (not UUID) - format: `"dca_bot_{timestamp}"` or `"bot_{timestamp}"`
3. **Row Level Security (RLS)**: Users can only access their own bots
   ```sql
   CREATE POLICY "Users can manage own bots" ON public.bots
       FOR ALL USING (auth.uid() = user_id);
   ```

### Creating Multiple Bots

**API Endpoint**: `POST /bots/dca-bots`

```python
# Example: User creates multiple DCA bots
bot1 = {
    "user_id": "user-123",
    "botName": "BTC DCA Bot",
    "selectedPairs": ["BTCUSDT"],
    "baseOrderSize": 100,
    "conditionConfig": {...},
    "dcaRules": {...}
}

bot2 = {
    "user_id": "user-123",  # Same user
    "botName": "ETH DCA Bot",
    "selectedPairs": ["ETHUSDT"],
    "baseOrderSize": 50,
    ...
}
```

**Result**: Both bots are stored with the same `user_id` but different `bot_id` values.

### Bot Status Lifecycle

```
inactive → running → stopped/error/paused
         ↓
      active (when conditions met)
```

---

## 3. Live Data Fetching

### Market Data Service

**Location**: `apps/bots/market_data.py`

**Class**: `MarketDataService`

### Data Sources

1. **Binance REST API** (via `BinanceClient`)
   - Current prices: `get_ticker_price(symbol)`
   - Historical klines: `get_klines(symbol, interval, limit)`
   - 24hr ticker: `get_ticker_24hr(symbol)`

2. **WebSocket** (for real-time updates)
   - Frontend uses: `wss://stream.binance.com:9443/ws/{symbol}@kline_{interval}`
   - Backend can use WebSocket for live price feeds

### Data Flow

```
┌─────────────────┐
│  DCA Executor   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ MarketDataService│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ BinanceClient   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Binance API    │
└─────────────────┘
```

### Example: Fetching Data for Bot

```python
# In DCABotExecutor.execute_once()
for pair in selected_pairs:
    # Get current price
    price = await self.market_data.get_current_price(pair)
    
    # Get historical data for indicators/regime detection
    df = await self.market_data.get_klines_as_dataframe(
        pair, 
        timeframe="1h", 
        limit=200
    )
    
    # Use data for:
    # - Entry condition evaluation
    # - Market regime detection
    # - Emergency brake checks
    # - Support/resistance levels
```

### Data Caching

- **No explicit caching** in current implementation
- Each bot execution fetches fresh data
- Can be optimized with Redis caching (future enhancement)

---

## 4. Alert Integration

### How Alerts Trigger Bots

**Flow**:
```
Alert Triggered → Alert Runner → Dispatch System → Bot Action Handler → Bot Execution
```

### Alert Action Types

**1. Bot Trigger Action**:
```json
{
  "type": "bot_trigger",
  "bot_id": "dca_bot_1234567890",
  "action_type": "execute_entry"  // or "execute_dca"
}
```

**2. Alert Creation for Bot Entry**:
When a DCA bot is created with entry conditions, the system automatically creates an alert:

```python
# In apps/api/routers/bots.py - create_dca_bot()
alert = {
    "user_id": user_id,
    "symbol": primary_pair,
    "base_timeframe": "15m",
    "conditions": [...],  # Extracted from bot config
    "logic": "AND",
    "action": {
        "type": "bot_trigger",
        "bot_id": bot_id,
        "action_type": "execute_entry"
    },
    "status": "active"
}
```

### Alert → Bot Execution Flow

**Step 1: Alert Runner Evaluates Conditions**
```python
# apps/alerts/runner.py
async def run_once(manager: AlertManager):
    alerts = manager.fetch_active_alerts()  # Gets all active alerts
    for alert in alerts:
        payload = manager.evaluate_alert(alert)  # Check if conditions met
        if payload:  # Condition triggered
            await dispatch.dispatch_alert_action(alert, payload["snapshot"])
```

**Step 2: Dispatch System Routes to Bot Handler**
```python
# apps/alerts/dispatch.py
async def dispatch_alert_action(alert, snapshot):
    action = alert.get("action", {})
    if action.get("type") == "bot_trigger":
        from apps.bots.bot_action_handler import execute_bot_action
        await execute_bot_action(action, {
            "alert_id": alert.get("alert_id"),
            "user_id": alert.get("user_id"),
            "symbol": alert.get("symbol"),
            "snapshot": snapshot
        })
```

**Step 3: Bot Action Handler Executes Bot Action**
```python
# apps/bots/bot_action_handler.py
async def execute_bot_action(action, alert_data):
    bot_id = action.get("bot_id")
    action_type = action.get("action_type")
    
    # Fetch bot config from database
    bot_config = supabase.table("bots").select("*").eq("bot_id", bot_id).execute()
    
    if action_type == "execute_entry":
        await _execute_entry_order(bot_config, alert_data)
    elif action_type == "execute_dca":
        await _execute_dca_order(bot_config, dca_index, alert_data)
```

### DCA Alerts Creation

When entry order executes, system creates alerts for subsequent DCA orders:

```python
# In bot_action_handler.py
async def _create_dca_alerts(bot_config, entry_price):
    for i, level in enumerate(dca_levels):
        price_drop_percent = level.get("priceDropPercent", 5)
        price_threshold = entry_price * (1 - price_drop_percent / 100.0)
        
        alert = {
            "user_id": user_id,
            "symbol": symbol,
            "base_timeframe": "1m",
            "conditions": [{
                "type": "price",
                "operator": "<=",
                "compareValue": price_threshold
            }],
            "action": {
                "type": "bot_trigger",
                "bot_id": bot_id,
                "action_type": "execute_dca",
                "dca_index": i
            }
        }
        supabase.table("alerts").insert(alert).execute()
```

---

## 5. Condition Creation & Execution

### Condition Types

**1. Indicator Conditions**:
```json
{
  "type": "indicator",
  "indicator": "RSI",
  "component": "RSI",
  "operator": "<",
  "compareWith": "value",
  "compareValue": 30,
  "timeframe": "same",
  "settings": {"length": 14}
}
```

**2. Price Conditions**:
```json
{
  "type": "price",
  "operator": ">",
  "compareWith": "indicator_component",
  "rhs": {
    "indicator": "EMA",
    "component": "EMA",
    "settings": {"period": 20}
  },
  "timeframe": "same"
}
```

**3. Volume Conditions**:
```json
{
  "type": "volume",
  "operator": ">",
  "compareWith": "value",
  "compareValue": 1000000,
  "timeframe": "same"
}
```

### Condition Extraction from Bot Config

**Location**: `apps/api/routers/bots.py` - `extract_conditions_from_dca_config()`

**Process**:
1. **Playbook Mode**: Multiple conditions with AND/OR logic
2. **Simple Mode**: Single condition
3. **Custom DCA Rules**: Custom conditions for DCA triggers

```python
def extract_conditions_from_dca_config(bot_config, symbol):
    conditions = []
    condition_config = bot_config.get("conditionConfig")
    
    if condition_config.get("mode") == "playbook":
        # Extract all playbook conditions
        for playbook_condition in condition_config.get("conditions", []):
            condition = {
                "type": "indicator" or "price",
                "indicator": ...,
                "operator": ...,
                "compareValue": ...,
                ...
            }
            conditions.append(condition)
    
    return conditions
```

### Condition Evaluation

**Location**: `backend/evaluator.py`

**Process**:
```python
def evaluate_condition(df: pd.DataFrame, row_index: int, condition: Dict) -> bool:
    row = df.iloc[row_index]
    condition_type = condition.get("type")
    
    if condition_type == "indicator":
        return _evaluate_indicator_condition(row, condition, operator, compare_with)
    elif condition_type == "price":
        return _evaluate_price_condition(row, condition, operator, compare_with)
    elif condition_type == "volume":
        return _evaluate_volume_condition(row, condition, operator, compare_with)
```

**In Alert Manager**:
```python
# apps/alerts/alert_manager.py
def evaluate_alert(self, alert: Dict) -> Optional[Dict]:
    symbol = alert.get("symbol")
    base_tf = alert.get("base_timeframe")
    
    # Get base dataframe
    base_df = self._get_base_df(symbol, base_tf)
    
    # Resolve timeframes for each condition
    for condition in alert.get("conditions", []):
        cond_tf = condition.get("timeframe", "same")
        cond_df = self._resolve_tf_df(base_df, cond_tf, base_tf, symbol)
        
        # Apply indicators
        cond_df = self._apply_needed_indicators(cond_df, [condition])
        
        # Evaluate condition
        if not evaluate_condition(cond_df, -1, condition):
            return None  # Condition not met
    
    # All conditions met - return snapshot
    return {"snapshot": {...}, "triggered": True}
```

---

## 6. Logging System

### Log Tables

**1. Bot Runs** (`public.bot_runs`):
```sql
CREATE TABLE public.bot_runs (
    run_id UUID PRIMARY KEY,
    bot_id TEXT REFERENCES public.bots(bot_id),
    user_id UUID REFERENCES public.users(id),
    status TEXT,  -- 'running', 'completed', 'stopped', 'error'
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    total_trades INTEGER,
    total_pnl DECIMAL(20,8),
    max_drawdown DECIMAL(20,8),
    sharpe_ratio DECIMAL(10,4),
    meta JSONB
);
```

**2. Order Logs** (`public.order_logs`):
```sql
CREATE TABLE public.order_logs (
    order_id UUID PRIMARY KEY,
    bot_id TEXT REFERENCES public.bots(bot_id),
    run_id UUID REFERENCES public.bot_runs(run_id),
    user_id UUID REFERENCES public.users(id),
    symbol TEXT,
    side TEXT,  -- 'buy', 'sell'
    qty DECIMAL(20,8),
    order_type TEXT,  -- 'market', 'limit', 'stop', 'stop_limit'
    status TEXT,  -- 'pending', 'filled', 'cancelled', etc.
    filled_qty DECIMAL(20,8),
    avg_price DECIMAL(20,8),
    fees DECIMAL(20,8),
    created_at TIMESTAMP
);
```

**3. Alert Logs** (`public.alerts_log`):
```sql
CREATE TABLE public.alerts_log (
    id BIGSERIAL PRIMARY KEY,
    alert_id UUID REFERENCES public.alerts(alert_id),
    triggered_at TIMESTAMP,
    payload JSONB  -- Snapshot of market data when alert fired
);
```

**4. Positions** (`public.positions`):
```sql
CREATE TABLE public.positions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    symbol TEXT,
    qty DECIMAL(20,8),
    avg_price DECIMAL(20,8),
    current_price DECIMAL(20,8),
    unrealized_pnl DECIMAL(20,8),
    unrealized_pnl_percent DECIMAL(10,4),
    updated_at TIMESTAMP,
    UNIQUE(user_id, symbol)
);
```

### Logging Flow

**1. Bot Start**:
```python
# In bot_runner.py
run_id = db_service.create_bot_run(
    bot_id=bot_id,
    user_id=user_id,
    status="running"
)
```

**2. Order Execution**:
```python
# In paper_trading.py or real trading
db_service.log_order(
    bot_id=bot_id,
    run_id=run_id,
    user_id=user_id,
    symbol=symbol,
    side="buy",
    qty=quantity,
    order_type="market",
    status="filled",
    filled_qty=quantity,
    avg_price=price,
    fees=fees
)
```

**3. Alert Trigger**:
```python
# In alert_manager.py
def log_and_dispatch(self, alert, payload):
    # Log alert trigger
    supabase.table("alerts_log").insert({
        "alert_id": alert.get("alert_id"),
        "triggered_at": datetime.now(),
        "payload": payload
    }).execute()
    
    # Dispatch action
    dispatch.dispatch_alert_action(alert, payload)
```

**4. Position Updates**:
```python
# In paper_trading.py
db_service.upsert_position(
    user_id=user_id,
    symbol=symbol,
    qty=total_qty,
    avg_price=avg_entry_price,
    current_price=current_price,
    unrealized_pnl=pnl_amount,
    unrealized_pnl_percent=pnl_percent
)
```

### Querying Logs

**Get Bot Orders**:
```sql
SELECT * FROM public.order_logs
WHERE bot_id = 'dca_bot_1234567890'
AND user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 100;
```

**Get Alert Logs for Bot**:
```sql
SELECT al.*, a.symbol
FROM public.alerts_log al
JOIN public.alerts a ON al.alert_id = a.alert_id
WHERE a.user_id = auth.uid()
AND a.action->>'bot_id' = 'dca_bot_1234567890'
ORDER BY al.triggered_at DESC;
```

**Get Bot Run Statistics**:
```sql
SELECT 
    br.*,
    COUNT(ol.order_id) as total_orders,
    SUM(ol.filled_qty * ol.avg_price) as total_volume
FROM public.bot_runs br
LEFT JOIN public.order_logs ol ON br.run_id = ol.run_id
WHERE br.bot_id = 'dca_bot_1234567890'
AND br.user_id = auth.uid()
GROUP BY br.run_id;
```

---

## 7. Complete Flow Diagram

### Bot Creation Flow

```
User Creates Bot
      │
      ▼
POST /bots/dca-bots
      │
      ▼
Extract Conditions from Config
      │
      ▼
Register Conditions in Condition Registry
      │
      ▼
Subscribe Bot to Conditions
      │
      ▼
Create Alert for Entry Condition
      │
      ▼
Save Bot to Database (bots table)
      │
      ▼
Store Bot Config in Memory (BotManager)
      │
      ▼
Return bot_id to User
```

### Bot Execution Flow

```
Alert Runner Polls Alerts (every 1 second)
      │
      ▼
Fetch Active Alerts (including bot entry alerts)
      │
      ▼
For Each Alert:
  - Fetch Market Data
  - Calculate Indicators
  - Evaluate Conditions
      │
      ▼
Condition Met? ──No──> Continue to Next Alert
      │
     Yes
      │
      ▼
Log Alert Trigger (alerts_log table)
      │
      ▼
Dispatch Alert Action
      │
      ▼
Action Type = "bot_trigger"?
      │
      ▼
Execute Bot Action (bot_action_handler.py)
      │
      ▼
Fetch Bot Config from Database
      │
      ▼
Execute Entry Order (or DCA Order)
      │
      ▼
Log Order (order_logs table)
      │
      ▼
Update Position (positions table)
      │
      ▼
Create DCA Alerts (if entry order)
      │
      ▼
Disable Entry Alert (already triggered)
```

### Bot Running Flow (Paper Trading)

```
User Starts Bot
      │
      ▼
POST /bots/dca-bots/{bot_id}/start-paper
      │
      ▼
Create Bot Run (bot_runs table)
      │
      ▼
Initialize BotRunner
      │
      ▼
Initialize DCABotExecutor
      │
      ▼
Initialize MarketDataService
      │
      ▼
Initialize PaperTradingEngine
      │
      ▼
Start Execution Loop (every 60 seconds)
      │
      ▼
For Each Iteration:
  - Fetch Current Prices
  - Get Market Data (for indicators)
  - Check Market Regime
  - Check Emergency Brake
  - Check Entry Conditions
  - Check DCA Rules
  - Execute Orders (if conditions met)
  - Check Profit Targets
  - Update Statistics
      │
      ▼
Log Orders & Update Positions
      │
      ▼
Update Bot Run Statistics (every 5 iterations)
```

---

## 8. Key Features

### Multi-User Support
- ✅ Each bot is tagged with `user_id`
- ✅ RLS ensures users only see their bots
- ✅ Users can have unlimited bots

### Multi-Bot Support
- ✅ Each user can create multiple DCA bots
- ✅ Each bot can trade different symbols
- ✅ Each bot has independent configuration

### Live Data
- ✅ Real-time price fetching from Binance
- ✅ Historical kline data for indicators
- ✅ WebSocket support for real-time updates

### Alert Integration
- ✅ Automatic alert creation for bot entry conditions
- ✅ Alert triggers bot execution
- ✅ DCA alerts created dynamically

### Condition System
- ✅ Multiple condition types (indicator, price, volume)
- ✅ Playbook mode (multiple conditions with AND/OR)
- ✅ Multi-timeframe support
- ✅ Automatic indicator calculation

### Comprehensive Logging
- ✅ Bot runs tracked
- ✅ All orders logged
- ✅ Alert triggers logged
- ✅ Positions tracked
- ✅ P&L calculated

---

## 9. API Endpoints

### Bot Management
- `POST /bots/dca-bots` - Create DCA bot
- `GET /bots/` - List user's bots
- `GET /bots/dca-bots/{bot_id}/status` - Get bot status
- `POST /bots/dca-bots/{bot_id}/start-paper` - Start bot (paper trading)
- `POST /bots/dca-bots/{bot_id}/stop` - Stop bot
- `POST /bots/dca-bots/{bot_id}/pause` - Pause bot
- `POST /bots/dca-bots/{bot_id}/resume` - Resume bot

### Bot Data
- `GET /bots/dca-bots/{bot_id}/positions` - Get positions
- `GET /bots/dca-bots/{bot_id}/orders` - Get order history
- `GET /bots/dca-bots/{bot_id}/pnl` - Get P&L summary

### Alert Integration
- `POST /alerts` - Create alert (can trigger bot)
- `GET /alerts/{alert_id}/logs` - Get alert trigger logs

---

## 10. Example: Complete User Journey

**Step 1: User Creates DCA Bot**
```json
POST /bots/dca-bots
{
  "user_id": "user-123",
  "botName": "BTC DCA Bot",
  "selectedPairs": ["BTCUSDT"],
  "baseOrderSize": 100,
  "conditionConfig": {
    "mode": "playbook",
    "conditions": [{
      "conditionType": "indicator",
      "condition": {
        "indicator": "RSI",
        "operator": "<",
        "compareValue": 30
      }
    }]
  },
  "dcaRules": {
    "ruleType": "down_from_last_entry",
    "percentage": 5
  }
}
```

**Step 2: System Creates Alert**
```json
{
  "user_id": "user-123",
  "symbol": "BTCUSDT",
  "base_timeframe": "1h",
  "conditions": [{
    "type": "indicator",
    "indicator": "RSI",
    "operator": "<",
    "compareValue": 30
  }],
  "action": {
    "type": "bot_trigger",
    "bot_id": "dca_bot_1234567890",
    "action_type": "execute_entry"
  }
}
```

**Step 3: Alert Runner Evaluates**
- Every 1 second, alert runner checks if RSI < 30
- When condition met, alert fires

**Step 4: Bot Executes Entry**
- Bot action handler receives trigger
- Executes entry order
- Logs order to `order_logs`
- Creates DCA alerts for subsequent orders

**Step 5: DCA Orders Execute**
- When price drops 5% from entry, DCA alert fires
- Bot executes DCA order
- Process continues

**Step 6: User Monitors**
- User queries `/bots/dca-bots/{bot_id}/status` for real-time stats
- User queries `/bots/dca-bots/{bot_id}/orders` for order history
- User queries `/alerts/{alert_id}/logs` for alert triggers

---

## Summary

**User Association**: ✅ Each bot has `user_id`, users can have unlimited bots

**Live Data**: ✅ Fetched from Binance via REST API and WebSocket

**Alert Integration**: ✅ Alerts automatically created and trigger bot execution

**Conditions**: ✅ Extracted from bot config, evaluated by alert runner

**Logging**: ✅ Comprehensive logging in `bot_runs`, `order_logs`, `alerts_log`, `positions`

**Complete System**: ✅ End-to-end flow from bot creation to order execution to logging


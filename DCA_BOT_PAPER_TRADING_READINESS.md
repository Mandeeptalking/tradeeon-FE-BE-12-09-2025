# DCA Bot Paper Trading Readiness Assessment

## Current Logging Status

### ✅ What's Already Logged

1. **Orders (order_logs table)**
   - All buy/sell orders are logged with:
     - `created_at` timestamp (when order was created)
     - `updated_at` timestamp (when order status changed)
     - Order details: symbol, side, qty, price, status, fees
   - **Location**: `apps/bots/paper_trading.py` lines 186-200, 309-324

2. **Bot Runs (bot_runs table)**
   - Bot run start time: `started_at`
   - Bot run end time: `ended_at` (when stopped/completed)
   - Run statistics: total_trades, total_pnl, max_drawdown
   - **Location**: `apps/bots/db_service.py` lines 141-166, 168-202

3. **Positions (positions table)**
   - Position updates with `updated_at` timestamp
   - Tracks: qty, avg_price, current_price, unrealized_pnl
   - **Location**: `apps/bots/paper_trading.py` lines 203-213, 327-343

4. **Balance (funds table)**
   - Balance updates with timestamps
   - Tracks free and locked balances
   - **Location**: `apps/bots/paper_trading.py` lines 215-223, 345-353

5. **Python Logging**
   - Console/file logging via Python's logging module
   - Logs entry conditions, DCA execution, errors
   - **Location**: `apps/bots/dca_executor.py` throughout

### ⚠️ What's Missing

1. **Structured Event Logging**
   - No dedicated event log table for all bot activities
   - Events like "condition evaluated", "DCA triggered", "profit target hit" are only in Python logs
   - No easy way to query "what happened between trade X and Y"

2. **Comprehensive Event Tracking**
   - Entry condition evaluations (pass/fail with details)
   - DCA rule evaluations (which rule triggered)
   - Market regime checks (pause/resume events)
   - Emergency brake triggers
   - Profit target checks
   - Dynamic scaling calculations

3. **Event Timeline**
   - No unified view of all events in chronological order
   - Hard to trace "why did bot execute trade at this time"

4. **API Endpoints for Logs**
   - No endpoint to retrieve bot event logs
   - No endpoint to view order history with filters
   - No endpoint to view bot run timeline

## Recommendations

### Priority 1: Create Bot Events Table

Create a `bot_events` table to log all bot activities:

```sql
CREATE TABLE IF NOT EXISTS public.bot_events (
    event_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id TEXT REFERENCES public.bots(bot_id) ON DELETE CASCADE NOT NULL,
    run_id UUID REFERENCES public.bot_runs(run_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL, -- 'entry_condition', 'dca_triggered', 'order_executed', 'profit_target', 'market_regime', 'emergency_brake', etc.
    event_category TEXT NOT NULL, -- 'condition', 'execution', 'risk', 'system'
    symbol TEXT,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_bot_events_bot_id (bot_id),
    INDEX idx_bot_events_run_id (run_id),
    INDEX idx_bot_events_created_at (created_at)
);
```

### Priority 2: Enhance Event Logging

Add event logging to:
- Entry condition evaluation (pass/fail with condition details)
- DCA rule evaluation (which rule triggered, why)
- Market regime detection (pause/resume with reason)
- Emergency brake checks (triggered or not, reason)
- Profit target checks (target hit, action taken)
- Dynamic scaling (multiplier applied, reason)
- Order execution (before and after state)

### Priority 3: Add Logging API Endpoints

Create endpoints:
- `GET /bots/{bot_id}/events` - Get all events for a bot
- `GET /bots/{bot_id}/runs/{run_id}/events` - Get events for a specific run
- `GET /bots/{bot_id}/orders` - Get order history
- `GET /bots/{bot_id}/timeline` - Get chronological event timeline

## Current Readiness: 70%

### Ready ✅
- Order logging with timestamps
- Bot run tracking
- Position tracking
- Balance tracking
- Python console logging

### Needs Enhancement ⚠️
- Structured event logging
- Event timeline view
- API endpoints for log retrieval
- More detailed event context

## Next Steps

1. Create `bot_events` table
2. Add event logging functions to `db_service.py`
3. Enhance `dca_executor.py` to log all events
4. Create API endpoints for log retrieval
5. Test with paper trading


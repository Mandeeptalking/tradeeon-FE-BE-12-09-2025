# Logging System Analysis

## Overview

This document provides a comprehensive analysis of how the logging system works in the Tradeeon application, covering both backend event logging and frontend log display.

## Architecture

### 1. Database Schema

The logging system uses the `bot_events` table in Supabase to store all bot execution events.

**Table Structure** (`infra/supabase/migrations/003_bot_events.sql`):
```sql
CREATE TABLE IF NOT EXISTS public.bot_events (
    event_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id TEXT REFERENCES public.bots(bot_id) ON DELETE CASCADE NOT NULL,
    run_id UUID REFERENCES public.bot_runs(run_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,  -- e.g., 'entry_condition', 'dca_triggered', 'order_executed'
    event_category TEXT NOT NULL,  -- 'condition', 'execution', 'risk', 'system', 'position'
    symbol TEXT,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields:**
- `event_id`: Unique identifier for each event
- `bot_id`: Links event to a specific bot
- `run_id`: Links event to a specific bot run/session
- `user_id`: Ensures user can only see their own events (RLS)
- `event_type`: Specific type of event (e.g., 'bot_initialized', 'dca_triggered')
- `event_category`: High-level category for filtering
- `message`: Human-readable description
- `details`: JSON object with additional event data
- `created_at`: Timestamp for chronological sorting

**Indexes:**
- `idx_bot_events_bot_id`: Fast lookups by bot
- `idx_bot_events_run_id`: Fast lookups by run
- `idx_bot_events_user_id`: Fast lookups by user
- `idx_bot_events_created_at`: Fast chronological sorting
- `idx_bot_events_event_type`: Fast filtering by type

**Row Level Security (RLS):**
- Users can only SELECT their own events
- Service role can INSERT events (bypasses RLS for bot execution)

---

## 2. Backend Event Logging

### 2.1 Logging Service (`apps/bots/db_service.py`)

The `BotDatabaseService` class provides the `log_event()` method:

```python
def log_event(
    self,
    bot_id: str,
    run_id: Optional[str],
    user_id: str,
    event_type: str,
    event_category: str,
    message: str,
    symbol: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> bool:
    """Log a bot event to the database."""
```

**Process:**
1. Checks if database service is enabled
2. Builds event data dictionary
3. Inserts into `bot_events` table via Supabase
4. Returns True/False for success/failure

**Example Usage:**
```python
db_service.log_event(
    bot_id="dca_bot_1234567890",
    run_id="550e8400-e29b-41d4-a716-446655440000",
    user_id="user-uuid-here",
    event_type="bot_initialized",
    event_category="system",
    message="DCA bot 'My Bot' initialized in paper trading mode",
    details={"bot_name": "My Bot", "paper_trading": True}
)
```

### 2.2 Event Logging Locations

Events are logged throughout the bot execution lifecycle:

**Initialization** (`apps/bots/dca_executor.py:77`):
- Event type: `bot_initialized`
- Category: `system`
- Logged when bot starts

**Balance Setup** (`apps/bots/dca_executor.py:102`):
- Event type: `balance_initialized`
- Category: `system`
- Logged when paper trading balance is set

**Pause Events** (`apps/bots/dca_executor.py:120`):
- Event type: `bot_paused`
- Category: `system`
- Logged when market regime pauses bot

**Market Regime Override** (`apps/bots/dca_executor.py:186`):
- Event type: `market_regime_override`
- Category: `risk`
- Logged when entry condition overrides market regime pause

**Entry Condition Checks** (`apps/bots/dca_executor.py:203, 220`):
- Event type: `entry_condition_evaluated`
- Category: `condition`
- Logged when entry conditions are evaluated

**DCA Triggers** (`apps/bots/dca_executor.py:260`):
- Event type: `dca_triggered`
- Category: `execution`
- Logged when DCA order is triggered

**Order Execution** (`apps/bots/dca_executor.py:285, 314, 361, 375, 393`):
- Event type: `order_executed`, `order_failed`
- Category: `execution`
- Logged when orders are placed/filled/failed

**Profit Target** (`apps/bots/dca_executor.py:557, 571`):
- Event type: `profit_target_reached`
- Category: `position`
- Logged when profit target is hit

**Emergency Brake** (`apps/bots/dca_executor.py:636, 650`):
- Event type: `emergency_brake_triggered`
- Category: `risk`
- Logged when emergency brake activates

**Errors** (`apps/bots/dca_executor.py:971, 1013`):
- Event type: `error`
- Category: `system`
- Logged when errors occur

**Paper Trading Events** (`apps/bots/paper_trading.py:229, 378`):
- Event type: `buy_order_executed`, `sell_order_executed`
- Category: `execution`
- Logged when paper trades are executed

**Bot Management** (`apps/bots/bot_execution_service.py:159, 174`):
- Event type: `bot_started`, `bot_stopped`
- Category: `system`
- Logged when bot is started/stopped

### 2.3 Event Types Catalog

**System Events:**
- `bot_initialized`
- `bot_started`
- `bot_stopped`
- `bot_paused`
- `balance_initialized`
- `error`

**Condition Events:**
- `entry_condition_evaluated`
- `entry_condition_met`
- `entry_condition_failed`

**Execution Events:**
- `dca_triggered`
- `order_executed`
- `order_failed`
- `buy_order_executed`
- `sell_order_executed`

**Position Events:**
- `profit_target_reached`
- `position_opened`
- `position_closed`

**Risk Events:**
- `market_regime_override`
- `emergency_brake_triggered`
- `cooldown_active`

---

## 3. Frontend Log Display

### 3.1 API Endpoints

**Get Bot Events** (`apps/api/routers/bots.py:477`):
```
GET /bots/dca-bots/{bot_id}/events
Query Parameters:
  - run_id: Optional filter by run
  - event_type: Optional filter by type
  - limit: Number of events (default: 100, max: 1000)
  - offset: Pagination offset
```

**Response Format:**
```json
{
  "success": true,
  "events": [
    {
      "event_id": "uuid",
      "bot_id": "dca_bot_123",
      "run_id": "uuid",
      "user_id": "uuid",
      "event_type": "dca_triggered",
      "event_category": "execution",
      "symbol": "BTCUSDT",
      "message": "DCA order triggered for BTCUSDT",
      "details": {...},
      "created_at": "2025-01-12T10:30:00Z"
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

**Get Bot Status** (`apps/api/routers/bots.py:379`):
```
GET /bots/dca-bots/{bot_id}/status
```

Returns recent activity including last 5 events:
```json
{
  "recent_activity": {
    "events_count": 5,
    "events": [...]
  }
}
```

**Get Timeline** (`apps/api/routers/bots.py:609`):
```
GET /bots/dca-bots/{bot_id}/timeline
Query Parameters:
  - run_id: Optional filter
  - limit: Number of items (default: 200)
```

Combines events and orders in chronological order.

### 3.2 Frontend Components

**BotLogsPage** (`apps/frontend/src/pages/BotLogsPage.tsx`):
- Full-page view for bot logs
- Displays Overview, Events, Orders, and Timeline tabs
- Auto-refreshes every 10 seconds
- Shows stats: Status, Total Orders, Total Events, Last Activity

**BotLogsModal** (`apps/frontend/src/components/bots/BotLogsModal.tsx`):
- Modal popup for quick log viewing
- Same tabs as full page
- Auto-refreshes every 5 seconds

**Key Features:**
- Event filtering and sorting
- Expandable details for each event
- Color-coded icons by event type
- Real-time updates
- Error handling with helpful messages

### 3.3 Data Flow

```
┌─────────────────┐
│  Bot Execution  │
│  (Backend)      │
└────────┬────────┘
         │
         │ db_service.log_event()
         ▼
┌─────────────────┐
│  bot_events     │
│  (Supabase)     │
└────────┬────────┘
         │
         │ SELECT query
         ▼
┌─────────────────┐
│  API Router     │
│  /events        │
└────────┬────────┘
         │
         │ GET /bots/dca-bots/{id}/events
         ▼
┌─────────────────┐
│  Frontend       │
│  BotLogsPage    │
└─────────────────┘
```

---

## 4. Event Categories and Types

### Category: `system`
- Bot lifecycle events
- Initialization, start, stop, pause
- Errors and warnings
- Balance setup

### Category: `condition`
- Entry condition evaluation
- Condition met/failed
- Market analysis results

### Category: `execution`
- Order placement
- Order execution
- DCA triggers
- Trade fills

### Category: `position`
- Position opened/closed
- Profit targets reached
- Position updates

### Category: `risk`
- Emergency brake activations
- Market regime pauses
- Cooldown periods
- Risk management actions

---

## 5. Query Patterns

### Get All Events for a Bot
```sql
SELECT * FROM bot_events
WHERE bot_id = 'dca_bot_123'
  AND user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 100;
```

### Get Events by Type
```sql
SELECT * FROM bot_events
WHERE bot_id = 'dca_bot_123'
  AND event_type = 'order_executed'
ORDER BY created_at DESC;
```

### Get Recent Activity
```sql
SELECT * FROM bot_events
WHERE bot_id = 'dca_bot_123'
ORDER BY created_at DESC
LIMIT 5;
```

### Get Events for a Run
```sql
SELECT * FROM bot_events
WHERE run_id = 'run-uuid'
ORDER BY created_at ASC;
```

---

## 6. Frontend API Integration

**API Client** (`apps/frontend/src/lib/api/auth.ts`):
Uses `authenticatedFetch()` for authenticated requests.

**Fetch Events Example:**
```typescript
const API_BASE_URL = getApiBaseUrl();
const response = await authenticatedFetch(
  `${API_BASE_URL}/bots/dca-bots/${botId}/events?limit=100`
);
const data = await response.json();
const events = data.events || [];
```

**Error Handling:**
- Checks for empty events array
- Shows helpful messages when no events found
- Logs errors to console for debugging
- Displays user-friendly error messages

---

## 7. Best Practices

### Backend Logging:
1. **Always include context**: bot_id, user_id, run_id when available
2. **Use descriptive messages**: Clear, human-readable descriptions
3. **Store details in JSONB**: Additional context in `details` field
4. **Categorize correctly**: Use appropriate event_category
5. **Handle errors gracefully**: Log failures but don't crash bot

### Frontend Display:
1. **Show recent events first**: Default to DESC order
2. **Provide filtering**: By type, category, run_id
3. **Real-time updates**: Auto-refresh for active bots
4. **User-friendly format**: Format timestamps, show icons
5. **Handle empty states**: Clear messages when no events

---

## 8. Troubleshooting

### No Events Appearing:

1. **Check Database Table:**
   ```sql
   SELECT COUNT(*) FROM bot_events WHERE bot_id = 'your-bot-id';
   ```

2. **Check RLS Policies:**
   - Ensure user_id matches authenticated user
   - Verify RLS policy allows SELECT

3. **Check Backend Logging:**
   - Verify `db_service.enabled = True`
   - Check backend logs for "Failed to log event"
   - Ensure SUPABASE_SERVICE_ROLE_KEY is set

4. **Check Frontend:**
   - Open browser console (F12)
   - Check for API errors
   - Verify botId in URL is correct

### Events Not Logging:

1. **Database Service Disabled:**
   - Check `db_service.enabled` status
   - Verify Supabase connection

2. **Missing Required Fields:**
   - Ensure bot_id, user_id are set
   - Check that log_event() is called correctly

3. **RLS Blocking Inserts:**
   - Verify service role key is used
   - Check INSERT policy allows service role

---

## 9. Future Enhancements

### Possible Improvements:
1. **WebSocket Real-time Updates**: Push events to frontend as they occur
2. **Event Aggregation**: Group similar events for cleaner display
3. **Export Functionality**: Download logs as CSV/JSON
4. **Search/Filter UI**: Advanced filtering interface
5. **Event Analytics**: Charts and statistics on events
6. **Alerts on Critical Events**: Notify users of important events

---

## 10. Summary

The logging system provides:
- ✅ Comprehensive event tracking throughout bot execution
- ✅ Structured storage in Supabase `bot_events` table
- ✅ Secure access via RLS policies
- ✅ Frontend display in BotLogsPage and BotLogsModal
- ✅ Real-time updates via auto-refresh
- ✅ Filtering and pagination support
- ✅ Detailed event information with JSONB details

**Key Files:**
- Database Schema: `infra/supabase/migrations/003_bot_events.sql`
- Backend Logging: `apps/bots/db_service.py` (log_event method)
- Event Creation: `apps/bots/dca_executor.py` (multiple locations)
- API Endpoints: `apps/api/routers/bots.py` (events, status, timeline)
- Frontend Display: `apps/frontend/src/pages/BotLogsPage.tsx`
- Modal Component: `apps/frontend/src/components/bots/BotLogsModal.tsx`


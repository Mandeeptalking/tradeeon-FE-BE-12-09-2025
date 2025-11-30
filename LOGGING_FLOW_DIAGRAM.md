# Logging System Flow Diagram

## Complete Logging Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOT EXECUTION LIFECYCLE                       │
└─────────────────────────────────────────────────────────────────┘

1. Bot Start
   │
   ├─► BotExecutionService.start_bot()
   │       │
   │       └─► DCABotExecutor.initialize()
   │               │
   │               └─► db_service.log_event(
   │                       event_type="bot_initialized",
   │                       event_category="system"
   │                   )
   │
   └─► db_service.log_event(
           event_type="bot_started",
           event_category="system"
       )

2. Bot Execution Loop
   │
   ├─► DCABotExecutor.execute_once()
   │       │
   │       ├─► Check Market Regime
   │       │       │
   │       │       └─► db_service.log_event(
   │       │               event_type="market_regime_override",
   │       │               event_category="risk"
   │       │           )
   │       │
   │       ├─► Evaluate Entry Conditions
   │       │       │
   │       │       └─► db_service.log_event(
   │       │               event_type="entry_condition_evaluated",
   │       │               event_category="condition"
   │       │           )
   │       │
   │       ├─► Trigger DCA Order
   │       │       │
   │       │       └─► db_service.log_event(
   │       │               event_type="dca_triggered",
   │       │               event_category="execution"
   │       │           )
   │       │
   │       ├─► Execute Order (Paper Trading)
   │       │       │
   │       │       ├─► PaperTradingEngine.buy()
   │       │       │       │
   │       │       │       └─► db_service.log_event(
   │       │       │               event_type="buy_order_executed",
   │       │       │               event_category="execution"
   │       │       │           )
   │       │       │
   │       │       └─► db_service.log_order() → order_logs table
   │       │
   │       └─► Check Profit Target
   │               │
   │               └─► db_service.log_event(
   │                       event_type="profit_target_reached",
   │                       event_category="position"
   │                   )
   │
   └─► Repeat every interval_seconds

3. Bot Stop
   │
   └─► BotExecutionService.stop_bot()
           │
           └─► db_service.log_event(
                   event_type="bot_stopped",
                   event_category="system"
               )
```

## Database Insertion Flow

```
┌─────────────────┐
│  log_event()    │
│  Called         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Check if       │
│  db_service     │
│  enabled?       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
   NO        YES
    │         │
    └─────────┼─────────┐
              │         │
              ▼         ▼
    ┌─────────────┐   ┌──────────────────┐
    │ Return      │   │ Build event_data │
    │ False       │   │ dictionary       │
    └─────────────┘   └────────┬─────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ supabase.table(       │
                    │   "bot_events"        │
                    │ ).insert(event_data)  │
                    │ .execute()            │
                    └──────────┬────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
            ┌───────────────┐      ┌───────────────┐
            │ Success       │      │ Error         │
            │ Return True   │      │ Log Error     │
            │               │      │ Return False  │
            └───────────────┘      └───────────────┘
```

## Frontend Retrieval Flow

```
┌──────────────────────┐
│  User Opens          │
│  BotLogsPage         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  useEffect()         │
│  Triggers            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  fetchAll()          │
│  - fetchBotDetails() │
│  - fetchBotStatus()  │
│  - fetchEvents()     │
│  - fetchOrders()     │
│  - fetchTimeline()   │
└──────────┬───────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  authenticatedFetch(                │
│    /bots/dca-bots/{botId}/events    │
│  )                                  │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────┐
│  API Router          │
│  get_bot_events()    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Verify bot belongs  │
│  to user (RLS)       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Query Supabase:     │
│  bot_events table    │
│  WHERE bot_id = X    │
│  AND user_id = Y     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Return JSON:        │
│  {                   │
│    success: true,    │
│    events: [...],    │
│    total: 150        │
│  }                   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Frontend Updates    │
│  State:              │
│  setEvents(data)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  React Re-renders    │
│  UI with Events      │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Auto-refresh        │
│  Every 10 seconds    │
│  (if enabled)        │
└──────────────────────┘
```

## Event Types by Execution Phase

```
┌──────────────────────────────────────────────────────────┐
│ INITIALIZATION PHASE                                      │
├──────────────────────────────────────────────────────────┤
│ • bot_initialized       (system)                         │
│ • balance_initialized   (system)                         │
│ • bot_started           (system)                         │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ EXECUTION LOOP                                           │
├──────────────────────────────────────────────────────────┤
│ CONDITION CHECKING:                                      │
│ • entry_condition_evaluated (condition)                  │
│ • entry_condition_met      (condition)                   │
│ • entry_condition_failed   (condition)                   │
│                                                          │
│ RISK MANAGEMENT:                                         │
│ • market_regime_override    (risk)                      │
│ • bot_paused               (system)                     │
│ • emergency_brake_triggered (risk)                      │
│ • cooldown_check          (risk)                        │
│                                                          │
│ ORDER EXECUTION:                                         │
│ • dca_triggered           (execution)                   │
│ • order_executed          (execution)                   │
│ • buy_order_executed      (execution)                   │
│ • sell_order_executed     (execution)                   │
│ • order_failed            (execution)                   │
│                                                          │
│ POSITION MANAGEMENT:                                     │
│ • position_opened         (position)                    │
│ • profit_target_reached   (position)                    │
│ • position_closed         (position)                    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ TERMINATION PHASE                                        │
├──────────────────────────────────────────────────────────┤
│ • bot_stopped            (system)                        │
│ • error                  (system)                        │
└──────────────────────────────────────────────────────────┘
```

## Data Relationships

```
┌─────────────┐
│   users     │
│             │
│ id (PK)     │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────┐       ┌─────────────┐
│    bots     │       │  bot_runs   │
│             │       │             │
│ bot_id (PK) │◄──────┤ run_id (PK) │
│ user_id (FK)│  1:N  │ bot_id (FK) │
└──────┬──────┘       └──────┬──────┘
       │                     │
       │ 1:N                 │ 1:N
       │                     │
┌──────▼─────────────────────▼──────┐
│         bot_events                │
│                                   │
│ event_id (PK)                     │
│ bot_id (FK) ────────┐             │
│ run_id (FK) ────┐   │             │
│ user_id (FK) ───┼───┼─────────────┤
│ event_type      │   │             │
│ event_category  │   │             │
│ message         │   │             │
│ details (JSONB) │   │             │
│ created_at      │   │             │
└─────────────────┘   │             │
                      │             │
                      │             │
┌─────────────────────▼─────────────▼──────┐
│         order_logs                      │
│                                         │
│ order_id (PK)                           │
│ bot_id (FK) ────────────────────────────┤
│ run_id (FK) ────────────────────────────┤
│ user_id (FK) ───────────────────────────┤
│ symbol                                  │
│ side                                    │
│ qty                                     │
│ status                                  │
│ filled_qty                              │
│ avg_price                               │
└─────────────────────────────────────────┘
```

## Key Integration Points

### Backend → Database
- **Service**: `BotDatabaseService.log_event()`
- **Location**: `apps/bots/db_service.py:585`
- **Dependency**: Supabase client with service role key
- **RLS**: Service role bypasses RLS for inserts

### Database → API
- **Endpoint**: `GET /bots/dca-bots/{bot_id}/events`
- **Location**: `apps/api/routers/bots.py:477`
- **Filtering**: By run_id, event_type
- **Pagination**: limit, offset

### API → Frontend
- **Component**: `BotLogsPage.tsx`
- **Hook**: `useEffect()` for initial load
- **Auto-refresh**: `setInterval()` every 10 seconds
- **Authentication**: JWT token via `authenticatedFetch()`

---

## Summary

**Total Event Types**: ~20+ unique event types
**Event Categories**: 5 (system, condition, execution, position, risk)
**Database Tables**: 2 (bot_events, order_logs)
**API Endpoints**: 3 (events, status, timeline)
**Frontend Components**: 2 (BotLogsPage, BotLogsModal)

**Logging Points**: 56+ locations in codebase where events are logged


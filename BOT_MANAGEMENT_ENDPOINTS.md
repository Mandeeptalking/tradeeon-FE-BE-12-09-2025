# Bot Management Endpoints - Complete Guide

## Overview
All bot management operations are now fully integrated with the database. Bots can be created, listed, retrieved, started, paused, resumed, stopped, updated, and deleted with full database persistence.

---

## 📋 Complete Endpoint List

### 1. **List Bots** - `GET /bots`
**Get all bots for a user from database**
```http
GET /bots?user_id={user_id}&status={status}
```

**Parameters:**
- `user_id` (required): User ID
- `status` (optional): Filter by status (`active`, `inactive`, `running`, `stopped`, `paused`, `error`)

**Response:**
```json
{
  "success": true,
  "bots": [
    {
      "bot_id": "dca_bot_1234567890",
      "user_id": "user_123",
      "name": "My DCA Bot",
      "bot_type": "dca",
      "status": "running",
      "symbol": "BTC/USDT",
      "interval": "1h",
      "config": {...},
      "required_capital": 1000.0,
      "created_at": "2025-01-24T10:00:00Z",
      "updated_at": "2025-01-24T10:05:00Z"
    }
  ],
  "count": 1
}
```

**Database Integration:**
- ✅ Queries `public.bots` table filtered by `user_id`
- ✅ Filters by `status` if provided
- ✅ Returns empty list if database unavailable (graceful fallback)

---

### 2. **Get Bot** - `GET /bots/{bot_id}`
**Get specific bot details**
```http
GET /bots/{bot_id}
```

**Response:**
```json
{
  "success": true,
  "bot": {
    "bot_id": "dca_bot_1234567890",
    "user_id": "user_123",
    "name": "My DCA Bot",
    "bot_type": "dca",
    "status": "running",
    "symbol": "BTC/USDT",
    "interval": "1h",
    "config": {...},
    "required_capital": 1000.0
  }
}
```

**Database Integration:**
- ✅ Queries `public.bots` table by `bot_id`
- ✅ Falls back to in-memory storage if database unavailable
- ✅ Checks if bot is currently running (updates status)

---

### 3. **Create Bot** - `POST /bots/dca-bots`
**Create a new DCA bot**
```http
POST /bots/dca-bots
Content-Type: application/json

{
  "botName": "My DCA Bot",
  "direction": "long",
  "pair": "BTC/USDT",
  "selectedPairs": ["BTC/USDT"],
  ...
}
```

**Database Integration:**
- ✅ Saves to `public.bots` table
- ✅ Stores full config in JSONB column
- ✅ Returns bot_id for subsequent operations

---

### 4. **Start Bot** - `POST /bots/dca-bots/{bot_id}/start-paper`
**Start a bot in paper trading mode**
```http
POST /bots/dca-bots/{bot_id}/start-paper
Content-Type: application/json

{
  "initial_balance": 10000,
  "interval_seconds": 60,
  "use_live_data": true
}
```

**Database Integration:**
- ✅ Creates entry in `public.bot_runs` table
- ✅ Updates bot status to "running"
- ✅ Links bot_id, run_id, user_id to all operations
- ✅ Syncs initial balance to `public.funds`

---

### 5. **Pause Bot** - `POST /bots/{bot_id}/pause`
**Pause a running bot (temporarily stop execution)**
```http
POST /bots/{bot_id}/pause
```

**Response:**
```json
{
  "success": true,
  "message": "Bot dca_bot_1234567890 paused successfully"
}
```

**Database Integration:**
- ✅ Updates bot status to "paused" in `public.bots`
- ✅ Sets `executor.paused = True` (execution stops)
- ✅ Bot remains loaded (can be resumed)

---

### 6. **Resume Bot** - `POST /bots/{bot_id}/resume`
**Resume a paused bot**
```http
POST /bots/{bot_id}/resume
```

**Response:**
```json
{
  "success": true,
  "message": "Bot dca_bot_1234567890 resumed successfully"
}
```

**Database Integration:**
- ✅ Updates bot status to "running" in `public.bots`
- ✅ Sets `executor.paused = False` (execution resumes)
- ✅ Bot continues from where it left off

---

### 7. **Stop Bot** - `POST /bots/{bot_id}/stop`
**Stop a bot completely (unloads it)**
```http
POST /bots/{bot_id}/stop
```

**Response:**
```json
{
  "success": true,
  "message": "Bot dca_bot_1234567890 stopped successfully"
}
```

**Database Integration:**
- ✅ Updates `bot_runs` status to "stopped"
- ✅ Updates final statistics (total_trades, total_pnl)
- ✅ Updates bot status to "stopped" in `public.bots`
- ✅ Bot is unloaded from memory

---

### 8. **Update Bot** - `PUT /bots/{bot_id}`
**Update bot configuration**
```http
PUT /bots/{bot_id}
Content-Type: application/json

{
  "botName": "Updated Bot Name",
  "baseOrderSize": 150,
  ...
}
```

**Database Integration:**
- ✅ Updates `config` JSONB in `public.bots` table
- ✅ Updates `name` and `updated_at` timestamp
- ✅ Validates configuration before saving
- ❌ Blocks update if bot is running (must stop first)

---

### 9. **Delete Bot** - `DELETE /bots/{bot_id}`
**Delete a bot and all related data**
```http
DELETE /bots/{bot_id}
```

**Response:**
```json
{
  "success": true,
  "message": "Bot dca_bot_1234567890 deleted successfully. All related data (runs, orders) also deleted."
}
```

**Database Integration:**
- ✅ Deletes bot from `public.bots` table
- ✅ Cascade deletes all `bot_runs` (via foreign key)
- ✅ Cascade deletes all `order_logs` (via foreign key)
- ✅ Stops bot if currently running before deletion

---

### 10. **Get Bot Status** - `GET /bots/dca-bots/status/{bot_id}`
**Get real-time bot execution status**
```http
GET /bots/dca-bots/status/{bot_id}
```

**Response (Running Bot):**
```json
{
  "success": true,
  "bot_id": "dca_bot_1234567890",
  "status": "running",
  "paused": false,
  "running": true,
  "current_balance": 9500.00,
  "initial_balance": 10000.00,
  "total_pnl": -500.00,
  "total_return_pct": -5.00,
  "open_positions": 1,
  "positions": {...}
}
```

**Response (Not Running):**
```json
{
  "success": true,
  "bot_id": "dca_bot_1234567890",
  "status": "stopped",
  "running": false,
  "latest_run": {
    "run_id": "...",
    "total_trades": 5,
    "total_pnl": 25.50
  },
  "bot_info": {...}
}
```

**Database Integration:**
- ✅ Gets live status if bot is running
- ✅ Falls back to database if bot not running
- ✅ Returns latest run information from `public.bot_runs`

---

### 11. **Get Bot Runs** - `GET /bots/{bot_id}/runs`
**Get bot execution history**
```http
GET /bots/{bot_id}/runs?limit=20
```

**Response:**
```json
{
  "success": true,
  "runs": [
    {
      "run_id": "uuid-here",
      "bot_id": "dca_bot_1234567890",
      "user_id": "user_123",
      "status": "completed",
      "started_at": "2025-01-24T10:00:00Z",
      "ended_at": "2025-01-24T11:00:00Z",
      "total_trades": 5,
      "total_pnl": 25.50,
      "max_drawdown": 5.0,
      "sharpe_ratio": 1.2
    }
  ],
  "count": 1
}
```

**Database Integration:**
- ✅ Queries `public.bot_runs` table filtered by `bot_id`
- ✅ Ordered by `started_at` descending
- ✅ Limited by `limit` parameter

---

## 🔄 Bot State Flow

```
┌─────────────┐
│   Created   │ → POST /bots/dca-bots
│  (inactive) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Started   │ → POST /bots/dca-bots/{id}/start-paper
│  (running)  │
└──────┬──────┘
       │
       ├───► Pause → POST /bots/{id}/pause → (paused)
       │                                            │
       │                                            ├───► Resume → POST /bots/{id}/resume → (running)
       │                                            │
       │                                            ▼
       │                                         (running)
       │
       ▼
┌─────────────┐
│   Stopped   │ → POST /bots/{id}/stop
│  (stopped)  │
└──────┬──────┘
       │
       ├───► Update → PUT /bots/{id} → (still stopped)
       │
       ▼
┌─────────────┐
│   Deleted   │ → DELETE /bots/{id}
│             │   (all data removed)
└─────────────┘
```

---

## 📊 Database Tables Used

### `public.bots`
- **Operations**: Create, Read, Update, Delete
- **Status Values**: `inactive`, `running`, `paused`, `stopped`, `error`
- **Key Fields**: `bot_id`, `user_id`, `name`, `status`, `config` (JSONB)

### `public.bot_runs`
- **Operations**: Create (on start), Read, Update (periodically)
- **Status Values**: `running`, `completed`, `stopped`, `error`
- **Key Fields**: `run_id`, `bot_id`, `user_id`, `status`, `total_trades`, `total_pnl`

### `public.order_logs`
- **Operations**: Create (on each trade)
- **Key Fields**: `order_id`, `bot_id`, `run_id`, `symbol`, `side`, `qty`, `price`

### `public.positions`
- **Operations**: Upsert (on each trade), Delete (on position close)
- **Key Fields**: `user_id`, `symbol`, `qty`, `avg_price`, `unrealized_pnl`

### `public.funds`
- **Operations**: Upsert (on balance changes)
- **Key Fields**: `user_id`, `exchange`, `currency`, `free`, `locked`

---

## ✅ All Operations Link to Database

| Operation | Database Table | Action |
|-----------|---------------|--------|
| **List Bots** | `public.bots` | SELECT |
| **Get Bot** | `public.bots` | SELECT |
| **Create Bot** | `public.bots` | INSERT |
| **Start Bot** | `public.bots`, `public.bot_runs` | UPDATE, INSERT |
| **Pause Bot** | `public.bots` | UPDATE (status = 'paused') |
| **Resume Bot** | `public.bots` | UPDATE (status = 'running') |
| **Stop Bot** | `public.bots`, `public.bot_runs` | UPDATE (status = 'stopped') |
| **Update Bot** | `public.bots` | UPDATE (config, name) |
| **Delete Bot** | `public.bots` | DELETE (cascade) |
| **Get Status** | `public.bots`, `public.bot_runs` | SELECT |
| **Get Runs** | `public.bot_runs` | SELECT |

---

## 🛡️ Error Handling

### Database Unavailable
- ✅ All endpoints gracefully fall back to in-memory storage
- ✅ No exceptions thrown to user
- ✅ Operations continue to work
- ✅ Logs warnings for database failures

### Bot Not Found
- ✅ Returns 404 with clear message
- ✅ Checks both database and in-memory storage

### Bot Already Running/Stopped
- ✅ Validates state before operations
- ✅ Returns appropriate messages
- ✅ Prevents invalid state transitions

---

## 🔍 Tracking Bot History

### Via Database Queries:

1. **All Bots for User:**
   ```sql
   SELECT * FROM public.bots WHERE user_id = 'user_123';
   ```

2. **All Runs for Bot:**
   ```sql
   SELECT * FROM public.bot_runs WHERE bot_id = 'dca_bot_123' ORDER BY started_at DESC;
   ```

3. **All Orders for Bot Run:**
   ```sql
   SELECT * FROM public.order_logs WHERE run_id = 'run_123' ORDER BY created_at;
   ```

4. **Current Positions:**
   ```sql
   SELECT * FROM public.positions WHERE user_id = 'user_123';
   ```

5. **Account Balance:**
   ```sql
   SELECT * FROM public.funds WHERE user_id = 'user_123' AND exchange = 'paper_trading';
   ```

---

## 📝 Complete CRUD Operations

| Operation | Endpoint | Database Action | Table |
|-----------|----------|----------------|-------|
| **Create** | `POST /bots/dca-bots` | INSERT | `bots` |
| **Read (List)** | `GET /bots` | SELECT | `bots` |
| **Read (One)** | `GET /bots/{id}` | SELECT | `bots` |
| **Update** | `PUT /bots/{id}` | UPDATE | `bots` |
| **Delete** | `DELETE /bots/{id}` | DELETE | `bots` |
| **Start** | `POST /bots/dca-bots/{id}/start-paper` | UPDATE, INSERT | `bots`, `bot_runs` |
| **Stop** | `POST /bots/{id}/stop` | UPDATE | `bots`, `bot_runs` |
| **Pause** | `POST /bots/{id}/pause` | UPDATE | `bots` |
| **Resume** | `POST /bots/{id}/resume` | UPDATE | `bots` |
| **Status** | `GET /bots/dca-bots/status/{id}` | SELECT | `bots`, `bot_runs` |
| **History** | `GET /bots/{id}/runs` | SELECT | `bot_runs` |

---

## ✅ Summary

**All bot management operations are now:**
- ✅ **Linked to database** - All operations persist to Supabase
- ✅ **Fully functional** - Create, Read, Update, Delete all work
- ✅ **State aware** - Pause, Resume, Stop track state correctly
- ✅ **History tracked** - All runs, orders, positions logged
- ✅ **Graceful fallback** - Works with or without database
- ✅ **Production ready** - Error handling, validation, cascade deletes

**Without database tables, these operations would NOT work:**
- ❌ Cannot list bots (no persistence)
- ❌ Cannot track bot history (no runs table)
- ❌ Cannot resume after restart (no state persistence)
- ❌ Cannot query past performance (no orders/positions history)
- ❌ Cannot manage multiple bots (no organization)

**With database integration, we can:**
- ✅ List all user's bots
- ✅ Track complete execution history
- ✅ Resume bots after server restart
- ✅ Query historical performance
- ✅ Manage multiple bots efficiently
- ✅ Audit all bot operations



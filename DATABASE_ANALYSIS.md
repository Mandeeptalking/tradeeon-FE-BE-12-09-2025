# Database Analysis: What We Have vs What We Need

## 🎯 Overview
Analysis of database schema for DCA Bot functionality and E2E testing readiness.

---

## ✅ WHAT WE HAVE

### 1. Core Schema (infra/supabase/schema.sql)

#### ✅ **Users Table** (`public.users`)
- Extends Supabase `auth.users`
- Fields: `id`, `email`, `full_name`, `avatar_url`, `timezone`
- **Status**: ✅ Ready

#### ✅ **Exchange Keys** (`public.exchange_keys`)
- Stores encrypted API keys per user
- Fields: `api_key_encrypted`, `api_secret_encrypted`, `passphrase_encrypted`
- Supports: `binance`, `zerodha`, `coinbase`, `kraken`
- **Status**: ✅ Ready (but backend currently uses in-memory storage)

#### ✅ **Bots Table** (`public.bots`)
- Bot configurations
- Fields:
  - `bot_id` (UUID, primary key)
  - `user_id` (references users)
  - `name` (bot name)
  - `bot_type` (includes 'dca')
  - `status` (includes 'running', 'paused')
  - `symbol` (trading pair)
  - `interval` (timeframe)
  - `config` (JSONB) - **Can store full DCA config here**
  - `required_capital`, `max_position_size`, `risk_per_trade`
- **Status**: ✅ Schema ready, but backend uses in-memory storage

#### ✅ **Bot Runs** (`public.bot_runs`)
- Instance tracking for each bot execution
- Fields: `run_id`, `bot_id`, `status`, `started_at`, `ended_at`, `total_trades`, `total_pnl`, `max_drawdown`, `sharpe_ratio`
- **Status**: ✅ Schema ready

#### ✅ **Order Logs** (`public.order_logs`)
- Complete order history
- Fields: `order_id`, `bot_id`, `run_id`, `symbol`, `side`, `qty`, `order_type`, `status`, `filled_qty`, `avg_price`, `fees`
- **Status**: ✅ Schema ready

#### ✅ **Positions** (`public.positions`)
- Current open positions
- Fields: `symbol`, `qty`, `avg_price`, `current_price`, `unrealized_pnl`
- **Status**: ✅ Schema ready

#### ✅ **Holdings** (`public.holdings`)
- Asset holdings by currency
- **Status**: ✅ Schema ready

#### ✅ **Funds** (`public.funds`)
- Available funds per exchange and currency
- Fields: `exchange`, `currency`, `free`, `locked`, `total`
- **Status**: ✅ Schema ready

#### ✅ **Alerts** (`public.alerts`)
- From migrations `01_alerts.sql` and `02_alerts_log.sql`
- Complete alerts system with RLS
- **Status**: ✅ Ready

---

## ⚠️ WHAT WE NEED (Gaps)

### 1. **Backend Integration Gap**

#### ❌ **Bot Storage NOT Persisted**
- **Current**: Backend uses in-memory `bot_manager.store_bot_config(bot_id, config)` 
- **File**: `apps/bots/bot_manager.py`
- **Issue**: Bots lost on server restart
- **Needed**: Save to `public.bots` table instead

#### ❌ **Bot Runs NOT Tracked**
- **Current**: `BotRunner` executes but doesn't persist runs
- **File**: `apps/bots/bot_runner.py`
- **Issue**: No historical tracking
- **Needed**: Create entry in `public.bot_runs` when bot starts

#### ❌ **Orders NOT Logged**
- **Current**: `PaperTradingEngine` executes trades but doesn't log them
- **File**: `apps/bots/paper_trading.py`
- **Issue**: No order history
- **Needed**: Log all orders to `public.order_logs`

#### ❌ **Positions NOT Synced**
- **Current**: Positions tracked in memory only
- **Issue**: No persistence, no cross-session continuity
- **Needed**: Sync positions to `public.positions` table

#### ❌ **Funds NOT Synced**
- **Current**: Balance tracked in `PaperTradingEngine` memory only
- **Issue**: No persistence
- **Needed**: Sync to `public.funds` for paper trading balance

### 2. **Exchange Keys Integration**

#### ❌ **Not Used by Backend**
- **Current**: Exchange connection endpoint uses in-memory storage
- **File**: `apps/api/routers/connections.py` uses `connections_store` dict
- **Issue**: Keys not persisted or encrypted
- **Needed**: Save to `public.exchange_keys` with encryption

### 3. **Missing Database Client**

#### ❌ **No Supabase Client in Backend**
- **Current**: Backend doesn't connect to Supabase
- **Issue**: Can't query/write to database
- **Needed**: 
  - Install `supabase-py` or use `psycopg2`
  - Create database client service
  - Add connection pooling

---

## 📋 MIGRATION STATUS

### ✅ **Schema Files Exist**
- `infra/supabase/schema.sql` - Complete schema
- `infra/supabase/migrations/001_initial_schema.sql` - Initial migration
- `infra/supabase/migrations/01_alerts.sql` - Alerts migration
- `infra/supabase/migrations/02_alerts_log.sql` - Alerts log migration

### ❓ **Migration Status Unknown**
- Need to verify if migrations have been run in Supabase
- Need to check if tables actually exist in production/staging database

---

## 🔧 WHAT NEEDS TO BE DONE

### **Priority 1: Database Integration (Critical for Production)**

1. **Add Supabase Client to Backend**
   ```python
   # apps/bots/db_client.py (new file)
   from supabase import create_client
   import os
   
   SUPABASE_URL = os.getenv("SUPABASE_URL")
   SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
   
   supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
   ```

2. **Persist Bot Creation**
   ```python
   # In apps/api/routers/bots.py - create_dca_bot endpoint
   # After creating bot config, save to database:
   result = supabase.table("bots").insert({
       "bot_id": bot_id,
       "user_id": user_id,  # from auth
       "name": bot_name,
       "bot_type": "dca",
       "status": "inactive",
       "symbol": primary_pair,
       "interval": "1h",
       "config": bot_config  # Full JSONB config
   }).execute()
   ```

3. **Track Bot Runs**
   ```python
   # In apps/bots/bot_runner.py - start() method
   run_result = supabase.table("bot_runs").insert({
       "bot_id": bot_id,
       "user_id": user_id,
       "status": "running",
       "started_at": "now()"
   }).execute()
   run_id = run_result.data[0]["run_id"]
   ```

4. **Log Orders**
   ```python
   # In apps/bots/paper_trading.py - execute_buy/execute_sell
   supabase.table("order_logs").insert({
       "bot_id": bot_id,
       "run_id": run_id,
       "user_id": user_id,
       "symbol": symbol,
       "side": "buy",  # or "sell"
       "qty": quantity,
       "order_type": "market",
       "status": "filled",
       "filled_qty": quantity,
       "avg_price": price
   }).execute()
   ```

5. **Sync Positions**
   ```python
   # In apps/bots/paper_trading.py - after each trade
   supabase.table("positions").upsert({
       "user_id": user_id,
       "symbol": symbol,
       "qty": position_qty,
       "avg_price": avg_price,
       "current_price": current_price,
       "unrealized_pnl": pnl
   }, on_conflict="user_id,symbol").execute()
   ```

6. **Sync Paper Trading Balance**
   ```python
   # In apps/bots/paper_trading.py - after balance change
   supabase.table("funds").upsert({
       "user_id": user_id,
       "exchange": "paper_trading",
       "currency": "USDT",
       "free": balance,
       "locked": 0
   }, on_conflict="user_id,exchange,currency").execute()
   ```

### **Priority 2: Exchange Keys Integration**

1. **Encrypt and Store API Keys**
   - Use `pgcrypto` or Python encryption library
   - Store in `public.exchange_keys` table
   - Retrieve on bot execution

### **Priority 3: Verification**

1. **Run Migrations**
   - Verify all migrations applied
   - Check RLS policies enabled
   - Test query access

2. **Test Database Queries**
   - Verify insert/update works
   - Test RLS policies
   - Check foreign key constraints

---

## 🎯 FOR E2E TESTING

### **Current State (Works for Testing)**
- ✅ Backend APIs functional (in-memory storage)
- ✅ Bot creation works
- ✅ Paper trading works
- ✅ Status polling works
- ❌ Data lost on restart
- ❌ No historical data
- ❌ No cross-session persistence

### **What Works NOW**
- Can test full flow without database
- Bot execution works in memory
- All functionality works for single session

### **What Won't Work**
- ❌ Bot survives server restart
- ❌ Historical bot runs unavailable
- ❌ Order history not persistent
- ❌ Can't track progress across sessions

---

## 📊 SUMMARY

### ✅ **Schema: COMPLETE**
- All necessary tables exist
- RLS policies defined
- Relationships correct
- Indexes created

### ❌ **Integration: MISSING**
- Backend doesn't write to database
- All data in-memory
- No persistence layer

### ⚡ **Quick Fix for Testing**
- Current setup works for E2E testing in single session
- Can proceed with UI testing
- Database integration can be added later

### 🚀 **Production Readiness**
- Must add database integration before production
- Need to persist all bot data
- Need historical tracking
- Need encrypted key storage

---

## 🔍 DATABASE VERIFICATION CHECKLIST

### Before E2E Testing:
- [ ] Verify Supabase project exists and is accessible
- [ ] Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in environment
- [ ] Run migrations (if not already done)
- [ ] Verify tables exist: `users`, `bots`, `bot_runs`, `order_logs`, `positions`, `funds`
- [ ] Test RLS policies work (query with user context)

### Optional (Current Session Testing):
- [x] Backend works without database (in-memory)
- [x] Bot creation and execution works
- [x] Paper trading functional
- [ ] Database integration can be added incrementally

---

## 🛠️ RECOMMENDED NEXT STEPS

1. **For E2E Testing (NOW)**
   - ✅ Proceed with current in-memory setup
   - ✅ Test full UI flow
   - ✅ Verify bot execution works
   - ⚠️ Note: Data will not persist across sessions

2. **For Production (AFTER E2E)**
   - Add Supabase client to backend
   - Implement persistence layer
   - Add encryption for API keys
   - Migrate in-memory storage to database
   - Add data migration scripts if needed



# Database Tables Usage Analysis

## Tables Defined in Schema

### ✅ **USED Tables** (Keep)

1. **`users`** ✅
   - **Used in:** `apps/api/routers/connections.py`
   - **Usage:** User profile management, creating user records
   - **Status:** ACTIVE

2. **`exchange_keys`** ✅
   - **Used in:** 
     - `apps/api/routers/connections.py` (CRUD operations)
     - `apps/api/routers/orders.py` (read)
     - `apps/api/routers/portfolio.py` (read)
   - **Usage:** Store encrypted API keys for exchanges
   - **Status:** ACTIVE

3. **`bots`** ✅
   - **Used in:**
     - `apps/api/routers/bots.py` (CRUD)
     - `apps/bots/db_service.py` (CRUD)
     - `apps/bots/bot_action_handler.py` (read)
   - **Usage:** Bot configurations
   - **Status:** ACTIVE

4. **`bot_runs`** ✅
   - **Used in:**
     - `apps/api/routers/bots.py` (read)
     - `apps/bots/db_service.py` (CRUD)
   - **Usage:** Track bot execution runs
   - **Status:** ACTIVE

5. **`order_logs`** ✅
   - **Used in:** `apps/bots/db_service.py`
   - **Usage:** Log all bot orders
   - **Status:** ACTIVE

6. **`positions`** ✅ (Partially)
   - **Used in:** `apps/bots/db_service.py` (write)
   - **Note:** `apps/api/routers/portfolio.py` reads positions from Binance API, not DB
   - **Usage:** Track bot positions (written by bots, not read by portfolio API)
   - **Status:** ACTIVE (for bots)

7. **`alerts`** ✅
   - **Used in:**
     - `apps/api/services/alerts_service.py` (CRUD)
     - `apps/api/modules/alerts/alert_manager.py` (read/write)
     - `apps/api/routers/bots.py` (write - when converting bots to alerts)
     - `apps/bots/bot_action_handler.py` (write)
   - **Usage:** Alert configurations
   - **Status:** ACTIVE

8. **`alerts_log`** ✅
   - **Used in:**
     - `apps/api/services/alerts_service.py` (read)
     - `apps/api/modules/alerts/alert_manager.py` (write)
   - **Usage:** Log alert triggers
   - **Status:** ACTIVE

---

### ❌ **UNUSED Tables** (Can be removed)

1. **`zerodha_sessions`** ❌
   - **Defined in:** `infra/supabase/schema.sql` (lines 35-45)
   - **Used in:** NOWHERE
   - **Note:** Zerodha is mentioned in frontend types but no actual session management code exists
   - **Recommendation:** REMOVE (unless planning to implement Zerodha OAuth soon)

2. **`holdings`** ❌
   - **Defined in:** `infra/supabase/schema.sql` (lines 115-126)
   - **Used in:** NOWHERE
   - **Note:** `portfolio.py` reads holdings from Binance API directly, not from DB
   - **Recommendation:** REMOVE (or implement DB caching if needed)

3. **`funds`** ❌
   - **Defined in:** `infra/supabase/schema.sql` (lines 129-139)
   - **Used in:** NOWHERE
   - **Note:** `portfolio.py` reads funds from Binance API directly, not from DB
   - **Recommendation:** REMOVE (or implement DB caching if needed)

4. **`signals`** ❌
   - **Defined in:** `infra/supabase/schema.sql` (lines 142-157)
   - **Used in:** NOWHERE
   - **Note:** Comment says "for analysis and backtesting" but no code uses it
   - **Recommendation:** REMOVE (unless planning to implement signal tracking)

5. **`market_data_cache`** ❌
   - **Defined in:** `infra/supabase/schema.sql` (lines 160-173)
   - **Used in:** NOWHERE
   - **Note:** Comment says "for performance" but no caching implementation exists
   - **Recommendation:** REMOVE (or implement caching if needed)

---

## Summary

### Tables to Keep (8):
- ✅ `users`
- ✅ `exchange_keys`
- ✅ `bots`
- ✅ `bot_runs`
- ✅ `order_logs`
- ✅ `positions` (used by bots)
- ✅ `alerts`
- ✅ `alerts_log`

### Tables to Remove (5):
- ❌ `zerodha_sessions` - No implementation
- ❌ `holdings` - Not written to, data comes from API
- ❌ `funds` - Not written to, data comes from API
- ❌ `signals` - No usage
- ❌ `market_data_cache` - No implementation

---

## Migration Script Needed

To remove unused tables, create a migration that:
1. Drops foreign key constraints
2. Drops indexes
3. Drops RLS policies
4. Drops tables

**Note:** Before removing, verify:
- No production data exists in these tables
- No future plans to use them
- Consider if `holdings`/`funds` should be kept for caching


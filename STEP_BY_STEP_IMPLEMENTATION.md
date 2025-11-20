# Step-by-Step Implementation Guide

## 🎯 Current Status

**Phase 1: Core Infrastructure** - In Progress

---

## ✅ Step 1: Database Migration

### Goal
Create condition registry tables in Supabase database.

### Action Required

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run Migration SQL**
   - Open file: `infra/supabase/migrations/06_condition_registry.sql`
   - Copy all contents
   - Paste into Supabase SQL Editor
   - Click **Run**

3. **Verify Tables Created**
   ```sql
   -- Run this in SQL Editor to verify
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
       'condition_registry', 
       'user_condition_subscriptions', 
       'condition_evaluation_cache', 
       'condition_triggers'
   );
   ```

   Expected: Should return 4 rows

4. **Verify Indexes Created**
   ```sql
   SELECT indexname, tablename 
   FROM pg_indexes 
   WHERE schemaname = 'public' 
   AND tablename IN (
       'condition_registry', 
       'user_condition_subscriptions'
   );
   ```

### ✅ Completion Checklist
- [ ] Migration SQL executed successfully
- [ ] All 4 tables created
- [ ] Indexes created
- [ ] RLS policies enabled
- [ ] Triggers created

---

## ✅ Step 2: Test Condition Registry API

### Goal
Verify API endpoints work correctly.

### Prerequisites
- Backend API running on `http://localhost:8000`
- Database migration completed

### Action Required

1. **Start Backend API** (if not running)
   ```bash
   cd apps/api
   uvicorn main:app --reload --port 8000
   ```

2. **Run Test Script**
   ```bash
   python scripts/test_condition_registry.py
   ```

3. **Manual API Testing** (Alternative)

   **Test 1: Register RSI Condition**
   ```bash
   curl -X POST http://localhost:8000/conditions/register \
     -H "Content-Type: application/json" \
     -d '{
       "type": "indicator",
       "symbol": "BTCUSDT",
       "timeframe": "1h",
       "indicator": "RSI",
       "operator": "crosses_below",
       "value": 30,
       "period": 14
     }'
   ```

   **Test 2: Register Price Condition**
   ```bash
   curl -X POST http://localhost:8000/conditions/register \
     -H "Content-Type: application/json" \
     -d '{
       "type": "price",
       "symbol": "BTCUSDT",
       "timeframe": "1m",
       "operator": "between",
       "lowerBound": 90000,
       "upperBound": 100000
     }'
   ```

   **Test 3: Get Condition Status**
   ```bash
   curl http://localhost:8000/conditions/{condition_id}/status
   ```

   **Test 4: Get Stats**
   ```bash
   curl http://localhost:8000/conditions/stats
   ```

### ✅ Completion Checklist
- [ ] API endpoints responding
- [ ] Conditions can be registered
- [ ] Condition IDs are generated correctly
- [ ] Same condition returns same ID (deduplication works)
- [ ] Stats endpoint returns data

---

## ✅ Step 3: Integrate DCA Bot

### Goal
Modify DCA Bot creation to register conditions in centralized system.

### Files to Modify
- `apps/frontend/src/pages/DCABot.tsx` - Frontend bot creation
- `apps/api/routers/bots.py` - Backend bot creation endpoint

### Action Required

1. **Modify DCA Bot Creation Flow**

   When creating a DCA bot:
   - Extract conditions from bot config
   - Register each condition via `/conditions/register`
   - Subscribe bot to conditions via `/conditions/subscribe`
   - Store condition IDs in bot config

2. **Update Bot Creation Endpoint**

   In `apps/api/routers/bots.py`, modify `create_dca_bot`:
   ```python
   # After creating bot config
   # Register conditions
   conditions = extract_conditions_from_config(bot_config)
   condition_ids = []
   for condition in conditions:
       condition_id = await register_condition(condition)
       condition_ids.append(condition_id)
       await subscribe_bot(bot_id, condition_id, "dca", bot_config)
   ```

3. **Test Integration**
   - Create a DCA Bot via UI
   - Verify conditions are registered
   - Check subscriptions are created

### ✅ Completion Checklist
- [ ] DCA Bot creation registers conditions
- [ ] Bot subscribes to conditions
- [ ] Condition IDs stored in bot config
- [ ] Can query bot's conditions

---

## ✅ Step 4: Set Up Centralized Evaluator Service

### Goal
Create background service that evaluates conditions continuously.

### Action Required

1. **Create Evaluator Service Script**
   - File: `apps/bots/run_evaluator.py`
   - Starts evaluation loop
   - Monitors conditions
   - Publishes triggers

2. **Set Up as Background Service**
   - Can run as separate process
   - Or integrate into main API (background task)

3. **Test Evaluator**
   - Start evaluator service
   - Create test conditions
   - Verify conditions are evaluated
   - Check trigger logs

### ✅ Completion Checklist
- [ ] Evaluator service created
- [ ] Can start/stop service
- [ ] Evaluates conditions periodically
- [ ] Logs evaluation results

---

## ✅ Step 5: Event Bus Setup

### Goal
Set up Redis/RabbitMQ for event distribution.

### Action Required

1. **Install Redis** (or RabbitMQ)
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Create Event Bus Module**
   - File: `apps/bots/event_bus.py`
   - Redis pub/sub implementation
   - Event publishers
   - Event subscribers

3. **Integrate with Evaluator**
   - When condition triggers, publish event
   - Bots subscribe to events
   - Execute bot logic on trigger

### ✅ Completion Checklist
- [ ] Redis/RabbitMQ running
- [ ] Event bus module created
- [ ] Can publish events
- [ ] Can subscribe to events
- [ ] Events reach subscribers

---

## ✅ Step 6: Bot Notification System

### Goal
Bots receive notifications when conditions trigger.

### Action Required

1. **Create Bot Notification Handler**
   - File: `apps/bots/bot_notifier.py`
   - Listens for condition triggers
   - Routes to appropriate bot executor
   - Executes bot-specific logic

2. **Integrate with Bot Execution**
   - DCA Bot: Execute DCA buy order
   - Grid Bot: Execute grid order
   - Other bots: Execute their logic

3. **Test End-to-End**
   - Create bot with condition
   - Wait for condition to trigger
   - Verify bot executes action

### ✅ Completion Checklist
- [ ] Notification handler created
- [ ] Bots receive notifications
- [ ] Bot logic executes correctly
- [ ] End-to-end flow works

---

## 📊 Progress Tracking

### Phase 1: Core Infrastructure
- [x] Database schema design
- [x] Condition Registry API
- [x] Condition normalization
- [ ] **Step 1: Database migration** ← CURRENT
- [ ] Step 2: Test API
- [ ] Step 3: DCA Bot integration

### Phase 2: Evaluation Engine
- [ ] Step 4: Evaluator service
- [ ] Step 5: Event bus
- [ ] Step 6: Bot notifications

### Phase 3: Bot Integrations
- [ ] Grid Bot integration
- [ ] Other bot types

---

## 🚀 Next Action

**START WITH STEP 1: Database Migration**

1. Open Supabase SQL Editor
2. Run `infra/supabase/migrations/06_condition_registry.sql`
3. Verify tables created
4. Report back when done!



# Centralized Bot System - Step-by-Step Implementation Plan

## 🎯 Implementation Phases

### Phase 1: Core Infrastructure ✅ (Current)
- [x] Database schema design
- [x] Condition Registry API
- [x] Condition normalization & hashing
- [ ] **Run database migration** ← START HERE
- [ ] Test API endpoints
- [ ] Integrate with DCA Bot

### Phase 2: Evaluation Engine
- [ ] Set up centralized evaluator service
- [ ] Event bus integration (Redis)
- [ ] Bot notification system
- [ ] Monitoring & metrics

### Phase 3: Bot Integrations
- [ ] DCA Bot integration
- [ ] Grid Bot integration
- [ ] Other bot types

---

## 📋 Step-by-Step Guide

### Step 1: Database Migration ⏳

**Goal**: Create condition registry tables in Supabase

**Action**: Run migration SQL file

**File**: `infra/supabase/migrations/06_condition_registry.sql`

**How to run**:
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `06_condition_registry.sql`
3. Run the SQL
4. Verify tables are created

**Verification**:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('condition_registry', 'user_condition_subscriptions', 'condition_evaluation_cache', 'condition_triggers');
```

---

### Step 2: Test Condition Registry API ⏳

**Goal**: Verify API endpoints work correctly

**Endpoints to test**:
1. `POST /conditions/register` - Register a condition
2. `POST /conditions/subscribe` - Subscribe bot to condition
3. `GET /conditions/{condition_id}/status` - Get condition status
4. `GET /conditions/user/subscriptions` - Get user subscriptions

**Test script**: Create test file

---

### Step 3: DCA Bot Integration ⏳

**Goal**: Integrate DCA Bot to use centralized condition registry

**Changes needed**:
1. When creating DCA Bot, register conditions
2. Subscribe bot to conditions
3. Listen for condition triggers
4. Execute DCA logic when triggered

---

### Step 4: Centralized Evaluator Service ⏳

**Goal**: Set up background service that evaluates conditions

**Components**:
1. Condition evaluator service
2. Evaluation loop
3. Event publishing

---

### Step 5: Event Bus Setup ⏳

**Goal**: Set up Redis/RabbitMQ for event distribution

**Components**:
1. Redis/RabbitMQ setup
2. Event publishers
3. Event subscribers
4. Bot notification handlers

---

## 🚀 Let's Start!

**Current Step**: Step 1 - Database Migration


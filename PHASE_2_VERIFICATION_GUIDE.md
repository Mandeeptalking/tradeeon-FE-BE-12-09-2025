# Phase 2 Verification Guide

## ✅ Phase 2 Components Overview

Phase 2 consists of three main components:

1. **Phase 2.1**: Centralized Condition Evaluator Service
2. **Phase 2.2**: Event Bus (Redis Pub/Sub)
3. **Phase 2.3**: Bot Notification System

---

## 🔍 Verification Checklist

### Prerequisites

- [ ] Redis is installed and running on Lightsail
- [ ] Python dependencies installed (`redis>=5.0.0`, `pandas`, `numpy`, etc.)
- [ ] Database migration applied (`06_condition_registry.sql`)
- [ ] Environment variables set (`REDIS_URL`, `SUPABASE_URL`, etc.)

### Phase 2.1: Condition Evaluator ✅

**File**: `apps/bots/condition_evaluator.py`

- [ ] File exists and has `CentralizedConditionEvaluator` class
- [ ] Implements `initialize()` method
- [ ] Implements `evaluate_symbol_timeframe()` method
- [ ] Uses `MarketDataService` for data fetching
- [ ] Caches indicator calculations
- [ ] Publishes events via `event_bus`
- [ ] Service runner exists: `apps/bots/run_condition_evaluator.py`

**Verification**:
```bash
# Check file exists
ls -la apps/bots/condition_evaluator.py

# Check imports work
python3 -c "from apps.bots.condition_evaluator import CentralizedConditionEvaluator; print('OK')"

# Check service runner
ls -la apps/bots/run_condition_evaluator.py
```

### Phase 2.2: Event Bus ✅

**File**: `apps/bots/event_bus.py`

- [ ] File exists and has `EventBus` class
- [ ] Implements Redis pub/sub
- [ ] Has `connect()` method
- [ ] Has `publish()` method
- [ ] Has `subscribe()` method
- [ ] Has `disconnect()` method
- [ ] Handles reconnection automatically

**Verification**:
```bash
# Check file exists
ls -la apps/bots/event_bus.py

# Check imports work
python3 -c "from apps.bots.event_bus import EventBus, create_event_bus; print('OK')"

# Check Redis connection
redis-cli ping  # Should return PONG
```

### Phase 2.3: Bot Notifier ✅

**File**: `apps/bots/bot_notifier.py`

- [ ] File exists and has `BotNotifier` class
- [ ] Implements `initialize()` method
- [ ] Subscribes to condition trigger events
- [ ] Routes triggers to bot executors
- [ ] Has `handle_condition_trigger()` method
- [ ] Service runner exists: `apps/bots/run_bot_notifier.py`

**Verification**:
```bash
# Check file exists
ls -la apps/bots/bot_notifier.py

# Check imports work
python3 -c "from apps.bots.bot_notifier import BotNotifier; print('OK')"

# Check service runner
ls -la apps/bots/run_bot_notifier.py
```

---

## 🧪 End-to-End Testing

### Test 1: Redis Connection

```bash
# On Lightsail
redis-cli ping
# Expected: PONG

redis-cli INFO
# Should show Redis server info
```

### Test 2: Condition Evaluator Service

```bash
# On Lightsail
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Run condition evaluator (test mode)
python3 run_condition_evaluator.py
# Should start and connect to Redis
# Should fetch conditions from database
# Should start evaluation loop
```

**Check logs**:
```bash
# Should see:
# - "Centralized Condition Evaluator initialized"
# - "Connected to Redis"
# - "Starting evaluation loop"
# - "Evaluating symbol BTCUSDT on timeframe 1h"
```

### Test 3: Bot Notifier Service

```bash
# On Lightsail (separate terminal)
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Run bot notifier
python3 run_bot_notifier.py
# Should start and connect to Redis
# Should subscribe to condition channels
```

**Check logs**:
```bash
# Should see:
# - "Bot Notifier initialized"
# - "Connected to Redis"
# - "Subscribed to condition channels"
# - "Listening for condition triggers"
```

### Test 4: Full Integration Test

**Steps**:
1. **Create a DCA bot** via API/Frontend with RSI condition
2. **Verify condition is registered** in `condition_registry` table
3. **Verify bot is subscribed** in `user_condition_subscriptions` table
4. **Wait for condition evaluator** to evaluate condition
5. **Check Redis** for published events
6. **Verify bot notifier** receives trigger
7. **Check bot executes** action

**SQL Queries**:
```sql
-- Check registered conditions
SELECT * FROM condition_registry 
ORDER BY created_at DESC 
LIMIT 10;

-- Check subscriptions
SELECT * FROM user_condition_subscriptions 
WHERE status = 'active';

-- Check condition triggers
SELECT * FROM condition_triggers 
ORDER BY triggered_at DESC 
LIMIT 10;
```

**Redis Commands**:
```bash
# Monitor Redis for events
redis-cli MONITOR

# Check for condition trigger channels
redis-cli PUBSUB CHANNELS "condition.*"
```

---

## 📋 Component Verification Script

Run the automated verification script:

```bash
# On Lightsail
cd ~/tradeeon-FE-BE-12-09-2025
python3 scripts/verify_phase2_complete.py
```

This script checks:
- ✅ All required files exist
- ✅ Imports work correctly
- ✅ Redis is accessible
- ✅ Database tables exist
- ✅ Service runners are configured

---

## 🚀 Deployment Verification

### Check Services Running

```bash
# On Lightsail
ps aux | grep -E "(condition_evaluator|bot_notifier)" | grep -v grep

# Should see:
# - python3 run_condition_evaluator.py
# - python3 run_bot_notifier.py
```

### Check Service Logs

```bash
# Condition Evaluator logs
tail -f apps/bots/evaluator.log

# Bot Notifier logs
tail -f apps/bots/notifier.log
```

### Check Redis Activity

```bash
# Monitor Redis in real-time
redis-cli MONITOR

# Should see PUBLISH commands when conditions trigger
```

---

## ✅ Phase 2 Completion Criteria

Phase 2 is **COMPLETE** when:

- [x] **Phase 2.1**: Condition Evaluator service implemented and running
- [x] **Phase 2.2**: Event Bus (Redis) integrated and working
- [x] **Phase 2.3**: Bot Notifier service implemented and running
- [ ] **Services Running**: Both services running on Lightsail
- [ ] **End-to-End Test**: Full flow works (condition → trigger → bot action)
- [ ] **Monitoring**: Logs show evaluation activity

---

## 🐛 Troubleshooting

### Issue: Services Not Starting

**Check**:
```bash
# Check Python dependencies
pip3 list | grep redis
pip3 list | grep pandas

# Check imports
python3 -c "import redis; import pandas; print('OK')"
```

### Issue: Redis Connection Failed

**Check**:
```bash
# Check Redis is running
sudo systemctl status redis-server

# Check Redis connection
redis-cli ping

# Check REDIS_URL environment variable
echo $REDIS_URL
```

### Issue: No Conditions Evaluated

**Check**:
```bash
# Check database for conditions
# (Use Supabase SQL Editor)
SELECT COUNT(*) FROM condition_registry;

SELECT COUNT(*) FROM user_condition_subscriptions WHERE status = 'active';

# Check logs for errors
tail -f apps/bots/evaluator.log
```

### Issue: Bot Notifier Not Receiving Events

**Check**:
```bash
# Verify Redis pub/sub is working
redis-cli PUBSUB CHANNELS "condition.*"

# Check bot notifier logs
tail -f apps/bots/notifier.log

# Test Redis publish manually
redis-cli PUBLISH "condition.test" "test message"
```

---

## 📊 Success Indicators

When Phase 2 is working correctly, you should see:

1. **Condition Evaluator Logs**:
   - Regular evaluation cycles
   - Symbol/timeframe combinations being evaluated
   - Indicators being calculated
   - Events being published

2. **Bot Notifier Logs**:
   - Subscribed to condition channels
   - Receiving trigger events
   - Routing to bot executors
   - Executing bot actions

3. **Redis Activity**:
   - PUBLISH commands for condition triggers
   - SUBSCRIBE commands from bot notifier

4. **Database**:
   - `condition_triggers` table has entries
   - `condition_evaluation_cache` has cached values
   - `condition_registry` has registered conditions

---

## 📝 Next Steps After Verification

Once Phase 2 is verified:

1. ✅ **Production Setup**: Create systemd services for auto-restart
2. ✅ **Monitoring**: Set up log aggregation and alerts
3. ✅ **Phase 3**: Grid Bot integration (if needed)
4. ✅ **Performance**: Monitor and optimize evaluation loops

---

**Last Updated**: 2025-11-17
**Status**: Phase 2 Implementation Complete - Ready for Verification



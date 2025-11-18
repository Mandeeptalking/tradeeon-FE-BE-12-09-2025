# Phase 2 Runtime Verification Guide

## 🔍 How to Verify Phase 2 is Working

### Quick Verification

Run the automated verification script on Lightsail:

```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
python3 scripts/verify_phase2_running.py
```

This checks:
- ✅ Redis connection
- ✅ Supabase connection
- ✅ Services are running (Docker or Python processes)
- ✅ Database tables exist
- ✅ Registered conditions
- ✅ Event bus functionality
- ✅ Recent condition triggers
- ✅ Imports work correctly
- ✅ Service logs

---

## 📋 Manual Verification Steps

### Step 1: Check Services are Running

#### Docker (Recommended):
```bash
# Check Docker containers
docker ps | grep -E "(condition-evaluator|bot-notifier|redis)"

# Should show:
# tradeeon-redis
# tradeeon-condition-evaluator
# tradeeon-bot-notifier
```

#### Python Processes (If not using Docker):
```bash
# Check Python processes
ps aux | grep -E "(condition_evaluator|bot_notifier)" | grep -v grep

# Should show:
# python3 run_condition_evaluator.py
# python3 run_bot_notifier.py
```

### Step 2: Check Redis Connection

```bash
# Test Redis directly
redis-cli ping
# Should return: PONG

# Or from Docker
docker-compose exec redis redis-cli ping
```

### Step 3: Check Service Logs

#### Docker:
```bash
# Check condition evaluator logs
docker-compose logs -f condition-evaluator --tail 50

# Check bot notifier logs
docker-compose logs -f bot-notifier --tail 50

# Check Redis logs
docker-compose logs -f redis --tail 20
```

#### Python Processes:
```bash
# Check log files
tail -f apps/bots/condition_evaluator.log
tail -f apps/bots/bot_notifier.log
```

**Expected logs:**
- Condition Evaluator: "Centralized Condition Evaluator initialized", "Connected to Redis"
- Bot Notifier: "Bot Notifier initialized", "Connected to Redis", "Subscribed to condition channels"

### Step 4: Check Database

```sql
-- Check condition registry (run in Supabase SQL Editor)
SELECT COUNT(*) FROM condition_registry;

-- Check active subscriptions
SELECT COUNT(*) FROM user_condition_subscriptions WHERE status = 'active';

-- Check recent triggers
SELECT * FROM condition_triggers 
ORDER BY triggered_at DESC 
LIMIT 10;
```

### Step 5: Test Event Bus

```bash
# Publish test event via Redis CLI
redis-cli PUBLISH "test.verification" '{"test": true}'

# Or from Docker container
docker-compose exec condition-evaluator python3 -c "
import asyncio
from apps.bots.event_bus import create_event_bus

async def test():
    bus = await create_event_bus()
    result = await bus.publish('test', {'test': True})
    print('✅ Published' if result else '❌ Failed')
    await bus.disconnect()

asyncio.run(test())
"
```

### Step 6: Test End-to-End Flow

**If you have bots created:**

1. **Create a DCA bot** via frontend/API with a condition (e.g., RSI < 30)
2. **Check condition is registered:**
   ```sql
   SELECT * FROM condition_registry ORDER BY created_at DESC LIMIT 1;
   ```
3. **Check bot is subscribed:**
   ```sql
   SELECT * FROM user_condition_subscriptions WHERE status = 'active' ORDER BY created_at DESC LIMIT 1;
   ```
4. **Monitor evaluator logs** for evaluation activity:
   ```bash
   docker-compose logs -f condition-evaluator | grep -i "evaluating"
   ```
5. **Wait for condition to trigger** (or create test data)
6. **Check condition_triggers table:**
   ```sql
   SELECT * FROM condition_triggers ORDER BY triggered_at DESC LIMIT 5;
   ```
7. **Check bot notifier logs** for trigger handling:
   ```bash
   docker-compose logs -f bot-notifier | grep -i "trigger"
   ```

---

## ✅ Success Indicators

Phase 2 is **WORKING** when:

1. **Services Running:**
   - ✅ Condition Evaluator service is running
   - ✅ Bot Notifier service is running
   - ✅ Redis is running

2. **Connections:**
   - ✅ Redis connection successful
   - ✅ Supabase connection successful

3. **Database:**
   - ✅ All Phase 2 tables exist (`condition_registry`, `user_condition_subscriptions`, `condition_evaluation_cache`, `condition_triggers`)

4. **Logs Show Activity:**
   - ✅ Condition Evaluator: "Starting evaluation loop..."
   - ✅ Bot Notifier: "Listening for condition triggers..."
   - ✅ No errors in logs

5. **Event Bus:**
   - ✅ Can publish events to Redis
   - ✅ Can subscribe to channels

---

## 🐛 Troubleshooting

### Services Not Running

**Docker:**
```bash
# Check why services stopped
docker-compose logs condition-evaluator
docker-compose logs bot-notifier

# Restart services
docker-compose restart condition-evaluator bot-notifier

# Start if not running
docker-compose up -d condition-evaluator bot-notifier
```

**Python Processes:**
```bash
# Check if processes crashed
ps aux | grep python3

# Check logs for errors
tail -n 100 apps/bots/condition_evaluator.log
tail -n 100 apps/bots/bot_notifier.log

# Restart services
cd apps/bots
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &
```

### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping

# Restart Redis
sudo systemctl restart redis-server

# Or Docker
docker-compose restart redis
```

### Supabase Connection Failed

```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test connection from container
docker-compose exec condition-evaluator python3 -c "
from apps.api.clients.supabase_client import supabase
print('OK' if supabase else 'FAILED')
"
```

### No Conditions Evaluated

```bash
# Check if conditions exist
# (Run in Supabase SQL Editor)
SELECT COUNT(*) FROM condition_registry;
SELECT COUNT(*) FROM user_condition_subscriptions WHERE status = 'active';

# Check evaluator logs for errors
docker-compose logs condition-evaluator | grep -i error

# Check if evaluator is fetching conditions
docker-compose logs condition-evaluator | grep -i "evaluating"
```

---

## 📊 Verification Commands Summary

```bash
# Run automated verification
python3 scripts/verify_phase2_running.py

# Check services (Docker)
docker-compose ps

# Check services (Processes)
ps aux | grep -E "(condition_evaluator|bot_notifier)"

# Check Redis
redis-cli ping

# Check logs (Docker)
docker-compose logs -f condition-evaluator bot-notifier

# Check logs (Files)
tail -f apps/bots/*.log

# Test event bus
redis-cli PUBLISH "test" '{"test": true}'
```

---

**Run the verification script to get a complete status report!**


# Next Steps - Complete Deployment

## Current Status:
- ✅ Redis is running (PONG)
- ✅ Services started (processes running)
- ⚠️ pip3 not installed (need to install redis library)
- ⚠️ Logs are empty (checking for errors)

---

## Step 1: Install pip3 and Redis Library

```bash
# Install pip3
sudo apt install python3-pip

# Install Redis Python library
pip3 install redis>=5.0.0

# Install API dependencies
cd ~/tradeeon-FE-BE-12-09-2025/apps/api
pip3 install -e .
```

---

## Step 2: Check Logs for Errors

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Check evaluator log (should show errors if redis not installed)
cat evaluator.log

# Check notifier log
cat notifier.log

# Or watch logs in real-time
tail -f evaluator.log
tail -f notifier.log
```

---

## Step 3: Restart Services (After Installing Redis)

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Stop existing services
pkill -f run_condition_evaluator
pkill -f run_bot_notifier

# Wait a moment
sleep 2

# Restart services
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &

# Verify they're running
ps aux | grep -E "(condition_evaluator|bot_notifier)"

# Check logs immediately
tail -f evaluator.log
```

---

## Expected Log Output

### Evaluator should show:
```
Starting Condition Evaluator Service...
✅ Event bus connected to Redis: redis://localhost:6379
Evaluator configured with interval: 60s, timeframes: ['1m', '5m', '15m', '1h']
Started evaluation loop...
```

### Notifier should show:
```
Starting Bot Notification Service...
✅ Event bus connected to Redis: redis://localhost:6379
Subscribed to condition triggers (pattern: condition.*)
Bot notifier initialized successfully
Started listening for events...
```

---

## If You See Import Errors

If logs show "No module named 'redis'", you need to:
1. Install pip3: `sudo apt install python3-pip`
2. Install redis: `pip3 install redis>=5.0.0`
3. Restart services

---

## Quick Fix Command Sequence

```bash
# 1. Install pip3
sudo apt install python3-pip -y

# 2. Install Redis library
pip3 install redis>=5.0.0

# 3. Install API dependencies
cd ~/tradeeon-FE-BE-12-09-2025/apps/api
pip3 install -e .

# 4. Restart services
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
pkill -f run_condition_evaluator
pkill -f run_bot_notifier
sleep 2
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &

# 5. Check logs
tail -f evaluator.log
```



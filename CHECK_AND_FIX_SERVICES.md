# Check and Fix Services

## Issue: Logs are empty because:
1. Services write to different log files (`condition_evaluator.log` and `bot_notifier.log`)
2. Redis library not installed yet (services may be failing silently)

---

## Step 1: Check Actual Log Files

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Check the actual log files (not evaluator.log/notifier.log)
cat condition_evaluator.log
cat bot_notifier.log

# Also check the redirected logs
cat evaluator.log
cat notifier.log
```

---

## Step 2: Install pip3 and Redis

```bash
# Install pip3
sudo apt install python3-pip -y

# Install Redis Python library
pip3 install redis>=5.0.0

# Install API dependencies
cd ~/tradeeon-FE-BE-12-09-2025/apps/api
pip3 install -e .
```

---

## Step 3: Restart Services

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Stop existing services
pkill -f run_condition_evaluator
pkill -f run_bot_notifier

# Wait a moment
sleep 2

# Restart with correct log files
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &

# Check processes
ps aux | grep -E "(condition_evaluator|bot_notifier)"
```

---

## Step 4: Check Logs

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Check both log files
tail -f evaluator.log
# In another terminal:
tail -f notifier.log

# Or check the actual log files
tail -f condition_evaluator.log
tail -f bot_notifier.log
```

---

## Expected Output

### If Redis is installed correctly:
```
2025-11-17 13:09:00 - root - INFO - ======================================================================
2025-11-17 13:09:00 - root - INFO - Starting Centralized Condition Evaluator Service
2025-11-17 13:09:00 - root - INFO - ======================================================================
2025-11-17 13:09:01 - event_bus - INFO - ✅ Event bus connected to Redis: redis://localhost:6379
```

### If Redis is NOT installed:
```
ERROR:root:Failed to import required modules: No module named 'redis'
```

---

## Complete Fix Command Sequence

```bash
# 1. Check current logs
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
cat condition_evaluator.log
cat bot_notifier.log

# 2. Install pip3 and redis
sudo apt install python3-pip -y
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
sleep 3
tail -n 50 evaluator.log
tail -n 50 notifier.log
```



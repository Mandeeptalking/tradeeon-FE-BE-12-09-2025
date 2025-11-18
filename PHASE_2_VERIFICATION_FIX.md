# Phase 2 Verification Fix - Missing Files on Lightsail

## 🔴 Issue Identified

The `event_bus.py` file is missing on Lightsail because the server hasn't pulled the latest changes from GitHub.

## ✅ Solution

### Step 1: Pull Latest Code on Lightsail

```bash
# SSH into Lightsail
cd ~/tradeeon-FE-BE-12-09-2025

# Pull latest changes
git pull origin main
```

### Step 2: Verify Files Exist

```bash
# Check event_bus.py exists
ls -la apps/bots/event_bus.py

# Check all Phase 2 files
ls -la apps/bots/condition_evaluator.py
ls -la apps/bots/event_bus.py
ls -la apps/bots/bot_notifier.py
ls -la apps/bots/run_condition_evaluator.py
ls -la apps/bots/run_bot_notifier.py
```

### Step 3: Fix Import Paths

The import errors are because Python needs the correct `sys.path` setup. The service runners already handle this, but for manual testing:

```bash
# Run from project root, not apps/bots directory
cd ~/tradeeon-FE-BE-12-09-2025

# Set PYTHONPATH
export PYTHONPATH=/home/ubuntu/tradeeon-FE-BE-12-09-2025:$PYTHONPATH

# Test imports from root
python3 -c "from apps.bots.condition_evaluator import CentralizedConditionEvaluator; print('OK')"
python3 -c "from apps.bots.event_bus import EventBus; print('OK')"
python3 -c "from apps.bots.bot_notifier import BotNotifier; print('OK')"
```

### Step 4: Start Services (Correct Method)

The service runners handle path setup automatically, so run them directly:

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Start Condition Evaluator
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &

# Start Bot Notifier
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &
```

### Step 5: Verify Services Running

```bash
# Check processes
ps aux | grep -E "(condition_evaluator|bot_notifier)" | grep -v grep

# Check logs (should be created now)
tail -f apps/bots/evaluator.log
tail -f apps/bots/notifier.log
```

## 🔍 Complete Verification Commands

Run these commands in order on Lightsail:

```bash
# 1. Pull latest code
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main

# 2. Verify files exist
ls -la apps/bots/event_bus.py
ls -la apps/bots/condition_evaluator.py
ls -la apps/bots/bot_notifier.py
ls -la apps/bots/run_condition_evaluator.py
ls -la apps/bots/run_bot_notifier.py

# 3. Check Redis is running
redis-cli ping  # Should return PONG

# 4. Start services
cd apps/bots
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
sleep 2
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &
sleep 2

# 5. Verify services are running
ps aux | grep -E "(condition_evaluator|bot_notifier)" | grep -v grep

# 6. Check logs
tail -n 20 evaluator.log
tail -n 20 notifier.log
```

## ✅ Expected Results

After pulling and starting:

**Processes:**
```
ubuntu  xxxxx  0.0  0.7  16264  6656 pts/0    R    13:09   0:00 python3 run_condition_evaluator.py
ubuntu  xxxxx  0.0  0.8  16668  8320 pts/0    R    13:09   0:00 python3 run_bot_notifier.py
```

**Logs should show:**
```
# evaluator.log
2025-11-17 XX:XX:XX - Centralized Condition Evaluator initialized
2025-11-17 XX:XX:XX - Connected to Redis: redis://localhost:6379
2025-11-17 XX:XX:XX - Starting evaluation loop...

# notifier.log
2025-11-17 XX:XX:XX - Bot Notifier initialized
2025-11-17 XX:XX:XX - Connected to Redis: redis://localhost:6379
2025-11-17 XX:XX:XX - Subscribed to condition channels
2025-11-17 XX:XX:XX - Listening for condition triggers...
```

## 🐛 Troubleshooting

### Issue: Still can't import modules

**Solution**: Make sure you're running from the correct directory:

```bash
# Always run service runners from apps/bots directory
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
python3 run_condition_evaluator.py
```

The service runners handle all path setup automatically.

### Issue: Redis connection failed

**Solution**: Check Redis is running:

```bash
sudo systemctl status redis-server
sudo systemctl start redis-server
redis-cli ping
```

### Issue: File still missing after git pull

**Solution**: Check if file is in git:

```bash
git ls-files apps/bots/event_bus.py
git log --oneline -5 -- apps/bots/event_bus.py
```

If it's in git but not on disk, try:

```bash
git checkout apps/bots/event_bus.py
```

---

**After pulling the latest code, all files should be present and services should start correctly!**


# Fix Dependencies and Import Issues

## Issues Found:
1. Missing `pandas` dependency
2. `event_bus` import path issue
3. Need to install all Python dependencies

---

## Solution:

### Step 1: Install all Python dependencies
```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/api

# Install dependencies directly (not editable mode)
pip3 install pandas numpy aiohttp redis>=5.0.0

# Or install from requirements if it exists
# pip3 install -r requirements.txt
```

### Step 2: Fix import paths (if needed)
The `event_bus` module should be importable from `apps/bots/`. Let's verify the import paths are correct.

### Step 3: Restart services
```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Stop existing
pkill -f run_condition_evaluator
pkill -f run_bot_notifier

# Start again
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &

# Check logs
sleep 3
tail -n 50 evaluator.log
tail -n 50 notifier.log
```

---

## Complete Fix Sequence:

```bash
# 1. Install dependencies
pip3 install pandas numpy aiohttp redis>=5.0.0 supabase pyjwt

# 2. Test imports
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
python3 -c "import pandas; print('pandas OK')"
python3 -c "from event_bus import EventBus; print('event_bus OK')"

# 3. Restart services
pkill -f run_condition_evaluator
pkill -f run_bot_notifier
sleep 2
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &

# 4. Check logs
sleep 3
tail -n 50 evaluator.log
tail -n 50 notifier.log
```



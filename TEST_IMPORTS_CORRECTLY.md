# Test Imports Correctly

## Issue: Simple import test fails because path setup is missing

The scripts have path setup code, but simple `python3 -c` commands don't use it.

---

## Solution: Test by running scripts directly (they have path setup)

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Test evaluator (will show errors if imports fail)
python3 run_condition_evaluator.py &
EVAL_PID=$!
sleep 2
kill $EVAL_PID 2>/dev/null

# Test notifier (will show errors if imports fail)
python3 run_bot_notifier.py &
NOTIF_PID=$!
sleep 2
kill $NOTIF_PID 2>/dev/null
```

---

## Better: Just start services and check logs

The scripts have all the path setup needed. Just start them and check logs:

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Stop any existing
pkill -f run_condition_evaluator
pkill -f run_bot_notifier
sleep 2

# Start services
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &

# Check logs immediately
sleep 3
tail -n 50 evaluator.log
tail -n 50 notifier.log
```

---

## Expected Output:

If imports work, you should see:
- `✅ Event bus connected to Redis`
- `Starting Centralized Condition Evaluator Service`
- `Bot notifier initialized successfully`

If imports fail, you'll see the error in the logs.



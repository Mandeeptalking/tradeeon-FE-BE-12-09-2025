# Fix Missing Dependencies

## Issues Found:
1. ❌ Missing `python-dotenv` package
2. ❌ `event_bus.py` may not be in git

## Complete Fix (Run on Lightsail):

```bash
# 1. Install missing dependency
pip3 install python-dotenv

# 2. Pull latest code (includes event_bus.py)
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main

# 3. Verify event_bus.py exists
ls -la apps/bots/event_bus.py

# 4. Restart services
cd apps/bots
pkill -f run_condition_evaluator
pkill -f run_bot_notifier
sleep 2

nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &

# 5. Check logs
sleep 3
tail -n 30 evaluator.log
tail -n 30 notifier.log
```

## One-Line Fix:

```bash
pip3 install python-dotenv && cd ~/tradeeon-FE-BE-12-09-2025 && git pull origin main && cd apps/bots && pkill -f run_condition_evaluator && pkill -f run_bot_notifier && sleep 2 && nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 & nohup python3 run_bot_notifier.py > notifier.log 2>&1 & sleep 3 && tail -n 30 evaluator.log && echo "---" && tail -n 30 notifier.log
```



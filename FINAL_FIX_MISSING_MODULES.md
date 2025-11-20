# Final Fix - Missing Modules

## Issues Found:
1. ❌ Missing `python-dotenv` package
2. ❌ `event_bus` module not found (import path issue)

## Complete Fix

Run this ONCE on Lightsail:

```bash
# Install missing dependency
pip3 install python-dotenv

# Verify event_bus.py exists
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
ls -la event_bus.py

# If event_bus.py doesn't exist, pull latest code
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main

# Restart services
cd apps/bots
pkill -f run_condition_evaluator
pkill -f run_bot_notifier
sleep 2

nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &

sleep 3
tail -n 30 evaluator.log
tail -n 30 notifier.log
```

## One-Line Fix

```bash
pip3 install python-dotenv && cd ~/tradeeon-FE-BE-12-09-2025 && git pull origin main && cd apps/bots && pkill -f run_condition_evaluator && pkill -f run_bot_notifier && sleep 2 && nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 & nohup python3 run_bot_notifier.py > notifier.log 2>&1 & sleep 3 && tail -n 30 evaluator.log && tail -n 30 notifier.log
```



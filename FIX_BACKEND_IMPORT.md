# Fix Backend Import Path

## Issue: `No module named 'backend'`

The `backend` module is at the project root, but the path setup wasn't including it.

---

## Fix Applied:

Added root path to `run_condition_evaluator.py` so it can find the `backend` module.

---

## Next Steps on Lightsail:

```bash
# 1. Pull latest fix
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main

# 2. Restart services
cd apps/bots
pkill -f run_condition_evaluator
pkill -f run_bot_notifier
sleep 2

# 3. Start services
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &

# 4. Check logs
sleep 3
tail -n 50 evaluator.log
tail -n 50 notifier.log
```

---

**Fix has been committed and pushed!** Pull and restart services.



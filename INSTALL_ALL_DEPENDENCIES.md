# Install All Dependencies

## Issues:
1. Missing `pandas` (needed by condition_evaluator.py)
2. Missing other Python dependencies

---

## Solution: Install all dependencies

```bash
# Install all required Python packages
pip3 install pandas numpy aiohttp redis>=5.0.0 supabase pyjwt python-binance

# Or install from pyproject.toml dependencies directly
cd ~/tradeeon-FE-BE-12-09-2025/apps/api
pip3 install fastapi uvicorn requests websockets python-binance aiohttp pydantic supabase pyjwt redis>=5.0.0 pandas numpy
```

---

## Complete Fix Sequence:

```bash
# 1. Install all dependencies
pip3 install pandas numpy aiohttp redis>=5.0.0 supabase pyjwt python-binance fastapi uvicorn requests websockets pydantic

# 2. Test imports
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
python3 -c "import pandas; print('✅ pandas OK')"
python3 -c "from event_bus import EventBus; print('✅ event_bus OK')"
python3 -c "from apps.api.clients.supabase_client import supabase; print('✅ supabase OK')"

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

---

## Expected Success Output:

### evaluator.log should show:
```
✅ Event bus connected to Redis: redis://localhost:6379
Starting Centralized Condition Evaluator Service...
Evaluator configured with interval: 60s
```

### notifier.log should show:
```
✅ Event bus connected to Redis: redis://localhost:6379
Subscribed to condition triggers (pattern: condition.*)
Bot notifier initialized successfully
```



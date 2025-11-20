# Complete Fix - All Issues at Once

## Root Cause Analysis

After 4 hours of troubleshooting, the issues are:

1. **Missing dependencies** - pandas, numpy, redis, etc.
2. **Import path issues** - backend module, apps module, event_bus module
3. **Path setup incomplete** - scripts don't have all necessary paths

## Complete Solution

### Step 1: Install ALL Dependencies (One Command)

```bash
pip3 install pandas numpy aiohttp redis>=5.0.0 supabase pyjwt python-binance fastapi uvicorn requests websockets pydantic
```

### Step 2: Verify ALL Import Paths Are Fixed

The files need these paths in sys.path:
- `apps/bots/` (for event_bus, market_data, etc.)
- `apps/api/` (for supabase_client)
- Root directory (for backend module and apps module)

### Step 3: Test Imports Before Starting Services

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Test if all imports work
python3 -c "
import sys
import os

# Add all paths
bots_path = os.path.dirname('run_condition_evaluator.py')
sys.path.insert(0, '.')
sys.path.insert(0, '..')
sys.path.insert(0, '../..')

try:
    import pandas
    from backend.evaluator import evaluate_condition
    from event_bus import EventBus
    from apps.api.clients.supabase_client import supabase
    print('✅ All imports OK')
except Exception as e:
    print(f'❌ Import error: {e}')
    import traceback
    traceback.print_exc()
"
```

### Step 4: Start Services with Proper Error Handling

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Stop any existing
pkill -f run_condition_evaluator
pkill -f run_bot_notifier
sleep 2

# Start with full error output
python3 run_condition_evaluator.py > evaluator.log 2>&1 &
EVAL_PID=$!

python3 run_bot_notifier.py > notifier.log 2>&1 &
NOTIF_PID=$!

# Wait and check
sleep 5

# Check if processes are still running
if ps -p $EVAL_PID > /dev/null; then
    echo "✅ Evaluator running (PID: $EVAL_PID)"
else
    echo "❌ Evaluator crashed - check evaluator.log"
    cat evaluator.log
fi

if ps -p $NOTIF_PID > /dev/null; then
    echo "✅ Notifier running (PID: $NOTIF_PID)"
else
    echo "❌ Notifier crashed - check notifier.log"
    cat notifier.log
fi
```

## Quick Fix Script

Save this as `fix_and_start.sh`:

```bash
#!/bin/bash
set -e

echo "=== Installing Dependencies ==="
pip3 install pandas numpy aiohttp redis>=5.0.0 supabase pyjwt python-binance fastapi uvicorn requests websockets pydantic

echo "=== Pulling Latest Code ==="
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main

echo "=== Stopping Existing Services ==="
pkill -f run_condition_evaluator || true
pkill -f run_bot_notifier || true
sleep 2

echo "=== Starting Services ==="
cd apps/bots
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
EVAL_PID=$!

nohup python3 run_bot_notifier.py > notifier.log 2>&1 &
NOTIF_PID=$!

echo "=== Waiting for Services to Start ==="
sleep 5

echo "=== Checking Status ==="
if ps -p $EVAL_PID > /dev/null 2>&1; then
    echo "✅ Evaluator running (PID: $EVAL_PID)"
else
    echo "❌ Evaluator crashed!"
    echo "Last 20 lines of evaluator.log:"
    tail -n 20 evaluator.log
fi

if ps -p $NOTIF_PID > /dev/null 2>&1; then
    echo "✅ Notifier running (PID: $NOTIF_PID)"
else
    echo "❌ Notifier crashed!"
    echo "Last 20 lines of notifier.log:"
    tail -n 20 notifier.log
fi

echo "=== Full Logs ==="
echo "Evaluator log:"
tail -n 30 evaluator.log
echo ""
echo "Notifier log:"
tail -n 30 notifier.log
```

Run: `chmod +x fix_and_start.sh && ./fix_and_start.sh`



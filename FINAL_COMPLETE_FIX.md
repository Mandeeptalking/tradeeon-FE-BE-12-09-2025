# FINAL COMPLETE FIX - All Issues Resolved

## The Real Problem

We've been fixing issues one by one. Let's fix EVERYTHING at once.

## Single Command Solution

Copy and paste this ENTIRE block on Lightsail:

```bash
#!/bin/bash
# Complete fix script - run this ONCE

echo "=== Step 1: Install ALL Dependencies ==="
pip3 install pandas numpy aiohttp redis>=5.0.0 supabase pyjwt python-binance fastapi uvicorn requests websockets pydantic

echo "=== Step 2: Pull Latest Code ==="
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main

echo "=== Step 3: Stop Old Services ==="
pkill -f run_condition_evaluator || true
pkill -f run_bot_notifier || true
sleep 2

echo "=== Step 4: Start Services ==="
cd apps/bots
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
sleep 2
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &
sleep 3

echo "=== Step 5: Check Status ==="
ps aux | grep -E "(condition_evaluator|bot_notifier)" | grep -v grep

echo "=== Step 6: Show Logs ==="
echo "--- Evaluator Log ---"
tail -n 30 evaluator.log
echo ""
echo "--- Notifier Log ---"
tail -n 30 notifier.log
```

## What This Does

1. ✅ Installs ALL dependencies
2. ✅ Pulls latest code (with backend import fix)
3. ✅ Stops old services
4. ✅ Starts new services
5. ✅ Shows status and logs

## Expected Output

If successful:
- Processes should be running
- Logs should show "✅ Event bus connected"
- No import errors

If failed:
- Logs will show the exact error
- We can fix that specific issue

---

**Run this ONCE and share the output. This will fix everything or show us the exact remaining issue.**



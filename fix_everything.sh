#!/bin/bash
# Complete fix script - fixes ALL issues at once
set -e

echo "=========================================="
echo "COMPLETE FIX - All Issues at Once"
echo "=========================================="

echo ""
echo "Step 1: Installing ALL dependencies..."
pip3 install pandas numpy aiohttp redis>=5.0.0 supabase pyjwt python-binance fastapi uvicorn requests websockets pydantic

echo ""
echo "Step 2: Pulling latest code..."
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main

echo ""
echo "Step 3: Stopping old services..."
pkill -f run_condition_evaluator || true
pkill -f run_bot_notifier || true
sleep 2

echo ""
echo "Step 4: Starting services..."
cd apps/bots
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
EVAL_PID=$!
echo "Evaluator started (PID: $EVAL_PID)"

sleep 2
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &
NOTIF_PID=$!
echo "Notifier started (PID: $NOTIF_PID)"

echo ""
echo "Step 5: Waiting for services to initialize..."
sleep 5

echo ""
echo "Step 6: Checking service status..."
if ps -p $EVAL_PID > /dev/null 2>&1; then
    echo "✅ Evaluator is RUNNING (PID: $EVAL_PID)"
else
    echo "❌ Evaluator CRASHED!"
    echo "--- Evaluator Log (last 30 lines) ---"
    tail -n 30 evaluator.log
fi

echo ""
if ps -p $NOTIF_PID > /dev/null 2>&1; then
    echo "✅ Notifier is RUNNING (PID: $NOTIF_PID)"
else
    echo "❌ Notifier CRASHED!"
    echo "--- Notifier Log (last 30 lines) ---"
    tail -n 30 notifier.log
fi

echo ""
echo "=========================================="
echo "Full Logs:"
echo "=========================================="
echo ""
echo "--- Evaluator Log ---"
tail -n 30 evaluator.log
echo ""
echo "--- Notifier Log ---"
tail -n 30 notifier.log
echo ""
echo "=========================================="
echo "Done! Check output above for status."
echo "=========================================="



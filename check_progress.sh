#!/bin/bash
# Progress Check Script - Run this on Lightsail

echo "=========================================="
echo "PROGRESS CHECK - Phase 2 Deployment"
echo "=========================================="
echo ""

echo "1. Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "   ✅ Redis is running"
else
    echo "   ❌ Redis is NOT running"
fi

echo ""
echo "2. Checking Python dependencies..."
MISSING_DEPS=0
for dep in pandas numpy redis aiohttp supabase; do
    if python3 -c "import $dep" 2>/dev/null; then
        echo "   ✅ $dep installed"
    else
        echo "   ❌ $dep MISSING"
        MISSING_DEPS=1
    fi
done

echo ""
echo "3. Checking files exist..."
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots 2>/dev/null || cd apps/bots

if [ -f "run_condition_evaluator.py" ]; then
    echo "   ✅ run_condition_evaluator.py exists"
else
    echo "   ❌ run_condition_evaluator.py MISSING"
fi

if [ -f "run_bot_notifier.py" ]; then
    echo "   ✅ run_bot_notifier.py exists"
else
    echo "   ❌ run_bot_notifier.py MISSING"
fi

if [ -f "bot_notifier.py" ]; then
    echo "   ✅ bot_notifier.py exists"
else
    echo "   ❌ bot_notifier.py MISSING"
fi

if [ -f "event_bus.py" ]; then
    echo "   ✅ event_bus.py exists"
else
    echo "   ❌ event_bus.py MISSING"
fi

echo ""
echo "4. Checking services are running..."
EVAL_RUNNING=$(ps aux | grep -E "[r]un_condition_evaluator" | wc -l)
NOTIF_RUNNING=$(ps aux | grep -E "[r]un_bot_notifier" | wc -l)

if [ "$EVAL_RUNNING" -gt 0 ]; then
    echo "   ✅ Condition Evaluator is RUNNING"
    ps aux | grep -E "[r]un_condition_evaluator" | grep -v grep | awk '{print "      PID: " $2 " | CPU: " $3 "% | MEM: " $4 "%"}'
else
    echo "   ❌ Condition Evaluator is NOT running"
fi

if [ "$NOTIF_RUNNING" -gt 0 ]; then
    echo "   ✅ Bot Notifier is RUNNING"
    ps aux | grep -E "[r]un_bot_notifier" | grep -v grep | awk '{print "      PID: " $2 " | CPU: " $3 "% | MEM: " $4 "%"}'
else
    echo "   ❌ Bot Notifier is NOT running"
fi

echo ""
echo "5. Checking logs for errors..."
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots 2>/dev/null || cd apps/bots

if [ -f "evaluator.log" ]; then
    echo "   --- Evaluator Log (last 10 lines) ---"
    tail -n 10 evaluator.log | sed 's/^/   /'
    
    # Check for errors
    if grep -i "error\|failed\|exception" evaluator.log | tail -n 1 > /dev/null 2>&1; then
        echo "   ⚠️  ERRORS FOUND in evaluator.log:"
        grep -i "error\|failed\|exception" evaluator.log | tail -n 3 | sed 's/^/      /'
    else
        echo "   ✅ No errors in evaluator.log"
    fi
else
    echo "   ⚠️  evaluator.log not found"
fi

echo ""
if [ -f "notifier.log" ]; then
    echo "   --- Notifier Log (last 10 lines) ---"
    tail -n 10 notifier.log | sed 's/^/   /'
    
    # Check for errors
    if grep -i "error\|failed\|exception" notifier.log | tail -n 1 > /dev/null 2>&1; then
        echo "   ⚠️  ERRORS FOUND in notifier.log:"
        grep -i "error\|failed\|exception" notifier.log | tail -n 3 | sed 's/^/      /'
    else
        echo "   ✅ No errors in notifier.log"
    fi
else
    echo "   ⚠️  notifier.log not found"
fi

echo ""
echo "6. Checking for success indicators..."
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots 2>/dev/null || cd apps/bots

if [ -f "evaluator.log" ] && grep -q "Event bus connected\|Starting Centralized" evaluator.log 2>/dev/null; then
    echo "   ✅ Evaluator shows success indicators"
else
    echo "   ⚠️  Evaluator may not have started successfully"
fi

if [ -f "notifier.log" ] && grep -q "Event bus connected\|Bot notifier initialized" notifier.log 2>/dev/null; then
    echo "   ✅ Notifier shows success indicators"
else
    echo "   ⚠️  Notifier may not have started successfully"
fi

echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="

if [ "$EVAL_RUNNING" -gt 0 ] && [ "$NOTIF_RUNNING" -gt 0 ]; then
    echo "✅ STATUS: Services are RUNNING"
    echo ""
    echo "Next steps:"
    echo "1. Monitor logs: tail -f evaluator.log"
    echo "2. Create a test bot via frontend"
    echo "3. Verify condition triggers work"
else
    echo "❌ STATUS: Services are NOT running properly"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check logs: cat evaluator.log && cat notifier.log"
    echo "2. Install missing dependencies if any shown above"
    echo "3. Run: ./fix_everything.sh"
fi

echo "=========================================="



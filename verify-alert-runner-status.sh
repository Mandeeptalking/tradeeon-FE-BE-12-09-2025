#!/bin/bash
# Verify Alert Runner Status

echo "========================================="
echo "Alert Runner Status Check"
echo "========================================="
echo ""

# Check if process is running
echo "1. Checking if alert runner process is running..."
if pgrep -f "apps.alerts.runner" > /dev/null; then
    PID=$(pgrep -f "apps.alerts.runner")
    echo "   ✅ Alert runner is RUNNING"
    echo "   PID: $PID"
    ps aux | grep "$PID" | grep -v grep
else
    echo "   ❌ Alert runner is NOT running"
    echo "   (Process may have exited)"
fi

echo ""

# Check logs
echo "2. Checking recent logs..."
if [ -f "logs/alert-runner.log" ]; then
    echo "   Last 20 lines of log:"
    tail -20 logs/alert-runner.log
    echo ""
    
    # Check for errors
    ERROR_COUNT=$(grep -i "error\|exception\|traceback" logs/alert-runner.log | wc -l)
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo "   ⚠️  Found $ERROR_COUNT error(s) in logs"
        echo "   Recent errors:"
        grep -i "error\|exception\|traceback" logs/alert-runner.log | tail -5
    else
        echo "   ✅ No errors found in logs"
    fi
    
    # Check for successful polling
    POLL_COUNT=$(grep -i "HTTP Request.*alerts" logs/alert-runner.log | wc -l)
    if [ "$POLL_COUNT" -gt 0 ]; then
        echo "   ✅ Found $POLL_COUNT successful polling requests"
    fi
else
    echo "   ⚠️  Log file not found"
fi

echo ""

# Check if it's fetching alerts
echo "3. Checking alert fetching activity..."
if grep -q "alerts?select" logs/alert-runner.log 2>/dev/null; then
    echo "   ✅ Alert runner is fetching alerts from Supabase"
    LATEST_FETCH=$(grep "alerts?select" logs/alert-runner.log | tail -1)
    echo "   Latest fetch: $(echo "$LATEST_FETCH" | cut -d' ' -f1-3)"
else
    echo "   ⚠️  No alert fetching activity found"
fi

echo ""

# Summary
echo "========================================="
echo "Summary"
echo "========================================="
echo ""

if pgrep -f "apps.alerts.runner" > /dev/null; then
    echo "✅ Alert runner is RUNNING"
    echo ""
    echo "To monitor:"
    echo "   tail -f logs/alert-runner.log"
    echo ""
    echo "To stop:"
    echo "   pkill -f 'apps.alerts.runner'"
else
    echo "⚠️  Alert runner process not found"
    echo ""
    echo "It may have exited. Check logs for errors:"
    echo "   tail -50 logs/alert-runner.log"
    echo ""
    echo "To restart:"
    echo "   nohup python3 -m apps.alerts.runner > logs/alert-runner.log 2>&1 &"
fi

echo ""


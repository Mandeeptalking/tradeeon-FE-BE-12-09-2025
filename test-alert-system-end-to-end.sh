#!/bin/bash
# End-to-End Alert System Test
# Tests the complete alert flow: Create → Process → Trigger → Notify

set -e

echo "========================================="
echo "Alert System End-to-End Test"
echo "========================================="
echo ""

# Configuration
API_URL="${API_URL:-https://api.tradeeon.com}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

if [ -z "$AUTH_TOKEN" ]; then
    echo "⚠️  AUTH_TOKEN not set"
    echo "   Set it: export AUTH_TOKEN='your-jwt-token'"
    echo "   Or pass it: AUTH_TOKEN='token' ./test-alert-system-end-to-end.sh"
    echo ""
    exit 1
fi

echo "API URL: $API_URL"
echo ""

# Step 1: Check alert runner is running
echo "Step 1: Checking alert runner status..."
if pgrep -f "apps.alerts.runner" > /dev/null; then
    RUNNER_PID=$(pgrep -f "apps.alerts.runner")
    echo "✅ Alert runner is running (PID: $RUNNER_PID)"
else
    echo "❌ Alert runner is NOT running!"
    echo "   Start it: ./start-alert-runner-lightsail.sh"
    echo ""
    exit 1
fi

echo ""

# Step 2: Check backend API
echo "Step 2: Checking backend API..."
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "✅ Backend API is healthy"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "❌ Backend API health check failed"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi

echo ""

# Step 3: List existing alerts
echo "Step 3: Listing existing alerts..."
ALERTS_RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/alerts")
echo "   Response: $ALERTS_RESPONSE"
ALERT_COUNT=$(echo "$ALERTS_RESPONSE" | grep -o '"alert_id"' | wc -l || echo "0")
echo "   Existing alerts: $ALERT_COUNT"
echo ""

# Step 4: Create test alert
echo "Step 4: Creating test alert..."
TEST_ALERT=$(cat <<EOF
{
  "symbol": "BTCUSDT",
  "base_timeframe": "1h",
  "conditions": [
    {
      "id": "rsi_oversold",
      "type": "indicator",
      "indicator": "RSI",
      "component": "RSI",
      "operator": "<",
      "compareWith": "value",
      "compareValue": 30,
      "timeframe": "same",
      "settings": {"length": 14}
    }
  ],
  "logic": "AND",
  "action": {
    "type": "notify"
  },
  "status": "active"
}
EOF
)

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/alerts" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$TEST_ALERT")

echo "   Response: $CREATE_RESPONSE"

# Extract alert ID
ALERT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"alert_id":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$ALERT_ID" ]; then
    echo "❌ Failed to create alert or extract alert ID"
    echo "   Full response: $CREATE_RESPONSE"
    exit 1
fi

echo "✅ Test alert created"
echo "   Alert ID: $ALERT_ID"
echo ""

# Step 5: Verify alert in database
echo "Step 5: Verifying alert in database..."
GET_RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/alerts/$ALERT_ID")
if echo "$GET_RESPONSE" | grep -q "$ALERT_ID"; then
    echo "✅ Alert found in database"
else
    echo "❌ Alert not found in database"
    echo "   Response: $GET_RESPONSE"
    exit 1
fi

echo ""

# Step 6: Check alert runner logs
echo "Step 6: Checking alert runner logs..."
if [ -f "logs/alert-runner.log" ]; then
    echo "   Recent log entries:"
    tail -n 20 logs/alert-runner.log | grep -i "alert\|trigger\|error" || echo "   (no relevant entries found)"
else
    echo "⚠️  Log file not found: logs/alert-runner.log"
fi

echo ""

# Step 7: Wait and check for processing
echo "Step 7: Waiting for alert runner to process alert..."
echo "   (This may take a few seconds for the next polling cycle)"
sleep 5

# Check logs again
if [ -f "logs/alert-runner.log" ]; then
    echo "   Checking for processing..."
    if tail -n 50 logs/alert-runner.log | grep -q "$ALERT_ID\|BTCUSDT"; then
        echo "✅ Alert runner is processing alerts"
    else
        echo "⚠️  No evidence of alert processing in logs yet"
        echo "   This is normal if condition hasn't triggered"
    fi
fi

echo ""

# Step 8: Check alert logs
echo "Step 8: Checking alert trigger logs..."
ALERT_LOGS=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/alerts/$ALERT_ID/logs")
LOG_COUNT=$(echo "$ALERT_LOGS" | grep -o '"id"' | wc -l || echo "0")
echo "   Trigger log entries: $LOG_COUNT"

if [ "$LOG_COUNT" -gt 0 ]; then
    echo "✅ Alert has been triggered!"
    echo "   Logs: $ALERT_LOGS"
else
    echo "ℹ️  Alert not triggered yet (condition may not be met)"
    echo "   This is normal - alert will trigger when RSI < 30"
fi

echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
echo "✅ Alert runner: Running"
echo "✅ Backend API: Healthy"
echo "✅ Alert created: $ALERT_ID"
echo "✅ Alert in database: Verified"
echo "⚠️  Alert processing: Check logs"
echo "⚠️  Alert trigger: Condition dependent"
echo ""
echo "Next steps:"
echo "1. Monitor logs: tail -f logs/alert-runner.log"
echo "2. Wait for condition to trigger (RSI < 30)"
echo "3. Check notifications when triggered"
echo "4. View alert logs: curl -H 'Authorization: Bearer $AUTH_TOKEN' $API_URL/alerts/$ALERT_ID/logs"
echo ""
echo "To clean up test alert:"
echo "   curl -X DELETE -H 'Authorization: Bearer $AUTH_TOKEN' $API_URL/alerts/$ALERT_ID"
echo ""


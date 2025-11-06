#!/bin/bash

# Alerts API Test Script
# Make sure to replace $TOKEN with a valid Supabase JWT token

BASE_URL="http://localhost:8000"
TOKEN="YOUR_SUPABASE_JWT_TOKEN_HERE"

echo "🚀 Testing Alerts API Endpoints"
echo "================================"

# Test 1: Create Alert
echo "📝 Creating Alert..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/alerts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol":"BTCUSDT",
    "base_timeframe":"1m",
    "conditions":[
      {
        "id":"c1",
        "type":"indicator",
        "indicator":"RSI",
        "component":"RSI",
        "operator":"crosses_below",
        "compareWith":"value",
        "compareValue":30,
        "timeframe":"same",
        "settings":{"length":14}
      }
    ],
    "logic":"AND",
    "action":{"type":"notify"},
    "status":"active"
  }')

echo "Create Response: $CREATE_RESPONSE"
ALERT_ID=$(echo $CREATE_RESPONSE | jq -r '.alert_id')
echo "Created Alert ID: $ALERT_ID"
echo ""

# Test 2: List Alerts
echo "📋 Listing Alerts..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/alerts" | jq '.'
echo ""

# Test 3: Get Specific Alert
echo "🔍 Getting Alert $ALERT_ID..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/alerts/$ALERT_ID" | jq '.'
echo ""

# Test 4: Update Alert
echo "✏️ Updating Alert $ALERT_ID..."
curl -s -X PATCH "$BASE_URL/alerts/$ALERT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"paused"}' | jq '.'
echo ""

# Test 5: Get Alert Logs
echo "📊 Getting Alert Logs for $ALERT_ID..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/alerts/$ALERT_ID/logs" | jq '.'
echo ""

# Test 6: Delete Alert
echo "🗑️ Deleting Alert $ALERT_ID..."
curl -s -X DELETE "$BASE_URL/alerts/$ALERT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "✅ All tests completed!"




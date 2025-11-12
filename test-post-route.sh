#!/bin/bash

echo "=== Testing POST /connections Route ==="
echo ""

# Test 1: Without authentication (should return 401, not 404)
echo "Test 1: POST without authentication (expecting 401)..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:8000/connections \
  -H "Content-Type: application/json" \
  -d '{"exchange":"BINANCE","api_key":"test","api_secret":"test"}')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

if [ "$HTTP_STATUS" == "401" ]; then
  echo "✅ Route exists! Returns 401 (authentication required) - This is correct!"
elif [ "$HTTP_STATUS" == "404" ]; then
  echo "❌ Route NOT found! Returns 404 - Route is not registered!"
  echo ""
  echo "Checking if route exists in code..."
  sudo docker exec tradeeon-backend grep -n '@router.post("/")' apps/api/routers/connections.py
  exit 1
else
  echo "⚠️  Unexpected status: $HTTP_STATUS"
fi

echo ""
echo "=== Route Verification Complete ==="
echo ""
echo "If route returns 401, it means:"
echo "  ✅ Route is registered correctly"
echo "  ✅ Authentication is required (as expected)"
echo "  ✅ Frontend should work once authenticated"
echo ""
echo "Next: Test the connection through the frontend UI:"
echo "  1. Sign in at https://www.tradeeon.com"
echo "  2. Go to /app/connections"
echo "  3. Click 'Connect Exchange'"
echo "  4. Enter Binance credentials"
echo "  5. Test and save connection"


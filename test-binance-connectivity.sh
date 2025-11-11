#!/bin/bash
# Test Binance API connectivity from Lightsail backend

echo "=== Testing Binance API Connectivity ==="
echo ""

# Test 1: Can we reach Binance API at all?
echo "1. Testing basic connectivity to Binance API..."
BINANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.binance.com/api/v3/ping" --max-time 5)
if [ "$BINANCE_RESPONSE" == "200" ]; then
    echo "   ✅ Can reach Binance API (ping returned 200)"
else
    echo "   ❌ Cannot reach Binance API (HTTP $BINANCE_RESPONSE)"
    exit 1
fi

# Test 2: Can we get exchange info (public endpoint)?
echo ""
echo "2. Testing public endpoint (no auth required)..."
EXCHANGE_INFO=$(curl -s "https://api.binance.com/api/v3/exchangeInfo" --max-time 5)
if echo "$EXCHANGE_INFO" | grep -q "symbols"; then
    echo "   ✅ Public endpoint works (got exchange info)"
else
    echo "   ❌ Public endpoint failed"
    echo "   Response: $EXCHANGE_INFO"
    exit 1
fi

# Test 3: Check backend logs for actual Binance requests
echo ""
echo "3. Checking backend logs for Binance API requests..."
echo "   Looking for recent Binance API calls..."
RECENT_BINANCE_LOGS=$(sudo docker logs tradeeon-backend 2>&1 | grep -i "binance\|api.binance.com" | tail -10)
if [ -n "$RECENT_BINANCE_LOGS" ]; then
    echo "   ✅ Found Binance API requests in logs:"
    echo "$RECENT_BINANCE_LOGS" | sed 's/^/      /'
else
    echo "   ⚠️  No recent Binance API requests found in logs"
fi

# Test 4: Check for specific error codes
echo ""
echo "4. Checking for Binance error codes..."
ERROR_2015=$(sudo docker logs tradeeon-backend 2>&1 | grep -i "error -2015\|code.*-2015" | tail -5)
if [ -n "$ERROR_2015" ]; then
    echo "   ⚠️  Found -2015 errors (IP whitelist/invalid API key):"
    echo "$ERROR_2015" | sed 's/^/      /'
fi

ERROR_1022=$(sudo docker logs tradeeon-backend 2>&1 | grep -i "error -1022\|code.*-1022\|invalid signature" | tail -5)
if [ -n "$ERROR_1022" ]; then
    echo "   ⚠️  Found -1022 errors (Invalid signature):"
    echo "$ERROR_1022" | sed 's/^/      /'
fi

# Test 5: Check what IP Binance sees
echo ""
echo "5. Checking backend's outbound IP..."
BACKEND_IP=$(curl -s "https://api.ipify.org" --max-time 5)
echo "   Backend outbound IP: $BACKEND_IP"
if [ "$BACKEND_IP" == "52.77.227.148" ]; then
    echo "   ✅ IP matches expected whitelist IP (52.77.227.148)"
else
    echo "   ⚠️  IP does NOT match expected whitelist IP (52.77.227.148)"
    echo "   This might be the issue!"
fi

# Test 6: Test authenticated endpoint with a test (will fail but shows if we reach Binance)
echo ""
echo "6. Testing if we can reach Binance authenticated endpoint..."
# This will fail with -2015 but proves we're hitting Binance
TEST_AUTH=$(curl -s "https://api.binance.com/api/v3/account?timestamp=$(date +%s)000&signature=test" \
    -H "X-MBX-APIKEY: test" --max-time 5)
if echo "$TEST_AUTH" | grep -q "code\|msg"; then
    echo "   ✅ Reached Binance API (got error response, which is expected)"
    echo "   Response: $TEST_AUTH"
else
    echo "   ❌ Did not reach Binance API (no response or network error)"
fi

echo ""
echo "=== Summary ==="
echo "If you see -2015 errors, Binance IS being reached but rejecting due to:"
echo "  1. IP not whitelisted (even if 'Unrestricted' is selected, Binance may have restricted it)"
echo "  2. API key revoked/restricted by Binance"
echo "  3. API key permissions mismatch"
echo ""
echo "ACTION REQUIRED:"
echo "  1. In Binance API Management, select 'Restrict access to trusted IPs only'"
echo "  2. Ensure IP 52.77.227.148 is in the whitelist"
echo "  3. Save changes"
echo "  4. If API key was revoked, create a new one"


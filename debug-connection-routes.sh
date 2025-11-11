#!/bin/bash

echo "=== Complete Connection Flow Debug ==="

# 1. Check if backend is running
echo "1. Checking if backend container is running..."
if ! sudo docker ps | grep -q tradeeon-backend; then
    echo "   ❌ Backend container is NOT running!"
    echo "   Starting container..."
    sudo docker start tradeeon-backend 2>/dev/null || {
        echo "   Container doesn't exist. Need to create it."
        exit 1
    }
    sleep 5
else
    echo "   ✅ Backend container is running"
fi

# 2. Check backend logs for route registration
echo ""
echo "2. Checking backend startup logs for route registration..."
sudo docker logs tradeeon-backend 2>&1 | grep -i "application startup\|uvicorn\|routes\|connections" | tail -10

# 3. Test GET /connections/info (should work without auth)
echo ""
echo "3. Testing GET /connections/info (no auth required)..."
INFO_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" https://api.tradeeon.com/connections/info)
HTTP_STATUS=$(echo "$INFO_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$INFO_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo "   ✅ GET /connections/info works"
    echo "   Response: $(echo "$BODY" | head -c 100)..."
else
    echo "   ❌ GET /connections/info failed: HTTP $HTTP_STATUS"
    echo "   Response: $BODY"
fi

# 4. Test POST /connections (should return 401 without auth, 404 if route doesn't exist)
echo ""
echo "4. Testing POST /connections (without auth - should return 401, not 404)..."
POST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"exchange":"BINANCE","api_key":"test","api_secret":"test"}' \
    https://api.tradeeon.com/connections)
POST_HTTP_STATUS=$(echo "$POST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
POST_BODY=$(echo "$POST_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$POST_HTTP_STATUS" = "401" ]; then
    echo "   ✅ POST /connections route exists (returned 401 as expected)"
    echo "   Response: $POST_BODY"
elif [ "$POST_HTTP_STATUS" = "404" ]; then
    echo "   ❌ POST /connections route NOT FOUND (404)"
    echo "   This means the route isn't registered in the backend"
    echo "   Response: $POST_BODY"
else
    echo "   ⚠️  POST /connections returned unexpected status: $POST_HTTP_STATUS"
    echo "   Response: $POST_BODY"
fi

# 5. Test POST /connections/test (should return 401 without auth)
echo ""
echo "5. Testing POST /connections/test (without auth - should return 401)..."
TEST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"exchange":"BINANCE","api_key":"test","api_secret":"test"}' \
    https://api.tradeeon.com/connections/test)
TEST_HTTP_STATUS=$(echo "$TEST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
TEST_BODY=$(echo "$TEST_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$TEST_HTTP_STATUS" = "401" ]; then
    echo "   ✅ POST /connections/test route exists (returned 401 as expected)"
    echo "   Response: $TEST_BODY"
elif [ "$TEST_HTTP_STATUS" = "404" ]; then
    echo "   ❌ POST /connections/test route NOT FOUND (404)"
    echo "   Response: $TEST_BODY"
else
    echo "   ⚠️  POST /connections/test returned unexpected status: $TEST_HTTP_STATUS"
    echo "   Response: $TEST_BODY"
fi

# 6. Check if routes are registered in the container
echo ""
echo "6. Checking if routes are registered in backend code..."
if sudo docker exec tradeeon-backend grep -q "@router.post(\"/\")" apps/api/routers/connections.py 2>/dev/null; then
    echo "   ✅ POST / route found in code"
else
    echo "   ❌ POST / route NOT found in code - backend needs update"
fi

if sudo docker exec tradeeon-backend grep -q "@router.post(\"/test\")" apps/api/routers/connections.py 2>/dev/null; then
    echo "   ✅ POST /test route found in code"
else
    echo "   ❌ POST /test route NOT found in code - backend needs update"
fi

# 7. Check backend code version
echo ""
echo "7. Checking backend code version..."
CONTAINER_CODE=$(sudo docker exec tradeeon-backend grep -A 5 "@router.post(\"/\")" apps/api/routers/connections.py 2>/dev/null | head -1)
LOCAL_CODE=$(grep -A 5 "@router.post(\"/\")" ~/tradeeon-FE-BE-12-09-2025/apps/api/routers/connections.py 2>/dev/null | head -1)

if [ -n "$CONTAINER_CODE" ] && [ -n "$LOCAL_CODE" ]; then
    if [ "$CONTAINER_CODE" = "$LOCAL_CODE" ]; then
        echo "   ✅ Container code matches local code"
    else
        echo "   ⚠️  Container code may differ from local code"
    fi
fi

echo ""
echo "=== Summary ==="
echo "If POST /connections returns 404, the backend needs to be redeployed."
echo "Run: ./redeploy-backend-debug.sh"


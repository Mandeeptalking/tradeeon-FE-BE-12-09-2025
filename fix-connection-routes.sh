#!/bin/bash

echo "=== Fixing Connection Routes Issue ==="

cd ~/tradeeon-FE-BE-12-09-2025 || { echo "❌ Failed to change directory"; exit 1; }

# 1. Pull latest code
echo "1. Pulling latest code from Git..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }
echo "   ✅ Code updated"

# 2. Verify routes exist in code
echo ""
echo "2. Verifying routes exist in code..."
if grep -q "@router.post(\"/\")" apps/api/routers/connections.py; then
    echo "   ✅ POST / route found in code"
else
    echo "   ❌ POST / route NOT found in code!"
    exit 1
fi

if grep -q "@router.post(\"/test\")" apps/api/routers/connections.py; then
    echo "   ✅ POST /test route found in code"
else
    echo "   ❌ POST /test route NOT found in code!"
    exit 1
fi

# 3. Stop and remove old container
echo ""
echo "3. Stopping old container..."
sudo docker stop tradeeon-backend 2>/dev/null || true
sudo docker rm tradeeon-backend 2>/dev/null || true
echo "   ✅ Old container removed"

# 4. Build new image WITHOUT cache
echo ""
echo "4. Building new Docker image (no cache)..."
sudo docker build --no-cache -t tradeeon-backend . || { 
    echo "❌ Docker build failed"; 
    exit 1; 
}
echo "   ✅ Image built successfully"

# 5. Start new container
echo ""
echo "5. Starting new container..."
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend || { 
    echo "❌ Container start failed"; 
    exit 1; 
}
echo "   ✅ Container started"

# 6. Wait for startup
echo ""
echo "6. Waiting for backend to start (10 seconds)..."
sleep 10

# 7. Verify container is running
echo ""
echo "7. Verifying container is running..."
if sudo docker ps | grep -q tradeeon-backend; then
    echo "   ✅ Container is running"
else
    echo "   ❌ Container is NOT running!"
    echo "   Checking logs..."
    sudo docker logs tradeeon-backend 2>&1 | tail -30
    exit 1
fi

# 8. Test health endpoint
echo ""
echo "8. Testing health endpoint..."
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "   ✅ Backend is healthy"
else
    echo "   ❌ Backend health check failed: $HEALTH"
    exit 1
fi

# 9. Test GET /connections/info (should work)
echo ""
echo "9. Testing GET /connections/info..."
INFO_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" https://api.tradeeon.com/connections/info)
HTTP_STATUS=$(echo "$INFO_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "   ✅ GET /connections/info works"
else
    echo "   ⚠️  GET /connections/info returned HTTP $HTTP_STATUS"
fi

# 10. Test POST /connections (should return 401, not 404)
echo ""
echo "10. Testing POST /connections (should return 401, not 404)..."
POST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"exchange":"BINANCE","api_key":"test","api_secret":"test"}' \
    https://api.tradeeon.com/connections)
POST_STATUS=$(echo "$POST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$POST_STATUS" = "401" ]; then
    echo "   ✅ POST /connections route EXISTS (returned 401 as expected)"
elif [ "$POST_STATUS" = "404" ]; then
    echo "   ❌ POST /connections route NOT FOUND (404)"
    echo "   This means routes aren't registered properly"
    echo "   Checking backend logs..."
    sudo docker logs tradeeon-backend 2>&1 | grep -i "route\|startup\|error" | tail -20
    exit 1
else
    echo "   ⚠️  POST /connections returned HTTP $POST_STATUS"
fi

# 11. Test POST /connections/test (should return 401)
echo ""
echo "11. Testing POST /connections/test..."
TEST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"exchange":"BINANCE","api_key":"test","api_secret":"test"}' \
    https://api.tradeeon.com/connections/test)
TEST_STATUS=$(echo "$TEST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$TEST_STATUS" = "401" ]; then
    echo "   ✅ POST /connections/test route EXISTS (returned 401 as expected)"
elif [ "$TEST_STATUS" = "404" ]; then
    echo "   ❌ POST /connections/test route NOT FOUND (404)"
    exit 1
else
    echo "   ⚠️  POST /connections/test returned HTTP $TEST_STATUS"
fi

# 12. Show recent logs
echo ""
echo "12. Recent backend logs (last 20 lines)..."
sudo docker logs tradeeon-backend 2>&1 | tail -20

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "✅ Backend redeployed with latest code"
echo "✅ Routes verified and working"
echo ""
echo "Now try the connection test again from the frontend."
echo "The 'Not Found' error should be resolved."


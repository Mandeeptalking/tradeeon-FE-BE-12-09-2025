#!/bin/bash

echo "=== Deploying Tradeeon Backend to Lightsail ==="

# 1. Navigate to project root
echo "1. Navigating to project root..."
cd ~/tradeeon-FE-BE-12-09-2025 || { echo "❌ Failed to change directory. Exiting."; exit 1; }
echo "   Current directory: $(pwd)"

# 2. Pull latest code from Git
echo "2. Pulling latest code from Git (origin main)..."
git pull origin main || { echo "❌ Git pull failed. Exiting."; exit 1; }
echo "   ✅ Git pull complete."

# 3. Stop and remove existing container (if any)
echo "3. Stopping and removing old Docker container (if running)..."
sudo docker stop tradeeon-backend 2>/dev/null || true
sudo docker rm tradeeon-backend 2>/dev/null || true
echo "   ✅ Old container stopped and removed."

# 4. Build Docker image without cache
echo "4. Building new Docker image (tradeeon-backend) without cache..."
sudo docker build --no-cache -t tradeeon-backend . || { echo "❌ Docker build failed. Exiting."; exit 1; }
echo "   ✅ Docker image built successfully."

# 5. Run new Docker container
echo "5. Running new Docker container..."
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend || { echo "❌ Docker run failed. Exiting."; exit 1; }
echo "   ✅ New container started."

# 6. Wait for container to become healthy
echo "6. Waiting for container to become healthy (up to 30 seconds)..."
sleep 5 # Initial wait
for i in {1..5}; do
  HEALTH_STATUS=$(sudo docker inspect --format='{{.State.Health.Status}}' tradeeon-backend 2>/dev/null || echo "starting")
  if [ "$HEALTH_STATUS" == "healthy" ]; then
    echo "   ✅ Container is healthy."
    break
  elif [ "$HEALTH_STATUS" == "unhealthy" ]; then
    echo "❌ Container is unhealthy. Check logs: sudo docker logs tradeeon-backend"
    exit 1
  fi
  echo "   Container health: $HEALTH_STATUS. Waiting more..."
  sleep 5
done

if [ "$HEALTH_STATUS" != "healthy" ]; then
  echo "❌ Container did not become healthy in time. Check logs: sudo docker logs tradeeon-backend"
  exit 1
fi

# 7. Verify backend health endpoint
echo "7. Verifying backend health endpoint (http://localhost:8000/health)..."
HEALTH_CHECK_LOCAL=$(curl -s http://localhost:8000/health)
if echo "$HEALTH_CHECK_LOCAL" | grep -q '"status":"ok"'; then
  echo "   ✅ Local health check successful: $HEALTH_CHECK_LOCAL"
else
  echo "❌ Local health check failed: $HEALTH_CHECK_LOCAL"
  exit 1
fi

# 8. Verify connections info endpoint (local)
echo "8. Verifying connections info endpoint (http://localhost:8000/connections/info)..."
CONNECTIONS_INFO_LOCAL=$(curl -s http://localhost:8000/connections/info)
if echo "$CONNECTIONS_INFO_LOCAL" | grep -q '"whitelist_ip":"52.77.227.148"'; then
  echo "   ✅ Local connections info check successful."
else
  echo "❌ Local connections info check failed: $CONNECTIONS_INFO_LOCAL"
  echo "   This might indicate the new code is not running or the route is misconfigured."
  exit 1
fi

# 9. Verify POST route exists in container
echo "9. Verifying POST /connections route exists in container..."
POST_ROUTE_EXISTS=$(sudo docker exec tradeeon-backend grep -c '@router.post("/")' apps/api/routers/connections.py 2>/dev/null || echo "0")
if [ "$POST_ROUTE_EXISTS" -gt 0 ]; then
  echo "   ✅ POST route found in container code."
else
  echo "❌ POST route NOT found in container code!"
  echo "   This indicates the container doesn't have the latest code."
  exit 1
fi

# 10. Test POST endpoint (should return 401 without auth, not 404)
echo "10. Testing POST /connections endpoint (expecting 401, not 404)..."
POST_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/connections \
  -H "Content-Type: application/json" \
  -d '{"exchange":"BINANCE","api_key":"test","api_secret":"test"}')
if [ "$POST_TEST" == "401" ]; then
  echo "   ✅ POST endpoint returns 401 (authentication required) - route is registered correctly."
elif [ "$POST_TEST" == "404" ]; then
  echo "❌ POST endpoint returns 404 (Not Found) - route is NOT registered!"
  echo "   This is the root cause of the frontend error."
  exit 1
else
  echo "   ⚠️  POST endpoint returned $POST_TEST (expected 401)"
fi

# 11. Verify connections info endpoint (via Nginx/HTTPS)
echo "11. Verifying connections info endpoint (https://api.tradeeon.com/connections/info)..."
CONNECTIONS_INFO_HTTPS=$(curl -s https://api.tradeeon.com/connections/info)
if echo "$CONNECTIONS_INFO_HTTPS" | grep -q '"whitelist_ip":"52.77.227.148"'; then
  echo "   ✅ HTTPS connections info check successful."
else
  echo "❌ HTTPS connections info check failed: $CONNECTIONS_INFO_HTTPS"
  echo "   This might indicate Nginx is not configured correctly or SSL is not working."
  exit 1
fi

echo ""
echo "=== Backend Deployment Complete ==="
echo "✅ All endpoints verified successfully!"
echo "Frontend should now be able to connect to https://api.tradeeon.com/connections"
echo ""
echo "If you still see 'Not Found' errors, check:"
echo "  1. Frontend is using correct API URL: https://api.tradeeon.com"
echo "  2. Frontend is sending Authorization header with Bearer token"
echo "  3. User is authenticated in Supabase"

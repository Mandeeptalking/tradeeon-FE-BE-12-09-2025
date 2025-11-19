#!/bin/bash

echo "=== Fixing Bot Import Issue ==="

# Navigate to project root
cd ~/tradeeon-FE-BE-12-09-2025 || { echo "❌ Failed to change directory"; exit 1; }

# 1. Pull latest code
echo "1. Pulling latest code..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

# 2. Clear all Python cache files
echo "2. Clearing Python cache files..."
find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
echo "   ✅ Cache cleared"

# 3. Verify the fix files exist
echo "3. Verifying fix files..."
if [ -f "apps/api/modules/bots/__init__.py" ]; then
    echo "   ✅ __init__.py exists"
else
    echo "   ❌ __init__.py missing!"
    exit 1
fi

if grep -q "from bot_action_handler import" apps/api/modules/alerts/dispatch.py; then
    echo "   ✅ dispatch.py has correct import"
else
    echo "   ❌ dispatch.py import not fixed!"
    exit 1
fi

# 4. Stop and remove old container
echo "4. Stopping and removing old container..."
sudo docker stop tradeeon-backend 2>/dev/null || true
sudo docker rm tradeeon-backend 2>/dev/null || true
echo "   ✅ Old container removed"

# 5. Rebuild Docker image (no cache to ensure fresh build)
echo "5. Rebuilding Docker image (no cache)..."
sudo docker build --no-cache -t tradeeon-backend . || { echo "❌ Docker build failed"; exit 1; }
echo "   ✅ Docker image rebuilt"

# 6. Run new container
echo "6. Starting new container..."
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend || { echo "❌ Docker run failed"; exit 1; }
echo "   ✅ Container started"

# 7. Wait for container to be ready
echo "7. Waiting for container to be ready..."
sleep 10

# 8. Check container logs for import errors
echo "8. Checking container logs for errors..."
LOGS=$(sudo docker logs tradeeon-backend 2>&1 | tail -50)
if echo "$LOGS" | grep -q "No module named 'apps.api.modules.bots'"; then
    echo "   ❌ Still seeing import error in logs!"
    echo "   Recent logs:"
    echo "$LOGS" | tail -20
    exit 1
else
    echo "   ✅ No import errors in logs"
fi

# 9. Test health endpoint
echo "9. Testing health endpoint..."
for i in {1..10}; do
    HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null || echo "")
    if echo "$HEALTH" | grep -q '"status":"ok"'; then
        echo "   ✅ Backend is healthy"
        break
    else
        if [ $i -eq 10 ]; then
            echo "   ❌ Health check failed after 10 attempts"
            echo "   Response: $HEALTH"
            sudo docker logs tradeeon-backend --tail 30
            exit 1
        else
            echo "   Waiting for backend... ($i/10)"
            sleep 3
        fi
    fi
done

# 10. Test bot creation endpoint (should not return 500)
echo "10. Testing bot creation endpoint..."
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/bots/dca-bots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"test":"data"}' 2>/dev/null || echo "000")

if [ "$TEST_RESPONSE" == "500" ]; then
    echo "   ❌ Still getting 500 error!"
    echo "   Checking detailed error..."
    curl -s -X POST http://localhost:8000/bots/dca-bots \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer test" \
      -d '{"test":"data"}' | head -100
    exit 1
elif [ "$TEST_RESPONSE" == "401" ] || [ "$TEST_RESPONSE" == "422" ]; then
    echo "   ✅ Endpoint is working (got $TEST_RESPONSE - expected auth/validation error, not import error)"
else
    echo "   ⚠️  Got response code: $TEST_RESPONSE (not 500, which is good)"
fi

echo ""
echo "=== Fix Complete ==="
echo "✅ Backend should now be working without import errors"
echo "Test the bot creation endpoint from the frontend now."


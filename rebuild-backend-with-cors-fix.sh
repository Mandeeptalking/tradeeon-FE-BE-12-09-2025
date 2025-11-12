#!/bin/bash

echo "=== Rebuilding Backend with CORS Fix ==="
echo "This will rebuild the Docker image with latest code including CORS fix"
echo ""

cd ~/tradeeon-FE-BE-12-09-2025 || { echo "❌ Failed to change directory"; exit 1; }

# Step 1: Stash local changes
echo "1. Stashing local changes..."
git stash || true

# Step 2: Pull latest code
echo "2. Pulling latest code..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

# Step 3: Verify CORS fix is in code
echo "3. Verifying CORS fix is in code..."
if grep -q "X-CSRF-Token" apps/api/main.py; then
    echo "   ✅ CORS fix found in code"
else
    echo "   ❌ CORS fix NOT found! Check apps/api/main.py"
    exit 1
fi

# Step 4: Stop and remove old container
echo "4. Stopping and removing old container..."
sudo docker stop tradeeon-backend 2>/dev/null || true
sudo docker rm tradeeon-backend 2>/dev/null || true
echo "   ✅ Old container removed"

# Step 5: Rebuild Docker image
echo "5. Rebuilding Docker image (this may take a few minutes)..."
sudo docker build -t tradeeon-backend . || {
    echo "❌ Docker build failed"
    exit 1
}
echo "   ✅ Docker image rebuilt"

# Step 6: Run new container
echo "6. Starting new container..."
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend || {
    echo "❌ Docker run failed"
    exit 1
}
echo "   ✅ Container started"

# Step 7: Wait for container to start
echo "7. Waiting for container to start..."
sleep 5

# Step 8: Verify container is running
echo "8. Verifying container status..."
if sudo docker ps | grep -q tradeeon-backend; then
    echo "   ✅ Container is running"
else
    echo "   ❌ Container is not running!"
    echo "   Checking logs..."
    sudo docker logs tradeeon-backend --tail 50
    exit 1
fi

# Step 9: Test health endpoint
echo "9. Testing health endpoint..."
sleep 3
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "   ✅ Backend is healthy"
    echo "   Response: $HEALTH"
else
    echo "   ⚠️  Health check: $HEALTH"
fi

# Step 10: Show recent logs
echo ""
echo "10. Recent logs:"
sudo docker logs tradeeon-backend --tail 20

echo ""
echo "=== Rebuild Complete ==="
echo "✅ Backend is now running with CORS fix"
echo "✅ CSRF protection can now be re-enabled in frontend"
echo ""
echo "Next: Re-enable CSRF headers in frontend and redeploy"


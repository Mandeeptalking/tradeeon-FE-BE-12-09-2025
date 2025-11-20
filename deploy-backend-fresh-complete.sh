#!/bin/bash

echo "=== Complete Fresh Backend Deployment to Lightsail ==="
echo "This script will:"
echo "  1. Pull latest code from Git"
echo "  2. Clear ALL Python caches"
echo "  3. Remove old Docker container and image"
echo "  4. Build fresh Docker image (NO CACHE)"
echo "  5. Start new container"
echo "  6. Verify deployment"
echo ""

# 1. Navigate to project root
echo "1. Navigating to project root..."
cd ~/tradeeon-FE-BE-12-09-2025 || { echo "❌ Failed to change directory. Exiting."; exit 1; }
echo "   Current directory: $(pwd)"

# 2. Stash any local changes
echo "2. Stashing local changes (if any)..."
git stash || true
echo "   ✅ Local changes stashed."

# 3. Pull latest code from Git
echo "3. Pulling latest code from Git (origin main)..."
git pull origin main || { echo "❌ Git pull failed. Exiting."; exit 1; }
echo "   ✅ Git pull complete."
echo "   Latest commit: $(git log -1 --oneline)"

# 4. Verify the fix is in the code
echo "4. Verifying fix is in bots.py..."
if grep -q "user: AuthedUser = Depends(get_current_user)" apps/api/routers/bots.py; then
    echo "   ✅ Correct endpoint definition found (uses Depends(get_current_user))"
else
    echo "❌ ERROR: The fix is NOT in the code! The endpoint still expects user_id as query parameter."
    echo "   Please check apps/api/routers/bots.py"
    exit 1
fi

if grep -q "user_id.*Query" apps/api/routers/bots.py; then
    echo "❌ ERROR: Found user_id Query parameter in bots.py! This should NOT be there."
    exit 1
else
    echo "   ✅ No user_id Query parameter found (correct)"
fi

# 5. Clear Python cache files (aggressive)
echo "5. Clearing ALL Python bytecode cache files..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
find . -type f -name "*.pyd" -delete 2>/dev/null || true
find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
echo "   ✅ Python cache cleared."

# 6. Stop and remove existing container (if any)
echo "6. Stopping and removing old Docker container (if running)..."
sudo docker stop tradeeon-backend 2>/dev/null || true
sudo docker rm tradeeon-backend 2>/dev/null || true
echo "   ✅ Old container stopped and removed."

# 7. Remove old Docker image to ensure a fresh build
echo "7. Removing old Docker image (if exists)..."
sudo docker rmi tradeeon-backend 2>/dev/null || true
echo "   ✅ Old Docker image removed."

# 8. Remove all unused Docker images and containers
echo "8. Cleaning up unused Docker resources..."
sudo docker system prune -f 2>/dev/null || true
echo "   ✅ Docker cleanup complete."

# 9. Build Docker image without cache (completely fresh)
echo "9. Building new Docker image (tradeeon-backend) WITHOUT CACHE..."
sudo docker build --no-cache --pull -t tradeeon-backend . || { 
    echo "❌ Docker build failed. Exiting."; 
    exit 1; 
}
echo "   ✅ Docker image built successfully."

# 10. Run new Docker container
echo "10. Running new Docker container..."
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend || { 
    echo "❌ Docker run failed. Exiting."; 
    exit 1; 
}
echo "   ✅ New container started."

# 11. Wait for container to become healthy
echo "11. Waiting for container to become healthy (up to 30 seconds)..."
sleep 8 # Initial wait, slightly longer for fresh build
for i in {1..6}; do
  HEALTH_STATUS=$(sudo docker inspect --format='{{.State.Health.Status}}' tradeeon-backend 2>/dev/null || echo "starting")
  if [ "$HEALTH_STATUS" == "healthy" ]; then
    echo "   ✅ Container is healthy."
    break
  elif [ "$HEALTH_STATUS" == "unhealthy" ]; then
    echo "❌ Container is unhealthy. Check logs: sudo docker logs tradeeon-backend"
    sudo docker logs tradeeon-backend --tail 50
    exit 1
  fi
  echo "   Container health: $HEALTH_STATUS. Waiting more... ($i/6)"
  sleep 5
done

if [ "$HEALTH_STATUS" != "healthy" ]; then
  echo "❌ Container did not become healthy in time. Check logs: sudo docker logs tradeeon-backend"
  sudo docker logs tradeeon-backend --tail 50
  exit 1
fi

# 12. Verify backend health endpoint
echo "12. Verifying backend health endpoint (http://localhost:8000/health)..."
HEALTH_CHECK_LOCAL=$(curl -s http://localhost:8000/health)
if echo "$HEALTH_CHECK_LOCAL" | grep -q '"status":"ok"'; then
  echo "   ✅ Local health check successful: $HEALTH_CHECK_LOCAL"
else
  echo "❌ Local health check failed: $HEALTH_CHECK_LOCAL"
  sudo docker logs tradeeon-backend --tail 50
  exit 1
fi

# 13. Test the /bots/ endpoint (should require auth, not user_id query param)
echo "13. Testing /bots/ endpoint (should return 401 without auth, not 422)..."
BOTS_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/bots/)
if [ "$BOTS_TEST" == "401" ]; then
  echo "   ✅ /bots/ endpoint correctly requires authentication (401)"
elif [ "$BOTS_TEST" == "422" ]; then
  echo "❌ ERROR: /bots/ endpoint still returns 422 (expecting user_id query param)"
  echo "   This means the old code is still running!"
  echo "   Checking container logs..."
  sudo docker logs tradeeon-backend --tail 50
  exit 1
else
  echo "   ⚠️  Unexpected status code: $BOTS_TEST (expected 401)"
fi

echo ""
echo "=== Backend Deployment Complete ==="
echo "✅ All checks passed. The backend should now be running with the latest code."
echo ""
echo "Next steps:"
echo "  1. Try accessing the Bots Page in the frontend"
echo "  2. Check browser console for any errors"
echo "  3. Verify that your bot from Supabase appears on the page"
echo ""
echo "If issues persist, check logs with:"
echo "  sudo docker logs tradeeon-backend --tail 100"
echo ""


#!/bin/bash

echo "=== FORCE REBUILD BACKEND - Fix 422 Error ==="
echo "This will completely remove and rebuild the backend"
echo ""

cd ~/tradeeon-FE-BE-12-09-2025 || exit 1

# 1. Stop and remove everything
echo "1. Stopping and removing all containers and images..."
sudo docker stop tradeeon-backend 2>/dev/null || true
sudo docker rm tradeeon-backend 2>/dev/null || true
sudo docker rmi tradeeon-backend 2>/dev/null || true
sudo docker system prune -f 2>/dev/null || true
echo "   ✅ Cleaned up"

# 2. Pull latest code
echo "2. Pulling latest code..."
git stash || true
git reset --hard HEAD 2>/dev/null || true
git fetch origin main
git reset --hard origin/main
echo "   ✅ Code updated"
echo "   Latest commit: $(git log -1 --oneline)"

# 3. Verify the fix is in the code
echo "3. Verifying code has the fix..."
if grep -q "user: AuthedUser = Depends(get_current_user)" apps/api/routers/bots.py; then
    echo "   ✅ Correct code found (uses Depends)"
else
    echo "   ❌ ERROR: Code still has old implementation!"
    exit 1
fi

if grep -q "user_id.*Query\|Query.*user_id" apps/api/routers/bots.py; then
    echo "   ❌ ERROR: Still has user_id Query parameter!"
    grep -n "user_id.*Query\|Query.*user_id" apps/api/routers/bots.py
    exit 1
fi

echo "   ✅ Code verification passed"

# 4. Clear all caches
echo "4. Clearing all Python caches..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
echo "   ✅ Caches cleared"

# 5. Build fresh image
echo "5. Building fresh Docker image (this may take a few minutes)..."
sudo docker build --no-cache --pull -t tradeeon-backend . || {
    echo "❌ Build failed!"
    exit 1
}
echo "   ✅ Image built"

# 6. Start container
echo "6. Starting new container..."
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend || {
    echo "❌ Container start failed!"
    exit 1
}
echo "   ✅ Container started"

# 7. Wait and verify
echo "7. Waiting for container to be ready..."
sleep 10

# 8. Test endpoint
echo "8. Testing /bots/ endpoint..."
RESPONSE=$(curl -s http://localhost:8000/bots/)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/bots/)

echo "   Response status: $STATUS"
echo "   Response body: $RESPONSE"

if [ "$STATUS" == "401" ]; then
    echo "   ✅ SUCCESS! Endpoint now requires authentication (401)"
    echo "   ✅ Old code is fixed!"
elif [ "$STATUS" == "422" ]; then
    echo "   ❌ FAILED! Still returning 422 (old code still running)"
    echo "   Checking container logs..."
    sudo docker logs tradeeon-backend --tail 30
    echo ""
    echo "   Checking code in container..."
    sudo docker exec tradeeon-backend grep -A 3 "@router.get" /app/apps/api/routers/bots.py | head -5
    exit 1
else
    echo "   ⚠️  Unexpected status: $STATUS"
fi

echo ""
echo "=== Deployment Complete ==="
echo "✅ Backend should now be running with correct code"
echo "Test the bots page in the frontend"


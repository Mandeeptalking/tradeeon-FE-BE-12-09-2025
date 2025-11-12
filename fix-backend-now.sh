#!/bin/bash

echo "=== Fixing Backend Deployment ==="

cd ~/tradeeon-FE-BE-12-09-2025 || exit 1

# Step 1: Stash local changes
echo "1. Stashing local changes..."
git stash

# Step 2: Pull latest code
echo "2. Pulling latest code..."
git pull origin main

# Step 3: Check what CORS headers are in the code
echo "3. Verifying CORS configuration in code..."
if grep -q "X-CSRF-Token" apps/api/main.py; then
    echo "   ✅ CORS fix is in the code"
else
    echo "   ❌ CORS fix NOT found in code!"
    exit 1
fi

# Step 4: Check if container needs rebuild or just restart
echo "4. Checking container status..."
if sudo docker ps | grep -q tradeeon-backend; then
    echo "   Container is running"
    echo "5. Restarting container to pick up code changes..."
    sudo docker restart tradeeon-backend
else
    echo "   Container not running, checking if it exists..."
    if sudo docker ps -a | grep -q tradeeon-backend; then
        echo "   Container exists but stopped, starting it..."
        sudo docker start tradeeon-backend
    else
        echo "   ❌ Container doesn't exist! You may need to rebuild it."
        echo "   Run: sudo docker build -t tradeeon-backend ."
        echo "   Then: sudo docker run -d --name tradeeon-backend --restart unless-stopped -p 8000:8000 --env-file apps/api/.env tradeeon-backend"
        exit 1
    fi
fi

# Step 5: Wait for container to start
echo "6. Waiting for container to start..."
sleep 5

# Step 6: Verify container is running
if sudo docker ps | grep -q tradeeon-backend; then
    echo "   ✅ Container is running"
else
    echo "   ❌ Container failed to start!"
    echo "   Checking logs..."
    sudo docker logs tradeeon-backend --tail 50
    exit 1
fi

# Step 7: Test health endpoint
echo "7. Testing health endpoint..."
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "   ✅ Backend is healthy: $HEALTH"
else
    echo "   ⚠️  Health check returned: $HEALTH"
fi

# Step 8: Check if CORS fix is actually running
echo "8. Verifying CORS fix is active..."
echo "   (Check logs to see if X-CSRF-Token is in allowed headers)"
sudo docker logs tradeeon-backend 2>&1 | grep -i "cors\|x-csrf" | tail -5 || echo "   (No CORS logs found - this is normal)"

echo ""
echo "=== Done ==="
echo "Backend should now be running with CORS fix."
echo "Test the dashboard endpoint now."


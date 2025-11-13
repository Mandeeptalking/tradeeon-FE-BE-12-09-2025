#!/bin/bash

echo "=== Quick Backend Redeploy (Restart Only) ==="

# Navigate to project root
cd ~/tradeeon-FE-BE-12-09-2025 || { echo "❌ Failed to change directory"; exit 1; }

# Pull latest code
echo "1. Pulling latest code..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

# Restart Docker container (code is mounted or needs rebuild)
echo "2. Restarting Docker container..."
sudo docker restart tradeeon-backend || {
    echo "   Container not found, you may need to rebuild"
    exit 1
}

# Wait for container to start
echo "3. Waiting for container to start..."
sleep 5

# Check container status
echo "4. Checking container status..."
if sudo docker ps | grep -q tradeeon-backend; then
    echo "   ✅ Container is running"
else
    echo "   ❌ Container is not running!"
    echo "   Checking logs..."
    sudo docker logs tradeeon-backend --tail 50
    exit 1
fi

# Test health endpoint
echo "5. Testing health endpoint..."
sleep 2
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "   ✅ Backend is healthy"
else
    echo "   ⚠️  Health check: $HEALTH"
fi

echo ""
echo "=== Quick Redeploy Complete ==="
echo "If code changes aren't reflected, use full redeploy script."


#!/bin/bash

echo "=== Quick Backend Redeploy ==="

# Navigate to project root
cd ~/tradeeon-FE-BE-12-09-2025 || { echo "❌ Failed to change directory"; exit 1; }

# Stash local changes (if any)
echo "1. Stashing local changes..."
git stash || true

# Pull latest code
echo "2. Pulling latest code..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

# Restart Docker container
echo "3. Restarting Docker container..."
sudo docker restart tradeeon-backend || {
    echo "   Container not found, checking status..."
    sudo docker ps -a | grep tradeeon-backend
    echo "   If container doesn't exist, you may need to rebuild it"
    exit 1
}

# Wait a moment
echo "4. Waiting for container to start..."
sleep 3

# Check container status
echo "5. Checking container status..."
if sudo docker ps | grep -q tradeeon-backend; then
    echo "   ✅ Container is running"
else
    echo "   ❌ Container is not running!"
    echo "   Checking logs..."
    sudo docker logs tradeeon-backend --tail 50
    exit 1
fi

# Test health endpoint
echo "6. Testing health endpoint..."
sleep 2
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "   ✅ Backend is healthy"
    echo "   Response: $HEALTH"
else
    echo "   ⚠️  Health check: $HEALTH"
fi

# Show recent logs
echo ""
echo "7. Recent logs:"
sudo docker logs tradeeon-backend --tail 20

echo ""
echo "=== Redeployment Complete ==="
echo "Backend should now be running with latest code."
echo "Test the dashboard endpoint now."


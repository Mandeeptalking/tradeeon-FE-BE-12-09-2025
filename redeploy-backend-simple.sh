#!/bin/bash

echo "=== Quick Backend Redeploy ==="
echo "This script will pull latest code and restart the backend container"
echo ""

# Navigate to project root
cd ~/tradeeon-FE-BE-12-09-2025 || { echo "❌ Project directory not found. Exiting."; exit 1; }

# Pull latest code
echo "1. Pulling latest code from Git..."
git pull origin main || { echo "❌ Git pull failed. Exiting."; exit 1; }
echo "   ✅ Code updated"

# Restart Docker container (this will use the latest code if mounted, or rebuild if needed)
echo "2. Restarting Docker container..."
sudo docker restart tradeeon-backend 2>/dev/null || {
    echo "   Container not found. Stopping old container..."
    sudo docker stop tradeeon-backend 2>/dev/null || true
    sudo docker rm tradeeon-backend 2>/dev/null || true
    
    echo "   Building new image..."
    sudo docker build -t tradeeon-backend . || { echo "❌ Docker build failed"; exit 1; }
    
    echo "   Starting new container..."
    sudo docker run -d \
      --name tradeeon-backend \
      --restart unless-stopped \
      -p 8000:8000 \
      --env-file apps/api/.env \
      tradeeon-backend || { echo "❌ Docker run failed"; exit 1; }
}

# Wait a moment for container to start
echo "3. Waiting for container to start..."
sleep 3

# Check if container is running
if sudo docker ps | grep -q tradeeon-backend; then
    echo "   ✅ Container is running"
else
    echo "   ❌ Container is not running. Check logs: sudo docker logs tradeeon-backend"
    exit 1
fi

# Test health endpoint
echo "4. Testing health endpoint..."
sleep 2
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "   ✅ Backend is healthy"
    echo "   Response: $HEALTH"
else
    echo "   ⚠️  Health check returned: $HEALTH"
    echo "   Check logs: sudo docker logs tradeeon-backend"
fi

echo ""
echo "=== Redeployment Complete ==="
echo "Backend should now be running with latest code."
echo "Check logs: sudo docker logs tradeeon-backend -f"


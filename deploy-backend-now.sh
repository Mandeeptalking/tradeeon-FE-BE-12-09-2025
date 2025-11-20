#!/bin/bash

echo "=== Quick Backend Deployment - Pull Latest Code & Restart ==="

# Navigate to project root
cd ~/tradeeon-FE-BE-12-09-2025 || { echo "❌ Failed to change directory"; exit 1; }

# Stash any local changes
echo "1. Stashing local changes..."
git stash || true

# Pull latest code
echo "2. Pulling latest code from main..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }
echo "   ✅ Code updated"

# Restart Docker container (this will use the latest code if mounted)
echo "3. Restarting Docker container..."
sudo docker restart tradeeon-backend || {
    echo "   ⚠️  Container restart failed, trying to rebuild..."
    
    # Stop and remove old container
    sudo docker stop tradeeon-backend 2>/dev/null || true
    sudo docker rm tradeeon-backend 2>/dev/null || true
    
    # Rebuild image
    echo "   Building new Docker image..."
    sudo docker build -t tradeeon-backend . || { echo "❌ Docker build failed"; exit 1; }
    
    # Run new container
    echo "   Starting new container..."
    sudo docker run -d \
      --name tradeeon-backend \
      --restart unless-stopped \
      -p 8000:8000 \
      --env-file apps/api/.env \
      tradeeon-backend || { echo "❌ Docker run failed"; exit 1; }
}

# Wait for container to start
echo "4. Waiting for container to start..."
sleep 5

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
sleep 3
for i in {1..5}; do
    HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null || echo "")
    if echo "$HEALTH" | grep -q '"status":"ok"'; then
        echo "   ✅ Backend is healthy"
        echo "   Response: $HEALTH"
        break
    else
        if [ $i -eq 5 ]; then
            echo "   ⚠️  Health check failed after 5 attempts"
            echo "   Response: $HEALTH"
            echo "   Checking logs..."
            sudo docker logs tradeeon-backend --tail 30
        else
            echo "   Waiting for backend to be ready (attempt $i/5)..."
            sleep 3
        fi
    fi
done

# Show recent logs
echo ""
echo "7. Recent logs:"
sudo docker logs tradeeon-backend --tail 20

echo ""
echo "=== Deployment Complete ==="
echo "✅ Backend should now be running with latest code."
echo "Test at: https://api.tradeeon.com/health"


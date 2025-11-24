#!/bin/bash

echo "=== Checking and Starting Backend ==="

# Check if container exists
if sudo docker ps -a | grep -q tradeeon-backend; then
    echo "Container exists"
    
    # Check if it's running
    if sudo docker ps | grep -q tradeeon-backend; then
        echo "✅ Container is running"
    else
        echo "⚠️  Container exists but is not running. Starting..."
        sudo docker start tradeeon-backend
        sleep 5
    fi
else
    echo "❌ Container does not exist. Creating..."
    
    # Check if image exists
    if sudo docker images | grep -q tradeeon-backend; then
        echo "Image exists, creating container..."
        sudo docker run -d \
          --name tradeeon-backend \
          --restart unless-stopped \
          -p 8000:8000 \
          --env-file apps/api/.env \
          tradeeon-backend
        sleep 5
    else
        echo "❌ Image does not exist. You need to build it first:"
        echo "   sudo docker build --no-cache -t tradeeon-backend ."
        exit 1
    fi
fi

# Check container status
echo ""
echo "Container status:"
sudo docker ps | grep tradeeon-backend || sudo docker ps -a | grep tradeeon-backend

# Check logs
echo ""
echo "Recent logs:"
sudo docker logs tradeeon-backend --tail 20

# Test endpoint
echo ""
echo "Testing endpoint..."
sleep 3
curl -s http://localhost:8000/bots/ || echo "Connection failed"


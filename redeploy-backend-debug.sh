#!/bin/bash

echo "=== Redeploying Backend with Latest Code ==="

# 1. Navigate to project root
cd ~/tradeeon-FE-BE-12-09-2025 || { echo "❌ Failed to change directory"; exit 1; }

# 2. Pull latest code
echo "1. Pulling latest code..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }
echo "   ✅ Code updated"

# 3. Stop and remove container
echo "2. Stopping old container..."
sudo docker stop tradeeon-backend 2>/dev/null || true
sudo docker rm tradeeon-backend 2>/dev/null || true
echo "   ✅ Old container removed"

# 4. Build new image
echo "3. Building new Docker image..."
sudo docker build --no-cache -t tradeeon-backend . || { echo "❌ Build failed"; exit 1; }
echo "   ✅ Image built"

# 5. Start new container
echo "4. Starting new container..."
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend || { echo "❌ Container start failed"; exit 1; }
echo "   ✅ Container started"

# 6. Wait for startup
echo "5. Waiting for backend to start..."
sleep 5

# 7. Check logs for errors
echo "6. Checking recent logs for authentication errors..."
echo ""
echo "=== Recent Backend Logs ==="
sudo docker logs tradeeon-backend 2>&1 | tail -30
echo ""

# 8. Test health endpoint
echo "7. Testing health endpoint..."
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "   ✅ Backend is healthy"
else
  echo "   ❌ Backend health check failed: $HEALTH"
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next: Try the connection test again and check logs:"
echo "  sudo docker logs tradeeon-backend 2>&1 | grep -i 'jwt\|token\|auth\|401' | tail -20"


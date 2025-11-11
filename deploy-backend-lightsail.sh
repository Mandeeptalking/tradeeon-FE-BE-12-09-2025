#!/bin/bash
# Complete Backend Deployment Script for Lightsail
# Run this on your Lightsail instance

set -e

echo "=========================================="
echo "  Tradeeon Backend Deployment"
echo "=========================================="
echo ""

cd ~/tradeeon-FE-BE-12-09-2025

echo "Step 1: Updating code from git..."
git pull origin main

echo ""
echo "Step 2: Verifying /info route exists..."
if grep -q '@router.get("/info")' apps/api/routers/connections.py; then
    echo "✅ Route found in code"
else
    echo "❌ Route NOT found - aborting"
    exit 1
fi

echo ""
echo "Step 3: Stopping and removing old container..."
sudo docker stop tradeeon-backend 2>/dev/null || true
sudo docker rm tradeeon-backend 2>/dev/null || true

echo ""
echo "Step 4: Building new image (no cache)..."
sudo docker build --no-cache -t tradeeon-backend .

echo ""
echo "Step 5: Starting new container..."
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend

echo ""
echo "Step 6: Waiting for container to start..."
sleep 8

echo ""
echo "Step 7: Verifying container is running..."
if sudo docker ps | grep -q tradeeon-backend; then
    echo "✅ Container is running"
else
    echo "❌ Container is NOT running - checking logs..."
    sudo docker logs tradeeon-backend | tail -20
    exit 1
fi

echo ""
echo "Step 8: Verifying /info route in container..."
if sudo docker exec tradeeon-backend grep -q '@router.get("/info")' apps/api/routers/connections.py; then
    echo "✅ Route found in container"
else
    echo "❌ Route NOT found in container - rebuild failed"
    exit 1
fi

echo ""
echo "Step 9: Testing endpoints..."
echo "Health check:"
curl -s http://localhost:8000/health | head -1
echo ""
echo "Connections info:"
curl -s http://localhost:8000/connections/info | head -5

echo ""
echo "=========================================="
echo "  ✅ Deployment Complete!"
echo "=========================================="

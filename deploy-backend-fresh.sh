#!/bin/bash

# Force fresh deployment of backend - clears all caches and rebuilds

set -e

echo "=== Force Fresh Backend Deployment ==="

# Navigate to project
cd ~/tradeeon-FE-BE-12-09-2025 || { echo "❌ Project directory not found"; exit 1; }

# Stash any local changes
echo "📦 Stashing local changes..."
git stash || true

# Pull latest code
echo "⬇️  Pulling latest code from main..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

# Verify the fix is in the code
echo "🔍 Verifying bots.py has correct endpoint..."
if ! grep -q "Depends(get_current_user)" apps/api/routers/bots.py; then
    echo "❌ ERROR: bots.py doesn't have the correct endpoint definition!"
    echo "   Expected: Depends(get_current_user)"
    echo "   Please check the file and ensure it's correct."
    exit 1
fi
echo "✅ bots.py has correct endpoint definition"

# Clear ALL Python cache
echo "🧹 Clearing ALL Python cache files..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
echo "✅ Python cache cleared"

# Stop and remove old container
echo "🛑 Stopping and removing old container..."
sudo docker stop tradeeon-backend 2>/dev/null || true
sudo docker rm tradeeon-backend 2>/dev/null || true

# Remove old image to force fresh build
echo "🗑️  Removing old Docker image..."
sudo docker rmi tradeeon-backend 2>/dev/null || true

# Build new Docker image WITHOUT cache
echo "🔨 Building NEW Docker image (no cache)..."
sudo docker build --no-cache --pull -t tradeeon-backend . || { 
    echo "❌ Docker build failed"; 
    exit 1; 
}
echo "✅ Docker image built successfully"

# Run new container
echo "🚀 Starting new container..."
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend || { 
    echo "❌ Docker run failed"; 
    exit 1; 
}
echo "✅ Container started"

# Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 8

# Verify health
echo "🏥 Verifying backend health..."
for i in {1..10}; do
  HEALTH=$(curl -s http://localhost:8000/health)
  if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "✅ Backend is healthy!"
    echo ""
    echo "=== Deployment Complete ==="
    echo "✅ Backend deployed successfully with fresh build"
    echo "🌐 Test at: https://api.tradeeon.com/health"
    echo ""
    echo "📋 Verify endpoint:"
    echo "   curl -H 'Authorization: Bearer YOUR_TOKEN' https://api.tradeeon.com/bots/"
    exit 0
  fi
  echo "   Waiting for backend... ($i/10)"
  sleep 3
done

echo "❌ Backend health check failed"
echo "📋 Container logs:"
sudo docker logs tradeeon-backend --tail 50
exit 1


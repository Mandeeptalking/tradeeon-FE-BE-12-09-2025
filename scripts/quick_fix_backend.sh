#!/bin/bash
# Quick fix script to restore backend access
# Run this on Lightsail if backend is down after Docker changes

set -e

echo "========================================="
echo "Quick Fix: Restore Backend Access"
echo "========================================="

# Navigate to project root
cd ~/tradeeon-FE-BE-12-09-2025 || cd "$(dirname "$0")/.."

echo ""
echo "1. Checking current backend status..."
echo ""

# Check if backend container exists
if sudo docker ps -a | grep -q tradeeon-backend; then
    echo "[INFO] Backend container found"
    BACKEND_EXISTS=true
else
    echo "[INFO] Backend container not found"
    BACKEND_EXISTS=false
fi

# Check if backend is running
if sudo docker ps | grep -q tradeeon-backend; then
    echo "[INFO] Backend container is running"
    BACKEND_RUNNING=true
else
    echo "[WARN] Backend container is NOT running"
    BACKEND_RUNNING=false
fi

# Check docker-compose
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
    if ! command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    fi
    echo "[INFO] Docker Compose available: $DOCKER_COMPOSE_CMD"
    
    # Check if services are defined
    if [ -f "docker-compose.yml" ]; then
        echo "[INFO] docker-compose.yml found"
        
        # Check Redis dependency
        if grep -q "depends_on" docker-compose.yml && grep -q "redis" docker-compose.yml; then
            echo "[WARN] Backend depends on Redis - this might be the issue"
        fi
    fi
fi

echo ""
echo "2. Checking backend logs..."
echo ""

if [ "$BACKEND_EXISTS" = true ]; then
    echo "--- Last 20 lines of backend logs ---"
    sudo docker logs tradeeon-backend --tail 20 2>&1 | head -20 || echo "Could not read logs"
fi

echo ""
echo "3. Attempting to fix..."
echo ""

# Option 1: Restart existing container
if [ "$BACKEND_EXISTS" = true ] && [ "$BACKEND_RUNNING" = false ]; then
    echo "[INFO] Attempting to restart existing backend container..."
    sudo docker restart tradeeon-backend
    sleep 5
    
    if sudo docker ps | grep -q tradeeon-backend; then
        echo "[OK] Backend container restarted successfully"
        BACKEND_RUNNING=true
    else
        echo "[FAIL] Backend container failed to start"
        echo "--- Container logs ---"
        sudo docker logs tradeeon-backend --tail 30
    fi
fi

# Option 2: If docker-compose is used and backend depends on Redis
if [ -f "docker-compose.yml" ] && [ "$BACKEND_RUNNING" = false ]; then
    echo "[INFO] Attempting to fix with Docker Compose..."
    
    # Start Redis first if it exists in compose
    if grep -q "redis:" docker-compose.yml; then
        echo "[INFO] Starting Redis..."
        $DOCKER_COMPOSE_CMD up -d redis || true
        sleep 5
    fi
    
    # Start backend
    echo "[INFO] Starting backend..."
    $DOCKER_COMPOSE_CMD up -d backend || true
    sleep 5
    
    if $DOCKER_COMPOSE_CMD ps | grep -q "backend.*Up"; then
        echo "[OK] Backend started via Docker Compose"
        BACKEND_RUNNING=true
    fi
fi

# Option 3: Start as standalone container
if [ "$BACKEND_RUNNING" = false ]; then
    echo "[INFO] Attempting to start as standalone container..."
    
    # Pull latest code
    git pull origin main || echo "[WARN] Could not pull latest code"
    
    # Build image
    echo "[INFO] Building backend image..."
    sudo docker build -t tradeeon-backend -f Dockerfile . || echo "[WARN] Build failed, using existing image"
    
    # Stop old container if exists
    sudo docker stop tradeeon-backend 2>/dev/null || true
    sudo docker rm tradeeon-backend 2>/dev/null || true
    
    # Start new container
    echo "[INFO] Starting backend container..."
    sudo docker run -d \
      --name tradeeon-backend \
      --restart unless-stopped \
      -p 8000:8000 \
      -v "$(pwd)/logs:/app/logs" 2>/dev/null || -v "$HOME/tradeeon-FE-BE-12-09-2025/logs:/app/logs" \
      -e PYTHONPATH=/app \
      -e SUPABASE_URL="${SUPABASE_URL}" \
      -e SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}" \
      -e SUPABASE_JWT_SECRET="${SUPABASE_JWT_SECRET}" \
      -e CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:5173,https://tradeeon.com}" \
      tradeeon-backend
    
    sleep 5
    
    if sudo docker ps | grep -q tradeeon-backend; then
        echo "[OK] Backend started as standalone container"
        BACKEND_RUNNING=true
    else
        echo "[FAIL] Backend failed to start"
        echo "--- Container logs ---"
        sudo docker logs tradeeon-backend --tail 30 2>&1 || echo "Could not read logs"
    fi
fi

echo ""
echo "4. Verifying backend..."
echo ""

# Test health endpoint
if [ "$BACKEND_RUNNING" = true ]; then
    sleep 3
    
    echo "[INFO] Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s http://localhost:8000/health || echo "FAILED")
    
    if echo "$HEALTH_RESPONSE" | grep -q "status"; then
        echo "[OK] Backend is responding!"
        echo "Health response: $HEALTH_RESPONSE"
    else
        echo "[WARN] Backend might not be fully ready yet"
        echo "Response: $HEALTH_RESPONSE"
        
        echo ""
        echo "--- Backend logs (last 20 lines) ---"
        sudo docker logs tradeeon-backend --tail 20
    fi
else
    echo "[FAIL] Backend is NOT running"
    echo ""
    echo "--- Final container status ---"
    sudo docker ps -a | grep backend || echo "No backend container found"
    echo ""
    echo "Please check logs manually:"
    echo "  sudo docker logs tradeeon-backend --tail 100"
fi

echo ""
echo "========================================="
echo "Fix script completed"
echo "========================================="



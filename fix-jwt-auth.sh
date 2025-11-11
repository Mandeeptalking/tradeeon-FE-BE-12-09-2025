#!/bin/bash

echo "=== JWT Authentication Diagnosis & Fix ==="

cd ~/tradeeon-FE-BE-12-09-2025 || { echo "❌ Failed to change directory"; exit 1; }

# 1. Pull latest code
echo "1. Pulling latest code..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

# 2. Check current JWT secret in container
echo ""
echo "2. Checking current SUPABASE_JWT_SECRET in container..."
CURRENT_JWT=$(sudo docker exec tradeeon-backend printenv SUPABASE_JWT_SECRET 2>/dev/null)
if [ -n "$CURRENT_JWT" ]; then
    echo "   Current JWT secret length: ${#CURRENT_JWT}"
    echo "   First 30 chars: ${CURRENT_JWT:0:30}..."
    echo "   Last 30 chars: ...${CURRENT_JWT: -30}"
else
    echo "   ❌ SUPABASE_JWT_SECRET is NOT set!"
fi

# 3. Check expected JWT secret
echo ""
echo "3. Expected JWT secret for mgjlnmlhwuqspctanaik project:"
EXPECTED_JWT="b5xpWCI1kSA9+zuP39rNJ3RIJiwHa86gGsL6mBcUpl6u6VxFaTowQcHoNpJhrYTacxAdsHBosS+k88xHlNdXyQ=="
echo "   Length: ${#EXPECTED_JWT}"
echo "   First 30 chars: ${EXPECTED_JWT:0:30}..."
echo "   Last 30 chars: ...${EXPECTED_JWT: -30}"

# 4. Compare
if [ "$CURRENT_JWT" = "$EXPECTED_JWT" ]; then
    echo ""
    echo "   ✅ JWT secret matches expected value"
else
    echo ""
    echo "   ❌ JWT secret does NOT match!"
    echo "   This is likely the cause of authentication failures."
fi

# 5. Check .env file
echo ""
echo "4. Checking apps/api/.env file..."
if [ -f "apps/api/.env" ]; then
    ENV_JWT=$(grep "^SUPABASE_JWT_SECRET=" apps/api/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$ENV_JWT" ]; then
        echo "   JWT secret in .env length: ${#ENV_JWT}"
        if [ "$ENV_JWT" = "$EXPECTED_JWT" ]; then
            echo "   ✅ .env file has correct JWT secret"
        else
            echo "   ❌ .env file has incorrect JWT secret"
            echo "   Updating .env file..."
            # Backup
            cp apps/api/.env apps/api/.env.backup
            # Update JWT secret
            if grep -q "^SUPABASE_JWT_SECRET=" apps/api/.env; then
                sed -i "s|^SUPABASE_JWT_SECRET=.*|SUPABASE_JWT_SECRET=$EXPECTED_JWT|" apps/api/.env
            else
                echo "SUPABASE_JWT_SECRET=$EXPECTED_JWT" >> apps/api/.env
            fi
            echo "   ✅ Updated .env file"
        fi
    else
        echo "   ⚠️  SUPABASE_JWT_SECRET not found in .env"
        echo "   Adding SUPABASE_JWT_SECRET to .env..."
        echo "SUPABASE_JWT_SECRET=$EXPECTED_JWT" >> apps/api/.env
        echo "   ✅ Added JWT secret to .env"
    fi
else
    echo "   ❌ .env file not found!"
fi

# 6. Check backend logs for JWT errors
echo ""
echo "5. Checking backend logs for JWT errors..."
sudo docker logs tradeeon-backend 2>&1 | grep -i "jwt\|token\|signature\|invalid\|expired" | tail -20

# 7. Redeploy with updated .env
echo ""
echo "6. Redeploying backend with updated configuration..."
sudo docker stop tradeeon-backend 2>/dev/null || true
sudo docker rm tradeeon-backend 2>/dev/null || true

echo "   Building new image..."
sudo docker build --no-cache -t tradeeon-backend . || { echo "❌ Build failed"; exit 1; }

echo "   Starting container..."
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend || { echo "❌ Container start failed"; exit 1; }

echo "   Waiting for startup..."
sleep 10

# 8. Verify JWT secret in new container
echo ""
echo "7. Verifying JWT secret in new container..."
NEW_JWT=$(sudo docker exec tradeeon-backend printenv SUPABASE_JWT_SECRET 2>/dev/null)
if [ "$NEW_JWT" = "$EXPECTED_JWT" ]; then
    echo "   ✅ JWT secret is correct in container"
else
    echo "   ❌ JWT secret still incorrect!"
    echo "   Current: ${NEW_JWT:0:30}..."
    echo "   Expected: ${EXPECTED_JWT:0:30}..."
fi

# 9. Test health endpoint
echo ""
echo "8. Testing health endpoint..."
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "   ✅ Backend is healthy"
else
    echo "   ❌ Backend health check failed"
fi

echo ""
echo "=== Diagnosis Complete ==="
echo ""
echo "Next: Try the connection test from frontend again."
echo "If still failing, check logs:"
echo "  sudo docker logs tradeeon-backend 2>&1 | grep -i 'jwt\|signature' | tail -30"


# Quick Backend Deployment - Fix "Field required" Error

## The Error
"Backend Configuration Error: The backend is expecting a parameter that should not be required: user_id: Field required."

This means the backend is still running **OLD CODE** that expects `user_id` as a query parameter.

## The Fix
The code is already fixed in the repository. You just need to **deploy it**.

## Deploy on Lightsail (SSH into your server)

### Option 1: Use the deployment script (Recommended)
```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
chmod +x deploy-backend-fresh-complete.sh
./deploy-backend-fresh-complete.sh
```

### Option 2: Manual deployment
```bash
cd ~/tradeeon-FE-BE-12-09-2025

# Pull latest code
git pull origin main

# Handle any conflicts
git stash || true
git reset --hard HEAD 2>/dev/null || true
git pull origin main

# Clear Python caches
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

# Stop and remove old container
sudo docker stop tradeeon-backend
sudo docker rm tradeeon-backend
sudo docker rmi tradeeon-backend 2>/dev/null || true

# Build fresh image (NO CACHE - this is important!)
sudo docker build --no-cache --pull -t tradeeon-backend .

# Start new container
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend

# Wait for container to start
sleep 8

# Verify it's working
curl http://localhost:8000/health

# Test the bots endpoint (should return 401, not 422)
curl http://localhost:8000/bots/
# Expected: {"detail":"Missing token"} (401)
# If you get 422, the old code is still running
```

## Verify the Fix

After deployment, test the endpoint:
```bash
# Without auth - should return 401 (not 422)
curl http://localhost:8000/bots/
# Should see: {"detail":"Missing token"}

# Check logs
sudo docker logs tradeeon-backend --tail 50 | grep -i "bot\|list_bots"
```

## What Changed

The endpoint now uses:
- ✅ `user: AuthedUser = Depends(get_current_user)` - extracts user_id from JWT token
- ❌ OLD: Expected `user_id` as query parameter

## After Deployment

1. The error message will disappear
2. Bots will load from Supabase
3. Check browser console for detailed logs
4. Check backend logs for query execution details

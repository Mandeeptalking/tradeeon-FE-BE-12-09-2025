# Security Issue Explanation & Fix

## What Happened

### The Problem:
1. **Frontend Enhancement**: We added CSRF protection to the frontend that sends:
   - `X-CSRF-Token` header
   - `Origin` header
   
2. **Backend Mismatch**: The backend Docker container is running **OLD code** that doesn't allow `X-CSRF-Token` in CORS configuration.

3. **CORS Preflight Failure**: When the browser sends an OPTIONS request (CORS preflight), it includes `X-CSRF-Token` in `Access-Control-Request-Headers`. The backend rejects it because it's not in the `allow_headers` list, returning **400 Bad Request**.

4. **Temporary Fix**: I disabled CSRF headers in frontend to make it work, but this **compromises security**.

## The Root Cause

**Backend Docker container is not being updated via Git pull.**

The container was built from a Docker image, and when we update code via Git, the container doesn't automatically pick up changes. We need to **rebuild the Docker image**.

## Proper Solution

### Step 1: Rebuild Backend Docker Image

On Lightsail, run:

```bash
cd ~/tradeeon-FE-BE-12-09-2025

# Stash any local changes
git stash

# Pull latest code (with CORS fix)
git pull origin main

# Stop and remove old container
sudo docker stop tradeeon-backend
sudo docker rm tradeeon-backend

# Rebuild Docker image with latest code
sudo docker build -t tradeeon-backend .

# Run new container
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend

# Verify it's running
sudo docker ps | grep tradeeon-backend

# Check logs
sudo docker logs tradeeon-backend --tail 50

# Test health
curl http://localhost:8000/health
```

### Step 2: Re-enable CSRF Protection in Frontend

Once backend is rebuilt, we need to re-enable CSRF headers in `apps/frontend/src/lib/api/auth.ts`.

## Current State

- ✅ **Backend code**: Has CORS fix (allows X-CSRF-Token)
- ❌ **Backend container**: Running old code (doesn't allow X-CSRF-Token)
- ❌ **Frontend**: CSRF disabled (security compromised)
- ✅ **Frontend code**: CSRF code exists but is commented out

## Security Impact

**Current (Compromised):**
- ❌ No CSRF protection
- ❌ No Origin header validation
- ✅ Still has JWT authentication
- ✅ Still uses HTTPS

**After Fix (Secure):**
- ✅ CSRF protection enabled
- ✅ Origin header validation
- ✅ JWT authentication
- ✅ HTTPS enforced

## Why This Happened

The backend uses a **Docker image** that was built once. When we update code via Git:
- The code in the repo is updated ✅
- But the Docker container still runs the old image ❌
- We need to rebuild the image to include new code

## Prevention

Create a deployment script that:
1. Pulls latest code
2. Rebuilds Docker image
3. Restarts container
4. Verifies health

This ensures code changes are always deployed.


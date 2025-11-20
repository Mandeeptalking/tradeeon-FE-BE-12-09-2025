# Quick Fix: Backend Down After Docker Changes

## ⚠️ CRITICAL: Backend Not Accessible

### Problem
After Docker Compose changes, the backend is not accessible because:
1. Backend now depends on Redis (which might not be running)
2. Docker Compose might not be configured correctly for Lightsail
3. Backend container might be failing to start

---

## 🚨 IMMEDIATE FIX (Choose One)

### Option 1: Restart Backend Container Directly (FASTEST)

If backend is running as a standalone Docker container (not docker-compose):

```bash
# On Lightsail
cd ~/tradeeon-FE-BE-12-09-2025

# Check if backend container is running
sudo docker ps | grep backend

# Check backend logs
sudo docker logs tradeeon-backend --tail 100

# Restart backend container
sudo docker restart tradeeon-backend

# Check if it's up
sudo docker ps | grep backend
curl http://localhost:8000/health
```

---

### Option 2: Fix Docker Compose (If Using Docker Compose)

If you're using docker-compose and backend depends on Redis:

```bash
# On Lightsail
cd ~/tradeeon-FE-BE-12-09-2025

# Stop everything
docker-compose down
# OR if using docker compose (newer version)
docker compose down

# Start Redis first
docker-compose up -d redis
# OR
docker compose up -d redis

# Wait for Redis to be healthy (10 seconds)
sleep 10

# Start backend
docker-compose up -d backend
# OR
docker compose up -d backend

# Check status
docker-compose ps
# OR
docker compose ps

# Check logs
docker-compose logs backend --tail 100
# OR
docker compose logs backend --tail 100
```

---

### Option 3: Remove Redis Dependency (TEMPORARY FIX)

Make backend start without Redis dependency:

**Edit docker-compose.yml on Lightsail:**

```bash
cd ~/tradeeon-FE-BE-12-09-2025
nano docker-compose.yml
```

**Comment out Redis dependency in backend service:**

```yaml
backend:
  # ... other config ...
  depends_on:
    # redis:
    #   condition: service_healthy
  # OR remove depends_on entirely
```

**Then restart:**

```bash
docker-compose up -d backend
# OR
docker compose up -d backend
```

---

### Option 4: Revert Docker Changes (NUCLEAR OPTION)

Revert to the working Dockerfile before docker-compose changes:

```bash
# On Lightsail
cd ~/tradeeon-FE-BE-12-09-2025

# Check git history
git log --oneline -- Dockerfile

# Revert Dockerfile to before docker-compose changes
git checkout HEAD~3 -- Dockerfile

# Rebuild and restart
sudo docker build -t tradeeon-backend -f Dockerfile .
sudo docker stop tradeeon-backend || true
sudo docker rm tradeeon-backend || true
sudo docker run -d \
  --name tradeeon-backend \
  -p 8000:8000 \
  -e SUPABASE_URL=${SUPABASE_URL} \
  -e SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY} \
  -e SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET} \
  -e CORS_ORIGINS=${CORS_ORIGINS:-http://localhost:5173} \
  tradeeon-backend

# Check logs
sudo docker logs tradeeon-backend --tail 50
```

---

## 🔍 Diagnose the Issue

### Step 1: Check What's Running

```bash
# Check Docker containers
sudo docker ps -a | grep -E "(backend|redis)"

# Check if backend is running
sudo docker ps | grep backend

# Check if Redis is running (if needed)
sudo docker ps | grep redis
```

### Step 2: Check Backend Logs

```bash
# Check backend container logs
sudo docker logs tradeeon-backend --tail 100

# Or if using docker-compose
docker-compose logs backend --tail 100
```

### Step 3: Check Backend Health

```bash
# Test backend health endpoint
curl http://localhost:8000/health

# Check if port is accessible
curl http://localhost:8000/ || echo "Backend not responding"
```

### Step 4: Check Docker Compose Status

```bash
# If using docker-compose
docker-compose ps
# OR
docker compose ps

# Check all logs
docker-compose logs --tail 50
```

---

## 🎯 Most Likely Fix

**If backend was running as standalone Docker container before:**

```bash
# On Lightsail - Quick fix
cd ~/tradeeon-FE-BE-12-09-2025

# 1. Stop everything
sudo docker stop tradeeon-backend || true
sudo docker-compose down || true

# 2. Pull latest code
git pull origin main

# 3. Rebuild backend image (without docker-compose)
sudo docker build -t tradeeon-backend -f Dockerfile .

# 4. Start backend as standalone container (like before)
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  -v $(pwd)/logs:/app/logs \
  -e PYTHONPATH=/app \
  -e SUPABASE_URL=${SUPABASE_URL} \
  -e SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY} \
  -e SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET} \
  -e CORS_ORIGINS=${CORS_ORIGINS:-http://localhost:5173,https://tradeeon.com} \
  tradeeon-backend

# 5. Check logs
sudo docker logs tradeeon-backend --tail 50

# 6. Test health
curl http://localhost:8000/health
```

---

## 🔧 Verify Backend is Working

```bash
# Test health endpoint
curl http://localhost:8000/health

# Should return:
# {"status":"ok","timestamp":...,"database":"connected"}
```

---

## 📝 Next Steps

After fixing:
1. Verify site is accessible
2. Test API endpoints
3. Check backend logs for errors
4. Verify Docker container is stable

---

**Try Option 4 first if backend was running standalone before!** 🚀



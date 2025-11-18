# Docker Setup Verification Guide

## 🔍 Verification Steps

### Step 1: Run Verification Script

On Lightsail:

```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
python3 scripts/verify_docker_setup.py
```

This checks:
- ✅ Docker is installed
- ✅ Docker Compose is available
- ✅ All Dockerfiles exist
- ✅ Docker Compose file exists
- ✅ Required Python files exist
- ✅ Environment variables are set

### Step 2: Verify Docker Compose Configuration

```bash
# Validate docker-compose.yml syntax
docker-compose config

# Should show all services without errors
```

### Step 3: Check Docker Images Can Build

```bash
# Build specific service (quick test)
docker-compose build condition-evaluator

# Or build all services
docker-compose build

# Check images were created
docker images | grep tradeeon
```

### Step 4: Verify Services Start

```bash
# Start services in foreground (to see logs)
docker-compose up

# Or start in background
docker-compose up -d

# Check services are running
docker-compose ps

# Should show all services as "Up"
```

### Step 5: Check Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f condition-evaluator
docker-compose logs -f bot-notifier
docker-compose logs -f redis

# Last 50 lines
docker-compose logs --tail 50 condition-evaluator
```

## ✅ Expected Results

### After `docker-compose up -d`:

**docker-compose ps should show:**
```
NAME                           STATUS
tradeeon-backend              Up
tradeeon-condition-evaluator  Up
tradeeon-bot-notifier         Up
tradeeon-redis                Up
```

### Expected Logs:

**backend:**
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**condition-evaluator:**
```
Centralized Condition Evaluator initialized
Connected to Redis: redis://redis:6379
Starting evaluation loop...
```

**bot-notifier:**
```
Bot Notifier initialized
Connected to Redis: redis://redis:6379
Subscribed to condition channels
Listening for condition triggers...
```

**redis:**
```
Ready to accept connections
```

## 🧪 Quick Test Commands

```bash
# Test backend health
curl http://localhost:8000/health

# Test Redis connection
docker-compose exec redis redis-cli ping
# Should return: PONG

# Check service connectivity
docker-compose exec condition-evaluator python3 -c "import redis; r=redis.Redis.from_url('redis://redis:6379'); print('✅ Redis OK' if r.ping() else '❌ Redis FAILED')"

# Check Supabase connection
docker-compose exec condition-evaluator python3 -c "from apps.api.clients.supabase_client import supabase; print('✅ Supabase OK' if supabase else '❌ Supabase FAILED')"
```

## 🐛 Troubleshooting

### Issue: Docker not installed

```bash
# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker ubuntu

# Log out and back in, or:
newgrp docker
```

### Issue: Docker Compose not found

```bash
# Docker Compose v2 is included with Docker
docker compose version

# Or install separately (v1)
sudo apt-get install -y docker-compose
```

### Issue: Build fails

```bash
# Check build logs
docker-compose build --no-cache condition-evaluator

# Check for missing dependencies in requirements.txt
cat requirements.txt | grep python-dotenv
cat requirements.txt | grep redis
```

### Issue: Services exit immediately

```bash
# Check logs for errors
docker-compose logs condition-evaluator
docker-compose logs bot-notifier

# Check environment variables
docker-compose config | grep SUPABASE
```

### Issue: Redis connection failed

```bash
# Check Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test Redis from container
docker-compose exec condition-evaluator python3 -c "import redis; print(redis.Redis.from_url('redis://redis:6379').ping())"
```

## 📋 Verification Checklist

After running verification:

- [ ] Docker is installed
- [ ] Docker Compose is available
- [ ] All Dockerfiles exist
- [ ] docker-compose.yml exists
- [ ] .env file created (or will create)
- [ ] `docker-compose config` shows no errors
- [ ] Images can be built
- [ ] Services can start
- [ ] Services show as "Up" in `docker-compose ps`
- [ ] Logs show successful initialization
- [ ] Backend health check works
- [ ] Redis connection works

## ✅ Success Indicators

When everything is working:

1. **All services running**: `docker-compose ps` shows all as "Up"
2. **No errors in logs**: Logs show successful initialization
3. **Backend responds**: `curl http://localhost:8000/health` returns 200
4. **Redis accessible**: `redis-cli ping` returns PONG
5. **Services connected**: Logs show Redis connections

---

**Ready to deploy! Run the verification script and follow the steps above.**


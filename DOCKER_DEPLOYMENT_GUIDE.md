# Docker Deployment Guide - Option 2: Separate Containers

## 🎯 Overview

All services are now containerized and orchestrated with Docker Compose:

- **Backend API** - FastAPI application
- **Condition Evaluator** - Evaluates trading conditions
- **Bot Notifier** - Executes bot actions on triggers
- **Alert Runner** - Evaluates alerts (optional)
- **Redis** - Event bus for condition triggers

---

## 📋 Prerequisites

1. **Docker** installed on Lightsail
   ```bash
   # Check if Docker is installed
   docker --version
   docker-compose --version
   ```

2. **Environment Variables** set (create `.env` file):
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_JWT_SECRET=your_jwt_secret
   CORS_ORIGINS=http://localhost:5173,https://www.tradeeon.com
   REDIS_URL=redis://redis:6379
   ```

---

## 🚀 Deployment Steps

### Step 1: Pull Latest Code

```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
```

### Step 2: Create Environment File

```bash
# Create .env file
cat > .env << EOF
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
CORS_ORIGINS=http://localhost:5173,https://www.tradeeon.com
REDIS_URL=redis://redis:6379
EVALUATOR_INTERVAL_SECONDS=60
EVALUATOR_TIMEFRAMES=1h,4h,1d
EOF
```

### Step 3: Build Docker Images

```bash
# Build all images
docker-compose build

# Or build specific service
docker-compose build backend
docker-compose build condition-evaluator
docker-compose build bot-notifier
```

### Step 4: Start All Services

```bash
# Start all services (backend, condition-evaluator, bot-notifier, redis)
docker-compose up -d

# Or start specific services
docker-compose up -d redis backend
docker-compose up -d condition-evaluator bot-notifier

# Include alert-runner (optional)
docker-compose --profile alert-runner up -d alert-runner
```

### Step 5: Verify Services

```bash
# Check all containers are running
docker-compose ps

# Check logs
docker-compose logs -f backend
docker-compose logs -f condition-evaluator
docker-compose logs -f bot-notifier
docker-compose logs -f redis

# Check specific service
docker-compose logs -f condition-evaluator --tail 50
```

---

## 🔄 Updating Services

### Update All Services

```bash
# Pull latest code
git pull origin main

# Rebuild and restart all services
docker-compose up -d --build

# Or rebuild specific service
docker-compose up -d --build condition-evaluator
```

### Update Single Service

```bash
# Rebuild and restart specific service
docker-compose stop condition-evaluator
docker-compose build condition-evaluator
docker-compose up -d condition-evaluator
```

---

## 📊 Service Management

### Start Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend
docker-compose up -d condition-evaluator
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop specific service (keeps others running)
docker-compose stop condition-evaluator

# Stop and remove volumes (⚠️ deletes Redis data)
docker-compose down -v
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart condition-evaluator
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f condition-evaluator

# Last 100 lines
docker-compose logs --tail 100 condition-evaluator

# Follow logs in real-time
docker-compose logs -f --tail 50 condition-evaluator bot-notifier
```

### Service Status

```bash
# Check all services
docker-compose ps

# Check health status
docker-compose ps | grep -E "(Up|Exit)"

# Check resource usage
docker stats tradeeon-backend tradeeon-condition-evaluator tradeeon-bot-notifier
```

---

## 🔍 Troubleshooting

### Service Not Starting

```bash
# Check logs for errors
docker-compose logs condition-evaluator

# Check if dependencies are met
docker-compose ps
# Redis and backend should be healthy before starting condition-evaluator

# Check environment variables
docker-compose config
```

### Service Crashes Repeatedly

```bash
# Check logs
docker-compose logs --tail 100 condition-evaluator

# Check if Redis is accessible
docker-compose exec condition-evaluator python3 -c "import redis; r=redis.Redis.from_url('redis://redis:6379'); print(r.ping())"

# Check if Supabase is accessible
docker-compose exec condition-evaluator python3 -c "from apps.api.clients.supabase_client import supabase; print('OK' if supabase else 'FAILED')"
```

### Redis Connection Issues

```bash
# Test Redis connection from container
docker-compose exec condition-evaluator redis-cli -h redis ping

# Check Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### Missing Dependencies

```bash
# Rebuild with no cache
docker-compose build --no-cache condition-evaluator

# Check if requirements.txt is updated
cat requirements.txt | grep redis
```

---

## 📁 File Structure

```
tradeeon-FE-BE-12-09-2025/
├── docker-compose.yml              # Orchestration file
├── Dockerfile                      # Backend API
├── Dockerfile.condition-evaluator  # Condition Evaluator
├── Dockerfile.bot-notifier         # Bot Notifier
├── Dockerfile.alert-runner         # Alert Runner
├── requirements.txt                # Python dependencies
├── .env                            # Environment variables (create this)
└── logs/                           # Log files (auto-created)
```

---

## 🌐 Service URLs

After starting services:

- **Backend API**: `http://localhost:8000` (or your Lightsail IP)
- **Redis**: `redis://localhost:6379` (or `redis://redis:6379` from containers)

---

## 🔐 Environment Variables

Required environment variables (set in `.env` file):

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Redis
REDIS_URL=redis://redis:6379

# CORS
CORS_ORIGINS=http://localhost:5173,https://www.tradeeon.com

# Condition Evaluator (optional)
EVALUATOR_INTERVAL_SECONDS=60
EVALUATOR_TIMEFRAMES=1h,4h,1d

# Alert Runner (optional)
ALERT_RUNNER_POLL_MS=1000
ALERT_MAX_ALERTS_PER_SYMBOL=200
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] All containers are running: `docker-compose ps`
- [ ] Backend API is healthy: `curl http://localhost:8000/health`
- [ ] Redis is accessible: `docker-compose exec redis redis-cli ping`
- [ ] Condition Evaluator logs show initialization
- [ ] Bot Notifier logs show Redis connection
- [ ] No errors in logs: `docker-compose logs --tail 50`

---

## 🎯 Migration from Direct Python Processes

If you were running services directly (not in Docker):

1. **Stop old services:**
   ```bash
   pkill -f run_condition_evaluator
   pkill -f run_bot_notifier
   ```

2. **Start Docker services:**
   ```bash
   docker-compose up -d
   ```

3. **Verify migration:**
   ```bash
   # Old processes should be gone
   ps aux | grep -E "(condition_evaluator|bot_notifier)" | grep -v grep
   
   # Docker containers should be running
   docker-compose ps
   ```

---

**All services are now containerized and managed with Docker Compose!** 🚀



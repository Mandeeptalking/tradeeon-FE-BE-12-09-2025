# Quick Docker Compose Setup Guide

## ✅ What's Been Created

**Option 2: Separate Docker Containers** has been implemented:

1. **Dockerfile.condition-evaluator** - Container for condition evaluator
2. **Dockerfile.bot-notifier** - Container for bot notifier  
3. **docker-compose.yml** - Orchestrates all services
4. **DOCKER_DEPLOYMENT_GUIDE.md** - Full deployment guide

## 🚀 Quick Start on Lightsail

### Step 1: Pull Latest Code

```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
```

### Step 2: Stop Old Services (if running)

```bash
# Stop old Python processes
pkill -f run_condition_evaluator
pkill -f run_bot_notifier
pkill -f alert.*runner

# Stop old Docker container (if needed)
sudo docker stop tradeeon-backend
```

### Step 3: Create Environment File

```bash
# Create .env file with your environment variables
cat > .env << EOF
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
CORS_ORIGINS=http://localhost:5173,https://www.tradeeon.com
REDIS_URL=redis://redis:6379
EOF
```

### Step 4: Build and Start Services

```bash
# Build all Docker images
docker-compose build

# Start all services
docker-compose up -d

# Check services are running
docker-compose ps
```

### Step 5: Verify Services

```bash
# Check logs
docker-compose logs -f backend
docker-compose logs -f condition-evaluator
docker-compose logs -f bot-notifier
docker-compose logs -f redis

# Check service status
docker-compose ps

# Test backend
curl http://localhost:8000/health
```

## 📊 Services Overview

The Docker Compose setup includes:

- **redis** - Event bus (required)
- **backend** - FastAPI application
- **condition-evaluator** - Evaluates trading conditions
- **bot-notifier** - Executes bot actions
- **alert-runner** - Evaluates alerts (optional, uses profile)

## 🔄 Updating Services

**Now updating is consistent - all via Docker:**

```bash
# Pull latest code
git pull origin main

# Rebuild and restart all services
docker-compose up -d --build

# Or update specific service
docker-compose up -d --build condition-evaluator
```

## ✅ Benefits

- ✅ **Consistent deployment** - All services in Docker
- ✅ **No more git pull on server** - Code is in Docker images
- ✅ **Easy updates** - `docker-compose up -d --build`
- ✅ **Better isolation** - Each service in its own container
- ✅ **Easy scaling** - Scale individual services as needed
- ✅ **Production ready** - Proper containerization

---

**All services are now containerized! See `DOCKER_DEPLOYMENT_GUIDE.md` for full details.**


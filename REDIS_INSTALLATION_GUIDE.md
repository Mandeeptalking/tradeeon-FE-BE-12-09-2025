# Redis Installation Guide for Backend

## 🎯 Overview

Two options for installing Redis:
1. **Direct Installation** on AWS Lightsail server (simpler, faster)
2. **Docker Image** update (if using Docker deployment)

---

## Option 1: Direct Installation on AWS Lightsail (Recommended)

### Step 1: SSH into Lightsail Instance

```bash
ssh ubuntu@your-lightsail-ip
```

### Step 2: Install Redis

**Ubuntu/Debian**:
```bash
# Update package list
sudo apt-get update

# Install Redis
sudo apt-get install -y redis-server

# Start Redis service
sudo systemctl start redis-server

# Enable Redis to start on boot
sudo systemctl enable redis-server

# Verify Redis is running
sudo systemctl status redis-server
```

### Step 3: Configure Redis (Optional)

Edit Redis config:
```bash
sudo nano /etc/redis/redis.conf
```

**Recommended settings**:
```conf
# Bind to all interfaces (or specific IP)
bind 0.0.0.0

# Set password (optional but recommended)
requirepass your_redis_password_here

# Persistence
save 900 1
save 300 10
save 60 10000
```

**Restart Redis**:
```bash
sudo systemctl restart redis-server
```

### Step 4: Test Redis Connection

```bash
# Test locally
redis-cli ping
# Should return: PONG

# Test with password (if set)
redis-cli -a your_redis_password ping
```

### Step 5: Set Environment Variable

On your Lightsail server, add to `.env` or environment:
```bash
export REDIS_URL="redis://localhost:6379"
# Or with password:
export REDIS_URL="redis://:your_password@localhost:6379"
```

### Step 6: Install Python Redis Library

```bash
# On Lightsail server
cd /path/to/your/app
pip install redis
```

### Step 7: Restart Backend Service

```bash
# If using systemd
sudo systemctl restart tradeeon-backend

# Or if running manually
# Stop current process and restart
```

---

## Option 2: Add Redis to Docker Image

### Step 1: Update Dockerfile

**For Backend** (`Dockerfile`):
```dockerfile
FROM python:3.11-slim

# Install Redis
RUN apt-get update && \
    apt-get install -y redis-server && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ... rest of your Dockerfile
```

**For Alert Runner** (`Dockerfile.alert-runner`):
```dockerfile
FROM python:3.11-slim

# Install Redis
RUN apt-get update && \
    apt-get install -y redis-server && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ... rest of your Dockerfile
```

### Step 2: Update Docker Compose (if used)

If you have `docker-compose.yml`:
```yaml
services:
  backend:
    build: .
    # ... other config
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Step 3: Start Redis in Container

**Option A: Separate Redis Container** (Recommended)
```bash
# Run Redis container
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:alpine

# Update REDIS_URL to point to container
export REDIS_URL="redis://redis:6379"  # If same network
# Or
export REDIS_URL="redis://localhost:6379"  # If port mapped
```

**Option B: Redis in Same Container**
```bash
# In your startup script, start Redis
redis-server --daemonize yes
```

---

## 🔧 Quick Commands Reference

### Install Redis (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Check Redis Status
```bash
sudo systemctl status redis-server
redis-cli ping
```

### Redis CLI Commands
```bash
# Connect to Redis
redis-cli

# Or with password
redis-cli -a your_password

# Test connection
ping

# Check info
INFO

# Monitor commands
MONITOR

# Exit
exit
```

### Configure Redis Password
```bash
# Edit config
sudo nano /etc/redis/redis.conf

# Add line:
requirepass your_strong_password

# Restart
sudo systemctl restart redis-server

# Test with password
redis-cli -a your_strong_password ping
```

### Firewall Rules (if needed)
```bash
# Allow Redis port
sudo ufw allow 6379/tcp

# Or specific IP
sudo ufw allow from your_ip to any port 6379
```

---

## 🧪 Verify Installation

### Test 1: Redis Service Running
```bash
sudo systemctl status redis-server
# Should show: active (running)
```

### Test 2: Redis Responding
```bash
redis-cli ping
# Should return: PONG
```

### Test 3: Python Connection
```python
import redis.asyncio as redis
import asyncio

async def test():
    r = redis.from_url("redis://localhost:6379")
    result = await r.ping()
    print(f"Redis ping: {result}")  # Should print: True
    await r.close()

asyncio.run(test())
```

### Test 4: Event Bus Connection
```bash
python scripts/test_event_bus.py
```

---

## 🔒 Security Recommendations

### 1. Set Redis Password
```bash
# In redis.conf
requirepass your_strong_password_here
```

### 2. Bind to Localhost Only (if local)
```bash
# In redis.conf
bind 127.0.0.1
```

### 3. Use Redis ACLs (Redis 6+)
```bash
# Create user
redis-cli ACL SETUSER appuser on >apppassword ~* &* +@all
```

### 4. Firewall Rules
```bash
# Only allow localhost
sudo ufw deny 6379
sudo ufw allow from 127.0.0.1 to any port 6379
```

---

## 📝 Environment Variables

Add to your `.env` or environment:

```bash
# Basic (no password)
REDIS_URL=redis://localhost:6379

# With password
REDIS_URL=redis://:your_password@localhost:6379

# Remote Redis
REDIS_URL=redis://user:password@redis.example.com:6379

# With database number
REDIS_URL=redis://localhost:6379/0
```

---

## 🐛 Troubleshooting

### Issue: Redis won't start

**Check logs**:
```bash
sudo journalctl -u redis-server -n 50
```

**Common fixes**:
```bash
# Check if port is in use
sudo netstat -tulpn | grep 6379

# Remove old Redis process
sudo pkill redis-server

# Start manually to see errors
sudo redis-server /etc/redis/redis.conf
```

### Issue: Connection Refused

**Check**:
1. Redis is running: `sudo systemctl status redis-server`
2. Port is open: `sudo netstat -tulpn | grep 6379`
3. Firewall allows: `sudo ufw status`
4. Redis binding: Check `bind` in `/etc/redis/redis.conf`

### Issue: Authentication Failed

**Check**:
1. Password in config: `grep requirepass /etc/redis/redis.conf`
2. REDIS_URL includes password: `redis://:password@localhost:6379`
3. Test manually: `redis-cli -a password ping`

---

## ✅ Verification Checklist

- [ ] Redis installed
- [ ] Redis service running
- [ ] Redis responds to ping
- [ ] Python redis library installed
- [ ] REDIS_URL environment variable set
- [ ] Event bus can connect
- [ ] Test script passes
- [ ] Backend can publish events

---

## 🚀 Quick Install Script

Save as `install_redis.sh`:

```bash
#!/bin/bash
set -e

echo "Installing Redis..."

# Update packages
sudo apt-get update

# Install Redis
sudo apt-get install -y redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test
redis-cli ping

echo "✅ Redis installed and running!"
echo "Set REDIS_URL=redis://localhost:6379 in your environment"
```

Make executable and run:
```bash
chmod +x install_redis.sh
./install_redis.sh
```

---

**Recommended**: Use **Option 1** (Direct Installation) for simplicity and better performance.



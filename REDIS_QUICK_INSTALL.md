# Redis Quick Install Guide

## 🚀 Quick Install (Recommended for AWS Lightsail)

### Option 1: Run Install Script

```bash
# On your Lightsail server
wget https://raw.githubusercontent.com/your-repo/tradeeon-FE-BE-12-09-2025/main/install_redis.sh
chmod +x install_redis.sh
./install_redis.sh
```

### Option 2: Manual Install Commands

**SSH into your Lightsail server and run:**

```bash
# 1. Update packages
sudo apt-get update

# 2. Install Redis
sudo apt-get install -y redis-server

# 3. Start Redis
sudo systemctl start redis-server

# 4. Enable auto-start on boot
sudo systemctl enable redis-server

# 5. Verify it's running
redis-cli ping
# Should return: PONG

# 6. Install Python Redis library
pip install redis

# 7. Set environment variable (add to your .env or startup script)
export REDIS_URL="redis://localhost:6379"

# 8. Restart backend
sudo systemctl restart tradeeon-backend
# Or however you restart your backend service
```

---

## 🐳 Docker Option (If Using Docker)

### Update Dockerfile

**For Backend** (`Dockerfile`):
```dockerfile
# Add Redis to system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    redis-server \
    && rm -rf /var/lib/apt/lists/*
```

**For Alert Runner** (`Dockerfile.alert-runner`):
```dockerfile
# Add Redis to system dependencies  
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    redis-server \
    && rm -rf /var/lib/apt/lists/*
```

**Then rebuild and redeploy:**
```bash
docker build -t tradeeon-backend .
docker push ...
```

---

## ✅ Verify Installation

```bash
# Check Redis is running
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Test from Python
python -c "import redis; r = redis.from_url('redis://localhost:6379'); print(r.ping())"
```

---

## 📝 Environment Variable

Add to your backend environment:

```bash
REDIS_URL=redis://localhost:6379
```

---

**Recommended**: Use **Option 2 (Manual Install)** for AWS Lightsail - it's simpler and faster!



# Redis Installation Commands for Backend

## 🎯 Quick Commands (Copy & Paste)

### For AWS Lightsail Server:

```bash
# SSH into your server first
ssh ubuntu@your-lightsail-ip

# Then run these commands:

# 1. Install Redis
sudo apt-get update && sudo apt-get install -y redis-server

# 2. Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 3. Verify
redis-cli ping
# Should return: PONG

# 4. Install Python library
pip install redis

# 5. Set environment variable (add to your startup script or .env)
echo 'export REDIS_URL="redis://localhost:6379"' >> ~/.bashrc
source ~/.bashrc

# 6. Restart backend (adjust command based on how you run it)
# If using systemd:
sudo systemctl restart tradeeon-backend

# If using Docker:
sudo docker restart tradeeon-backend

# If running manually:
# Stop current process and restart
```

---

## 🔧 One-Line Install

```bash
sudo apt-get update && sudo apt-get install -y redis-server && sudo systemctl start redis-server && sudo systemctl enable redis-server && redis-cli ping && pip install redis
```

---

## ✅ Verification

```bash
# Check status
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Check if port is listening
sudo netstat -tulpn | grep 6379
```

---

## 📝 Add to Environment

**Option 1: Add to .env file**
```bash
echo 'REDIS_URL=redis://localhost:6379' >> /path/to/your/.env
```

**Option 2: Export in shell**
```bash
export REDIS_URL="redis://localhost:6379"
```

**Option 3: Add to systemd service** (if using systemd)
```ini
[Service]
Environment="REDIS_URL=redis://localhost:6379"
```

---

**That's it!** Redis will be installed and ready to use.



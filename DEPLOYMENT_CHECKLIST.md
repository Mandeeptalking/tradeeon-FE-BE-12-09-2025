# Deployment Checklist for Lightsail

## ✅ Pre-Deployment Verification

### 1. Code Verification (Run Locally)
```bash
# Test imports
python scripts/test_bot_notifier_imports.py

# Verify Phase 2 completeness
python scripts/verify_phase2_complete.py
```

### 2. Files to Deploy

**Backend Services:**
- ✅ `apps/bots/condition_evaluator.py`
- ✅ `apps/bots/run_condition_evaluator.py`
- ✅ `apps/bots/event_bus.py`
- ✅ `apps/bots/bot_notifier.py`
- ✅ `apps/bots/run_bot_notifier.py`
- ✅ `apps/api/pyproject.toml` (with redis dependency)

**Database:**
- ✅ Migration already applied: `06_condition_registry.sql`

---

## 🚀 Deployment Steps for Lightsail

### Step 1: Install Redis (if not already installed)
```bash
sudo apt-get update
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping  # Should return PONG

# Install Python Redis library
pip install redis>=5.0.0
```

### Step 2: Set Environment Variables
```bash
# Add to your .env or environment
export REDIS_URL="redis://localhost:6379"
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

### Step 3: Pull Latest Code
```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main  # or your branch
```

### Step 4: Install Dependencies
```bash
cd apps/api
pip install -e .  # This will install redis>=5.0.0
```

### Step 5: Start Services

**Option A: Run in Background (Recommended)**
```bash
# Terminal 1: Condition Evaluator
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
nohup python run_condition_evaluator.py > evaluator.log 2>&1 &

# Terminal 2: Bot Notifier
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
nohup python run_bot_notifier.py > notifier.log 2>&1 &
```

**Option B: Use systemd (Production)**
Create `/etc/systemd/system/condition-evaluator.service`:
```ini
[Unit]
Description=Tradeeon Condition Evaluator Service
After=network.target redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/tradeeon-FE-BE-12-09-2025/apps/bots
ExecStart=/usr/bin/python3 run_condition_evaluator.py
Restart=always
RestartSec=10
Environment="REDIS_URL=redis://localhost:6379"
EnvironmentFile=/home/ubuntu/.env

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/bot-notifier.service`:
```ini
[Unit]
Description=Tradeeon Bot Notifier Service
After=network.target redis.service condition-evaluator.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/tradeeon-FE-BE-12-09-2025/apps/bots
ExecStart=/usr/bin/python3 run_bot_notifier.py
Restart=always
RestartSec=10
Environment="REDIS_URL=redis://localhost:6379"
EnvironmentFile=/home/ubuntu/.env

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable condition-evaluator
sudo systemctl enable bot-notifier
sudo systemctl start condition-evaluator
sudo systemctl start bot-notifier

# Check status
sudo systemctl status condition-evaluator
sudo systemctl status bot-notifier
```

### Step 6: Verify Services Running
```bash
# Check Redis
redis-cli ping

# Check logs
tail -f ~/tradeeon-FE-BE-12-09-2025/apps/bots/evaluator.log
tail -f ~/tradeeon-FE-BE-12-09-2025/apps/bots/notifier.log

# Check processes
ps aux | grep run_condition_evaluator
ps aux | grep run_bot_notifier
```

---

## 🧪 Testing After Deployment

### Test 1: Check Services Are Running
```bash
# Should see both processes
ps aux | grep -E "(condition_evaluator|bot_notifier)"
```

### Test 2: Check Logs for Errors
```bash
# Evaluator logs
tail -n 50 ~/tradeeon-FE-BE-12-09-2025/apps/bots/evaluator.log

# Notifier logs
tail -n 50 ~/tradeeon-FE-BE-12-09-2025/apps/bots/notifier.log
```

### Test 3: Test Redis Connection
```bash
# From Python
python3 -c "import redis.asyncio as redis; import asyncio; r = redis.from_url('redis://localhost:6379'); print(asyncio.run(r.ping()))"
```

### Test 4: Create Test Bot via Frontend
1. Create a DCA bot with a condition
2. Check logs to see if condition is registered
3. Wait for condition to trigger
4. Check logs to see if bot action is executed

---

## 📊 Monitoring

### Check Service Status
```bash
# systemd services
sudo systemctl status condition-evaluator
sudo systemctl status bot-notifier

# Background processes
ps aux | grep run_condition_evaluator
ps aux | grep run_bot_notifier
```

### View Logs
```bash
# Real-time logs
tail -f ~/tradeeon-FE-BE-12-09-2025/apps/bots/evaluator.log
tail -f ~/tradeeon-FE-BE-12-09-2025/apps/bots/notifier.log

# Last 100 lines
tail -n 100 ~/tradeeon-FE-BE-12-09-2025/apps/bots/evaluator.log
```

### Database Queries
```sql
-- Check registered conditions
SELECT * FROM condition_registry ORDER BY created_at DESC LIMIT 10;

-- Check bot subscriptions
SELECT * FROM user_condition_subscriptions WHERE active = true;

-- Check condition triggers
SELECT * FROM condition_triggers ORDER BY triggered_at DESC LIMIT 10;
```

---

## ✅ Success Criteria

- [ ] Redis is running and accessible
- [ ] Condition Evaluator service is running
- [ ] Bot Notifier service is running
- [ ] No errors in logs
- [ ] Can create bot via frontend
- [ ] Condition is registered in database
- [ ] Bot is subscribed to condition
- [ ] When condition triggers, bot action executes

---

## 🐛 Troubleshooting

### Redis Connection Failed
```bash
# Check Redis is running
sudo systemctl status redis-server

# Check Redis port
netstat -tlnp | grep 6379

# Test connection
redis-cli ping
```

### Import Errors
```bash
# Check Python path
python3 -c "import sys; print('\n'.join(sys.path))"

# Reinstall dependencies
cd apps/api
pip install -e . --force-reinstall
```

### Service Not Starting
```bash
# Check logs
journalctl -u condition-evaluator -n 50
journalctl -u bot-notifier -n 50

# Check environment variables
sudo systemctl show condition-evaluator | grep Environment
```

---

**Ready for Deployment!** 🚀



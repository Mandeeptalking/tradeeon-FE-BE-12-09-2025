# Starting Phase 2 Services

## Quick Start

Run the startup script on Lightsail:

```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
chmod +x scripts/start_phase2_services.sh
./scripts/start_phase2_services.sh
```

---

## Manual Methods

### Option 1: Docker Compose (Recommended)

```bash
cd ~/tradeeon-FE-BE-12-09-2025

# Start all Phase 2 services
docker-compose up -d redis condition-evaluator bot-notifier

# Check status
docker-compose ps

# View logs
docker-compose logs -f condition-evaluator
docker-compose logs -f bot-notifier
```

### Option 2: Python Processes

```bash
cd ~/tradeeon-FE-BE-12-09-2025

# 1. Ensure Redis is running
redis-cli ping  # Should return PONG
# If not: sudo systemctl start redis-server

# 2. Start Condition Evaluator
cd apps/bots
nohup python3 run_condition_evaluator.py > condition_evaluator.log 2>&1 &

# 3. Start Bot Notifier
nohup python3 run_bot_notifier.py > bot_notifier.log 2>&1 &

# 4. Check status
ps aux | grep -E "(condition_evaluator|bot_notifier)" | grep -v grep

# 5. View logs
tail -f condition_evaluator.log
tail -f bot_notifier.log
```

---

## Verification

After starting services, run:

```bash
python3 scripts/verify_phase2_running.py
```

Expected output:
```
✅ PHASE 2 IS WORKING!

All critical components are operational:
  ✅ Redis connection working
  ✅ Supabase connection working
  ✅ Database tables exist
  ✅ Services are running
  ✅ Imports work correctly
```

---

## Troubleshooting

### Services won't start

**Check logs:**
- Docker: `docker-compose logs condition-evaluator`
- Python: `tail -n 50 apps/bots/condition_evaluator.log`

**Common issues:**

1. **Redis not running:**
   ```bash
   redis-cli ping
   # If fails: sudo systemctl start redis-server
   ```

2. **Missing dependencies:**
   ```bash
   pip3 install -r requirements.txt
   ```

3. **Environment variables missing:**
   ```bash
   # Check .env file exists
   ls -la .env
   # Or check Docker Compose environment
   docker-compose config
   ```

4. **Port conflicts:**
   ```bash
   # Check if ports are in use
   netstat -tulpn | grep -E "(6379|8000)"
   ```

### Services crash immediately

**Check for:**
- Database connection errors
- Redis connection errors
- Missing environment variables
- Import errors

**View detailed logs:**
```bash
# Docker
docker-compose logs --tail 100 condition-evaluator

# Python
tail -n 100 apps/bots/condition_evaluator.log
```

---

## Service Management

### Stop Services

**Docker:**
```bash
docker-compose stop condition-evaluator bot-notifier
# Or
docker-compose down
```

**Python:**
```bash
pkill -f run_condition_evaluator.py
pkill -f run_bot_notifier.py
```

### Restart Services

**Docker:**
```bash
docker-compose restart condition-evaluator bot-notifier
```

**Python:**
```bash
# Stop first
pkill -f run_condition_evaluator.py
pkill -f run_bot_notifier.py

# Then start again
cd apps/bots
nohup python3 run_condition_evaluator.py > condition_evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > bot_notifier.log 2>&1 &
```

---

**Use the startup script for the easiest experience!**


# Deployment Fixes for Lightsail

## Issue: `pip` command not found

**Solution**: Use `pip3` instead of `pip` on Ubuntu/Lightsail.

---

## Corrected Commands

### Step 1: Install Redis (Already Done ✅)
```bash
# Redis is already installed and running ✅
redis-cli ping  # Should return PONG
```

### Step 2: Install Redis Python Library
```bash
# Use pip3 instead of pip
pip3 install redis>=5.0.0

# Or if pip3 is not available, install it first:
sudo apt install python3-pip
pip3 install redis>=5.0.0
```

### Step 3: Install Dependencies
```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/api
pip3 install -e .
```

### Step 4: Start Services
```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &
```

### Step 5: Verify
```bash
# Check processes
ps aux | grep -E "(condition_evaluator|bot_notifier)"

# Check logs
tail -f evaluator.log
tail -f notifier.log
```

---

## Complete Corrected Command Sequence

```bash
# 1. Verify Redis (should already be running)
redis-cli ping

# 2. Install Redis Python library
pip3 install redis>=5.0.0

# 3. Install API dependencies
cd ~/tradeeon-FE-BE-12-09-2025/apps/api
pip3 install -e .

# 4. Start services
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &

# 5. Verify services are running
ps aux | grep -E "(condition_evaluator|bot_notifier)"

# 6. Check logs for errors
tail -n 50 evaluator.log
tail -n 50 notifier.log
```

---

## If pip3 is not available

```bash
# Install pip3 first
sudo apt install python3-pip

# Then continue with pip3 commands above
```



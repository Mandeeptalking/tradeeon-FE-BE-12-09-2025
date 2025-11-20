# Phase 2 Missing Dependencies Fix

## 🔴 Issue

Services are failing to start because `python-dotenv` is not installed on Lightsail.

**Error**: `ModuleNotFoundError: No module named 'dotenv'`

## ✅ Solution

Install the missing dependencies on Lightsail:

```bash
# Install python-dotenv
pip3 install python-dotenv>=1.0.0

# Or install all requirements
cd ~/tradeeon-FE-BE-12-09-2025
pip3 install -r requirements.txt
```

## 🔍 Complete Fix Steps

Run these commands on Lightsail:

```bash
# 1. Navigate to project root
cd ~/tradeeon-FE-BE-12-09-2025

# 2. Install all required dependencies
pip3 install python-dotenv>=1.0.0 redis>=5.0.0 pandas numpy aiohttp supabase pyjwt python-binance fastapi uvicorn requests websockets pydantic python-dotenv

# OR install from requirements.txt
pip3 install -r requirements.txt

# 3. Verify installation
python3 -c "import dotenv; print('✅ dotenv installed')"
python3 -c "import redis; print('✅ redis installed')"
python3 -c "import pandas; print('✅ pandas installed')"

# 4. Start services again
cd apps/bots
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
sleep 2
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &
sleep 2

# 5. Check services are running
ps aux | grep -E "(condition_evaluator|bot_notifier)" | grep -v grep

# 6. Check logs
tail -f evaluator.log
tail -f notifier.log
```

## 📋 Required Dependencies

Make sure these are installed:
- ✅ `python-dotenv>=1.0.0` - For environment variables
- ✅ `redis>=5.0.0` - For event bus
- ✅ `pandas>=2.1.0` - For data processing
- ✅ `numpy>=1.25.0` - For numerical operations
- ✅ `aiohttp>=3.8.0` - For async HTTP
- ✅ `supabase>=2.0.0` - For database
- ✅ `pyjwt>=2.8.0` - For JWT tokens

## ✅ Expected Logs After Installation

**evaluator.log:**
```
2025-11-18 XX:XX:XX - Centralized Condition Evaluator initialized
2025-11-18 XX:XX:XX - Connected to Redis: redis://localhost:6379
2025-11-18 XX:XX:XX - Starting evaluation loop...
```

**notifier.log:**
```
2025-11-18 XX:XX:XX - Bot Notifier initialized
2025-11-18 XX:XX:XX - Connected to Redis: redis://localhost:6379
2025-11-18 XX:XX:XX - Subscribed to condition channels
2025-11-18 XX:XX:XX - Listening for condition triggers...
```

## 🐛 If Still Failing

If services still fail after installing dependencies:

1. **Check Python version:**
   ```bash
   python3 --version  # Should be 3.8+
   ```

2. **Check if dependencies are in correct Python environment:**
   ```bash
   python3 -m pip list | grep dotenv
   python3 -m pip list | grep redis
   ```

3. **Install with sudo if needed:**
   ```bash
   sudo pip3 install python-dotenv redis pandas numpy
   ```

4. **Check logs for other missing modules:**
   ```bash
   tail -n 50 evaluator.log
   tail -n 50 notifier.log
   ```

---

**After installing `python-dotenv`, services should start successfully!**



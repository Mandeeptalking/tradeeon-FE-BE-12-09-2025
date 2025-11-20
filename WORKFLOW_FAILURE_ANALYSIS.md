# Workflow Failure Analysis

## Root Cause

All workflows are failing because:

### Issue 1: Missing `redis` in requirements.txt ✅ FIXED
- `Dockerfile.alert-runner` installs dependencies from `requirements.txt`
- `event_bus.py` requires `redis>=5.0.0`
- Docker build failed → Workflow failed

**Fix:** ✅ Added `redis>=5.0.0` to `requirements.txt`

### Issue 2: Missing `python-dotenv` in Docker ✅ ALREADY EXISTS
- `supabase_client.py` imports `from dotenv import load_dotenv`
- Already in requirements.txt ✅

## What Failed

When `event_bus.py` was added to `apps/bots/`:
1. Workflow triggered (file changed)
2. Docker build started
3. Build failed: `ModuleNotFoundError: No module named 'redis'`
4. Workflow failed ❌

## Fix Applied

✅ Added `redis>=5.0.0` to `requirements.txt`
✅ Committed and pushed

## Next Workflow Run

Should now:
1. ✅ Pull latest code
2. ✅ Build Docker image with redis installed
3. ✅ Deploy successfully
4. ✅ Workflow passes ✅

## For Lightsail

Still need to install dependencies manually:
```bash
pip3 install python-dotenv redis>=5.0.0
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
cd apps/bots
pkill -f run_condition_evaluator && pkill -f run_bot_notifier
sleep 2
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &
```

---

**Fix is committed - workflows should pass on next run!** ✅

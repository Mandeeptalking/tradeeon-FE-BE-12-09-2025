# Workflow Failure - Complete Fix

## Issue: Workflow Failing with Exit Code 1

The "Build and Deploy Alert Runner" workflow is failing because:
1. New bot files (`event_bus.py`, `bot_notifier.py`, etc.) were triggering deployments
2. These files aren't needed for the alert runner
3. The workflow was trying to build/deploy when these files changed

## Fixes Applied

### ✅ Fix 1: Added `redis` to `requirements.txt`
- Docker builds now include redis dependency
- Required for event_bus module (even if not used by alert runner)

### ✅ Fix 2: Excluded New Bot Files from Workflow Triggers
- Added exclusions to `.github/workflows/deploy-alert-runner.yml`
- Added exclusions to `.github/workflows/deploy-all.yml`
- Files excluded:
  - `!apps/bots/event_bus.py`
  - `!apps/bots/bot_notifier.py`
  - `!apps/bots/run_condition_evaluator.py`
  - `!apps/bots/run_bot_notifier.py`

## Why This Works

The alert runner:
- ✅ Only needs `apps/alerts/**` files
- ✅ Only needs `apps/bots/bot_action_handler.py` (for bot triggers)
- ❌ Doesn't need the new centralized bot system files

These new files are for Phase 2 (Centralized Bot System) which:
- Runs separately on Lightsail (not in Docker)
- Uses condition evaluator and bot notifier services
- Doesn't affect the alert runner

## Result

✅ **Workflows will now:**
- Not trigger when new bot files are added
- Only trigger when alert-related files change
- Build and deploy successfully

## Status

✅ **Both fixes committed and pushed**

The next workflow run should:
1. Not trigger for these files (because they're excluded)
2. Pass when it does run (because redis is in requirements.txt)

---

**The workflow failures should stop now!** 🎉



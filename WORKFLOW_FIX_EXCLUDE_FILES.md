# Workflow Fix - Exclude New Bot Files

## Issue: Workflow Failing

The workflow is failing because new bot files (`event_bus.py`, `bot_notifier.py`, `run_condition_evaluator.py`, `run_bot_notifier.py`) are triggering alert-runner deployment, but they're not needed for the alert runner.

## Fix Applied

✅ **Excluded new bot files from alert-runner workflow triggers**

### Files Excluded:
- `!apps/bots/event_bus.py` - Not used by alert runner
- `!apps/bots/bot_notifier.py` - Not used by alert runner  
- `!apps/bots/run_condition_evaluator.py` - Not used by alert runner
- `!apps/bots/run_bot_notifier.py` - Not used by alert runner

## What Changed

### `.github/workflows/deploy-alert-runner.yml`
- Added exclusions for new bot files
- Alert runner only deploys when alert-related files change

### `.github/workflows/deploy-all.yml`
- Added same exclusions to alert-runner filter
- Prevents unnecessary deployments

## Why This Fixes It

The alert runner:
- ✅ Only needs `apps/alerts/**` files
- ✅ Only needs `apps/bots/bot_action_handler.py` (for bot triggers)
- ❌ Doesn't need `event_bus.py`, `bot_notifier.py`, or service runners

These new files are for the centralized bot system (Phase 2) which runs separately on Lightsail, not in the alert-runner Docker container.

## Next Workflow Run

Should now:
1. ✅ Only trigger when alert-related files change
2. ✅ Not trigger when new bot files are added
3. ✅ Build and deploy successfully

## Status

✅ **Fix committed and pushed**

The workflow will no longer trigger when these files change, preventing build failures!



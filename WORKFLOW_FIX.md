# Workflow Failures - Fix Applied

## Issue: Workflows Failing

All workflows are failing because `redis` dependency is missing from `requirements.txt`.

## Fix Applied

✅ Added `redis>=5.0.0` to `requirements.txt`

The `Dockerfile.alert-runner` uses `requirements.txt` to install dependencies, so `redis` was missing in Docker builds.

## Status

- ✅ `python-dotenv` already in requirements.txt
- ✅ `redis` now added to requirements.txt
- ✅ Fix committed and pushed

## Next Steps

The workflows should pass on the next run since:
1. All dependencies are now in requirements.txt
2. Docker builds will include redis
3. Services will be able to import event_bus

## Current Status

The workflows were failing because:
- `event_bus.py` was added to `apps/bots/`
- This triggered `alert-runner` deployment
- Docker build failed because `redis` was missing from requirements.txt
- Now fixed ✅

The next workflow run should succeed!



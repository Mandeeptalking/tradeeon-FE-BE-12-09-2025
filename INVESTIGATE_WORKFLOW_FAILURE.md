# Investigate Workflow Failure

## Issue: Docker Build Failing

The workflow is failing with "exit code 1" during Docker build.

## Possible Causes

1. **Import Error in Alert Runner**
   - `apps/alerts/dispatch.py` imports `from apps.bots.bot_action_handler import execute_bot_action`
   - If `bot_action_handler.py` imports something missing, it will fail

2. **Missing Dependencies**
   - Requirements.txt might be missing something
   - Redis was just added, but maybe there's another issue

3. **Syntax Error**
   - New files might have syntax errors
   - Python module loading might fail

4. **Docker Build Context**
   - Files might not be copied correctly
   - Path issues in Docker

## Next Steps

1. Check GitHub Actions logs for the exact error
2. Verify bot_action_handler.py doesn't import event_bus
3. Test Docker build locally
4. Check for any syntax errors in new files

## Quick Check

Look at the GitHub Actions logs to see the actual error message. It will show:
- Which step failed (Build, Deploy, etc.)
- The exact error message
- Which import or command failed

## Temporary Fix

If the issue is that alert-runner doesn't need the new bot files, we could:
1. Exclude `apps/bots/event_bus.py` from triggering alert-runner deployment
2. Or ensure bot_action_handler doesn't import event_bus



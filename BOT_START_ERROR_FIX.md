# Bot Start Error Fix

## Issue
When clicking the "Start" button on a bot, users were getting a generic `INTERNAL_SERVER_ERROR` without any details about what went wrong.

## Root Cause
The `start_bot` method in `bot_execution_service.py` was catching exceptions, logging them, and returning `False`, but not propagating the actual error message. This made debugging impossible.

## Fixes Applied

### 1. Improved Error Propagation (`apps/bots/bot_execution_service.py`)
- Changed `start_bot` to raise `RuntimeError` with the actual error message instead of just returning `False`
- Added detailed logging with bot config information
- Error messages now include the exception type and full message

### 2. Better Error Handling (`apps/api/routers/bots.py`)
- Catch `RuntimeError` specifically from `start_bot` and propagate the message
- Include error details in the `TradeeonError` response
- Added more context in error messages

### 3. Error Details in Response
- The error handler already includes details in development mode
- Error messages now show the actual exception that occurred
- Check backend logs for full stack traces

## Testing
To see the actual error:
1. Check browser console for the full error response
2. Check backend logs (they now include detailed error information)
3. The error message should now show what actually failed (e.g., "Failed to start bot: ...")

## Next Steps
If you're still getting errors:
1. Check the backend server logs - they will show the full exception
2. The error message in the response should now be more descriptive
3. Common issues:
   - Missing bot configuration fields
   - Database connection issues
   - Market data service initialization failures
   - Missing dependencies


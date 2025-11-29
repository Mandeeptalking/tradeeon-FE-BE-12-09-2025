# Backend Bot Start/Delete Fixes

## Issues Fixed

### 1. Path Resolution Issues
**Problem:** Relative path resolution (`'..', '..', 'bots'`) was unreliable in Docker/production environments.

**Solution:** 
- Changed to absolute path resolution using `os.path.abspath()`
- Added path existence validation before importing
- Added detailed error logging for path resolution failures

**Files Changed:**
- `apps/api/routers/bots.py` - Start and Delete endpoints

### 2. Import Error Handling
**Problem:** Import errors were silently failing, making debugging difficult.

**Solution:**
- Added try-catch around imports with detailed error messages
- Log path information when imports fail
- Return proper HTTP error responses

### 3. Service Availability Checks
**Problem:** No validation that `db_service` and `bot_execution_service` are enabled/available before use.

**Solution:**
- Added checks for `db_service.enabled` before database operations
- Added checks for `bot_execution_service` availability
- Return 503 Service Unavailable with clear error messages

### 4. Bot Deletion Improvements
**Problem:** 
- Delete operation didn't verify deletion succeeded
- No handling for idempotent deletes (bot already deleted)

**Solution:**
- Added pre-delete check to verify bot exists
- Added post-delete verification
- Handle idempotent deletes gracefully
- Better error messages and logging

### 5. Bot Start Error Handling
**Problem:** Errors during bot run creation or executor start were not properly handled.

**Solution:**
- Added try-catch around `create_bot_run` (continues without run_id if it fails)
- Added try-catch around `start_bot` with detailed error messages
- Update run status to "error" if bot fails to start
- Better cleanup on failure

## Code Changes

### `apps/api/routers/bots.py`

**Start Endpoint (`start_dca_bot_paper`):**
- ✅ Absolute path resolution
- ✅ Path existence validation
- ✅ Import error handling
- ✅ Service availability checks
- ✅ Better error handling for bot run creation
- ✅ Better error handling for executor start

**Delete Endpoint (`delete_dca_bot`):**
- ✅ Absolute path resolution
- ✅ Path existence validation
- ✅ Import error handling
- ✅ Service availability checks
- ✅ Pre-delete verification
- ✅ Post-delete verification
- ✅ Idempotent delete handling
- ✅ Better error messages

### `apps/bots/db_service.py`

**Delete Bot Method:**
- ✅ Pre-delete existence check
- ✅ Post-delete verification
- ✅ Better error logging
- ✅ Returns False if bot doesn't exist (API handles idempotent delete)

## Testing Checklist

### Start Bot
- [ ] Start inactive bot → Should succeed
- [ ] Start stopped bot → Should succeed
- [ ] Start running bot → Should return "already running"
- [ ] Start paused bot → Should return error "resume instead"
- [ ] Start with invalid bot_id → Should return 404
- [ ] Start with database disabled → Should return 503
- [ ] Check logs for detailed error messages

### Delete Bot
- [ ] Delete inactive bot → Should succeed
- [ ] Delete running bot → Should stop first, then delete
- [ ] Delete paused bot → Should stop first, then delete
- [ ] Delete non-existent bot → Should return success (idempotent)
- [ ] Delete with invalid bot_id → Should return 404
- [ ] Delete with database disabled → Should return 503
- [ ] Check logs for detailed error messages

## Deployment

### Backend (Lightsail/Docker)
```bash
# SSH into Lightsail
cd /path/to/tradeeon
git pull origin main
docker-compose build --no-cache
docker-compose restart
docker logs -f tradeeon-backend  # Monitor logs
```

### Verify Deployment
1. Check backend logs for any import errors
2. Test start bot endpoint with curl/Postman
3. Test delete bot endpoint with curl/Postman
4. Check that path resolution works in Docker environment

## Debugging

### If Start Still Fails
1. Check backend logs for:
   - Path resolution errors
   - Import errors
   - Service availability errors
   - Bot executor initialization errors

2. Verify environment:
   - `SUPABASE_URL` is set
   - `SUPABASE_SERVICE_ROLE_KEY` is set
   - Bots directory exists at expected path

3. Test manually:
   ```python
   # In Python shell
   import sys
   import os
   bots_path = "/path/to/apps/bots"
   sys.path.insert(0, bots_path)
   from db_service import db_service
   from bot_execution_service import bot_execution_service
   ```

### If Delete Still Fails
1. Check backend logs for:
   - Database connection errors
   - RLS policy errors
   - Foreign key constraint errors

2. Verify database:
   - Bot exists in `bots` table
   - User owns the bot
   - RLS policies allow deletion

3. Test manually:
   ```sql
   -- Check bot exists
   SELECT * FROM bots WHERE bot_id = 'your_bot_id' AND user_id = 'your_user_id';
   
   -- Try delete
   DELETE FROM bots WHERE bot_id = 'your_bot_id' AND user_id = 'your_user_id';
   ```

## Error Messages

### Start Bot Errors
- `"Bots module not found"` → Path resolution failed
- `"Failed to import bot services"` → Import error
- `"Database service is not available"` → db_service not enabled
- `"Bot execution service is not available"` → bot_execution_service not available
- `"Failed to start bot executor"` → Executor initialization failed

### Delete Bot Errors
- `"Bots module not found"` → Path resolution failed
- `"Failed to import bot services"` → Import error
- `"Database service is not available"` → db_service not enabled
- `"Failed to delete bot"` → Database operation failed
- `"Bot still exists in database after delete attempt"` → Delete verification failed


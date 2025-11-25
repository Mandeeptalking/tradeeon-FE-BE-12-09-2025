# Bot Status Fixes Summary

## Issues Fixed

### 1. Execution Service Cleanup Issue
**Problem**: The execution loop's `finally` block was setting ALL bots to `"stopped"` when the loop ended, even if they were `"inactive"`.

**Fix**: Modified `apps/bots/bot_execution_service.py` to check the current bot status before updating:
- Only updates to `"stopped"` if current status is `"running"` or `"paused"`
- Does NOT change `"inactive"` bots to `"stopped"`
- Prevents newly created bots from being incorrectly marked as `"stopped"`

### 2. Status Validation Added
**Problem**: No validation to prevent invalid status transitions (e.g., trying to pause an inactive bot).

**Fix**: Added comprehensive status validation to all endpoints in `apps/api/routers/bots.py`:

#### Start Endpoint
- ✅ Validates bot can be started (must be `inactive` or `stopped`)
- ✅ Returns appropriate message if already `running`
- ✅ Returns error if `paused` (must use resume)
- ✅ Handles status sync issues (bot running in memory but status out of sync)

#### Stop Endpoint
- ✅ Validates bot can be stopped (must be `running` or `paused`)
- ✅ Returns appropriate message if already `stopped` or `inactive`
- ✅ Updates all active bot runs to `stopped`

#### Pause Endpoint
- ✅ Validates bot can be paused (must be `running`)
- ✅ Returns appropriate message if already `paused`
- ✅ Returns error if not `running`

#### Resume Endpoint
- ✅ Validates bot can be resumed (must be `paused`)
- ✅ Returns appropriate message if already `running`
- ✅ Returns error if not `paused`

#### Delete Endpoint
- ✅ Stops bot if `running` or `paused` before deletion
- ✅ Updates status to `stopped` before deletion
- ✅ Works from any status

## Status Flow

### Correct Status Transitions

```
1. Create Bot
   → Status: "inactive"
   → Bot Run: None

2. Start Bot (from inactive/stopped)
   → Status: "inactive"/"stopped" → "running"
   → Bot Run: Created with status "running"

3. Pause Bot (from running)
   → Status: "running" → "paused"
   → Bot Run: Status remains "running"

4. Resume Bot (from paused)
   → Status: "paused" → "running"
   → Bot Run: Status remains "running" (same run continues)

5. Stop Bot (from running/paused)
   → Status: "running"/"paused" → "stopped"
   → Bot Run: All active runs updated to "stopped" with ended_at

6. Start Bot Again (from stopped)
   → Status: "stopped" → "running"
   → Bot Run: New run created with status "running"

7. Delete Bot (from any status)
   → If running/paused: Stops first
   → Then deletes bot record
   → All bot_runs deleted (CASCADE)
```

## Endpoint Details

### POST `/bots/dca-bots/{bot_id}/start-paper`
- **Valid Statuses**: `inactive`, `stopped`
- **New Status**: `running`
- **Creates**: New `bot_runs` record
- **Error Codes**: 
  - `400`: Invalid status (paused, etc.)
  - `404`: Bot not found
  - `500`: Execution service failure

### POST `/bots/dca-bots/{bot_id}/stop`
- **Valid Statuses**: `running`, `paused`
- **New Status**: `stopped`
- **Updates**: All active `bot_runs` to `stopped`
- **Error Codes**:
  - `400`: Invalid status (inactive, etc.)
  - `404`: Bot not found
  - `500`: Execution service failure

### POST `/bots/dca-bots/{bot_id}/pause`
- **Valid Statuses**: `running` only
- **New Status**: `paused`
- **Updates**: Bot status only (run status unchanged)
- **Error Codes**:
  - `400`: Invalid status (not running)
  - `404`: Bot not found
  - `500`: Execution service failure

### POST `/bots/dca-bots/{bot_id}/resume`
- **Valid Statuses**: `paused` only
- **New Status**: `running`
- **Updates**: Bot status only (run status unchanged)
- **Error Codes**:
  - `400`: Invalid status (not paused)
  - `404`: Bot not found
  - `500`: Execution service failure

### DELETE `/bots/dca-bots/{bot_id}`
- **Valid Statuses**: Any
- **Action**: 
  - If `running`/`paused`: Stops bot first
  - Then deletes bot record
- **Error Codes**:
  - `404`: Bot not found
  - `500`: Database deletion failure

## Files Modified

1. **`apps/bots/bot_execution_service.py`**
   - Fixed `_execute_bot_loop` finally block to check status before updating
   - Prevents inactive bots from being changed to stopped

2. **`apps/api/routers/bots.py`**
   - Added status validation to all endpoints
   - Added proper error messages for invalid transitions
   - Added status sync handling
   - Improved error handling

## Testing Recommendations

1. **Create a new bot** → Verify status is `inactive`
2. **Start inactive bot** → Verify status changes to `running`
3. **Try to start running bot** → Should return "already running"
4. **Pause running bot** → Verify status changes to `paused`
5. **Try to pause paused bot** → Should return "already paused"
6. **Resume paused bot** → Verify status changes to `running`
7. **Try to resume running bot** → Should return "already running"
8. **Stop running bot** → Verify status changes to `stopped`
9. **Start stopped bot** → Verify status changes to `running` (new run)
10. **Delete bot** → Verify bot is deleted and runs are cleaned up

## Status Display

The frontend correctly displays:
- **Inactive**: Gray badge, "Inactive" label
- **Running**: Green badge, "Running" label  
- **Paused**: Amber badge, "Paused" label
- **Stopped**: Gray badge, "Stopped" label

Action buttons are context-aware based on status.


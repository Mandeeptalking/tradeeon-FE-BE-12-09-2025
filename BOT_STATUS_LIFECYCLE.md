# Bot Status Lifecycle Documentation

## Bot Status States

The bot can be in one of the following states:

1. **`inactive`** - Bot is created but never started
2. **`running`** - Bot is actively executing trades
3. **`paused`** - Bot is temporarily paused (can be resumed)
4. **`stopped`** - Bot has been stopped (needs to be restarted)

## Status Transitions

### Valid Transitions

```
Created → inactive
   ↓
Start → running
   ↓
Pause → paused → Resume → running
   ↓
Stop → stopped → Start → running (new run)
```

### Invalid Transitions (Now Prevented)

- ❌ `inactive` → `paused` (must start first)
- ❌ `inactive` → `stopped` (already stopped)
- ❌ `stopped` → `paused` (must start first)
- ❌ `paused` → `inactive` (use stop instead)
- ❌ `running` → `inactive` (use stop instead)

## Endpoint Behavior

### 1. Create Bot (`POST /bots/dca-bots`)
- **Status Set**: `inactive`
- **Bot Run**: None created
- **Action**: Bot is saved to database but not started

### 2. Start Bot (`POST /bots/dca-bots/{bot_id}/start-paper`)
- **Valid From**: `inactive` or `stopped`
- **Status Changes To**: `running`
- **Bot Run**: New run created with `status: "running"`
- **Validation**: 
  - If already `running`: Returns success message
  - If `paused`: Returns error (use resume instead)
  - If other status: Returns error

### 3. Stop Bot (`POST /bots/dca-bots/{bot_id}/stop`)
- **Valid From**: `running` or `paused`
- **Status Changes To**: `stopped`
- **Bot Run**: All active runs updated to `status: "stopped"` with `ended_at` timestamp
- **Validation**:
  - If already `stopped` or `inactive`: Returns success message
  - If other status: Returns error

### 4. Pause Bot (`POST /bots/dca-bots/{bot_id}/pause`)
- **Valid From**: `running` only
- **Status Changes To**: `paused`
- **Bot Run**: Run status remains `running` (not updated)
- **Validation**:
  - If already `paused`: Returns success message
  - If not `running`: Returns error

### 5. Resume Bot (`POST /bots/dca-bots/{bot_id}/resume`)
- **Valid From**: `paused` only
- **Status Changes To**: `running`
- **Bot Run**: Run status remains `running` (continues same run)
- **Validation**:
  - If already `running`: Returns success message
  - If not `paused`: Returns error

### 6. Delete Bot (`DELETE /bots/dca-bots/{bot_id}`)
- **Valid From**: Any status
- **Action**: 
  - If `running` or `paused`: Stops bot first
  - Then deletes bot record
  - All associated `bot_runs` are deleted (CASCADE)
  - Order logs and positions remain (for historical records)

## Status Validation

All endpoints now include status validation to prevent invalid transitions:

- **Start**: Only allows `inactive` → `running` or `stopped` → `running`
- **Stop**: Only allows `running` → `stopped` or `paused` → `stopped`
- **Pause**: Only allows `running` → `paused`
- **Resume**: Only allows `paused` → `running`

## Bot Execution Service Behavior

### Execution Loop Cleanup

The execution loop's `finally` block now checks the current bot status before updating:

- **Only updates to `stopped`** if current status is `running` or `paused`
- **Does NOT change** `inactive` bots to `stopped`
- **Does NOT change** already `stopped` bots

This prevents newly created bots from being incorrectly marked as `stopped`.

## Database Schema

### `bots` Table
- `status` field: `TEXT NOT NULL DEFAULT 'inactive'`
- Valid values: `'active', 'inactive', 'running', 'stopped', 'error', 'paused'`
- CHECK constraint enforces valid status values

### `bot_runs` Table
- `status` field: `TEXT NOT NULL`
- Valid values: `'running', 'completed', 'stopped', 'error'`
- Tracks individual execution instances
- One bot can have multiple runs over time

## Error Handling

All endpoints return appropriate error messages for invalid status transitions:

- **400 Bad Request**: Invalid status transition
- **404 Not Found**: Bot not found or access denied
- **500 Internal Server Error**: Execution service failure

## Status Display

### Frontend Display
- **Inactive**: Gray badge, "Inactive" label
- **Running**: Green badge, "Running" label
- **Paused**: Amber badge, "Paused" label
- **Stopped**: Gray badge, "Stopped" label

### Action Buttons Available
- **Inactive/Stopped**: Show "Start" button
- **Running**: Show "Pause" and "Stop" buttons
- **Paused**: Show "Resume" and "Stop" buttons
- **All**: Show "Delete" button (with confirmation)

## Testing Checklist

- [x] Create bot → Status is `inactive`
- [x] Start inactive bot → Status changes to `running`
- [x] Start stopped bot → Status changes to `running`
- [x] Start running bot → Returns "already running" message
- [x] Start paused bot → Returns error (must resume)
- [x] Pause running bot → Status changes to `paused`
- [x] Pause paused bot → Returns "already paused" message
- [x] Pause inactive bot → Returns error
- [x] Resume paused bot → Status changes to `running`
- [x] Resume running bot → Returns "already running" message
- [x] Resume inactive bot → Returns error
- [x] Stop running bot → Status changes to `stopped`
- [x] Stop paused bot → Status changes to `stopped`
- [x] Stop stopped bot → Returns "already stopped" message
- [x] Stop inactive bot → Returns "already stopped" message
- [x] Delete running bot → Stops first, then deletes
- [x] Delete paused bot → Stops first, then deletes
- [x] Delete stopped bot → Deletes directly
- [x] Delete inactive bot → Deletes directly
- [x] Execution loop cleanup → Only updates running/paused to stopped


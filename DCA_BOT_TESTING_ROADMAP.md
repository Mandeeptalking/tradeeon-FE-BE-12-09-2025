# DCA Bot Paper Trading Testing Roadmap

## Current Status

### ✅ What's Already Implemented

1. **DCA Bot Executor** (`apps/bots/dca_executor.py`)
   - ✅ Paper trading engine integration
   - ✅ Market data service
   - ✅ Phase 1 features (market regime, dynamic scaling, profit strategy, emergency brake)
   - ✅ DCA order execution logic

2. **Paper Trading Engine** (`apps/bots/paper_trading.py`)
   - ✅ Virtual balance management
   - ✅ Position tracking
   - ✅ Order history
   - ✅ P&L calculations
   - ✅ Database integration (upsert funds)

3. **Bot API** (`apps/api/routers/bots.py`)
   - ✅ Bot creation endpoint (`POST /bots/dca-bots`)
   - ✅ Condition registration (Phase 1.3)
   - ✅ Bot subscription to conditions

4. **Phase 2 Integration** (Complete)
   - ✅ Condition Evaluator Service
   - ✅ Event Bus (Redis)
   - ✅ Bot Notifier Service

---

## ❌ What's Missing for Paper Trading

### 1. Bot Start Endpoint (Critical)

**Status**: ⚠️ **NOT FULLY IMPLEMENTED**

**Issue**: The `/dca-bots/{bot_id}/start` endpoint exists but:
- Returns error: "Live trading not implemented yet"
- No paper trading mode option
- Doesn't actually start the bot executor

**What's Needed**:
```python
@router.post("/dca-bots/{bot_id}/start")
async def start_dca_bot(
    bot_id: str,
    mode: str = "paper",  # "paper" or "live"
    user: AuthedUser = Depends(get_current_user)
):
    # 1. Get bot config from database
    # 2. Initialize DCABotExecutor with paper_trading=True/False
    # 3. Start bot executor in background task
    # 4. Update bot status to "running"
    # 5. Return success
```

---

### 2. Bot Execution Service (Critical)

**Status**: ⚠️ **NOT IMPLEMENTED**

**Issue**: No service that:
- Runs bot executors continuously
- Handles bot lifecycle (start/stop/pause)
- Monitors bot status
- Manages multiple bots concurrently

**What's Needed**:
- A bot execution manager service
- Background task that calls `bot_executor.execute_once()` periodically
- Integration with Phase 2 condition triggers
- Bot state management

**Proposed Structure**:
```python
# apps/bots/bot_execution_service.py
class BotExecutionService:
    def __init__(self):
        self.running_bots: Dict[str, DCABotExecutor] = {}
        self.bot_tasks: Dict[str, asyncio.Task] = {}
    
    async def start_bot(self, bot_id: str, bot_config: Dict, mode: str = "paper"):
        # Create executor
        # Start background task
        # Track in running_bots
    
    async def stop_bot(self, bot_id: str):
        # Stop executor
        # Cancel task
        # Update status
```

---

### 3. Condition Trigger Integration (Critical)

**Status**: ⚠️ **PARTIAL**

**Issue**: 
- Phase 2 Bot Notifier receives condition triggers ✅
- But doesn't execute DCA bot actions ❌
- Needs to call bot executor when condition triggers

**What's Needed**:
- Update `BotNotifier._process_dca_bot_trigger()` to:
  1. Get bot config from database
  2. Get running bot executor (or create if not running)
  3. Call `bot_executor.execute_entry_order()` when condition triggers

---

### 4. Bot Status Tracking

**Status**: ⚠️ **PARTIAL**

**Issue**: Bot status in database isn't updated when bot starts/stops

**What's Needed**:
- Update bot status when starting: `status = "running"`
- Update bot status when stopping: `status = "stopped"`
- Update bot status when pausing: `status = "paused"`

---

### 5. Real-time Bot Status API

**Status**: ⚠️ **NOT IMPLEMENTED**

**What's Needed**:
- `GET /bots/dca-bots/{bot_id}/status` - Get current bot status, P&L, positions
- `GET /bots/dca-bots/{bot_id}/positions` - Get current positions
- `GET /bots/dca-bots/{bot_id}/orders` - Get order history
- `GET /bots/dca-bots/{bot_id}/pnl` - Get P&L summary

---

## Implementation Plan

### Phase A: Basic Paper Trading (1-2 days)

**Goal**: Start a DCA bot in paper trading mode and execute orders manually

1. **Fix Start Endpoint**
   - Implement `POST /dca-bots/{bot_id}/start` with `mode="paper"`
   - Initialize `DCABotExecutor` with `paper_trading=True`
   - Return success immediately (don't wait for execution)

2. **Create Bot Execution Service**
   - Create `apps/bots/bot_execution_service.py`
   - Implement `start_bot()`, `stop_bot()`, `pause_bot()`
   - Run bot executor loop in background task

3. **Test Basic Execution**
   - Create bot via API
   - Start bot in paper mode
   - Manually trigger execution
   - Verify orders are created in paper trading engine

---

### Phase B: Condition-Based Trading (2-3 days)

**Goal**: Bot responds to condition triggers from Phase 2

1. **Integrate Bot Notifier**
   - Update `BotNotifier._process_dca_bot_trigger()`
   - Connect to `BotExecutionService`
   - Execute entry orders when conditions trigger

2. **Test End-to-End**
   - Create bot with condition (e.g., RSI < 30)
   - Start bot in paper mode
   - Wait for condition to trigger (or manually trigger in test)
   - Verify bot executes entry order
   - Check paper trading positions

---

### Phase C: Bot Management & Monitoring (1-2 days)

**Goal**: Full bot lifecycle management

1. **Bot Status Endpoints**
   - Implement status endpoints
   - Real-time position tracking
   - P&L reporting

2. **Bot Dashboard Integration**
   - Frontend shows running bots
   - Live status updates
   - Position/P&L display

---

## Quick Start: Testing Paper Trading

### Option 1: Manual Testing (Fastest)

1. **Create Bot via API**:
```bash
POST /api/bots/dca-bots
{
  "botName": "Test DCA Bot",
  "direction": "long",
  "pair": "BTCUSDT",
  "baseOrderSize": 100,
  "conditionConfig": {...}
}
```

2. **Start Bot** (Need to implement first):
```bash
POST /api/bots/dca-bots/{bot_id}/start
{
  "mode": "paper"
}
```

3. **Manually Trigger Entry** (For testing):
```bash
POST /api/bots/dca-bots/{bot_id}/trigger-entry
```

4. **Check Positions**:
```bash
GET /api/bots/dca-bots/{bot_id}/positions
```

---

### Option 2: Full Integration Testing

1. Start Phase 2 services
2. Create bot with condition
3. Start bot in paper mode
4. Wait for condition to trigger
5. Verify automatic execution

---

## Estimated Timeline

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| **Phase A** | Start endpoint + Execution service | 1-2 days | ⏳ Pending |
| **Phase B** | Condition integration | 2-3 days | ⏳ Pending |
| **Phase C** | Status endpoints + Dashboard | 1-2 days | ⏳ Pending |
| **Total** | | **4-7 days** | |

---

## Immediate Next Steps

### 1. Fix Start Endpoint (Priority 1)

**File**: `apps/api/routers/bots.py`

**Action**: Replace the placeholder start endpoint with actual implementation:

```python
@router.post("/dca-bots/{bot_id}/start")
async def start_dca_bot(
    bot_id: str = Path(..., description="Bot ID"),
    mode: str = Body("paper", description="Trading mode: 'paper' or 'live'"),
    user: AuthedUser = Depends(get_current_user)
):
    # 1. Get bot from database
    # 2. Validate bot belongs to user
    # 3. Initialize DCABotExecutor
    # 4. Start bot execution service
    # 5. Update bot status
    # 6. Return success
```

### 2. Create Bot Execution Service (Priority 1)

**File**: `apps/bots/bot_execution_service.py` (new file)

**Action**: Create service to manage bot executors and execution loops.

### 3. Test Basic Flow (Priority 1)

**Action**: 
1. Create bot
2. Start bot
3. Manually execute entry order
4. Verify paper trading positions

---

## Questions to Answer

1. **Where should bot executors run?**
   - Option A: Same FastAPI process (background tasks)
   - Option B: Separate service (like condition evaluator)
   - Option C: Hybrid (lightweight in FastAPI, heavy in service)

2. **How to handle bot restarts?**
   - Persist running state?
   - Auto-restart on service restart?
   - Manual restart only?

3. **How to scale with many bots?**
   - One executor per bot?
   - Shared executor pool?
   - Distributed execution?

---

**Bottom Line**: DCA bot paper trading can be tested in **4-7 days** with focused implementation of:
1. Bot start endpoint
2. Bot execution service
3. Condition trigger integration

The foundation is already there - we just need to connect the pieces!



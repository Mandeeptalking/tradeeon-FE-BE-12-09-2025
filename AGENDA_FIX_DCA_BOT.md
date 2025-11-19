# Agenda: Fix DCA Bot - Complete Wiki

**Topic**: Fix DCA Bot for Paper & Live Trading  
**Status**: 🟡 In Progress  
**Target**: Ready for Paper & Live Trading  
**Created**: November 18, 2025  
**Last Updated**: November 18, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [How DCA Bot Works](#how-dca-bot-works)
3. [Current Issues](#current-issues)
4. [Fix Plan](#fix-plan)
5. [Progress Tracking](#progress-tracking)
6. [Testing Plan](#testing-plan)
7. [Documentation](#documentation)
8. [Updates Log](#updates-log)

---

## 🎯 Overview

### Goal
Fix all issues in the DCA bot to make it production-ready for both paper trading and live trading.

### Current Status
- **Overall Readiness**: ~85%
- **Paper Trading**: ⚠️ Mostly ready (entry conditions broken)
- **Live Trading**: ❌ Not ready (needs exchange integration)

### Timeline
- **Critical Fixes**: 1 week
- **Full Production Ready**: 2-3 weeks

---

## 🔧 How DCA Bot Works

### Architecture Overview

```
User Creates Bot
      │
      ▼
Bot Config Stored (bots table)
      │
      ▼
Alert Created (if entry conditions set)
      │
      ▼
Bot Started (paper/live mode)
      │
      ▼
Bot Execution Loop (every 60 seconds)
      │
      ├─► Fetch Market Data
      ├─► Check Market Regime
      ├─► Check Emergency Brake
      ├─► Evaluate Entry Conditions
      ├─► Evaluate DCA Rules
      ├─► Check Cooldown
      ├─► Calculate Dynamic Scaling
      ├─► Execute DCA Order
      ├─► Check Profit Targets
      └─► Update Statistics
```

### Core Components

#### 1. Bot Executor (`apps/bots/dca_executor.py`)
**Purpose**: Main execution engine for DCA bot

**Key Methods**:
- `execute_once()` - Main execution loop
- `_process_pair()` - Process single trading pair
- `_should_execute_dca()` - Check if DCA should execute
- `_evaluate_entry_conditions()` - ⚠️ **BROKEN** - Always returns True
- `_evaluate_dca_rules()` - Check DCA trigger rules
- `_calculate_scaled_amount()` - Apply dynamic scaling

**Flow**:
1. Fetch current prices for all pairs
2. Get market data (for indicators/regime detection)
3. Check market regime (pause if bear market)
4. Check emergency brake (pause if crash detected)
5. Check profit targets (sell if targets met)
6. For each pair:
   - Check entry conditions ⚠️ **BROKEN**
   - Check DCA rules
   - Check cooldown
   - Calculate scaled amount
   - Execute DCA order

#### 2. Market Data Service (`apps/bots/market_data.py`)
**Purpose**: Fetch live market data from Binance

**Methods**:
- `get_current_price(symbol)` - Get current price
- `get_klines_as_dataframe(symbol, interval, limit)` - Get historical candles
- `get_multiple_symbols_data()` - Batch fetch

**Status**: ✅ **WORKING**

#### 3. Paper Trading Engine (`apps/bots/paper_trading.py`)
**Purpose**: Simulate trades without real money

**Methods**:
- `execute_buy(pair, amount, price)` - Execute buy order
- `execute_sell(pair, quantity, price)` - Execute sell order
- `get_position_pnl(pair, current_price)` - Calculate P&L
- `get_statistics(current_prices)` - Get overall stats

**Status**: ✅ **WORKING**

#### 4. Market Regime Detector (`apps/bots/regime_detector.py`)
**Purpose**: Detect bear markets and accumulation zones

**Logic**:
- **Pause Conditions**: Price below MA + RSI below threshold for N periods
- **Resume Conditions**: Volume decrease + consolidation

**Status**: ✅ **WORKING**

#### 5. Emergency Brake (`apps/bots/emergency_brake.py`)
**Purpose**: Detect flash crashes and market-wide crashes

**Logic**:
- **Circuit Breaker**: Price drops X% in Y minutes
- **Market Crash**: Multiple pairs dropping together
- **Recovery**: Price stabilizes for N bars

**Status**: ✅ **WORKING**

#### 6. Dynamic Scaling (`apps/bots/volatility_calculator.py`, `support_resistance.py`)
**Purpose**: Adjust DCA amount based on market conditions

**Components**:
- **Volatility Scaling**: ATR-based (low/normal/high)
- **S/R Scaling**: Support/resistance zone-based
- **Fear & Greed**: ⚠️ **NOT IMPLEMENTED**

**Status**: ✅ **MOSTLY WORKING** (Fear & Greed missing)

#### 7. Profit Taker (`apps/bots/profit_taker.py`)
**Purpose**: Execute profit-taking strategies

**Strategies**:
- Partial profit targets
- Trailing stop loss
- Take profit and restart
- Time-based exit

**Status**: ✅ **WORKING**

#### 8. Condition Evaluator (`backend/evaluator.py`)
**Purpose**: Evaluate trading conditions

**Status**: ✅ **EXISTS BUT NOT INTEGRATED**

**Problem**: Bot executor doesn't use this evaluator!

---

## 🐛 Current Issues

### Issue #1: Entry Conditions Not Evaluated ⚠️ **CRITICAL**

**Location**: `apps/bots/dca_executor.py` - `_evaluate_entry_conditions()`

**Current Code**:
```python
async def _evaluate_entry_conditions(self, pair: str, condition_config: Dict,
                                    market_df: Optional[pd.DataFrame] = None) -> bool:
    """Evaluate entry conditions (playbook or simple)."""
    # TODO: Integrate with alert evaluator for condition evaluation
    # For now, if no market data, return True (no condition filtering)
    if market_df is None or market_df.empty:
        if condition_config:
            logger.warning(f"No market data for {pair}, cannot evaluate conditions")
            return False
        return True
        
    # Basic implementation - integrate with evaluator.py later
    # For now, return True to allow testing
    return True  # ⚠️ ALWAYS RETURNS TRUE!
```

**Problem**:
- Always returns `True` regardless of conditions
- Bot enters even when conditions not met
- Defeats purpose of condition-based entry

**Impact**:
- ❌ Bot ignores entry conditions
- ❌ Enters at suboptimal times
- ❌ Can't wait for signals

**Root Cause**:
- No integration with `backend/evaluator.py`
- No indicator calculation
- Stub implementation

**Fix Required**:
1. Import `backend/evaluator.py`
2. Calculate indicators needed for conditions
3. Evaluate each condition
4. Return actual result (True/False)

**Priority**: **HIGH** - Must fix before production

**Estimated Time**: 2-3 days

---

### Issue #2: Custom DCA Rules Not Implemented ⚠️ **MEDIUM**

**Location**: `apps/bots/dca_executor.py` - `_evaluate_dca_rules()`

**Current Code**:
```python
elif rule_type == "custom":
    # Evaluate custom condition
    # TODO: Use evaluator
    return True  # ⚠️ ALWAYS RETURNS TRUE!
```

**Problem**:
- Custom DCA rules always return `True`
- Users can't use custom conditions for DCA triggers

**Impact**:
- ❌ Custom DCA rules don't work
- ⚠️ Limits flexibility

**Fix Required**:
- Same as Issue #1 - integrate with evaluator

**Priority**: **MEDIUM**

**Estimated Time**: 1 day (after Issue #1 is fixed)

---

### Issue #3: Bar-Based Cooldown Uses Placeholder ⚠️ **LOW**

**Location**: `apps/bots/dca_executor.py` - `_check_dca_cooldown()`

**Current Code**:
```python
elif cooldown_unit == "bars":
    # TODO: Convert bars to time based on timeframe
    cooldown_delta = timedelta(minutes=cooldown_value * 5)  # Placeholder
```

**Problem**:
- Uses 5 minutes per bar (hardcoded)
- Should convert based on bot's timeframe

**Impact**:
- ⚠️ Cooldown may be incorrect for some timeframes

**Fix Required**:
- Convert bars to actual time based on timeframe
- Example: 1h timeframe = 1 hour per bar

**Priority**: **LOW**

**Estimated Time**: 1 hour

---

### Issue #4: Fear & Greed Index Not Implemented ⚠️ **LOW**

**Location**: `apps/bots/dca_executor.py` - `_get_fear_greed_multiplier()`

**Current Code**:
```python
async def _get_fear_greed_multiplier(self) -> float:
    """Get Fear & Greed Index multiplier."""
    # TODO: Fetch Fear & Greed Index from API
    # For now, return neutral
    return multipliers.get("neutral", 1.0)  # ⚠️ Always returns 1.0
```

**Problem**:
- Always returns neutral (1.0)
- No API integration

**Impact**:
- ⚠️ Dynamic scaling doesn't use market sentiment
- Minor feature missing

**Fix Required**:
- Integrate with alternative.me Fear & Greed Index API
- Cache result for 1 hour

**Priority**: **LOW** (optional feature)

**Estimated Time**: 2-3 hours

---

### Issue #5: Bot Restart After Take Profit Not Implemented ⚠️ **LOW**

**Location**: `apps/bots/dca_executor.py` - `_check_and_execute_profit_targets()`

**Current Code**:
```python
elif action["action"] == "close_and_restart":
    await self.trading_engine.execute_sell(...)
    # TODO: Restart bot with original capital
```

**Problem**:
- Bot doesn't restart after take profit
- User must manually restart

**Impact**:
- ⚠️ Minor inconvenience
- Bot can be manually restarted

**Fix Required**:
- Implement bot restart logic
- Reset capital to original amount

**Priority**: **LOW**

**Estimated Time**: 2-3 hours

---

### Issue #6: Live Trading Not Implemented ⚠️ **BLOCKER FOR LIVE**

**Location**: `apps/bots/dca_executor.py`, `apps/bots/bot_execution_service.py`

**Current Code**:
```python
if mode == "live":
    logger.error("Live trading not implemented yet")
    return False
```

**Problem**:
- Live trading mode not implemented
- Only paper trading works

**Impact**:
- ❌ Can't use real money
- ⚠️ Blocking feature for live trading

**Fix Required**:
- Integrate `BinanceAuthenticatedClient` into bot executor
- Replace `PaperTradingEngine` with `RealTradingEngine`
- Add balance checking
- Add error handling

**Priority**: **HIGH** (for live trading)

**Estimated Time**: 1-2 weeks

---

## 📝 Fix Plan

### Phase 1: Critical Fixes (Week 1)

#### Fix #1: Entry Condition Evaluation ⚠️ **CRITICAL**

**File**: `apps/bots/dca_executor.py`

**Current**:
```python
async def _evaluate_entry_conditions(self, pair: str, condition_config: Dict,
                                    market_df: Optional[pd.DataFrame] = None) -> bool:
    # TODO: Integrate with alert evaluator
    return True  # Always returns True
```

**Fix**:
```python
async def _evaluate_entry_conditions(self, pair: str, condition_config: Dict,
                                    market_df: Optional[pd.DataFrame] = None) -> bool:
    """Evaluate entry conditions using backend evaluator."""
    if market_df is None or market_df.empty:
        if condition_config:
            logger.warning(f"No market data for {pair}, cannot evaluate conditions")
            return False
        return True  # No conditions = allow entry
    
    # Import evaluator
    from backend.evaluator import evaluate_condition, evaluate_playbook
    from apps.alerts.alert_manager import AlertManager
    
    # Get mode (playbook or simple)
    mode = condition_config.get("mode", "simple")
    
    if mode == "playbook":
        # Playbook mode: multiple conditions with AND/OR logic
        playbook_conditions = condition_config.get("conditions", [])
        logic = condition_config.get("gateLogic", "ALL")  # ALL = AND, ANY = OR
        
        # Evaluate each condition
        results = []
        for playbook_condition in playbook_conditions:
            if not playbook_condition.get("enabled", True):
                continue
                
            condition_data = playbook_condition.get("condition", {})
            
            # Build condition dict for evaluator
            condition = {
                "type": "indicator" if playbook_condition.get("conditionType") != "Price Action" else "price",
                "indicator": condition_data.get("indicator"),
                "component": condition_data.get("component"),
                "operator": condition_data.get("operator", ">"),
                "compareWith": condition_data.get("compareWith", "value"),
                "compareValue": condition_data.get("compareValue") or condition_data.get("value"),
                "timeframe": condition_data.get("timeframe", "same"),
                "period": condition_data.get("period"),
            }
            
            # Calculate indicators if needed
            df_with_indicators = await self._apply_indicators(market_df, [condition])
            
            # Evaluate condition
            row_index = len(df_with_indicators) - 1
            result = evaluate_condition(df_with_indicators, row_index, condition)
            results.append(result)
        
        # Apply logic (AND/OR)
        if logic == "ALL":  # AND
            return all(results)
        else:  # ANY/OR
            return any(results)
    
    else:
        # Simple mode: single condition
        condition_data = condition_config.get("condition", {})
        
        condition = {
            "type": "indicator" if condition_config.get("conditionType") != "Price Action" else "price",
            "indicator": condition_data.get("indicator"),
            "component": condition_data.get("component"),
            "operator": condition_data.get("operator", ">"),
            "compareWith": condition_data.get("compareWith", "value"),
            "compareValue": condition_data.get("compareValue") or condition_data.get("value"),
            "timeframe": condition_data.get("timeframe", "same"),
            "period": condition_data.get("period"),
        }
        
        # Calculate indicators if needed
        df_with_indicators = await self._apply_indicators(market_df, [condition])
        
        # Evaluate condition
        row_index = len(df_with_indicators) - 1
        return evaluate_condition(df_with_indicators, row_index, condition)

async def _apply_indicators(self, df: pd.DataFrame, conditions: List[Dict]) -> pd.DataFrame:
    """Apply indicators needed for conditions."""
    # Use AlertManager's indicator application logic
    from apps.alerts.alert_manager import AlertManager
    from apps.alerts.datasource import CandleSource
    
    # Create temporary AlertManager for indicator calculation
    src = CandleSource()
    manager = AlertManager(src)
    
    # Apply indicators
    return manager._apply_needed_indicators(df, conditions)
```

**Steps**:
1. Import `backend/evaluator.py`
2. Add `_apply_indicators()` helper method
3. Replace stub with actual evaluation
4. Test with various conditions

**Testing**:
- Test with RSI < 30 condition
- Test with EMA cross condition
- Test with playbook (multiple conditions)
- Test with no conditions (should return True)

**Estimated Time**: 2-3 days

---

#### Fix #2: Custom DCA Rules

**File**: `apps/bots/dca_executor.py`

**Current**:
```python
elif rule_type == "custom":
    # TODO: Use evaluator
    return True
```

**Fix**:
```python
elif rule_type == "custom":
    # Evaluate custom condition
    custom_condition = dca_rules.get("customCondition", {}).get("condition", {})
    if not custom_condition:
        return False
    
    # Get market data if needed
    if market_df is None or market_df.empty:
        market_df = await self.market_data.get_klines_as_dataframe(pair, "1h", 200)
    
    if market_df.empty:
        return False
    
    # Build condition dict
    condition = {
        "type": "indicator" if dca_rules.get("customCondition", {}).get("conditionType") != "Price Action" else "price",
        "indicator": custom_condition.get("indicator"),
        "component": custom_condition.get("component"),
        "operator": custom_condition.get("operator", ">"),
        "compareWith": custom_condition.get("compareWith", "value"),
        "compareValue": custom_condition.get("compareValue") or custom_condition.get("value"),
        "timeframe": custom_condition.get("timeframe", "same"),
        "period": custom_condition.get("period"),
    }
    
    # Apply indicators and evaluate
    df_with_indicators = await self._apply_indicators(market_df, [condition])
    row_index = len(df_with_indicators) - 1
    return evaluate_condition(df_with_indicators, row_index, condition)
```

**Steps**:
1. Reuse `_apply_indicators()` from Fix #1
2. Evaluate custom condition
3. Return actual result

**Estimated Time**: 1 day (after Fix #1)

---

#### Fix #3: Bar-Based Cooldown

**File**: `apps/bots/dca_executor.py`

**Current**:
```python
elif cooldown_unit == "bars":
    cooldown_delta = timedelta(minutes=cooldown_value * 5)  # Placeholder
```

**Fix**:
```python
elif cooldown_unit == "bars":
    # Convert bars to time based on bot's timeframe
    timeframe = self.config.get("interval", "1h")
    
    # Timeframe to minutes mapping
    timeframe_minutes = {
        "1m": 1,
        "5m": 5,
        "15m": 15,
        "30m": 30,
        "1h": 60,
        "4h": 240,
        "1d": 1440,
        "1w": 10080
    }
    
    minutes_per_bar = timeframe_minutes.get(timeframe, 60)  # Default to 1h
    cooldown_delta = timedelta(minutes=cooldown_value * minutes_per_bar)
```

**Estimated Time**: 1 hour

---

### Phase 2: Nice-to-Have Fixes (Week 2)

#### Fix #4: Fear & Greed Index

**File**: `apps/bots/dca_executor.py`

**Fix**:
```python
async def _get_fear_greed_multiplier(self) -> float:
    """Get Fear & Greed Index multiplier."""
    import httpx
    import time
    
    # Check cache (1 hour TTL)
    cache_key = "fear_greed_index"
    cache_time_key = "fear_greed_time"
    
    if hasattr(self, cache_key):
        cached_value = getattr(self, cache_key)
        cached_time = getattr(self, cache_time_key, 0)
        
        # Use cache if less than 1 hour old
        if time.time() - cached_time < 3600:
            index_value = cached_value
        else:
            index_value = None
    else:
        index_value = None
    
    # Fetch if not cached
    if index_value is None:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get("https://api.alternative.me/fng/")
                data = response.json()
                
                if data.get("data") and len(data["data"]) > 0:
                    index_value = int(data["data"][0]["value"])
                    
                    # Cache
                    setattr(self, cache_key, index_value)
                    setattr(self, cache_time_key, time.time())
                else:
                    index_value = 50  # Neutral if API fails
        except Exception as e:
            logger.warning(f"Failed to fetch Fear & Greed Index: {e}")
            index_value = 50  # Neutral on error
    
    # Map index to multiplier
    multipliers = self.dynamic_scaling.get("fearGreedIndex", {})
    
    if index_value <= 25:
        return multipliers.get("extremeFear", 1.8)
    elif index_value <= 45:
        return multipliers.get("fear", 1.3)
    elif index_value <= 55:
        return multipliers.get("neutral", 1.0)
    elif index_value <= 75:
        return multipliers.get("greed", 0.7)
    else:
        return multipliers.get("extremeGreed", 0.5)
```

**Estimated Time**: 2-3 hours

---

#### Fix #5: Bot Restart After Take Profit

**File**: `apps/bots/dca_executor.py`

**Fix**:
```python
elif action["action"] == "close_and_restart":
    await self.trading_engine.execute_sell(
        pair, position_pnl["total_qty"], current_price,
        reason=action["reason"]
    )
    
    # Restart bot with original capital
    if self.paper_trading and self.trading_engine:
        # Get realized profit
        realized_pnl = position_pnl["pnl_amount"]
        
        # Reset balance to original + profit
        original_balance = self.trading_engine.initial_balance
        new_balance = original_balance + realized_pnl
        
        # Reset trading engine with new balance
        self.trading_engine.base_balance = Decimal(str(new_balance))
        self.trading_engine.initial_balance = Decimal(str(new_balance))
        
        logger.info(f"Bot restarted for {pair} with new balance: ${new_balance:.2f}")
```

**Estimated Time**: 2-3 hours

---

### Phase 3: Live Trading Integration (Week 3-4)

#### Fix #6: Live Trading Implementation

**Files**: 
- `apps/bots/dca_executor.py`
- `apps/bots/bot_execution_service.py`
- New: `apps/bots/real_trading.py`

**Steps**:
1. Create `RealTradingEngine` class
2. Integrate `BinanceAuthenticatedClient`
3. Add balance checking
4. Add order execution
5. Add error handling
6. Add retry logic
7. Test with small amounts

**Estimated Time**: 1-2 weeks

---

## 📊 Progress Tracking

### Phase 1: Critical Fixes

- [x] **Fix #1**: Entry Condition Evaluation
  - [x] Import evaluator
  - [x] Add `_apply_indicators()` method
  - [x] Implement playbook evaluation
  - [x] Implement simple condition evaluation
  - [ ] Test with RSI condition
  - [ ] Test with EMA condition
  - [ ] Test with playbook
  - [ ] Test with no conditions
  - **Status**: 🟡 In Progress (Implementation Complete, Testing Pending)
  - **Completed**: November 18, 2025
  - **Notes**: Full integration with backend evaluator. Supports both simple and playbook modes.

- [x] **Fix #2**: Custom DCA Rules
  - [x] Implement custom condition evaluation
  - [ ] Test custom DCA rules
  - **Status**: 🟡 In Progress (Implementation Complete, Testing Pending)
  - **Depends On**: Fix #1 ✅
  - **Completed**: November 18, 2025
  - **Notes**: Uses same evaluator as entry conditions.

- [x] **Fix #3**: Bar-Based Cooldown
  - [x] Add timeframe to minutes mapping
  - [x] Fix cooldown calculation
  - [ ] Test with different timeframes
  - **Status**: 🟡 In Progress (Implementation Complete, Testing Pending)
  - **Completed**: November 18, 2025
  - **Notes**: Supports all common timeframes (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w).

### Phase 2: Nice-to-Have

- [ ] **Fix #4**: Fear & Greed Index
  - **Status**: 🔴 Not Started
  - **Priority**: Low

- [ ] **Fix #5**: Bot Restart After Take Profit
  - **Status**: 🔴 Not Started
  - **Priority**: Low

### Phase 3: Live Trading

- [ ] **Fix #6**: Live Trading Implementation
  - **Status**: 🔴 Not Started
  - **Priority**: High (for live trading)

---

## 🧪 Testing Plan

### Test 1: Entry Conditions

**Setup**:
- Create bot with RSI < 30 entry condition
- Start bot in paper mode
- Monitor for 24 hours

**Expected**:
- Bot should NOT enter until RSI < 30
- When RSI < 30, bot should enter
- Logs should show condition evaluation

**Test Cases**:
1. RSI condition (single)
2. EMA cross condition (single)
3. Playbook with AND logic
4. Playbook with OR logic
5. No conditions (should enter immediately)

---

### Test 2: DCA Rules

**Setup**:
- Create bot with "down_from_last_entry" rule (5%)
- Start bot
- Wait for first entry
- Monitor price drops

**Expected**:
- Bot should NOT DCA until price drops 5% from last entry
- When price drops 5%, bot should DCA
- Logs should show rule evaluation

**Test Cases**:
1. Down from last entry
2. Down from average
3. Loss by percent
4. Loss by amount
5. Custom condition (after fix)

---

### Test 3: Market Regime

**Setup**:
- Create bot with market regime enabled
- Start bot
- Monitor during bear market

**Expected**:
- Bot should pause when bear market detected
- Bot should resume when accumulation zone detected
- Logs should show regime changes

---

### Test 4: Emergency Brake

**Setup**:
- Create bot with emergency brake enabled
- Start bot
- Simulate flash crash (or wait for real one)

**Expected**:
- Bot should pause during flash crash
- Bot should resume after stabilization
- Logs should show brake triggers

---

### Test 5: Dynamic Scaling

**Setup**:
- Create bot with volatility scaling enabled
- Start bot
- Monitor during different volatility periods

**Expected**:
- DCA amount should increase in low volatility
- DCA amount should decrease in high volatility
- Logs should show scaling multipliers

---

### Test 6: Profit Taking

**Setup**:
- Create bot with profit targets
- Start bot
- Wait for profit targets

**Expected**:
- Bot should sell partial at profit targets
- Trailing stop should trigger
- Take profit and restart should work

---

### Test 7: End-to-End

**Setup**:
- Create bot with all features enabled
- Start bot in paper mode
- Monitor for 1 week

**Expected**:
- All features work together
- No errors
- Accurate P&L
- Proper logging

---

## 📚 Documentation

### Code Documentation

- [ ] Add docstrings to all methods
- [ ] Document condition evaluation flow
- [ ] Document DCA rule logic
- [ ] Document dynamic scaling calculations

### User Documentation

- [ ] Update bot creation guide
- [ ] Document entry conditions
- [ ] Document DCA rules
- [ ] Document Phase 1 features
- [ ] Create troubleshooting guide

---

## 📝 Updates Log

### November 18, 2025

**Created Agenda**
- Created comprehensive DCA bot fix agenda
- Documented all current issues
- Created fix plan
- Set up progress tracking

**Phase 1 Implementation Complete** ✅
- ✅ **Fix #1**: Entry Condition Evaluation - IMPLEMENTED
  - Integrated with `backend/evaluator.py`
  - Added `_apply_indicators()` helper method
  - Supports both simple and playbook modes
  - Handles all condition types (indicator, price, volume)
  - Proper error handling and logging
  
- ✅ **Fix #2**: Custom DCA Rules - IMPLEMENTED
  - Uses same evaluator as entry conditions
  - Fetches market data when needed
  - Full condition evaluation support
  
- ✅ **Fix #3**: Bar-Based Cooldown - IMPLEMENTED
  - Added timeframe to minutes mapping
  - Supports: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w
  - Proper conversion from bars to time

**Current Status**:
- Entry conditions: ✅ **FIXED** (needs testing)
- Custom DCA rules: ✅ **FIXED** (needs testing)
- Bar-based cooldown: ✅ **FIXED** (needs testing)
- Fear & Greed: ❌ Not implemented (low priority)
- Bot restart: ❌ Not implemented (low priority)
- Live trading: ❌ Not implemented (Phase 3)

**Next Steps**:
1. Test Fix #1 (Entry Condition Evaluation)
2. Test Fix #2 (Custom DCA Rules)
3. Test Fix #3 (Bar-Based Cooldown)
4. Update documentation
5. Move to Phase 2 (optional features)

---

## 🎯 Definition of Done

### Paper Trading Ready
- [ ] Entry conditions work correctly
- [ ] All DCA rules work
- [ ] All Phase 1 features work
- [ ] All tests pass
- [ ] Documentation complete
- [ ] No critical bugs

### Live Trading Ready
- [ ] All paper trading requirements met
- [ ] Live trading implemented
- [ ] Exchange integration tested
- [ ] Error handling complete
- [ ] Risk management verified
- [ ] Security audit passed

---

## 🔗 Related Files

- `apps/bots/dca_executor.py` - Main bot executor
- `apps/bots/paper_trading.py` - Paper trading engine
- `apps/bots/market_data.py` - Market data service
- `apps/bots/regime_detector.py` - Market regime detection
- `apps/bots/emergency_brake.py` - Emergency brake
- `apps/bots/profit_taker.py` - Profit taking
- `apps/bots/volatility_calculator.py` - Volatility calculation
- `apps/bots/support_resistance.py` - S/R detection
- `backend/evaluator.py` - Condition evaluator
- `apps/alerts/alert_manager.py` - Alert manager (for indicator calculation)

---

## 📋 Notes

- All updates to DCA bot fixes should be documented in this file
- Progress should be updated regularly
- Test results should be logged here
- Any new issues discovered should be added to "Current Issues" section

---

**This file is the single source of truth for DCA bot fixes. All updates go here!**


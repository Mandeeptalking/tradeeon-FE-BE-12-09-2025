# Entry Conditions Engine Integration Assessment

## Executive Summary

This document assesses how the `EntryConditions` component integrates with the existing central trading engine. **The evaluator engine already exists** (`backend/evaluator.py` and `apps/bots/condition_evaluator.py`), so integration is primarily about mapping the frontend `EntryCondition` format to the existing evaluator's expected format.

---

## 1. Current Architecture Overview

### Frontend Component (`EntryConditions.tsx`)
- **Location**: `apps/frontend/src/components/bots/EntryConditions.tsx`
- **Purpose**: UI for configuring entry conditions for DCA bots
- **Data Structure**: `EntryConditionsData` containing:
  - Entry type (immediate vs conditional)
  - Order type (market vs limit)
  - Array of `EntryCondition` objects
  - Logic gate (AND/OR)

### Backend Engine (`IndicatorEngine`)
- **Location**: `backend/indicator_engine/core/engine.py`
- **Purpose**: Central engine for calculating technical indicators
- **Capabilities**:
  - Real-time indicator calculations
  - WebSocket streaming
  - Ring buffer storage for kline data
  - Indicator registry system

### Backend Evaluator (`evaluator.py` & `condition_evaluator.py`)
- **Location**: `backend/evaluator.py` and `apps/bots/condition_evaluator.py`
- **Purpose**: **EXISTING** condition evaluation engine
- **Capabilities**:
  - ✅ `evaluate_condition()` - Evaluates single conditions
  - ✅ `evaluate_playbook()` - Evaluates condition playbooks with AND/OR logic
  - ✅ Supports indicator, price, and volume conditions
  - ✅ Supports operators: `>`, `<`, `>=`, `<=`, `equals`, `crosses_above`, `crosses_below`, `between`
  - ✅ CentralizedConditionEvaluator - Continuous evaluation service
  - ✅ Already integrated with DCA executor (`dca_executor._evaluate_entry_conditions()`)

### Backend API (`bots.py`)
- **Location**: `apps/api/routers/bots.py`
- **Purpose**: Bot management endpoints
- **Database**: Stores bot configs in `bots.config` JSONB field

---

## 2. Data Structure Mapping

### Frontend EntryCondition Structure
```typescript
interface EntryCondition {
  id: string;
  name: string;
  enabled: boolean;
  indicator: string;           // e.g., 'RSI', 'EMA', 'MACD'
  component?: string;          // e.g., 'rsi_line', 'macd_line'
  operator: string;            // e.g., 'crosses_below_oversold'
  period?: number;             // Indicator period
  timeframe: string;           // e.g., '1h', '4h', '1d'
  overboughtLevel?: number;   // For RSI, Stochastic, etc.
  oversoldLevel?: number;      // For RSI, Stochastic, etc.
  order?: number;              // Condition sequence order
  durationBars?: number;       // Bars condition must stay true
  // ... additional indicator-specific params
}
```

### Backend Alert Condition Structure (Existing)
```python
class Condition(BaseModel):
    id: str
    type: Literal["indicator","price","volume"]
    operator: Operator  # ">", "<", "crosses_above", etc.
    compareWith: CompareWith  # "value", "indicator_component", "price"
    compareValue: Optional[float] = None
    indicator: Optional[str] = None
    component: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    timeframe: str = "same"
```

### Mapping Strategy
The frontend `EntryCondition` is more feature-rich than the backend `Condition`. Mapping would require:

1. **Operator Translation**: Frontend uses semantic operators (`crosses_below_oversold`) while backend uses generic operators (`crosses_below`, `<`)
2. **Component Mapping**: Frontend component names need to map to backend indicator components
3. **Settings Extraction**: Frontend condition params need to be extracted into `settings` dict

---

## 3. Integration Points

### 3.1 Bot Configuration Storage

**Current State**:
- Bot configs stored in `bots.config` JSONB field
- Entry conditions would be nested under `config.entryConditions`

**Example Storage Structure**:
```json
{
  "botConfig": {
    "botName": "My DCA Bot",
    "exchange": "Binance",
    "pairs": ["BTCUSDT"]
  },
  "entryConditions": {
    "entryType": "conditional",
    "enabled": true,
    "conditions": [
      {
        "id": "condition_1",
        "indicator": "RSI",
        "component": "rsi_line",
        "operator": "crosses_below_oversold",
        "period": 14,
        "oversoldLevel": 30,
        "timeframe": "1h"
      }
    ],
    "logicGate": "AND"
  }
}
```

### 3.2 Condition Evaluation Engine

**Required Components**:

1. **Condition Evaluator Service**
   - Location: `apps/api/services/condition_evaluator.py` (to be created)
   - Purpose: Evaluate entry conditions against live market data
   - Dependencies: IndicatorEngine, Market data stream

2. **Condition Parser**
   - Converts frontend `EntryCondition` to evaluable condition format
   - Maps semantic operators to evaluation logic
   - Handles condition sequencing (order, durationBars)

3. **Real-time Evaluation Loop**
   - Subscribes to market data streams
   - Calculates indicators via IndicatorEngine
   - Evaluates conditions on each bar close
   - Triggers entry signals when conditions are met

---

## 4. Workflow Integration

### 4.1 Bot Creation Flow

```
User Configures Entry Conditions (Frontend)
    ↓
EntryConditionsData saved to bot.config.entryConditions
    ↓
Bot Created via POST /bots/dca-bots
    ↓
Backend stores config in database
    ↓
When bot starts, Condition Evaluator Service initialized
    ↓
Subscribes to market data streams for configured pairs/timeframes
    ↓
IndicatorEngine calculates required indicators
    ↓
Conditions evaluated on each bar close
    ↓
Entry signal triggered when conditions met
    ↓
Bot executes entry order
```

### 4.2 Condition Evaluation Flow

```
On Bar Close Event:
    ↓
For each enabled condition:
    ↓
1. Get indicator value from IndicatorEngine
   - Symbol: condition.pair (from bot config)
   - Timeframe: condition.timeframe
   - Indicator: condition.indicator
   - Params: Extract from condition (period, etc.)
    ↓
2. Evaluate condition operator
   - crosses_below_oversold → Check if RSI crossed below oversoldLevel
   - greater_than_ma → Check if price > MA value
   - etc.
    ↓
3. Handle condition sequencing
   - If order specified, check previous conditions
   - If durationBars specified, verify condition held for N bars
    ↓
4. Apply logic gate (AND/OR)
   - Combine all condition results
    ↓
5. Trigger entry if all conditions met
```

---

## 5. Technical Implementation Requirements

### 5.1 Existing Infrastructure ✅

**The evaluator engine already exists!** No need to build from scratch:

#### A. Core Evaluator (`backend/evaluator.py`)
- ✅ `evaluate_condition(df, row_index, condition)` - Evaluates single conditions
- ✅ `evaluate_playbook(df, playbook, condition_states)` - Evaluates playbooks with AND/OR logic
- ✅ Supports indicator, price, volume conditions
- ✅ Supports all required operators
- ✅ Handles condition sequencing and validity duration

#### B. Centralized Evaluator Service (`apps/bots/condition_evaluator.py`)
- ✅ `CentralizedConditionEvaluator` - Continuous evaluation service
- ✅ Fetches market data once per symbol/timeframe
- ✅ Calculates indicators once and reuses
- ✅ Evaluates all conditions using shared data
- ✅ Publishes trigger events to event bus

#### C. DCA Executor Integration (`apps/bots/dca_executor.py`)
- ✅ Already calls `_evaluate_entry_conditions()` 
- ✅ Uses `backend.evaluator.evaluate_playbook()`
- ✅ Handles entry condition evaluation before placing orders

### 5.2 What's Needed: Condition Format Converter

**Only missing piece**: Converter from frontend `EntryCondition` format to evaluator's expected format.

**Note**: There's already an `alert_converter.py` that converts some bot entry conditions to alert format. We need to extend this or create a similar converter for the new `EntryCondition` format.

#### Condition Parser/Converter
```python
# apps/api/services/condition_parser.py

class ConditionParser:
    @staticmethod
    def parse_entry_condition(condition: dict) -> EvaluableCondition:
        """Convert frontend EntryCondition to evaluable format"""
        # Map operator names
        # Extract indicator settings
        # Normalize component names
        # Return structured condition object
    
    @staticmethod
    def map_operator(operator: str) -> Operator:
        """Map semantic operator to backend operator"""
        mapping = {
            'crosses_below_oversold': ('crosses_below', 'value'),
            'crosses_above_overbought': ('crosses_above', 'value'),
            'greater_than_ma': ('>', 'indicator_component'),
            # ... more mappings
        }
        return mapping.get(operator)
```

### 5.2 Indicator Engine Integration

The existing `IndicatorEngine` already supports:
- ✅ Indicator calculation
- ✅ Multiple symbols/timeframes
- ✅ Real-time updates via WebSocket
- ✅ Indicator registry system

**Required Extensions**:
- Subscribe to indicator updates for condition evaluation
- Cache indicator values for condition lookups
- Support for condition-specific indicator parameters

### 5.3 Database Schema

**Current Schema** (already supports):
```sql
CREATE TABLE bots (
    bot_id TEXT PRIMARY KEY,
    config JSONB NOT NULL DEFAULT '{}',  -- Entry conditions stored here
    ...
);
```

**No schema changes needed** - entry conditions stored in `config.entryConditions` JSONB field.

---

## 6. Operator Mapping Reference

### Frontend → Backend Operator Mapping

| Frontend Operator | Backend Operator | Compare With | Notes |
|------------------|------------------|--------------|-------|
| `crosses_below_oversold` | `crosses_below` | `value` | Compare with `oversoldLevel` |
| `crosses_above_overbought` | `crosses_above` | `value` | Compare with `overboughtLevel` |
| `below_oversold` | `<` | `value` | Compare with `oversoldLevel` |
| `above_overbought` | `>` | `value` | Compare with `overboughtLevel` |
| `crosses_above_ma` | `crosses_above` | `indicator_component` | Compare with MA indicator |
| `crosses_below_ma` | `crosses_below` | `indicator_component` | Compare with MA indicator |
| `greater_than_ma` | `>` | `indicator_component` | Compare with MA indicator |
| `less_than_ma` | `<` | `indicator_component` | Compare with MA indicator |

### Indicator Component Mapping

| Frontend Component | Backend Component | Indicator |
|-------------------|-------------------|-----------|
| `rsi_line` | `RSI` | RSI |
| `macd_line` | `MACD` | MACD |
| `macd_signal` | `MACD_Signal` | MACD |
| `macd_histogram` | `MACD_Histogram` | MACD |
| `ema_line` | `EMA` | EMA |
| `sma_line` | `SMA` | SMA |

---

## 7. Condition Sequencing Logic

### Order-Based Sequencing
- Conditions with `order` property are evaluated sequentially
- Condition with `order: 1` must be true before evaluating `order: 2`
- Previous conditions must remain true (unless `durationBars` allows reset)

### Duration-Based Sequencing
- `durationBars`: Condition must remain true for N bars before next condition can be evaluated
- Example: RSI must stay below 30 for 3 bars before checking next condition

### Implementation Logic
```python
def evaluate_sequenced_conditions(conditions: List[EntryCondition], symbol: str) -> bool:
    sorted_conditions = sorted(conditions, key=lambda c: c.get('order', 999))
    condition_states = {}
    
    for condition in sorted_conditions:
        order = condition.get('order', 999)
        duration = condition.get('durationBars', 0)
        
        # Check if previous conditions are still true
        if order > 1:
            prev_order = order - 1
            if not condition_states.get(prev_order, {}).get('is_true', False):
                return False  # Previous condition not met
        
        # Evaluate current condition
        is_true = evaluate_condition(condition, symbol)
        
        # Track duration
        if is_true:
            condition_states[order] = condition_states.get(order, {})
            condition_states[order]['bars_true'] = condition_states[order].get('bars_true', 0) + 1
            condition_states[order]['is_true'] = condition_states[order]['bars_true'] >= duration
        else:
            condition_states[order] = {'bars_true': 0, 'is_true': False}
        
        if not condition_states[order]['is_true']:
            return False
    
    return True
```

---

## 8. Entry Signal Triggering

### When Conditions Are Met

1. **Condition Evaluation Service** detects all conditions are true
2. **Entry Signal** created with:
   - Bot ID
   - Symbol/Pair
   - Entry type (immediate vs conditional)
   - Order type (market vs limit)
   - Limit price (if applicable)
3. **Bot Execution Service** receives signal
4. **Order Placement**:
   - Market order: Execute immediately
   - Limit order: Place at specified price

### Signal Format
```python
@dataclass
class EntrySignal:
    bot_id: str
    symbol: str
    entry_type: str  # 'immediate' or 'conditional'
    order_type: str  # 'market' or 'limit'
    limit_price: Optional[float] = None
    limit_price_percent: Optional[float] = None
    timestamp: datetime
    condition_results: Dict[str, bool]  # Which conditions were met
```

---

## 9. Integration Challenges & Solutions

### Challenge 1: Operator Semantic Mapping
**Problem**: Frontend uses semantic operators (`crosses_below_oversold`) while backend uses generic operators (`crosses_below`)

**Solution**: Create operator mapping service that translates semantic operators to generic operators + comparison values

### Challenge 2: Real-time Evaluation Performance
**Problem**: Evaluating conditions on every bar close for multiple bots could be CPU-intensive

**Solution**: 
- Use IndicatorEngine caching
- Batch evaluate conditions for same symbol/timeframe
- Only evaluate enabled conditions
- Use async evaluation

### Challenge 3: Condition State Persistence
**Problem**: Need to track condition states across bar closes for sequencing

**Solution**: 
- Store condition states in memory (Redis or in-memory cache)
- Key: `bot_id:condition_id:state`
- Reset on condition failure or bot restart

### Challenge 4: Multi-Timeframe Support
**Problem**: Conditions can use different timeframes (1h, 4h, 1d)

**Solution**:
- Subscribe to all required timeframes via IndicatorEngine
- Evaluate conditions when their specific timeframe bar closes
- Cache results until next bar close

---

## 10. Testing Strategy

### Unit Tests
- Condition parser tests
- Operator mapping tests
- Condition evaluation logic tests
- Sequencing logic tests

### Integration Tests
- End-to-end condition evaluation with IndicatorEngine
- Multi-timeframe condition evaluation
- Entry signal triggering

### Performance Tests
- Evaluate 100+ conditions simultaneously
- Measure latency of condition evaluation
- Test with high-frequency bar closes

---

## 11. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Create ConditionEvaluator service
- [ ] Create ConditionParser service
- [ ] Implement operator mapping
- [ ] Unit tests for parsing and evaluation

### Phase 2: Indicator Engine Integration (Week 2-3)
- [ ] Integrate with IndicatorEngine
- [ ] Subscribe to market data streams
- [ ] Implement indicator value retrieval
- [ ] Test with real market data

### Phase 3: Sequencing & Logic Gates (Week 3-4)
- [ ] Implement condition sequencing
- [ ] Implement duration bars logic
- [ ] Implement AND/OR logic gates
- [ ] State persistence for conditions

### Phase 4: Entry Signal Integration (Week 4-5)
- [ ] Create entry signal format
- [ ] Integrate with bot execution service
- [ ] Handle immediate vs conditional entry
- [ ] Handle market vs limit orders

### Phase 5: Testing & Optimization (Week 5-6)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error handling and edge cases
- [ ] Documentation

---

## 12. Conclusion

The `EntryConditions` component is well-designed and provides a comprehensive UI for defining entry conditions. Integration with the existing central engine is **feasible** and requires:

1. **Condition Evaluator Service** - Core service to evaluate conditions
2. **Condition Parser** - Translate frontend format to backend format
3. **Indicator Engine Integration** - Leverage existing IndicatorEngine
4. **Entry Signal System** - Trigger bot entries when conditions met

The existing architecture (IndicatorEngine, bot storage, WebSocket streaming) provides a solid foundation. The main work is building the evaluation layer that connects the frontend conditions to the backend execution engine.

**Estimated Effort**: 1-2 weeks (much simpler since evaluator exists!)
**Complexity**: Low-Medium (mainly format conversion and operator mapping)
**Risk**: Low (evaluator already proven, just needs format adapter)

### Key Finding: Evaluator Already Exists! ✅

The system already has:
- ✅ `backend/evaluator.py` - Core evaluation functions
- ✅ `apps/bots/condition_evaluator.py` - Centralized evaluation service  
- ✅ `apps/bots/dca_executor.py` - Already uses evaluator for entry conditions
- ✅ `apps/bots/alert_converter.py` - Partial converter (needs extension)

**What's needed**: Extend `alert_converter.py` or create new converter to map frontend `EntryCondition` format to evaluator's expected format.

---

## Appendix: Example Condition Evaluation

### Example: RSI Crosses Below Oversold

**Frontend Condition**:
```json
{
  "id": "condition_1",
  "indicator": "RSI",
  "component": "rsi_line",
  "operator": "crosses_below_oversold",
  "period": 14,
  "oversoldLevel": 30,
  "timeframe": "1h"
}
```

**Evaluation Steps**:
1. Get RSI(14) value for current bar from IndicatorEngine
2. Get RSI(14) value for previous bar
3. Check if:
   - Previous bar RSI > 30 (oversoldLevel)
   - Current bar RSI <= 30 (oversoldLevel)
   - This indicates a cross below oversold level
4. Return `true` if condition met, `false` otherwise

**Backend Implementation**:
```python
def evaluate_crosses_below_oversold(condition, symbol, timeframe):
    current_rsi = indicator_engine.get_indicator_value(
        symbol, timeframe, 'RSI', {'period': condition['period']}
    )
    previous_rsi = indicator_engine.get_indicator_value(
        symbol, timeframe, 'RSI', {'period': condition['period']}, bar_offset=1
    )
    oversold_level = condition['oversoldLevel']
    
    return previous_rsi > oversold_level and current_rsi <= oversold_level
```


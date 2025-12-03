# Price Action Conditions Implementation

## Overview
This document describes the implementation of Price Action conditions in the Entry Conditions builder. Price Action conditions allow users to create trading conditions based on raw price movements, candle patterns, and price-to-price comparisons.

## TypeScript Types

### New Types Added

```typescript
export type PriceActionComponent = 'open' | 'close' | 'high' | 'low';

export type PriceActionOperator =
  // Level-based
  | 'greater_than'
  | 'less_than'
  | 'equal_to'
  | 'not_equal'
  | 'crosses_above_level'
  | 'crosses_below_level'
  // Price-to-price
  | 'crosses_above_close'
  | 'crosses_below_close'
  | 'crosses_above_high'
  | 'crosses_below_low'
  | 'close_gt_prev_close'
  | 'close_lt_prev_close'
  // Pattern-based
  | 'inside_bar'
  | 'outside_bar'
  | 'bullish_engulfing'
  | 'bearish_engulfing'
  | 'doji'
  | 'hammer'
  | 'gap_up'
  | 'gap_down'
  | 'higher_high'
  | 'higher_low'
  | 'lower_high'
  | 'lower_low';

export type PriceActionCompareWithType =
  | 'none'             // for pure patterns like inside bar / doji
  | 'value'            // static number
  | 'previous_open'
  | 'previous_close'
  | 'previous_high'
  | 'previous_low';
```

### Updated EntryCondition Interface

```typescript
export interface EntryCondition {
  // ... existing fields ...
  
  // Price Action specific fields (when indicator === "Price")
  priceField?: PriceActionComponent; // Which price field to use for price action
  priceActionOperator?: PriceActionOperator; // Price action specific operator
  priceActionCompareWith?: PriceActionCompareWithType; // What to compare price to
  compareValue?: number; // Only when compareWithType === "value"
  
  // Legacy price action fields (for backward compatibility)
  compareTo?: 'value' | 'ma' | 'price_level';
  // ... other fields ...
}
```

## UI Components

### Price Action Component Selection
When `indicator === "Price"`, the UI shows:
- **Component Dropdown**: Close Price, Open Price, High Price, Low Price
- **Operator Dropdown**: All Price Action operators organized by category
- **Compare With Dropdown** (for level-based operators): Value, Previous Open, Previous Close, Previous High, Previous Low
- **Value Input** (when Compare With = "Value"): Numeric input for price level

### Operator Categories

1. **Level-based Operators** (require Compare With):
   - Crosses Above Level
   - Crosses Below Level
   - Greater Than
   - Less Than
   - Equal To
   - Not Equal

2. **Price-to-price Operators** (no Compare With needed):
   - Crosses Above Close
   - Crosses Below Close
   - Crosses Above High
   - Crosses Below Low
   - Close > Previous Close
   - Close < Previous Close

3. **Pattern-based Operators** (no Compare With needed):
   - Inside Bar
   - Outside Bar
   - Bullish Engulfing Candle
   - Bearish Engulfing Candle
   - Doji
   - Hammer / Pin Bar
   - Gap Up
   - Gap Down
   - Higher High
   - Higher Low
   - Lower High
   - Lower Low

## Backend Integration

### Converter (`apps/bots/entry_condition_converter.py`)

The `_convert_price_action_condition` function converts frontend Price Action conditions to evaluator format:

```python
def _convert_price_action_condition(entry_condition: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert price action condition to evaluator format.
    
    Handles:
    - Pattern-based operators (inside_bar, engulfing, etc.)
    - Price-to-price operators (crosses_above_close, etc.)
    - Level-based operators (greater_than with value/previous candle)
    """
```

### Evaluator (`backend/evaluator.py`)

The evaluator handles Price Action conditions through:

1. **Pattern Detection** (`_evaluate_price_pattern_with_df`):
   - Requires access to previous candle data
   - Evaluates patterns like inside_bar, engulfing, doji, etc.

2. **Previous Candle Comparisons**:
   - Compares current price to previous candle's OHLC values
   - Handles operators like `close_gt_prev_close`

3. **Level-based Comparisons**:
   - Compares price to fixed values or previous candle components
   - Uses standard operator evaluation

## Data Flow

1. **Frontend** (`EntryConditions.tsx`):
   - User selects Indicator = "Price Action"
   - User selects Component (open/close/high/low)
   - User selects Operator
   - If level-based, user selects Compare With and optionally Value
   - Condition saved with `priceField`, `priceActionOperator`, `priceActionCompareWith`, `compareValue`

2. **Converter** (`entry_condition_converter.py`):
   - Detects `indicator === "Price"`
   - Calls `_convert_price_action_condition`
   - Maps operators and converts to evaluator format
   - Sets `type: "price"` and `patternType` for patterns

3. **Evaluator** (`evaluator.py`):
   - Detects `type === "price"`
   - For patterns: calls `_evaluate_price_pattern_with_df` with dataframe access
   - For previous candle comparisons: accesses `df.iloc[row_index - 1]`
   - For level comparisons: uses standard evaluation

## Pattern Detection Logic

### Inside Bar
```python
curr_high <= prev_high and curr_low >= prev_low
```

### Outside Bar
```python
curr_high >= prev_high and curr_low <= prev_low
```

### Bullish Engulfing
```python
prev_close < prev_open and curr_close > curr_open and 
curr_open < prev_close and curr_close > prev_open
```

### Bearish Engulfing
```python
prev_close > prev_open and curr_close < curr_open and 
curr_open > prev_close and curr_close < prev_open
```

### Doji
```python
body_size / candle_range < 0.1  # Body is < 10% of range
```

### Hammer
```python
lower_wick > (2 * body_size) and upper_wick < (0.5 * body_size)
```

### Gap Up/Down
```python
gap_up: curr_open > prev_high
gap_down: curr_open < prev_low
```

### Higher High/Low, Lower High/Low
```python
higher_high: curr_high > prev_high
higher_low: curr_low > prev_low
lower_high: curr_high < prev_high
lower_low: curr_low < prev_low
```

## Backward Compatibility

- Old Price Action conditions using `compareTo`, `value`, `maPeriod` are still supported
- The converter handles both new (`priceActionOperator`, `priceActionCompareWith`) and legacy formats
- UI defaults to new format when creating new conditions

## Testing

To test Price Action conditions:

1. **Frontend**: Create a condition with Indicator = "Price Action"
2. **Backend**: Use `test_entry_condition_integration.py` to test conversion
3. **Evaluator**: Use `test_production_integration.py` to test evaluation

## Example Condition JSON

```json
{
  "id": "price_action_1",
  "name": "Close Crosses Above 50000",
  "enabled": true,
  "indicator": "Price",
  "priceField": "close",
  "priceActionOperator": "crosses_above_level",
  "priceActionCompareWith": "value",
  "compareValue": 50000,
  "timeframe": "1h",
  "order": 1,
  "durationBars": 3
}
```

## Key Files Modified

1. `apps/frontend/src/components/bots/EntryConditions.tsx`:
   - Added Price Action types and constants
   - Added Price Action UI components
   - Updated `formatConditionDescription` for Price Action
   - Added `handleIndicatorChange` for Price Action initialization

2. `apps/bots/entry_condition_converter.py`:
   - Updated `_convert_price_action_condition` for new operators
   - Added pattern detection support
   - Added previous candle comparison support

3. `backend/evaluator.py`:
   - Added `_evaluate_price_pattern_with_df` for pattern detection
   - Added previous candle comparison handling
   - Updated `evaluate_condition` to route Price Action conditions

## Future Enhancements

- Add more pattern types (shooting star, hanging man, etc.)
- Add multi-candle patterns (three white soldiers, three black crows)
- Add support for comparing to moving averages (legacy support exists)
- Add percentage-based comparisons (e.g., "price is 5% above previous close")


# Volume Conditions Implementation

## Overview
This document describes the implementation of Volume conditions in the Entry Conditions builder. Volume conditions allow users to create trading conditions based on trading volume comparisons.

## TypeScript Types

### New Types Added

```typescript
export type VolumeOperator =
  // Level-based
  | 'greater_than'
  | 'less_than'
  | 'equal_to'
  | 'not_equal'
  | 'crosses_above_level'
  | 'crosses_below_level'
  // Volume-to-volume
  | 'crosses_above_avg'
  | 'crosses_below_avg'
  | 'volume_gt_prev_volume'
  | 'volume_lt_prev_volume'
  // Volume spike/drop
  | 'volume_spike'      // Volume > X% above average
  | 'volume_drop';      // Volume < X% below average

export type VolumeCompareWithType =
  | 'value'            // static number
  | 'avg_volume'       // moving average of volume
  | 'previous_volume'  // previous candle's volume
  | 'indicator';       // volume indicator (OBV, VWAP)
```

### Updated EntryCondition Interface

```typescript
export interface EntryCondition {
  // ... existing fields ...
  
  // Volume specific fields (when indicator === "Volume")
  volumeOperator?: VolumeOperator; // Volume specific operator
  volumeCompareWith?: VolumeCompareWithType; // What to compare volume to
  volumeCompareValue?: number; // Only when compareWith === "value"
  volumePercentage?: number; // Percentage above/below average (e.g., 150 = 150% of average, for avg_volume comparisons)
  volumePeriod?: number; // Period for average volume calculation (default: 20)
  
  // Legacy volume fields (for backward compatibility)
  compareToVolume?: 'value' | 'avg_volume' | 'previous' | 'indicator';
  // ... other fields ...
}
```

## UI Components

### Volume Condition Selection
When `indicator === "Volume"`, the UI shows:
- **Info Box**: Explains that volume conditions compare trading volume to values, averages, or previous candles
- **Operator Dropdown**: All Volume operators organized by category
- **Compare With Dropdown** (for level-based operators): Value, Average Volume, Previous Volume, Volume Indicator
- **Value Input** (when Compare With = "Value"): Numeric input for volume level
- **Average Period Input** (when Compare With = "Average Volume" or spike/drop operators): Number of bars for moving average
- **Percentage Input** (for spike/drop operators): Percentage above/below average

### Operator Categories

1. **Level-based Operators** (require Compare With):
   - Crosses Above Level
   - Crosses Below Level
   - Greater Than
   - Less Than
   - Equal To
   - Not Equal

2. **Volume-to-volume Operators** (no Compare With needed):
   - Crosses Above Average
   - Crosses Below Average
   - Volume > Previous Volume
   - Volume < Previous Volume

3. **Volume Spike/Drop Operators** (use Average Volume with percentage):
   - Volume Spike (% Above Average)
   - Volume Drop (% Below Average)

## Backend Integration

### Converter (`apps/bots/entry_condition_converter.py`)

The `_convert_volume_condition` function converts frontend Volume conditions to evaluator format:

```python
def _convert_volume_condition(entry_condition: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert volume condition to evaluator format.
    
    Handles:
    - Level-based operators (greater_than with value/avg_volume/previous_volume)
    - Volume-to-volume operators (crosses_above_avg, volume_gt_prev_volume)
    - Volume spike/drop operators (volume_spike, volume_drop with percentage)
    """
```

### Evaluator (`backend/evaluator.py`)

The evaluator handles Volume conditions through:

1. **Previous Volume Comparisons** (handled at dataframe level):
   - Compares current volume to previous candle's volume
   - Uses `df.iloc[row_index - 1]` to access previous candle

2. **Average Volume Comparisons**:
   - Calculates volume moving average using `df["volume"].rolling(window=period).mean()`
   - Handles percentage offsets for spike/drop operators

3. **Value Comparisons**:
   - Compares volume to fixed numeric values
   - Uses standard operator evaluation

## Data Flow

1. **Frontend** (`EntryConditions.tsx`):
   - User selects Indicator = "Volume"
   - User selects Operator
   - If level-based, user selects Compare With and optionally Value/Period
   - If spike/drop, user sets Average Period and Percentage
   - Condition saved with `volumeOperator`, `volumeCompareWith`, `volumeCompareValue`, `volumePercentage`, `volumePeriod`

2. **Converter** (`entry_condition_converter.py`):
   - Detects `indicator === "Volume"`
   - Calls `_convert_volume_condition`
   - Maps operators and converts to evaluator format
   - Sets `type: "volume"` and handles all comparison types

3. **Evaluator** (`evaluator.py`):
   - Detects `type === "volume"`
   - For previous volume: accesses `df.iloc[row_index - 1]` at dataframe level
   - For average volume: calculates moving average or uses pre-calculated column
   - For value comparisons: uses standard evaluation

## Volume Comparison Types

### Value Comparison
```json
{
  "type": "volume",
  "operator": ">",
  "compareWith": "value",
  "compareValue": 1000000
}
```

### Average Volume Comparison
```json
{
  "type": "volume",
  "operator": "crosses_above",
  "compareWith": "indicator_component",
  "rhs": {
    "indicator": "VOLUME_MA",
    "component": "VOLUME_MA",
    "settings": {"length": 20}
  }
}
```

### Previous Volume Comparison
```json
{
  "type": "volume",
  "operator": ">",
  "compareWith": "previous_volume"
}
```

### Volume Spike/Drop
```json
{
  "type": "volume",
  "operator": ">",
  "compareWith": "indicator_component",
  "rhs": {
    "indicator": "VOLUME_MA",
    "component": "VOLUME_MA",
    "settings": {"length": 20}
  },
  "percentage": 50  // 50% above average
}
```

## Backward Compatibility

- Old Volume conditions using `compareToVolume`, `value`, `period` are still supported
- The converter handles both new (`volumeOperator`, `volumeCompareWith`) and legacy formats
- UI defaults to new format when creating new conditions

## Example Condition JSON

```json
{
  "id": "volume_condition_1",
  "name": "Volume Spike Above Average",
  "enabled": true,
  "indicator": "Volume",
  "volumeOperator": "volume_spike",
  "volumeCompareWith": "avg_volume",
  "volumePeriod": 20,
  "volumePercentage": 50,
  "timeframe": "1h",
  "order": 1,
  "durationBars": 3
}
```

## Key Files Modified

1. `apps/frontend/src/components/bots/EntryConditions.tsx`:
   - Added Volume types and constants
   - Added Volume UI components
   - Updated `formatConditionDescription` for Volume
   - Updated `handleIndicatorChange` for Volume initialization

2. `apps/bots/entry_condition_converter.py`:
   - Updated `_convert_volume_condition` for new operators
   - Added spike/drop operator support
   - Added previous volume comparison support

3. `backend/evaluator.py`:
   - Already handles previous volume at dataframe level
   - Already handles volume MA calculations
   - Already handles percentage offsets

## Testing

To test Volume conditions:

1. **Frontend**: Create a condition with Indicator = "Volume"
2. **Backend**: Use `test_entry_condition_integration.py` to test conversion
3. **Evaluator**: Use `test_production_integration.py` to test evaluation

## Future Enhancements

- Add volume trend detection (increasing/decreasing volume over N bars)
- Add volume divergence detection (price vs volume divergence)
- Add support for volume-weighted indicators (VWAP integration)
- Add volume profile support (volume at price levels)


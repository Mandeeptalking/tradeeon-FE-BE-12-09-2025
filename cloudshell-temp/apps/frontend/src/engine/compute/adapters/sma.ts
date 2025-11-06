import { IndicatorSpec } from '../../../contracts/indicator';
import { IndicatorComputeAdapter, ComputeState } from '../registry';
import { rollingMean } from '../math/rolling';
import { getSourceValue, createWarmupArray, createIndicatorPoint, validateIndicatorParams } from '../math/utils';

/**
 * SMA (Simple Moving Average) compute adapter
 */
export class SMAAdapter implements IndicatorComputeAdapter {
  key = 'SMA' as const;
  
  warmup(spec: IndicatorSpec): number {
    const period = spec.inputs.period as number;
    return period - 1; // First valid value at index period-1
  }
  
  dependencies(spec: IndicatorSpec): any[] {
    return []; // SMA has no dependencies
  }
  
  batch(spec: IndicatorSpec, candles: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>): Array<{
    t: number;
    values: Record<string, number | null>;
    status: 'partial' | 'final';
  }> {
    const validation = validateIndicatorParams(spec.inputs, ['period', 'source']);
    if (!validation.valid) {
      throw new Error(`SMA validation failed: missing ${validation.missing.join(', ')}`);
    }
    
    const period = spec.inputs.period as number;
    const source = spec.inputs.source as string;
    
    // Extract source values
    const sourceValues = candles.map(candle => getSourceValue(candle, source));
    
    // Calculate rolling mean
    const smaValues = rollingMean(sourceValues, period);
    
    // Create points with warmup nulls
    const points = candles.map((candle, index) => {
      const smaValue = smaValues[index];
      const values: Record<string, number | null> = {
        sma: isNaN(smaValue) ? null : smaValue
      };
      
      return createIndicatorPoint(candle.t, values, 'final');
    });
    
    return points;
  }
  
  incremental(
    spec: IndicatorSpec,
    prevState: ComputeState,
    barUpdate: {
      t: number;
      o: number;
      h: number;
      l: number;
      c: number;
      v: number;
      isPartial: boolean;
    }
  ): {
    pointsDelta: Array<{
      t: number;
      values: Record<string, number | null>;
      status: 'partial' | 'final';
    }>;
    nextState: ComputeState;
  } {
    const period = spec.inputs.period as number;
    const source = spec.inputs.source as string;
    const sourceValue = getSourceValue(barUpdate, source);
    
    // Initialize state if needed
    const state = { ...prevState };
    if (!state.rollingSums) {
      state.rollingSums = {};
    }
    
    const sumKey = `sma_${period}`;
    const valuesKey = `sma_values_${period}`;
    
    // Initialize rolling sum if needed
    if (!state.rollingSums[sumKey]) {
      state.rollingSums[sumKey] = 0;
    }
    if (!state[valuesKey]) {
      state[valuesKey] = [];
    }
    
    const values = state[valuesKey] as number[];
    
    // Add new value
    values.push(sourceValue);
    state.rollingSums[sumKey] += sourceValue;
    
    // Remove old value if window is full
    if (values.length > period) {
      const oldValue = values.shift()!;
      state.rollingSums[sumKey] -= oldValue;
    }
    
    // Calculate SMA
    let smaValue: number | null = null;
    if (values.length >= period) {
      smaValue = state.rollingSums[sumKey] / period;
    }
    
    // Update state
    state.lastPartialValues = { sma: smaValue };
    if (!barUpdate.isPartial) {
      state.lastFinalizedIndex = state.lastFinalizedIndex + 1;
    }
    
    // Create point
    const point = createIndicatorPoint(
      barUpdate.t,
      { sma: smaValue },
      barUpdate.isPartial ? 'partial' : 'final'
    );
    
    return {
      pointsDelta: [point],
      nextState: state
    };
  }
}

/**
 * Create SMA adapter instance
 */
export function createSMAAdapter(): SMAAdapter {
  return new SMAAdapter();
}


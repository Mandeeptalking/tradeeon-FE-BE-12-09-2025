import { IndicatorSpec } from '../../../contracts/indicator';
import { IndicatorComputeAdapter, ComputeState } from '../registry';
import { calculateEMAAlpha, calculateEMA, calculateSMA } from '../math/smoothing';
import { getSourceValue, createIndicatorPoint, validateIndicatorParams } from '../math/utils';

/**
 * EMA (Exponential Moving Average) compute adapter
 */
export class EMAAdapter implements IndicatorComputeAdapter {
  key = 'EMA' as const;
  
  warmup(spec: IndicatorSpec): number {
    const period = spec.inputs.period as number;
    return period - 1; // First valid value at index period-1
  }
  
  dependencies(spec: IndicatorSpec): any[] {
    return []; // EMA has no dependencies
  }
  
  batch(spec: IndicatorSpec, candles: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>): Array<{
    t: number;
    values: Record<string, number | null>;
    status: 'partial' | 'final';
  }> {
    const validation = validateIndicatorParams(spec.inputs, ['period', 'source']);
    if (!validation.valid) {
      throw new Error(`EMA validation failed: missing ${validation.missing.join(', ')}`);
    }
    
    const period = spec.inputs.period as number;
    const source = spec.inputs.source as string;
    const alpha = calculateEMAAlpha(period);
    
    // Extract source values
    const sourceValues = candles.map(candle => getSourceValue(candle, source));
    
    // Calculate EMA values
    const emaValues: (number | null)[] = [];
    let ema: number | null = null;
    
    for (let i = 0; i < sourceValues.length; i++) {
      if (i < period - 1) {
        // Warmup period - null values
        emaValues.push(null);
      } else if (i === period - 1) {
        // Seed EMA with SMA of first period values
        const smaSeed = calculateSMA(sourceValues.slice(0, period), period);
        ema = smaSeed;
        emaValues.push(ema);
      } else {
        // Calculate EMA using previous value
        if (ema !== null) {
          ema = calculateEMA(sourceValues[i], ema, alpha);
          emaValues.push(ema);
        } else {
          emaValues.push(null);
        }
      }
    }
    
    // Create points
    const points = candles.map((candle, index) => {
      const emaValue = emaValues[index];
      const values: Record<string, number | null> = {
        ema: emaValue
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
    const alpha = calculateEMAAlpha(period);
    const sourceValue = getSourceValue(barUpdate, source);
    
    // Initialize state if needed
    const state = { ...prevState };
    if (!state.emaSeeds) {
      state.emaSeeds = {};
    }
    if (!state.lastPartialValues) {
      state.lastPartialValues = {};
    }
    
    const emaKey = `ema_${period}`;
    const valuesKey = `ema_values_${period}`;
    
    // Initialize if needed
    if (!state.emaSeeds[emaKey]) {
      state.emaSeeds[emaKey] = null;
    }
    if (!state[valuesKey]) {
      state[valuesKey] = [];
    }
    
    const values = state[valuesKey] as number[];
    let currentEMA = state.emaSeeds[emaKey];
    
    // Add new value
    values.push(sourceValue);
    
    // Calculate EMA
    let emaValue: number | null = null;
    
    if (values.length < period) {
      // Still in warmup period
      emaValue = null;
    } else if (values.length === period) {
      // First valid EMA - seed with SMA
      const smaSeed = calculateSMA(values, period);
      currentEMA = smaSeed;
      emaValue = currentEMA;
      state.emaSeeds[emaKey] = currentEMA;
    } else {
      // Calculate EMA using previous value
      if (currentEMA !== null) {
        currentEMA = calculateEMA(sourceValue, currentEMA, alpha);
        emaValue = currentEMA;
        state.emaSeeds[emaKey] = currentEMA;
      }
    }
    
    // Update state
    state.lastPartialValues = { ema: emaValue };
    if (!barUpdate.isPartial) {
      state.lastFinalizedIndex = state.lastFinalizedIndex + 1;
    }
    
    // Create point
    const point = createIndicatorPoint(
      barUpdate.t,
      { ema: emaValue },
      barUpdate.isPartial ? 'partial' : 'final'
    );
    
    return {
      pointsDelta: [point],
      nextState: state
    };
  }
}

/**
 * Create EMA adapter instance
 */
export function createEMAAdapter(): EMAAdapter {
  return new EMAAdapter();
}


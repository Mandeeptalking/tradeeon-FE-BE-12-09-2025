import { IndicatorSpec } from '../../../contracts/indicator';
import { IndicatorComputeAdapter, ComputeState } from '../registry';
import { calculateGainsLosses } from '../math/rolling';
import { calculateWilderSmoothing, calculateRSI, calculateRelativeStrength, calculateMean } from '../math/smoothing';
import { getSourceValue, createIndicatorPoint, validateIndicatorParams } from '../math/utils';

/**
 * RSI (Relative Strength Index) with Wilder's smoothing compute adapter
 */
export class RSIWilderAdapter implements IndicatorComputeAdapter {
  key = 'RSI' as const;
  
  warmup(spec: IndicatorSpec): number {
    const period = spec.inputs.period as number;
    return period; // First valid value at index period
  }
  
  dependencies(spec: IndicatorSpec): any[] {
    return []; // RSI has no dependencies
  }
  
  batch(spec: IndicatorSpec, candles: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>): Array<{
    t: number;
    values: Record<string, number | null>;
    status: 'partial' | 'final';
  }> {
    const validation = validateIndicatorParams(spec.inputs, ['period', 'source']);
    if (!validation.valid) {
      throw new Error(`RSI validation failed: missing ${validation.missing.join(', ')}`);
    }
    
    const period = spec.inputs.period as number;
    const source = spec.inputs.source as string;
    
    // Extract source values
    const sourceValues = candles.map(candle => getSourceValue(candle, source));
    
    // Calculate gains and losses
    const { gains, losses } = calculateGainsLosses(sourceValues);
    
    // Calculate RSI values
    const rsiValues: (number | null)[] = [];
    let avgGain: number | null = null;
    let avgLoss: number | null = null;
    
    for (let i = 0; i < candles.length; i++) {
      if (i < period) {
        // Warmup period - null values
        rsiValues.push(null);
      } else if (i === period) {
        // First valid RSI - seed with arithmetic averages
        const gainSlice = gains.slice(1, period + 1); // Skip first 0
        const lossSlice = losses.slice(1, period + 1); // Skip first 0
        
        avgGain = calculateMean(gainSlice);
        avgLoss = calculateMean(lossSlice);
        
        if (avgGain === null || avgLoss === null) {
          rsiValues.push(null);
        } else {
          const rs = calculateRelativeStrength(avgGain, avgLoss);
          const rsi = calculateRSI(rs);
          rsiValues.push(rsi);
        }
      } else {
        // Apply Wilder's smoothing
        if (avgGain !== null && avgLoss !== null) {
          avgGain = calculateWilderSmoothing(gains[i], avgGain, period);
          avgLoss = calculateWilderSmoothing(losses[i], avgLoss, period);
          
          const rs = calculateRelativeStrength(avgGain, avgLoss);
          const rsi = calculateRSI(rs);
          rsiValues.push(rsi);
        } else {
          rsiValues.push(null);
        }
      }
    }
    
    // Create points
    const points = candles.map((candle, index) => {
      const rsiValue = rsiValues[index];
      const values: Record<string, number | null> = {
        rsi: rsiValue
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
    if (!state.rsiSmoothedGains) {
      state.rsiSmoothedGains = {};
    }
    if (!state.rsiSmoothedLosses) {
      state.rsiSmoothedLosses = {};
    }
    if (!state.lastPartialValues) {
      state.lastPartialValues = {};
    }
    
    const gainKey = `rsi_gain_${period}`;
    const lossKey = `rsi_loss_${period}`;
    const valuesKey = `rsi_values_${period}`;
    const prevValuesKey = `rsi_prev_values_${period}`;
    
    // Initialize if needed
    if (!state.rsiSmoothedGains[gainKey]) {
      state.rsiSmoothedGains[gainKey] = null;
    }
    if (!state.rsiSmoothedLosses[lossKey]) {
      state.rsiSmoothedLosses[lossKey] = null;
    }
    if (!state[valuesKey]) {
      state[valuesKey] = [];
    }
    if (!state[prevValuesKey]) {
      state[prevValuesKey] = null;
    }
    
    const values = state[valuesKey] as number[];
    const prevValue = state[prevValuesKey] as number | null;
    
    // Add new value
    values.push(sourceValue);
    
    // Calculate gain/loss
    let gain = 0;
    let loss = 0;
    
    if (prevValue !== null) {
      const change = sourceValue - prevValue;
      gain = change > 0 ? change : 0;
      loss = change < 0 ? Math.abs(change) : 0;
    }
    
    // Calculate RSI
    let rsiValue: number | null = null;
    let avgGain = state.rsiSmoothedGains[gainKey];
    let avgLoss = state.rsiSmoothedLosses[lossKey];
    
    if (values.length < period) {
      // Still in warmup period
      rsiValue = null;
    } else if (values.length === period) {
      // First valid RSI - seed with arithmetic averages
      const gains: number[] = [];
      const losses: number[] = [];
      
      for (let i = 1; i < values.length; i++) {
        const change = values[i] - values[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
      }
      
      avgGain = calculateMean(gains);
      avgLoss = calculateMean(losses);
      
      if (avgGain !== null && avgLoss !== null) {
        const rs = calculateRelativeStrength(avgGain, avgLoss);
        rsiValue = calculateRSI(rs);
      }
    } else {
      // Apply Wilder's smoothing
      if (avgGain !== null && avgLoss !== null) {
        avgGain = calculateWilderSmoothing(gain, avgGain, period);
        avgLoss = calculateWilderSmoothing(loss, avgLoss, period);
        
        const rs = calculateRelativeStrength(avgGain, avgLoss);
        rsiValue = calculateRSI(rs);
      }
    }
    
    // Update state
    state.rsiSmoothedGains[gainKey] = avgGain;
    state.rsiSmoothedLosses[lossKey] = avgLoss;
    state[prevValuesKey] = sourceValue;
    state.lastPartialValues = { rsi: rsiValue };
    
    if (!barUpdate.isPartial) {
      state.lastFinalizedIndex = state.lastFinalizedIndex + 1;
    }
    
    // Create point
    const point = createIndicatorPoint(
      barUpdate.t,
      { rsi: rsiValue },
      barUpdate.isPartial ? 'partial' : 'final'
    );
    
    return {
      pointsDelta: [point],
      nextState: state
    };
  }
}

/**
 * Create RSI Wilder adapter instance
 */
export function createRSIWilderAdapter(): RSIWilderAdapter {
  return new RSIWilderAdapter();
}


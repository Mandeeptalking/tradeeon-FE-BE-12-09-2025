import { IndicatorSpec } from '../../../contracts/indicator';
import { IndicatorComputeAdapter, ComputeState } from '../registry';
import { rollingMean, rollingVariance, createRollingVarianceState, updateRollingVariance } from '../math/rolling';
import { getSourceValue, createIndicatorPoint, validateIndicatorParams } from '../math/utils';

/**
 * Bollinger Bands compute adapter
 */
export class BollingerBandsAdapter implements IndicatorComputeAdapter {
  key = 'BB' as const;
  
  warmup(spec: IndicatorSpec): number {
    const period = (spec.inputs.period as number) || 20;
    return period - 1; // First valid value at index period-1
  }
  
  dependencies(spec: IndicatorSpec): any[] {
    return []; // Bollinger Bands has no dependencies
  }
  
  batch(spec: IndicatorSpec, candles: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>): Array<{
    t: number;
    values: Record<string, number | null>;
    status: 'partial' | 'final';
  }> {
    const validation = validateIndicatorParams(spec.inputs, ['period', 'k', 'source']);
    if (!validation.valid) {
      throw new Error(`Bollinger Bands validation failed: missing ${validation.missing.join(', ')}`);
    }
    
    const period = (spec.inputs.period as number) || 20;
    const k = (spec.inputs.k as number) || 2;
    const source = (spec.inputs.source as string) || 'close';
    
    // Extract source values
    const sourceValues = candles.map(candle => getSourceValue(candle, source));
    
    // Calculate rolling mean and variance
    const meanValues = rollingMean(sourceValues, period);
    const varianceValues = rollingVariance(sourceValues, period);
    
    // Calculate Bollinger Bands
    const upperValues: (number | null)[] = [];
    const middleValues: (number | null)[] = [];
    const lowerValues: (number | null)[] = [];
    
    for (let i = 0; i < sourceValues.length; i++) {
      const mean = meanValues[i];
      const variance = varianceValues[i];
      
      if (isNaN(mean) || isNaN(variance)) {
        upperValues.push(null);
        middleValues.push(null);
        lowerValues.push(null);
      } else {
        const stdDev = Math.sqrt(variance);
        const upper = mean + (k * stdDev);
        const lower = mean - (k * stdDev);
        
        upperValues.push(upper);
        middleValues.push(mean);
        lowerValues.push(lower);
      }
    }
    
    // Create points
    const points = candles.map((candle, index) => {
      const values: Record<string, number | null> = {
        bb_upper: upperValues[index],
        bb_middle: middleValues[index],
        bb_lower: lowerValues[index]
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
    const period = (spec.inputs.period as number) || 20;
    const k = (spec.inputs.k as number) || 2;
    const source = (spec.inputs.source as string) || 'close';
    const sourceValue = getSourceValue(barUpdate, source);
    
    // Initialize state if needed
    const state = { ...prevState };
    if (!state.bbVarianceState) {
      state.bbVarianceState = {};
    }
    if (!state.lastPartialValues) {
      state.lastPartialValues = {};
    }
    
    const varianceKey = `bb_variance_${period}`;
    const valuesKey = `bb_values_${period}`;
    
    // Initialize variance state if needed
    if (!state.bbVarianceState[varianceKey]) {
      state.bbVarianceState[varianceKey] = createRollingVarianceState(period);
    }
    
    // Initialize values array if needed
    if (!state[valuesKey]) {
      state[valuesKey] = [];
    }
    
    const values = state[valuesKey] as number[];
    values.push(sourceValue);
    
    // Update rolling variance
    const varianceState = state.bbVarianceState[varianceKey];
    const variance = updateRollingVariance(varianceState, sourceValue);
    
    // Calculate Bollinger Bands
    let upperValue: number | null = null;
    let middleValue: number | null = null;
    let lowerValue: number | null = null;
    
    if (variance !== null) {
      // Calculate mean
      const sum = values.slice(-period).reduce((acc, val) => acc + val, 0);
      const mean = sum / period;
      
      // Calculate standard deviation
      const stdDev = Math.sqrt(variance);
      
      // Calculate bands
      upperValue = mean + (k * stdDev);
      middleValue = mean;
      lowerValue = mean - (k * stdDev);
    }
    
    // Update state
    state.lastPartialValues = {
      bb_upper: upperValue,
      bb_middle: middleValue,
      bb_lower: lowerValue
    };
    
    if (!barUpdate.isPartial) {
      state.lastFinalizedIndex = state.lastFinalizedIndex + 1;
    }
    
    // Create point
    const point = createIndicatorPoint(
      barUpdate.t,
      {
        bb_upper: upperValue,
        bb_middle: middleValue,
        bb_lower: lowerValue
      },
      barUpdate.isPartial ? 'partial' : 'final'
    );
    
    return {
      pointsDelta: [point],
      nextState: state
    };
  }
}

/**
 * Create Bollinger Bands adapter instance
 */
export function createBollingerBandsAdapter(): BollingerBandsAdapter {
  return new BollingerBandsAdapter();
}


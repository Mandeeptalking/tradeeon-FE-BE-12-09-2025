import { IndicatorSpec } from '../../../contracts/indicator';
import { IndicatorComputeAdapter, ComputeState, CanonicalSpec } from '../registry';
import { calculateEMAAlpha, calculateEMA } from '../math/smoothing';
import { getSourceValue, createIndicatorPoint, validateIndicatorParams, createCanonicalId } from '../math/utils';

/**
 * MACD (Moving Average Convergence Divergence) compute adapter
 */
export class MACDAdapter implements IndicatorComputeAdapter {
  key = 'MACD' as const;
  
  warmup(spec: IndicatorSpec): number {
    const fast = (spec.inputs.fast as number) || 12;
    const slow = (spec.inputs.slow as number) || 26;
    const signal = (spec.inputs.signal as number) || 9;
    
    // MACD warmup is the maximum of all EMA warmups
    return Math.max(fast - 1, slow - 1, signal - 1);
  }
  
  dependencies(spec: IndicatorSpec): CanonicalSpec[] {
    const fast = (spec.inputs.fast as number) || 12;
    const slow = (spec.inputs.slow as number) || 26;
    const signal = (spec.inputs.signal as number) || 9;
    const source = (spec.inputs.source as string) || 'close';
    const timeframe = spec.timeframe;
    
    // MACD depends on three EMAs
    return [
      {
        id: createCanonicalId('EMA', { period: fast, source }, timeframe),
        name: 'EMA',
        inputs: { period: fast, source },
        timeframe
      },
      {
        id: createCanonicalId('EMA', { period: slow, source }, timeframe),
        name: 'EMA',
        inputs: { period: slow, source },
        timeframe
      },
      {
        id: createCanonicalId('EMA', { period: signal, source: 'macd' }, timeframe),
        name: 'EMA',
        inputs: { period: signal, source: 'macd' },
        timeframe
      }
    ];
  }
  
  batch(spec: IndicatorSpec, candles: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>): Array<{
    t: number;
    values: Record<string, number | null>;
    status: 'partial' | 'final';
  }> {
    const validation = validateIndicatorParams(spec.inputs, ['fast', 'slow', 'signal', 'source']);
    if (!validation.valid) {
      throw new Error(`MACD validation failed: missing ${validation.missing.join(', ')}`);
    }
    
    const fast = (spec.inputs.fast as number) || 12;
    const slow = (spec.inputs.slow as number) || 26;
    const signal = (spec.inputs.signal as number) || 9;
    const source = (spec.inputs.source as string) || 'close';
    
    // Calculate EMAs
    const { emaFast, emaSlow } = this.calculateEMAs(candles, fast, slow, source);
    
    // Calculate MACD line
    const macdLine = this.calculateMACDLine(emaFast, emaSlow);
    
    // Calculate signal line (EMA of MACD)
    const signalLine = this.calculateSignalLine(macdLine, signal);
    
    // Calculate histogram
    const histogram = this.calculateHistogram(macdLine, signalLine);
    
    // Create points
    const points = candles.map((candle, index) => {
      const values: Record<string, number | null> = {
        macd: macdLine[index],
        signal: signalLine[index],
        hist: histogram[index]
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
    const fast = (spec.inputs.fast as number) || 12;
    const slow = (spec.inputs.slow as number) || 26;
    const signal = (spec.inputs.signal as number) || 9;
    const source = (spec.inputs.source as string) || 'close';
    const sourceValue = getSourceValue(barUpdate, source);
    
    // Initialize state if needed
    const state = { ...prevState };
    if (!state.emaSeeds) {
      state.emaSeeds = {};
    }
    if (!state.lastPartialValues) {
      state.lastPartialValues = {};
    }
    
    // Update EMAs
    const { emaFast, emaSlow } = this.updateEMAs(state, sourceValue, fast, slow, source);
    
    // Calculate MACD line
    const macdValue = this.calculateMACDValue(emaFast, emaSlow);
    
    // Update signal line
    const signalValue = this.updateSignalLine(state, macdValue, signal);
    
    // Calculate histogram
    const histValue = this.calculateHistogramValue(macdValue, signalValue);
    
    // Update state
    state.lastPartialValues = {
      macd: macdValue,
      signal: signalValue,
      hist: histValue
    };
    
    if (!barUpdate.isPartial) {
      state.lastFinalizedIndex = state.lastFinalizedIndex + 1;
    }
    
    // Create point
    const point = createIndicatorPoint(
      barUpdate.t,
      {
        macd: macdValue,
        signal: signalValue,
        hist: histValue
      },
      barUpdate.isPartial ? 'partial' : 'final'
    );
    
    return {
      pointsDelta: [point],
      nextState: state
    };
  }
  
  private calculateEMAs(candles: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>, fast: number, slow: number, source: string): { emaFast: (number | null)[]; emaSlow: (number | null)[] } {
    const sourceValues = candles.map(candle => getSourceValue(candle, source));
    const alphaFast = calculateEMAAlpha(fast);
    const alphaSlow = calculateEMAAlpha(slow);
    
    const emaFast: (number | null)[] = [];
    const emaSlow: (number | null)[] = [];
    
    let emaFastValue: number | null = null;
    let emaSlowValue: number | null = null;
    
    for (let i = 0; i < sourceValues.length; i++) {
      // Fast EMA
      if (i < fast - 1) {
        emaFast.push(null);
      } else if (i === fast - 1) {
        // Seed with SMA
        const smaSeed = sourceValues.slice(0, fast).reduce((sum, val) => sum + val, 0) / fast;
        emaFastValue = smaSeed;
        emaFast.push(emaFastValue);
      } else {
        emaFastValue = calculateEMA(sourceValues[i], emaFastValue!, alphaFast);
        emaFast.push(emaFastValue);
      }
      
      // Slow EMA
      if (i < slow - 1) {
        emaSlow.push(null);
      } else if (i === slow - 1) {
        // Seed with SMA
        const smaSeed = sourceValues.slice(0, slow).reduce((sum, val) => sum + val, 0) / slow;
        emaSlowValue = smaSeed;
        emaSlow.push(emaSlowValue);
      } else {
        emaSlowValue = calculateEMA(sourceValues[i], emaSlowValue!, alphaSlow);
        emaSlow.push(emaSlowValue);
      }
    }
    
    return { emaFast, emaSlow };
  }
  
  private calculateMACDLine(emaFast: (number | null)[], emaSlow: (number | null)[]): (number | null)[] {
    return emaFast.map((fast, index) => {
      const slow = emaSlow[index];
      if (fast === null || slow === null) {
        return null;
      }
      return fast - slow;
    });
  }
  
  private calculateSignalLine(macdLine: (number | null)[], signal: number): (number | null)[] {
    const alpha = calculateEMAAlpha(signal);
    const signalLine: (number | null)[] = [];
    let signalValue: number | null = null;
    
    for (let i = 0; i < macdLine.length; i++) {
      if (macdLine[i] === null) {
        signalLine.push(null);
      } else if (signalValue === null) {
        // Find first valid MACD value to seed signal
        const validMacdValues = macdLine.slice(0, i + 1).filter(val => val !== null) as number[];
        if (validMacdValues.length >= signal) {
          const smaSeed = validMacdValues.slice(-signal).reduce((sum, val) => sum + val, 0) / signal;
          signalValue = smaSeed;
          signalLine.push(signalValue);
        } else {
          signalLine.push(null);
        }
      } else {
        signalValue = calculateEMA(macdLine[i]!, signalValue, alpha);
        signalLine.push(signalValue);
      }
    }
    
    return signalLine;
  }
  
  private calculateHistogram(macdLine: (number | null)[], signalLine: (number | null)[]): (number | null)[] {
    return macdLine.map((macd, index) => {
      const signal = signalLine[index];
      if (macd === null || signal === null) {
        return null;
      }
      return macd - signal;
    });
  }
  
  private updateEMAs(state: ComputeState, sourceValue: number, fast: number, slow: number, source: string): { emaFast: number | null; emaSlow: number | null } {
    const fastKey = `ema_${fast}_${source}`;
    const slowKey = `ema_${slow}_${source}`;
    const valuesKey = `macd_values_${source}`;
    
    // Initialize if needed
    if (!state.emaSeeds[fastKey]) {
      state.emaSeeds[fastKey] = null;
    }
    if (!state.emaSeeds[slowKey]) {
      state.emaSeeds[slowKey] = null;
    }
    if (!state[valuesKey]) {
      state[valuesKey] = [];
    }
    
    const values = state[valuesKey] as number[];
    values.push(sourceValue);
    
    const alphaFast = calculateEMAAlpha(fast);
    const alphaSlow = calculateEMAAlpha(slow);
    
    let emaFast = state.emaSeeds[fastKey];
    let emaSlow = state.emaSeeds[slowKey];
    
    // Update fast EMA
    if (values.length < fast) {
      emaFast = null;
    } else if (values.length === fast) {
      emaFast = values.slice(-fast).reduce((sum, val) => sum + val, 0) / fast;
    } else {
      emaFast = calculateEMA(sourceValue, emaFast!, alphaFast);
    }
    
    // Update slow EMA
    if (values.length < slow) {
      emaSlow = null;
    } else if (values.length === slow) {
      emaSlow = values.slice(-slow).reduce((sum, val) => sum + val, 0) / slow;
    } else {
      emaSlow = calculateEMA(sourceValue, emaSlow!, alphaSlow);
    }
    
    state.emaSeeds[fastKey] = emaFast;
    state.emaSeeds[slowKey] = emaSlow;
    
    return { emaFast, emaSlow };
  }
  
  private calculateMACDValue(emaFast: number | null, emaSlow: number | null): number | null {
    if (emaFast === null || emaSlow === null) {
      return null;
    }
    return emaFast - emaSlow;
  }
  
  private updateSignalLine(state: ComputeState, macdValue: number | null, signal: number): number | null {
    if (macdValue === null) {
      return null;
    }
    
    const signalKey = `ema_${signal}_macd`;
    const macdValuesKey = `macd_line_values`;
    
    // Initialize if needed
    if (!state.emaSeeds[signalKey]) {
      state.emaSeeds[signalKey] = null;
    }
    if (!state[macdValuesKey]) {
      state[macdValuesKey] = [];
    }
    
    const macdValues = state[macdValuesKey] as number[];
    macdValues.push(macdValue);
    
    const alpha = calculateEMAAlpha(signal);
    let signalValue = state.emaSeeds[signalKey];
    
    if (macdValues.length < signal) {
      signalValue = null;
    } else if (macdValues.length === signal) {
      signalValue = macdValues.slice(-signal).reduce((sum, val) => sum + val, 0) / signal;
    } else {
      signalValue = calculateEMA(macdValue, signalValue!, alpha);
    }
    
    state.emaSeeds[signalKey] = signalValue;
    return signalValue;
  }
  
  private calculateHistogramValue(macdValue: number | null, signalValue: number | null): number | null {
    if (macdValue === null || signalValue === null) {
      return null;
    }
    return macdValue - signalValue;
  }
}

/**
 * Create MACD adapter instance
 */
export function createMACDAdapter(): MACDAdapter {
  return new MACDAdapter();
}


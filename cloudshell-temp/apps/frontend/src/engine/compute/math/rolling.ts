/**
 * Rolling sum calculation
 */
export function rollingSum(values: number[], window: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      sum += values[j];
    }
    result.push(sum);
  }
  
  return result;
}

/**
 * Rolling mean calculation
 */
export function rollingMean(values: number[], window: number): number[] {
  const sums = rollingSum(values, window);
  return sums.map(sum => isNaN(sum) ? NaN : sum / window);
}

/**
 * Rolling variance calculation (population variance, ddof=0)
 */
export function rollingVariance(values: number[], window: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
      continue;
    }
    
    // Calculate mean for this window
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      sum += values[j];
    }
    const mean = sum / window;
    
    // Calculate variance
    let variance = 0;
    for (let j = i - window + 1; j <= i; j++) {
      variance += Math.pow(values[j] - mean, 2);
    }
    variance /= window; // Population variance (ddof=0)
    
    result.push(variance);
  }
  
  return result;
}

/**
 * Rolling standard deviation calculation
 */
export function rollingStdDev(values: number[], window: number): number[] {
  const variances = rollingVariance(values, window);
  return variances.map(variance => isNaN(variance) ? NaN : Math.sqrt(variance));
}

/**
 * Incremental rolling sum state
 */
export interface RollingSumState {
  sum: number;
  window: number;
  values: number[];
  index: number;
}

/**
 * Create initial rolling sum state
 */
export function createRollingSumState(window: number): RollingSumState {
  return {
    sum: 0,
    window,
    values: [],
    index: 0
  };
}

/**
 * Update rolling sum with new value
 */
export function updateRollingSum(state: RollingSumState, value: number): number | null {
  // Add new value
  state.values.push(value);
  state.sum += value;
  state.index++;
  
  // Remove old value if window is full
  if (state.values.length > state.window) {
    const oldValue = state.values.shift()!;
    state.sum -= oldValue;
  }
  
  // Return sum only if window is full
  return state.values.length >= state.window ? state.sum : null;
}

/**
 * Incremental rolling variance state
 */
export interface RollingVarianceState {
  sum: number;
  sumSquares: number;
  count: number;
  window: number;
  values: number[];
}

/**
 * Create initial rolling variance state
 */
export function createRollingVarianceState(window: number): RollingVarianceState {
  return {
    sum: 0,
    sumSquares: 0,
    count: 0,
    window,
    values: []
  };
}

/**
 * Update rolling variance with new value
 */
export function updateRollingVariance(state: RollingVarianceState, value: number): number | null {
  // Add new value
  state.values.push(value);
  state.sum += value;
  state.sumSquares += value * value;
  state.count++;
  
  // Remove old value if window is full
  if (state.values.length > state.window) {
    const oldValue = state.values.shift()!;
    state.sum -= oldValue;
    state.sumSquares -= oldValue * oldValue;
    state.count--;
  }
  
  // Return variance only if window is full
  if (state.count < state.window) {
    return null;
  }
  
  const mean = state.sum / state.count;
  const variance = (state.sumSquares / state.count) - (mean * mean);
  return variance;
}

/**
 * Calculate gains and losses for RSI
 */
export function calculateGainsLosses(values: number[]): { gains: number[]; losses: number[] } {
  const gains: number[] = [0]; // First value has no change
  const losses: number[] = [0];
  
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  return { gains, losses };
}


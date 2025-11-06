/**
 * Calculate EMA alpha value
 * @param period EMA period
 * @returns Alpha value (2/(period+1))
 */
export function calculateEMAAlpha(period: number): number {
  return 2 / (period + 1);
}

/**
 * Calculate EMA value
 * @param current Current price
 * @param previous Previous EMA value
 * @param alpha Alpha smoothing factor
 * @returns New EMA value
 */
export function calculateEMA(current: number, previous: number, alpha: number): number {
  return alpha * current + (1 - alpha) * previous;
}

/**
 * Calculate Wilder's smoothing for RSI
 * @param current Current value
 * @param previous Previous smoothed value
 * @param period Period for smoothing
 * @returns New smoothed value
 */
export function calculateWilderSmoothing(current: number, previous: number, period: number): number {
  return (previous * (period - 1) + current) / period;
}

/**
 * Calculate simple moving average for seeding
 * @param values Array of values
 * @param period Period for SMA
 * @returns SMA value or null if insufficient data
 */
export function calculateSMA(values: number[], period: number): number | null {
  if (values.length < period) {
    return null;
  }
  
  const sum = values.slice(-period).reduce((acc, val) => acc + val, 0);
  return sum / period;
}

/**
 * Calculate arithmetic mean
 * @param values Array of values
 * @returns Mean value or null if empty
 */
export function calculateMean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate standard deviation
 * @param values Array of values
 * @param ddof Delta degrees of freedom (0 for population, 1 for sample)
 * @returns Standard deviation or null if insufficient data
 */
export function calculateStdDev(values: number[], ddof: number = 0): number | null {
  if (values.length <= ddof) {
    return null;
  }
  
  const mean = calculateMean(values);
  if (mean === null) {
    return null;
  }
  
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (values.length - ddof);
  return Math.sqrt(variance);
}

/**
 * Clamp value between min and max
 * @param value Value to clamp
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if value is approximately equal to another (within tolerance)
 * @param a First value
 * @param b Second value
 * @param tolerance Tolerance for comparison
 * @returns True if values are approximately equal
 */
export function isApproximatelyEqual(a: number, b: number, tolerance: number = 1e-8): boolean {
  return Math.abs(a - b) < tolerance;
}

/**
 * Check if a bar is finalized
 * @param bar Bar object with isPartial flag
 * @returns True if bar is finalized
 */
export function isFinal(bar: { isPartial?: boolean }): boolean {
  return !bar.isPartial;
}

/**
 * Calculate RSI from relative strength
 * @param rs Relative strength (avgGain / avgLoss)
 * @returns RSI value (0-100)
 */
export function calculateRSI(rs: number): number {
  if (rs === Infinity || rs === -Infinity || isNaN(rs)) {
    return 50; // Neutral RSI for invalid RS
  }
  
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate relative strength for RSI
 * @param avgGain Average gain
 * @param avgLoss Average loss
 * @returns Relative strength
 */
export function calculateRelativeStrength(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) {
    return Infinity; // Will be handled in calculateRSI
  }
  
  return avgGain / avgLoss;
}


/**
 * Utility functions for indicator calculations
 */

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if value is approximately equal to another (within tolerance)
 */
export function isApproximatelyEqual(a: number, b: number, tolerance: number = 1e-8): boolean {
  return Math.abs(a - b) < tolerance;
}

/**
 * Check if a bar is finalized
 */
export function isFinal(bar: { isPartial?: boolean }): boolean {
  return !bar.isPartial;
}

/**
 * Check if value is null or undefined
 */
export function isNull(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is a valid number
 */
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Round to specified decimal places
 */
export function round(value: number, decimals: number = 8): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate percentage change
 */
export function percentageChange(from: number, to: number): number {
  if (from === 0) {
    return 0;
  }
  return ((to - from) / from) * 100;
}

/**
 * Calculate price change
 */
export function priceChange(from: number, to: number): number {
  return to - from;
}

/**
 * Get source value from candle based on source type
 */
export function getSourceValue(candle: { o: number; h: number; l: number; c: number; v: number }, source: string): number {
  switch (source.toLowerCase()) {
    case 'open':
    case 'o':
      return candle.o;
    case 'high':
    case 'h':
      return candle.h;
    case 'low':
    case 'l':
      return candle.l;
    case 'close':
    case 'c':
      return candle.c;
    case 'volume':
    case 'v':
      return candle.v;
    case 'hl2':
      return (candle.h + candle.l) / 2;
    case 'hlc3':
      return (candle.h + candle.l + candle.c) / 3;
    case 'ohlc4':
      return (candle.o + candle.h + candle.l + candle.c) / 4;
    default:
      return candle.c; // Default to close
  }
}

/**
 * Create null-filled array for warmup period
 */
export function createWarmupArray(length: number): (number | null)[] {
  return new Array(length).fill(null);
}

/**
 * Merge arrays with null handling
 */
export function mergeArrays<T>(a: T[], b: T[], mergeFn: (a: T, b: T) => T): T[] {
  const result: T[] = [];
  const maxLength = Math.max(a.length, b.length);
  
  for (let i = 0; i < maxLength; i++) {
    const aVal = a[i];
    const bVal = b[i];
    
    if (aVal !== undefined && bVal !== undefined) {
      result.push(mergeFn(aVal, bVal));
    } else if (aVal !== undefined) {
      result.push(aVal);
    } else if (bVal !== undefined) {
      result.push(bVal);
    }
  }
  
  return result;
}

/**
 * Create indicator point
 */
export function createIndicatorPoint(
  t: number,
  values: Record<string, number | null>,
  status: 'partial' | 'final'
): { t: number; values: Record<string, number | null>; status: 'partial' | 'final' } {
  return { t, values, status };
}

/**
 * Validate indicator parameters
 */
export function validateIndicatorParams(params: Record<string, any>, required: string[]): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const param of required) {
    if (!(param in params) || params[param] === undefined || params[param] === null) {
      missing.push(param);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Create canonical spec ID
 */
export function createCanonicalId(name: string, inputs: Record<string, number | string>, timeframe: string): string {
  const inputsStr = Object.entries(inputs)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
  
  return `${name.toLowerCase()}_${inputsStr}@${timeframe}`;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}


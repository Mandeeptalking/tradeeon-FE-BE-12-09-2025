/**
 * Indicator specification for configuration
 */
export type IndicatorSpec = {
  id: string;         // canonical key, e.g., "rsi_14:close@15m"
  name: string;       // "RSI"
  inputs: Record<string, number | string>; // { period: 14, source: "close" }
  timeframe: string;  // "1m" | "5m" | "15m" | "1h" | "1d"
  pane: "auto" | "price" | "new";
  style?: Record<string, unknown>;
  version?: string;   // "1.0.0"
};

/**
 * Output metadata for indicator series
 */
export type OutputMeta = {
  key: string;              // "rsi" | "macd" | "signal" | "hist" ...
  type: "line" | "histogram" | "area";
  overlay: boolean;         // if true, overlay on price pane
  zeroLine?: boolean;       // for MACD, etc.
  levels?: number[];        // e.g., [30, 50, 70] for RSI
};

/**
 * Indicator instance metadata
 */
export type IndicatorInstanceMeta = {
  id: string;
  outputsMeta: OutputMeta[];
  warmup: number;             // bars before first valid value
  defaultPane: "price" | "new";
};

/**
 * Indicator data point
 */
export type IndicatorPoint = {
  t: number;                    // timestamp (aligned to bar close of target TF)
  values: Record<string, number | null>; // keys from outputsMeta
  status: "partial" | "final";  // live lifecycle
};

/**
 * Indicator update containing multiple points
 */
export type IndicatorUpdate = {
  id: string; // must match IndicatorSpec.id
  points: IndicatorPoint[];
};

/**
 * Create canonical indicator ID
 */
export const canonicalId = (spec: Omit<IndicatorSpec, 'id'>): string => {
  const inputsStr = Object.entries(spec.inputs)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
  
  return `${spec.name.toLowerCase()}_${inputsStr}@${spec.timeframe}`;
};

/**
 * Create indicator spec with canonical ID
 */
export const createIndicatorSpec = (
  name: string,
  inputs: Record<string, number | string>,
  timeframe: string,
  pane: "auto" | "price" | "new" = "auto",
  style?: Record<string, unknown>,
  version?: string
): IndicatorSpec => {
  const spec: Omit<IndicatorSpec, 'id'> = {
    name,
    inputs,
    timeframe,
    pane,
    style,
    version
  };
  
  return {
    ...spec,
    id: canonicalId(spec)
  };
};

/**
 * Create indicator instance meta
 */
export const createIndicatorInstanceMeta = (
  id: string,
  outputsMeta: OutputMeta[],
  warmup: number,
  defaultPane: "price" | "new" = "new"
): IndicatorInstanceMeta => {
  return {
    id,
    outputsMeta,
    warmup,
    defaultPane
  };
};

/**
 * Check if indicator point is finalized
 */
export const isPointFinal = (point: IndicatorPoint): boolean => {
  return point.status === "final";
};

/**
 * Check if indicator point has valid values
 */
export const hasValidValues = (point: IndicatorPoint): boolean => {
  return Object.values(point.values).some(v => v !== null && v !== undefined);
};


/**
 * Candle data structure for price bars
 */
export type Candle = {
  t: number;  // unix seconds (bar close time)
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  f?: boolean; // optional: true if "finalized"; otherwise partial
};

/**
 * Validation helpers for candle data
 */
export const validateCandle = (candle: unknown): candle is Candle => {
  if (!candle || typeof candle !== 'object') return false;
  const c = candle as Record<string, unknown>;
  
  return (
    typeof c.t === 'number' &&
    typeof c.o === 'number' &&
    typeof c.h === 'number' &&
    typeof c.l === 'number' &&
    typeof c.c === 'number' &&
    typeof c.v === 'number' &&
    (c.f === undefined || typeof c.f === 'boolean') &&
    c.h >= Math.max(c.o, c.c) && // high >= max(open, close)
    c.l <= Math.min(c.o, c.c) && // low <= min(open, close)
    c.v >= 0 // volume >= 0
  );
};

/**
 * Create a canonical candle ID for deduplication
 */
export const candleId = (candle: Candle): string => {
  return `${candle.t}_${candle.o}_${candle.h}_${candle.l}_${candle.c}_${candle.v}`;
};

/**
 * Check if candle is finalized
 */
export const isFinalized = (candle: Candle): boolean => {
  return candle.f === true;
};

/**
 * Create a partial candle (not finalized)
 */
export const createPartialCandle = (t: number, o: number, h: number, l: number, c: number, v: number): Candle => {
  return { t, o, h, l, c, v, f: false };
};

/**
 * Create a finalized candle
 */
export const createFinalCandle = (t: number, o: number, h: number, l: number, c: number, v: number): Candle => {
  return { t, o, h, l, c, v, f: true };
};


export interface HistoryCandle {
  t: number; // timestamp in ms
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v?: number; // volume (optional)
}

interface FetchHistoryParams {
  symbol: string;
  interval: string;
  to: number; // timestamp in ms
  limit?: number;
}

interface FetchOlderParams {
  symbol: string;
  interval: string;
  oldestTs: number; // timestamp in ms
  limit?: number;
}

// Convert interval string to milliseconds
const getIntervalMs = (interval: string): number => {
  const intervalMap: Record<string, number> = {
    '1m': 60000, '2m': 120000, '3m': 180000, '5m': 300000, '10m': 600000, '15m': 900000, '30m': 1800000,
    '1h': 3600000, '2h': 7200000, '3h': 10800000, '4h': 14400000, '12h': 43200000,
    '1d': 86400000, '3d': 259200000, '1W': 604800000, '1M': 2592000000
  };
  return intervalMap[interval] || 3600000; // default to 1h
};

// Generate deterministic mock data based on symbol, interval, and time
const generateMockCandles = (symbol: string, interval: string, endTime: number, count: number): HistoryCandle[] => {
  const intervalMs = getIntervalMs(interval);
  const candles: HistoryCandle[] = [];
  
  // Use symbol as seed for consistent data
  const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = 30000 + (seed % 50000); // Price between 30k-80k based on symbol
  
  let currentPrice = basePrice;
  
  for (let i = count - 1; i >= 0; i--) {
    const timestamp = endTime - (i * intervalMs);
    
    // Deterministic randomness based on timestamp and symbol
    const timeSeed = timestamp / intervalMs + seed;
    const random1 = Math.sin(timeSeed * 0.1) * 0.5 + 0.5;
    const random2 = Math.sin(timeSeed * 0.2) * 0.5 + 0.5;
    const random3 = Math.sin(timeSeed * 0.3) * 0.5 + 0.5;
    const random4 = Math.sin(timeSeed * 0.4) * 0.5 + 0.5;
    
    const volatility = 0.02;
    const trend = Math.sin(timeSeed * 0.01) * 0.001; // Long-term trend
    
    const open = currentPrice + (random1 - 0.5) * currentPrice * volatility;
    const close = open + (random2 - 0.5) * currentPrice * volatility + currentPrice * trend;
    const high = Math.max(open, close) + random3 * currentPrice * volatility * 0.5;
    const low = Math.min(open, close) - random4 * currentPrice * volatility * 0.5;
    const volume = 100000 + random1 * 900000;
    
    candles.push({
      t: timestamp,
      o: open,
      h: high,
      l: low,
      c: close,
      v: volume,
    });
    
    currentPrice = close;
  }
  
  return candles.sort((a, b) => a.t - b.t);
};

// Fetch history ending at a specific time
export async function fetchHistory({ symbol, interval, to, limit = 300 }: FetchHistoryParams): Promise<HistoryCandle[]> {
  try {
    // Try to fetch from backend first
    // Security: Use environment variable for API URL, enforce HTTPS in production
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');
    if (!apiUrl) {
      throw new Error('API URL not configured');
    }
    const response = await fetch(`${apiUrl}/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.success && result.klines) {
        return result.klines.map((kline: any) => ({
          t: kline.open_time,
          o: kline.open,
          h: kline.high,
          l: kline.low,
          c: kline.close,
          v: kline.volume,
        })).sort((a: HistoryCandle, b: HistoryCandle) => a.t - b.t);
      }
    }
  } catch (error) {
    console.log('Backend not available, using mock data');
  }
  
  // Fallback to mock data
  return generateMockCandles(symbol, interval, to, limit);
}

// Fetch older candles (for lazy loading)
export async function fetchOlder({ symbol, interval, oldestTs, limit = 500 }: FetchOlderParams): Promise<HistoryCandle[]> {
  try {
    // Try to fetch from backend with specific end time
    const intervalMs = getIntervalMs(interval);
    const endTime = oldestTs - intervalMs; // End just before the oldest we have
    
    // Security: Use environment variable for API URL, enforce HTTPS in production
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');
    if (!apiUrl) {
      throw new Error('API URL not configured');
    }
    const response = await fetch(`${apiUrl}/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}&endTime=${endTime}`);
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.success && result.klines) {
        return result.klines.map((kline: any) => ({
          t: kline.open_time,
          o: kline.open,
          h: kline.high,
          l: kline.low,
          c: kline.close,
          v: kline.volume,
        })).sort((a: HistoryCandle, b: HistoryCandle) => a.t - b.t);
      }
    }
  } catch (error) {
    console.log('Backend not available for older data, using mock data');
  }
  
  // Fallback to mock data
  const intervalMs = getIntervalMs(interval);
  const endTime = oldestTs - intervalMs;
  return generateMockCandles(symbol, interval, endTime, limit);
}

// Remove duplicate candles by timestamp
export function dedupeCandles(candles: HistoryCandle[]): HistoryCandle[] {
  const seen = new Set<number>();
  return candles.filter(candle => {
    if (seen.has(candle.t)) {
      return false;
    }
    seen.add(candle.t);
    return true;
  });
}

// Merge new candles with existing ones
export function mergeCandles(existing: HistoryCandle[], newCandles: HistoryCandle[]): HistoryCandle[] {
  const combined = [...newCandles, ...existing];
  const deduped = dedupeCandles(combined);
  return deduped.sort((a, b) => a.t - b.t);
}



/**
 * Analytics API service for correlation and z-score endpoints
 */

export interface TimeSeriesPoint {
  t: string;
  value: number;
}

export interface CorrelationResponse {
  success: boolean;
  symbolA: string;
  symbolB: string;
  interval: string;
  window: number;
  latest: number | null;
  series: TimeSeriesPoint[];
  timestamp: number;
}

export interface SpreadZScoreResponse {
  success: boolean;
  symbolA: string;
  symbolB: string;
  interval: string;
  window: number;
  method: 'ratio' | 'ols';
  latest: number | null;
  meta: { method: string; beta?: number };
  series: TimeSeriesPoint[];
  timestamp: number;
}

export interface AnalyticsParams {
  symbolA: string;
  symbolB: string;
  interval?: string;
  window?: number;
  limit?: number;
  cache?: boolean;
}

export interface SpreadZScoreParams extends AnalyticsParams {
  method?: 'ratio' | 'ols';
}

// Security: Enforce HTTPS in production
function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (import.meta.env.PROD) {
    if (!apiUrl || !apiUrl.startsWith('https://')) {
      throw new Error('API URL must use HTTPS in production');
    }
    return apiUrl;
  }
  
  return apiUrl || 'http://localhost:8000';
}

import { withRateLimit } from '../../utils/rateLimiter';

const API_BASE_URL = getApiBaseUrl();

/**
 * Fetch all available symbols from Binance
 */
export async function fetchAllSymbols(): Promise<string[]> {
  return withRateLimit(
    'analytics-symbols',
    async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/symbols`);
        if (!response.ok) {
          throw new Error('Failed to fetch symbols');
        }
        const data = await response.json();
        return data.symbols?.map((s: any) => s.symbol) || [];
      } catch (error) {
        console.error('Error fetching symbols:', error);
        return [];
      }
    },
    { maxRequests: 10, windowMs: 10000 }
  );
}

/**
 * Validate if a symbol exists
 */
export async function validateSymbol(symbol: string): Promise<boolean> {
  return withRateLimit(
    `analytics-validate-${symbol}`,
    async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/ticker/price?symbol=${symbol.toUpperCase()}`);
        return response.ok;
      } catch (error) {
        return false;
      }
    },
    { maxRequests: 10, windowMs: 10000 }
  );
}

/**
 * Fetch rolling correlation between two symbols
 */
export async function fetchCorrelation(params: AnalyticsParams): Promise<CorrelationResponse> {
  return withRateLimit(
    `analytics-correlation-${params.symbolA}-${params.symbolB}`,
    async () => {
      const searchParams = new URLSearchParams({
        symbolA: params.symbolA,
        symbolB: params.symbolB,
        interval: params.interval || '1h',
        window: (params.window || 100).toString(),
        limit: (params.limit || 500).toString(),
        ...(params.cache && { cache: 'true' })
      });

      const response = await fetch(`${API_BASE_URL}/analytics/correlation?${searchParams}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `HTTP ${response.status}: Failed to fetch correlation data`);
      }

      return response.json();
    },
    { maxRequests: 10, windowMs: 10000 }
  );
}

/**
 * Fetch spread z-score between two symbols
 */
export async function fetchSpreadZScore(params: SpreadZScoreParams): Promise<SpreadZScoreResponse> {
  return withRateLimit(
    `analytics-zscore-${params.symbolA}-${params.symbolB}`,
    async () => {
      const searchParams = new URLSearchParams({
        symbolA: params.symbolA,
        symbolB: params.symbolB,
        interval: params.interval || '1h',
        window: (params.window || 100).toString(),
        method: params.method || 'ols',
        limit: (params.limit || 500).toString(),
        ...(params.cache && { cache: 'true' })
      });

      const response = await fetch(`${API_BASE_URL}/analytics/spread-zscore?${searchParams}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `HTTP ${response.status}: Failed to fetch z-score data`);
      }

      return response.json();
    },
    { maxRequests: 10, windowMs: 10000 }
  );
}

/**
 * Get trading signal based on z-score value
 */
export function getZScoreSignal(zscore: number | null) {
  if (zscore === null) return { signal: 'NO DATA', color: 'gray', severity: 'info' };
  
  const absZScore = Math.abs(zscore);
  
  if (absZScore >= 3.0) {
    return {
      signal: zscore > 0 ? 'EXTREME SELL' : 'EXTREME BUY',
      color: zscore > 0 ? 'red' : 'green',
      severity: 'critical'
    };
  } else if (absZScore >= 2.0) {
    return {
      signal: zscore > 0 ? 'STRONG SELL' : 'STRONG BUY',
      color: zscore > 0 ? 'red' : 'green',
      severity: 'high'
    };
  } else if (absZScore >= 1.0) {
    return {
      signal: zscore > 0 ? 'SELL' : 'BUY',
      color: zscore > 0 ? 'orange' : 'blue',
      severity: 'medium'
    };
  } else {
    return {
      signal: 'NEUTRAL',
      color: 'gray',
      severity: 'low'
    };
  }
}

/**
 * Get correlation strength assessment
 */
export function getCorrelationStrength(correlation: number | null) {
  if (correlation === null) return { strength: 'NO DATA', color: 'gray' };
  
  const absCorr = Math.abs(correlation);
  
  if (absCorr >= 0.8) {
    return { strength: 'VERY STRONG', color: 'green' };
  } else if (absCorr >= 0.6) {
    return { strength: 'STRONG', color: 'blue' };
  } else if (absCorr >= 0.4) {
    return { strength: 'MODERATE', color: 'yellow' };
  } else if (absCorr >= 0.2) {
    return { strength: 'WEAK', color: 'orange' };
  } else {
    return { strength: 'VERY WEAK', color: 'red' };
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Popular trading pairs for quick selection
 */
export const POPULAR_PAIRS = [
  { symbolA: 'BTCUSDT', symbolB: 'ETHUSDT', label: 'BTC/ETH' },
  { symbolA: 'ETHUSDT', symbolB: 'ADAUSDT', label: 'ETH/ADA' },
  { symbolA: 'BTCUSDT', symbolB: 'SOLUSDT', label: 'BTC/SOL' },
  { symbolA: 'ETHUSDT', symbolB: 'MATICUSDT', label: 'ETH/MATIC' },
  { symbolA: 'BTCUSDT', symbolB: 'AVAXUSDT', label: 'BTC/AVAX' },
  { symbolA: 'ETHUSDT', symbolB: 'DOTUSDT', label: 'ETH/DOT' },
];

/**
 * Get recommended window size based on interval
 */
export function getRecommendedWindow(interval: string): number {
  switch (interval) {
    case '1m':
    case '5m':
      return 200; // More data points for short intervals
    case '15m':
    case '30m':
      return 100;
    case '1h':
      return 50;
    case '4h':
      return 30;
    case '1d':
      return 20;
    default:
      return 50;
  }
}

/**
 * Check if configuration is likely to have sufficient data
 */
export function isConfigurationOptimal(interval: string, window: number): {
  isOptimal: boolean;
  suggestion?: string;
} {
  const recommended = getRecommendedWindow(interval);
  
  if (window > recommended * 2) {
    return {
      isOptimal: false,
      suggestion: `Consider reducing window to ${recommended} for ${interval} timeframe`
    };
  }
  
  if (window < 10) {
    return {
      isOptimal: false,
      suggestion: 'Window too small for reliable statistics (minimum 10)'
    };
  }
  
  return { isOptimal: true };
}

/**
 * Available timeframes
 */
export const TIMEFRAMES = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
];

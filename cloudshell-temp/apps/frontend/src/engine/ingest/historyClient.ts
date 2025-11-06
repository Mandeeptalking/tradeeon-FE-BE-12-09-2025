import { Candle } from '../../contracts/candle';

/**
 * Historical data client interface
 */
export interface HistoryClient {
  loadCandles(symbol: string, timeframe: string, limit: number): Promise<Candle[]>;
}

/**
 * Mock historical data client
 */
export class MockHistoryClient implements HistoryClient {
  private mockData: Map<string, Candle[]> = new Map();

  constructor() {
    this.initializeMockData();
  }

  async loadCandles(symbol: string, timeframe: string, limit: number): Promise<Candle[]> {
    const key = `${symbol}_${timeframe}`;
    const data = this.mockData.get(key) || [];
    
    // Return the most recent candles up to the limit
    return data.slice(-limit);
  }

  private initializeMockData() {
    // Generate mock BTCUSDT 1m data
    const now = Date.now();
    const intervalMs = 60 * 1000; // 1 minute
    const candles: Candle[] = [];

    let basePrice = 50000;
    for (let i = 0; i < 1000; i++) {
      const timestamp = now - (1000 - i) * intervalMs;
      const open = basePrice + (Math.random() - 0.5) * 100;
      const close = open + (Math.random() - 0.5) * 200;
      const high = Math.max(open, close) + Math.random() * 50;
      const low = Math.min(open, close) - Math.random() * 50;
      const volume = Math.random() * 1000;

      candles.push({
        t: Math.floor(timestamp / 1000),
        o: Math.round(open * 100) / 100,
        h: Math.round(high * 100) / 100,
        l: Math.round(low * 100) / 100,
        c: Math.round(close * 100) / 100,
        v: Math.round(volume * 100) / 100,
        f: true // All historical data is finalized
      });

      basePrice = close;
    }

    this.mockData.set('BTCUSDT_1m', candles);

    // Generate mock ETHUSDT 1m data
    const ethCandles: Candle[] = [];
    let ethBasePrice = 3000;
    for (let i = 0; i < 1000; i++) {
      const timestamp = now - (1000 - i) * intervalMs;
      const open = ethBasePrice + (Math.random() - 0.5) * 20;
      const close = open + (Math.random() - 0.5) * 40;
      const high = Math.max(open, close) + Math.random() * 10;
      const low = Math.min(open, close) - Math.random() * 10;
      const volume = Math.random() * 2000;

      ethCandles.push({
        t: Math.floor(timestamp / 1000),
        o: Math.round(open * 100) / 100,
        h: Math.round(high * 100) / 100,
        l: Math.round(low * 100) / 100,
        c: Math.round(close * 100) / 100,
        v: Math.round(volume * 100) / 100,
        f: true
      });

      ethBasePrice = close;
    }

    this.mockData.set('ETHUSDT_1m', ethCandles);
  }

  /**
   * Add mock data for testing
   */
  addMockData(symbol: string, timeframe: string, candles: Candle[]) {
    const key = `${symbol}_${timeframe}`;
    this.mockData.set(key, candles);
  }
}

/**
 * Real Binance historical data client
 */
export class BinanceHistoryClient implements HistoryClient {
  private baseUrl = 'https://api.binance.com/api/v3';

  async loadCandles(symbol: string, timeframe: string, limit: number): Promise<Candle[]> {
    const url = `${this.baseUrl}/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.map((k: any[]) => ({
        t: Math.floor(k[0] / 1000), // Convert to seconds
        o: parseFloat(k[1]),
        h: parseFloat(k[2]),
        l: parseFloat(k[3]),
        c: parseFloat(k[4]),
        v: parseFloat(k[5]),
        f: true // All historical data is finalized
      }));
    } catch (error) {
      console.error('Failed to load historical data:', error);
      throw error;
    }
  }
}

/**
 * Create history client instance
 */
export const createHistoryClient = (useMock: boolean = true): HistoryClient => {
  return useMock ? new MockHistoryClient() : new BinanceHistoryClient();
};


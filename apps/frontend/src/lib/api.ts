import { withRateLimit } from '../utils/rateLimiter';

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

const API_BASE_URL = getApiBaseUrl();

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
}


export interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  isSpotTradingAllowed: boolean;
  isMarginTradingAllowed: boolean;
  filters: any[];
}

export interface TickerData {
  symbol: string;
  price: number;
  price_change: number;
  price_change_percent: number;
  weighted_avg_price: number;
  prev_close_price: number;
  last_qty: number;
  bid_price: number;
  ask_price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  volume: number;
  quote_volume: number;
  open_time: number;
  close_time: number;
  first_id: number;
  last_id: number;
  count: number;
}

export interface KlineData {
  open_time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  close_time: number;
  quote_asset_volume: number;
  number_of_trades: number;
  taker_buy_base_asset_volume: number;
  taker_buy_quote_asset_volume: number;
  ignore: string;
}

export interface TradeData {
  id: number;
  price: number;
  qty: number;
  quote_qty: number;
  time: number;
  is_buyer_maker: boolean;
  is_best_match: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    return withRateLimit(
      'api-health',
      () => this.request('/health'),
      { maxRequests: 10, windowMs: 5000 }
    );
  }

  // Get all available symbols
  async getAllSymbols(): Promise<{
    success: boolean;
    symbols: SymbolInfo[];
    count: number;
    timestamp: number;
  }> {
    return withRateLimit(
      'api-symbols',
      () => this.request('/api/symbols'),
      { maxRequests: 20, windowMs: 5000 }
    );
  }

  // Get 24hr ticker data
  async get24hrTicker(symbol?: string): Promise<{
    success: boolean;
    tickers: TickerData[];
    timestamp: number;
  }> {
    return withRateLimit(
      `api-ticker-24hr-${symbol || 'all'}`,
      () => {
        const endpoint = symbol ? `/api/ticker/24hr?symbol=${symbol}` : '/api/ticker/24hr';
        return this.request(endpoint);
      },
      { maxRequests: 20, windowMs: 5000 }
    );
  }

  // Get current price
  async getTickerPrice(symbol?: string): Promise<{
    success: boolean;
    data: any;
    timestamp: number;
  }> {
    return withRateLimit(
      `api-ticker-price-${symbol || 'all'}`,
      () => {
        const endpoint = symbol ? `/api/ticker/price?symbol=${symbol}` : '/api/ticker/price';
        return this.request(endpoint);
      },
      { maxRequests: 20, windowMs: 5000 }
    );
  }

  // Get kline/candlestick data
  async getKlines(
    symbol: string, 
    interval: string = '1h', 
    limit: number = 100
  ): Promise<{
    success: boolean;
    symbol: string;
    interval: string;
    klines: KlineData[];
    timestamp: number;
  }> {
    return withRateLimit(
      `api-klines-${symbol}-${interval}`,
      () => {
        const endpoint = `/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        return this.request(endpoint);
      },
      { maxRequests: 20, windowMs: 5000 }
    );
  }

  // Get order book
  async getOrderBook(
    symbol: string, 
    limit: number = 100
  ): Promise<{
    success: boolean;
    symbol: string;
    orderbook: {
      last_update_id: number;
      bids: number[][];
      asks: number[][];
    };
    timestamp: number;
  }> {
    return withRateLimit(
      `api-orderbook-${symbol}`,
      () => {
        const endpoint = `/api/depth?symbol=${symbol}&limit=${limit}`;
        return this.request(endpoint);
      },
      { maxRequests: 20, windowMs: 5000 }
    );
  }

  // Get recent trades
  async getRecentTrades(
    symbol: string, 
    limit: number = 100
  ): Promise<{
    success: boolean;
    symbol: string;
    trades: TradeData[];
    timestamp: number;
  }> {
    return withRateLimit(
      `api-trades-${symbol}`,
      () => {
        const endpoint = `/api/trades?symbol=${symbol}&limit=${limit}`;
        return this.request(endpoint);
      },
      { maxRequests: 20, windowMs: 5000 }
    );
  }

  // Get aggregate trades
  async getAggregateTrades(
    symbol: string, 
    limit: number = 100
  ): Promise<{
    success: boolean;
    symbol: string;
    trades: TradeData[];
    timestamp: number;
  }> {
    return withRateLimit(
      `api-aggtrades-${symbol}`,
      () => {
        const endpoint = `/api/aggTrades?symbol=${symbol}&limit=${limit}`;
        return this.request(endpoint);
      },
      { maxRequests: 20, windowMs: 5000 }
    );
  }

  // Get market overview (frontend specific)
  async getMarketOverview(): Promise<{
    success: boolean;
    data: MarketData[];
    timestamp: number;
  }> {
    return withRateLimit(
      'api-market-overview',
      () => this.request('/api/market/overview'),
      { maxRequests: 10, windowMs: 5000 }
    );
  }

}

// Export singleton instance
export const apiClient = new ApiClient();

// Export individual methods for convenience
export const {
  healthCheck,
  getAllSymbols,
  get24hrTicker,
  getTickerPrice,
  getKlines,
  getOrderBook,
  getRecentTrades,
  getAggregateTrades,
  getMarketOverview,
} = apiClient;

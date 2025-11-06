export interface NormalizedCandle {
  time: number; // timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SubscribeKlinesParams {
  symbol: string;
  interval: string;
  onSnapshot: (candles: NormalizedCandle[]) => void;
  onUpdate: (kline: NormalizedCandle) => void;
}

interface BinanceKline {
  t: number; // Kline start time
  T: number; // Kline close time
  s: string; // Symbol
  i: string; // Interval
  f: number; // First trade ID
  L: number; // Last trade ID
  o: string; // Open price
  c: string; // Close price
  h: string; // High price
  l: string; // Low price
  v: string; // Base asset volume
  n: number; // Number of trades
  x: boolean; // Is this kline closed?
  q: string; // Quote asset volume
  V: string; // Taker buy base asset volume
  Q: string; // Taker buy quote asset volume
  B: string; // Ignore
}

interface BinanceKlineMessage {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  k: BinanceKline;
}

export class BinanceFeed {
  private static readonly BASE_URL = 'https://api.binance.com';
  private static readonly WS_URL = 'wss://stream.binance.com:9443/ws';
  
  // Interval mapping
  private static readonly INTERVAL_MAP: Record<string, string> = {
    '1m': '1m',
    '5m': '5m', 
    '15m': '15m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d'
  };

  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 60000; // 60 seconds
  private heartbeatInterval = 30000; // 30 seconds
  private isSubscribed = false;
  private currentSubscription: SubscribeKlinesParams | null = null;

  /**
   * Subscribe to live kline data for a symbol/interval
   */
  async subscribeKlines(params: SubscribeKlinesParams): Promise<void> {
    this.currentSubscription = params;
    this.isSubscribed = true;
    this.reconnectAttempts = 0;

    // Validate interval
    const binanceInterval = BinanceFeed.INTERVAL_MAP[params.interval];
    if (!binanceInterval) {
      throw new Error(`Unsupported interval: ${params.interval}`);
    }

    try {
      // Step 1: Backfill via REST API
      console.log(`Fetching historical data for ${params.symbol} ${params.interval}...`);
      const historicalCandles = await this.fetchHistoricalKlines(params.symbol, binanceInterval, 1000);
      
      if (historicalCandles.length > 0) {
        params.onSnapshot(historicalCandles);
      }

      // Step 2: Connect WebSocket for live updates
      await this.connectWebSocket(params.symbol, binanceInterval);
      
    } catch (error) {
      console.error('Failed to subscribe to klines:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Fetch historical klines from REST API
   */
  private async fetchHistoricalKlines(symbol: string, interval: string, limit: number): Promise<NormalizedCandle[]> {
    const url = `${BinanceFeed.BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.map((kline: any[]) => this.normalizeRestKline(kline));
    } catch (error) {
      console.error('Failed to fetch historical klines:', error);
      throw error;
    }
  }

  /**
   * Connect to Binance WebSocket stream
   */
  private async connectWebSocket(symbol: string, interval: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${BinanceFeed.WS_URL}/${symbol.toLowerCase()}@kline_${interval}`;
      console.log(`Connecting to WebSocket: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: BinanceKlineMessage = JSON.parse(event.data);
          if (message.e === 'kline' && this.currentSubscription) {
            const normalizedCandle = this.normalizeWsKline(message.k);
            this.currentSubscription.onUpdate(normalizedCandle);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.stopHeartbeat();
        
        if (this.isSubscribed) {
          this.scheduleReconnect();
        }
      };

      // Timeout for connection
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (!this.isSubscribed || !this.currentSubscription) return;

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts), 
      this.maxReconnectDelay
    );
    
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempts++;
      if (this.currentSubscription) {
        this.connectWebSocket(
          this.currentSubscription.symbol,
          BinanceFeed.INTERVAL_MAP[this.currentSubscription.interval]
        ).catch(() => {
          // Will schedule another reconnect via onclose
        });
      }
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Binance doesn't require ping frames, but we can monitor connection
        console.log('Heartbeat: WebSocket still connected');
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Normalize REST API kline data
   */
  private normalizeRestKline(kline: any[]): NormalizedCandle {
    return {
      time: kline[0], // Open time
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
    };
  }

  /**
   * Normalize WebSocket kline data
   */
  private normalizeWsKline(kline: BinanceKline): NormalizedCandle {
    return {
      time: kline.t,
      open: parseFloat(kline.o),
      high: parseFloat(kline.h),
      low: parseFloat(kline.l),
      close: parseFloat(kline.c),
      volume: parseFloat(kline.v),
    };
  }

  /**
   * Clean unsubscribe - close sockets and clear timers
   */
  unsubscribe(): void {
    console.log('Unsubscribing from Binance feed...');
    
    this.isSubscribed = false;
    this.currentSubscription = null;

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.reconnectAttempts = 0;
    console.log('Binance feed unsubscribed');
  }

  /**
   * Get supported intervals
   */
  static getSupportedIntervals(): string[] {
    return Object.keys(BinanceFeed.INTERVAL_MAP);
  }

  /**
   * Check if interval is supported
   */
  static isIntervalSupported(interval: string): boolean {
    return interval in BinanceFeed.INTERVAL_MAP;
  }
}



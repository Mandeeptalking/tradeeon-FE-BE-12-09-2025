import { Candle } from '../../contracts/candle';

/**
 * Live stream event types
 */
export type LiveStreamEvent = 
  | { type: 'partial'; candle: Candle }
  | { type: 'final'; candle: Candle }
  | { type: 'connected' }
  | { type: 'disconnected'; reason?: string }
  | { type: 'error'; error: string };

/**
 * Live stream client interface
 */
export interface LiveStreamClient {
  connect(symbol: string, timeframe: string): void;
  disconnect(): void;
  subscribe(callback: (event: LiveStreamEvent) => void): () => void;
  isConnected(): boolean;
}

/**
 * Mock live stream client that simulates real-time data
 */
export class MockLiveStreamClient implements LiveStreamClient {
  private subscribers: Set<(event: LiveStreamEvent) => void> = new Set();
  private isConnectedFlag = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentBar: Candle | null = null;
  private symbol = '';
  private timeframe = '';
  private basePrice = 50000;
  private barStartTime = 0;
  private intervalMs = 60000; // 1 minute default

  connect(symbol: string, timeframe: string): void {
    if (this.isConnectedFlag) {
      this.disconnect();
    }

    this.symbol = symbol;
    this.timeframe = timeframe;
    this.intervalMs = this.getIntervalMs(timeframe);
    this.barStartTime = this.getCurrentBarStartTime();
    this.basePrice = this.getBasePrice(symbol);

    this.isConnectedFlag = true;
    this.notifySubscribers({ type: 'connected' });

    // Start simulating live data
    this.startSimulation();
  }

  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.currentBar) {
      // Finalize current bar
      this.finalizeCurrentBar();
    }

    this.isConnectedFlag = false;
    this.notifySubscribers({ type: 'disconnected' });
  }

  subscribe(callback: (event: LiveStreamEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  private startSimulation(): void {
    // Send partial updates every 2 seconds
    this.intervalId = setInterval(() => {
      if (!this.isConnectedFlag) return;

      const now = Date.now();
      const currentBarStart = this.getCurrentBarStartTime();
      
      // Check if we need to start a new bar
      if (currentBarStart !== this.barStartTime) {
        if (this.currentBar) {
          // Finalize previous bar
          this.finalizeCurrentBar();
        }
        // Start new bar
        this.startNewBar(currentBarStart);
      }

      // Update current bar with partial data
      this.updateCurrentBar();
    }, 2000);
  }

  private getIntervalMs(timeframe: string): number {
    const intervals: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    return intervals[timeframe] || 60 * 1000;
  }

  private getCurrentBarStartTime(): number {
    const now = Date.now();
    return Math.floor(now / this.intervalMs) * this.intervalMs;
  }

  private getBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      'BTCUSDT': 50000,
      'ETHUSDT': 3000,
      'ADAUSDT': 0.5,
      'BNBUSDT': 300,
    };
    return prices[symbol] || 100;
  }

  private startNewBar(barStartTime: number): void {
    this.barStartTime = barStartTime;
    const open = this.basePrice + (Math.random() - 0.5) * this.basePrice * 0.01;
    
    this.currentBar = {
      t: Math.floor(barStartTime / 1000),
      o: Math.round(open * 100) / 100,
      h: open,
      l: open,
      c: open,
      v: 0,
      f: false
    };

    this.basePrice = open;
  }

  private updateCurrentBar(): void {
    if (!this.currentBar) return;

    const priceChange = (Math.random() - 0.5) * this.basePrice * 0.005;
    const newPrice = this.currentBar.c + priceChange;
    
    this.currentBar.c = Math.round(newPrice * 100) / 100;
    this.currentBar.h = Math.max(this.currentBar.h, this.currentBar.c);
    this.currentBar.l = Math.min(this.currentBar.l, this.currentBar.c);
    this.currentBar.v += Math.random() * 10;

    this.notifySubscribers({
      type: 'partial',
      candle: { ...this.currentBar }
    });
  }

  private finalizeCurrentBar(): void {
    if (!this.currentBar) return;

    const finalizedBar: Candle = {
      ...this.currentBar,
      f: true
    };

    this.notifySubscribers({
      type: 'final',
      candle: finalizedBar
    });

    this.currentBar = null;
  }

  private notifySubscribers(event: LiveStreamEvent): void {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in live stream subscriber:', error);
      }
    });
  }
}

/**
 * Real Binance WebSocket live stream client
 */
export class BinanceLiveStreamClient implements LiveStreamClient {
  private ws: WebSocket | null = null;
  private subscribers: Set<(event: LiveStreamEvent) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;

  connect(symbol: string, timeframe: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.disconnect();
    }

    const stream = `${symbol.toLowerCase()}@kline_${timeframe}`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${stream}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupWebSocketHandlers();
    } catch (error) {
      this.notifySubscribers({
        type: 'error',
        error: `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  subscribe(callback: (event: LiveStreamEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.notifySubscribers({ type: 'connected' });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const k = data.k;

        if (!k) return;

        const candle: Candle = {
          t: Math.floor(k.t / 1000),
          o: parseFloat(k.o),
          h: parseFloat(k.h),
          l: parseFloat(k.l),
          c: parseFloat(k.c),
          v: parseFloat(k.v),
          f: k.x // k.x is true when bar is closed
        };

        if (k.x) {
          this.notifySubscribers({ type: 'final', candle });
        } else {
          this.notifySubscribers({ type: 'partial', candle });
        }
      } catch (error) {
        this.notifySubscribers({
          type: 'error',
          error: `Failed to parse message: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    };

    this.ws.onclose = (event) => {
      this.notifySubscribers({
        type: 'disconnected',
        reason: event.reason || 'Connection closed'
      });

      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.notifySubscribers({
        type: 'error',
        error: 'WebSocket error occurred'
      });
    };
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        // Reconnect with the same parameters
        const symbol = this.ws?.url?.split('@')[0]?.split('/').pop()?.toUpperCase() || 'BTCUSDT';
        const timeframe = this.ws?.url?.split('@')[1]?.split('_')[1] || '1m';
        this.connect(symbol, timeframe);
      }
    }, delay);
  }

  private notifySubscribers(event: LiveStreamEvent): void {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in live stream subscriber:', error);
      }
    });
  }
}

/**
 * Create live stream client instance
 */
export const createLiveStreamClient = (useMock: boolean = true): LiveStreamClient => {
  return useMock ? new MockLiveStreamClient() : new BinanceLiveStreamClient();
};


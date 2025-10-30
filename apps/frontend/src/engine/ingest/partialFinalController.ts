import { Candle } from '../../contracts/candle';
import { LiveStreamEvent } from './liveStreamClient';

/**
 * Partial/Final bar lifecycle events
 */
export type BarLifecycleEvent = 
  | { type: 'barPartial'; candle: Candle }
  | { type: 'barFinal'; candle: Candle }
  | { type: 'barDropped'; reason: string };

/**
 * Partial/Final controller for managing bar lifecycle
 */
export class PartialFinalController {
  private currentBars: Map<string, Candle> = new Map();
  private subscribers: Set<(event: BarLifecycleEvent) => void> = new Set();
  private lastFinalizedTime: Map<string, number> = new Map();

  /**
   * Process live stream events and manage bar lifecycle
   */
  processLiveEvent(event: LiveStreamEvent): void {
    if (event.type === 'partial' || event.type === 'final') {
      this.processCandle(event.candle);
    }
  }

  /**
   * Subscribe to bar lifecycle events
   */
  subscribe(callback: (event: BarLifecycleEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Get current partial bar for a symbol
   */
  getCurrentBar(symbol: string): Candle | null {
    return this.currentBars.get(symbol) || null;
  }

  /**
   * Get all current partial bars
   */
  getAllCurrentBars(): Map<string, Candle> {
    return new Map(this.currentBars);
  }

  /**
   * Clear all current bars (useful for reconnection)
   */
  clearAllBars(): void {
    this.currentBars.clear();
    this.lastFinalizedTime.clear();
  }

  private processCandle(candle: Candle): void {
    const symbol = this.extractSymbolFromCandle(candle);
    if (!symbol) return;

    // Check for duplicate finalization
    if (candle.f && this.lastFinalizedTime.has(symbol)) {
      const lastFinalized = this.lastFinalizedTime.get(symbol)!;
      if (candle.t <= lastFinalized) {
        this.notifySubscribers({
          type: 'barDropped',
          reason: `Duplicate finalization for time ${candle.t}`
        });
        return;
      }
    }

    if (candle.f) {
      // Final bar - remove from current bars and notify
      this.currentBars.delete(symbol);
      this.lastFinalizedTime.set(symbol, candle.t);
      
      this.notifySubscribers({
        type: 'barFinal',
        candle
      });
    } else {
      // Partial bar - update current bar
      const existingBar = this.currentBars.get(symbol);
      
      if (existingBar && existingBar.t !== candle.t) {
        // New bar started, finalize the previous one if it exists
        this.notifySubscribers({
          type: 'barFinal',
          candle: { ...existingBar, f: true }
        });
        this.lastFinalizedTime.set(symbol, existingBar.t);
      }

      // Update current bar
      this.currentBars.set(symbol, candle);
      
      this.notifySubscribers({
        type: 'barPartial',
        candle
      });
    }
  }

  private extractSymbolFromCandle(candle: Candle): string | null {
    // In a real implementation, this would extract the symbol from the candle data
    // For now, we'll use a simple approach based on price ranges
    if (candle.c > 10000) return 'BTCUSDT';
    if (candle.c > 1000) return 'ETHUSDT';
    if (candle.c > 100) return 'BNBUSDT';
    return 'ADAUSDT';
  }

  private notifySubscribers(event: BarLifecycleEvent): void {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in bar lifecycle subscriber:', error);
      }
    });
  }
}

/**
 * Create a partial/final controller instance
 */
export const createPartialFinalController = (): PartialFinalController => {
  return new PartialFinalController();
};


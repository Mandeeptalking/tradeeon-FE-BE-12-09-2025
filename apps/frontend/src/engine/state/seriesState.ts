import { Candle } from '../../contracts/candle';
import { IndicatorPoint, IndicatorUpdate } from '../../contracts/indicator';
import { RingBuffer, createRingBuffer } from './ringBuffer';

/**
 * Series state for managing price and indicator data
 */
export class SeriesState {
  private priceBuffer: RingBuffer<Candle>;
  private indicatorBuffers: Map<string, RingBuffer<IndicatorPoint>> = new Map();
  private readonly maxCapacity: number;

  constructor(maxCapacity: number = 1000) {
    this.maxCapacity = maxCapacity;
    this.priceBuffer = createRingBuffer<Candle>(maxCapacity);
  }

  /**
   * Add a candle to the price series
   */
  addCandle(candle: Candle): void {
    this.priceBuffer.push(candle);
  }

  /**
   * Add indicator points to a specific indicator series
   */
  addIndicatorPoints(indicatorId: string, points: IndicatorPoint[]): void {
    let buffer = this.indicatorBuffers.get(indicatorId);
    if (!buffer) {
      buffer = createRingBuffer<IndicatorPoint>(this.maxCapacity);
      this.indicatorBuffers.set(indicatorId, buffer);
    }

    points.forEach(point => {
      buffer!.push(point);
    });
  }

  /**
   * Get the latest N candles
   */
  getLatestCandles(n: number): Candle[] {
    return this.priceBuffer.getLast(n);
  }

  /**
   * Get all candles
   */
  getAllCandles(): Candle[] {
    return this.priceBuffer.toArray();
  }

  /**
   * Get the latest N indicator points for a specific indicator
   */
  getLatestIndicatorPoints(indicatorId: string, n: number): IndicatorPoint[] {
    const buffer = this.indicatorBuffers.get(indicatorId);
    if (!buffer) {
      return [];
    }
    return buffer.getLast(n);
  }

  /**
   * Get all indicator points for a specific indicator
   */
  getAllIndicatorPoints(indicatorId: string): IndicatorPoint[] {
    const buffer = this.indicatorBuffers.get(indicatorId);
    if (!buffer) {
      return [];
    }
    return buffer.toArray();
  }

  /**
   * Get the latest indicator point for a specific indicator
   */
  getLatestIndicatorPoint(indicatorId: string): IndicatorPoint | undefined {
    const buffer = this.indicatorBuffers.get(indicatorId);
    if (!buffer) {
      return undefined;
    }
    return buffer.peek();
  }

  /**
   * Get indicator points for a specific output key
   */
  getIndicatorPointsForOutput(indicatorId: string, outputKey: string): IndicatorPoint[] {
    const buffer = this.indicatorBuffers.get(indicatorId);
    if (!buffer) {
      return [];
    }
    
    return buffer.filter(point => 
      point.values.hasOwnProperty(outputKey) && 
      point.values[outputKey] !== null
    );
  }

  /**
   * Get the latest indicator point for a specific output key
   */
  getLatestIndicatorPointForOutput(indicatorId: string, outputKey: string): IndicatorPoint | undefined {
    const points = this.getIndicatorPointsForOutput(indicatorId, outputKey);
    return points[points.length - 1];
  }

  /**
   * Get all available indicator IDs
   */
  getIndicatorIds(): string[] {
    return Array.from(this.indicatorBuffers.keys());
  }

  /**
   * Check if an indicator has data
   */
  hasIndicatorData(indicatorId: string): boolean {
    const buffer = this.indicatorBuffers.get(indicatorId);
    return buffer ? !buffer.isEmpty() : false;
  }

  /**
   * Get the number of candles stored
   */
  getCandleCount(): number {
    return this.priceBuffer.size();
  }

  /**
   * Get the number of indicator points for a specific indicator
   */
  getIndicatorPointCount(indicatorId: string): number {
    const buffer = this.indicatorBuffers.get(indicatorId);
    return buffer ? buffer.size() : 0;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.priceBuffer.clear();
    this.indicatorBuffers.forEach(buffer => buffer.clear());
  }

  /**
   * Clear data for a specific indicator
   */
  clearIndicator(indicatorId: string): void {
    const buffer = this.indicatorBuffers.get(indicatorId);
    if (buffer) {
      buffer.clear();
    }
  }

  /**
   * Remove an indicator and its data
   */
  removeIndicator(indicatorId: string): void {
    this.indicatorBuffers.delete(indicatorId);
  }

  /**
   * Get the time range of available data
   */
  getTimeRange(): { start: number; end: number } | null {
    const candles = this.getAllCandles();
    if (candles.length === 0) {
      return null;
    }

    const times = candles.map(c => c.t);
    return {
      start: Math.min(...times),
      end: Math.max(...times)
    };
  }

  /**
   * Get the time range for a specific indicator
   */
  getIndicatorTimeRange(indicatorId: string): { start: number; end: number } | null {
    const points = this.getAllIndicatorPoints(indicatorId);
    if (points.length === 0) {
      return null;
    }

    const times = points.map(p => p.t);
    return {
      start: Math.min(...times),
      end: Math.max(...times)
    };
  }

  /**
   * Find candles within a time range
   */
  getCandlesInRange(startTime: number, endTime: number): Candle[] {
    return this.priceBuffer.filter(candle => 
      candle.t >= startTime && candle.t <= endTime
    );
  }

  /**
   * Find indicator points within a time range
   */
  getIndicatorPointsInRange(indicatorId: string, startTime: number, endTime: number): IndicatorPoint[] {
    const buffer = this.indicatorBuffers.get(indicatorId);
    if (!buffer) {
      return [];
    }

    return buffer.filter(point => 
      point.t >= startTime && point.t <= endTime
    );
  }

  /**
   * Get statistics about the series state
   */
  getStats(): {
    candleCount: number;
    indicatorCount: number;
    indicators: Array<{
      id: string;
      pointCount: number;
      hasData: boolean;
    }>;
  } {
    const indicators = Array.from(this.indicatorBuffers.entries()).map(([id, buffer]) => ({
      id,
      pointCount: buffer.size(),
      hasData: !buffer.isEmpty()
    }));

    return {
      candleCount: this.priceBuffer.size(),
      indicatorCount: this.indicatorBuffers.size,
      indicators
    };
  }
}

/**
 * Create a series state instance
 */
export const createSeriesState = (maxCapacity: number = 1000): SeriesState => {
  return new SeriesState(maxCapacity);
};


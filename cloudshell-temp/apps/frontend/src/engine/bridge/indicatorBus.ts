import { IndicatorUpdate } from '../../contracts/indicator';
import { SeriesState } from '../state/seriesState';
import { validateIndicatorUpdate } from '../../contracts/validation';

/**
 * Indicator bus event types
 */
export type IndicatorBusEvent = 
  | { type: 'update'; update: IndicatorUpdate }
  | { type: 'error'; error: string; update?: IndicatorUpdate }
  | { type: 'subscriberAdded'; count: number }
  | { type: 'subscriberRemoved'; count: number };

/**
 * Indicator bus for managing indicator updates and subscriptions
 */
export class IndicatorBus {
  private subscribers: Set<(event: IndicatorBusEvent) => void> = new Set();
  private seriesState: SeriesState;
  private updateQueue: IndicatorUpdate[] = [];
  private isProcessing = false;
  private droppedUpdates = 0;
  private maxQueueSize = 1000;

  constructor(seriesState: SeriesState) {
    this.seriesState = seriesState;
  }

  /**
   * Subscribe to indicator bus events
   */
  subscribe(callback: (event: IndicatorBusEvent) => void): () => void {
    this.subscribers.add(callback);
    this.notifySubscribers({
      type: 'subscriberAdded',
      count: this.subscribers.size
    });
    return () => {
      this.subscribers.delete(callback);
      this.notifySubscribers({
        type: 'subscriberRemoved',
        count: this.subscribers.size
      });
    };
  }

  /**
   * Publish an indicator update
   */
  publish(update: IndicatorUpdate): void {
    // Validate the update
    const validation = validateIndicatorUpdate(update);
    if (!validation.success) {
      this.notifySubscribers({
        type: 'error',
        error: validation.error || 'Invalid indicator update',
        update
      });
      return;
    }

    // Add to queue
    this.updateQueue.push(update);

    // Drop oldest updates if queue is too large
    if (this.updateQueue.length > this.maxQueueSize) {
      const dropped = this.updateQueue.splice(0, this.updateQueue.length - this.maxQueueSize);
      this.droppedUpdates += dropped.length;
    }

    // Process queue asynchronously
    this.processQueue();
  }

  /**
   * Publish multiple indicator updates
   */
  publishBatch(updates: IndicatorUpdate[]): void {
    updates.forEach(update => this.publish(update));
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.updateQueue.length;
  }

  /**
   * Get number of dropped updates
   */
  getDroppedUpdates(): number {
    return this.droppedUpdates;
  }

  /**
   * Clear the update queue
   */
  clearQueue(): void {
    this.updateQueue = [];
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Process the update queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.updateQueue.length > 0) {
        const update = this.updateQueue.shift()!;
        await this.processUpdate(update);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single indicator update
   */
  private async processUpdate(update: IndicatorUpdate): Promise<void> {
    try {
      // Add to series state
      this.seriesState.addIndicatorPoints(update.id, update.points);

      // Notify subscribers
      this.notifySubscribers({
        type: 'update',
        update
      });
    } catch (error) {
      this.notifySubscribers({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error processing update',
        update
      });
    }
  }

  /**
   * Notify all subscribers of an event
   */
  private notifySubscribers(event: IndicatorBusEvent): void {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in indicator bus subscriber:', error);
      }
    });
  }
}

/**
 * Create an indicator bus instance
 */
export const createIndicatorBus = (seriesState: SeriesState): IndicatorBus => {
  return new IndicatorBus(seriesState);
};


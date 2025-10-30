/**
 * Generic ring buffer implementation with O(1) push/pop operations
 */
export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private count = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Ring buffer capacity must be positive');
    }
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Add an item to the buffer
   * If buffer is full, removes the oldest item
   */
  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    
    if (this.count < this.capacity) {
      this.count++;
    } else {
      // Buffer is full, move head to overwrite oldest item
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /**
   * Remove and return the oldest item
   * Returns undefined if buffer is empty
   */
  pop(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }

    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this.count--;
    
    return item;
  }

  /**
   * Get the most recent item without removing it
   */
  peek(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    
    const lastIndex = (this.tail - 1 + this.capacity) % this.capacity;
    return this.buffer[lastIndex];
  }

  /**
   * Get the oldest item without removing it
   */
  peekOldest(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    
    return this.buffer[this.head];
  }

  /**
   * Get the number of items currently in the buffer
   */
  size(): number {
    return this.count;
  }

  /**
   * Check if the buffer is empty
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Check if the buffer is full
   */
  isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Get the maximum capacity of the buffer
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Clear all items from the buffer
   */
  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  /**
   * Get all items in order (oldest to newest)
   */
  toArray(): T[] {
    if (this.count === 0) {
      return [];
    }

    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Get the last N items in order (oldest to newest)
   */
  getLast(n: number): T[] {
    const allItems = this.toArray();
    return allItems.slice(-n);
  }

  /**
   * Iterate over all items in order (oldest to newest)
   */
  *[Symbol.iterator](): Iterator<T> {
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        yield item;
      }
    }
  }

  /**
   * Iterate over the last N items in order (oldest to newest)
   */
  *iterateLast(n: number): Iterator<T> {
    const items = this.getLast(n);
    for (const item of items) {
      yield item;
    }
  }

  /**
   * Find the first item that matches the predicate
   */
  find(predicate: (item: T) => boolean): T | undefined {
    for (const item of this) {
      if (predicate(item)) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Find the last item that matches the predicate
   */
  findLast(predicate: (item: T) => boolean): T | undefined {
    const items = this.toArray();
    for (let i = items.length - 1; i >= 0; i--) {
      if (predicate(items[i])) {
        return items[i];
      }
    }
    return undefined;
  }

  /**
   * Filter items that match the predicate
   */
  filter(predicate: (item: T) => boolean): T[] {
    const result: T[] = [];
    for (const item of this) {
      if (predicate(item)) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Map items to a new type
   */
  map<U>(mapper: (item: T) => U): U[] {
    const result: U[] = [];
    for (const item of this) {
      result.push(mapper(item));
    }
    return result;
  }
}

/**
 * Create a ring buffer with the specified capacity
 */
export const createRingBuffer = <T>(capacity: number): RingBuffer<T> => {
  return new RingBuffer<T>(capacity);
};


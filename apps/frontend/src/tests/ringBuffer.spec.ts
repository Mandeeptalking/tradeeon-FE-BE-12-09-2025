import { describe, it, expect } from 'vitest';
import { RingBuffer, createRingBuffer } from '../engine/state/ringBuffer';

describe('RingBuffer', () => {
  describe('Basic Operations', () => {
    it('should create a ring buffer with specified capacity', () => {
      const buffer = createRingBuffer<number>(5);
      expect(buffer.getCapacity()).toBe(5);
      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.isFull()).toBe(false);
    });

    it('should throw error for zero or negative capacity', () => {
      expect(() => createRingBuffer<number>(0)).toThrow('Ring buffer capacity must be positive');
      expect(() => createRingBuffer<number>(-1)).toThrow('Ring buffer capacity must be positive');
    });

    it('should push and pop items correctly', () => {
      const buffer = createRingBuffer<number>(3);
      
      buffer.push(1);
      expect(buffer.size()).toBe(1);
      expect(buffer.isEmpty()).toBe(false);
      
      buffer.push(2);
      buffer.push(3);
      expect(buffer.size()).toBe(3);
      expect(buffer.isFull()).toBe(true);
      
      expect(buffer.pop()).toBe(1);
      expect(buffer.pop()).toBe(2);
      expect(buffer.pop()).toBe(3);
      expect(buffer.isEmpty()).toBe(true);
    });

    it('should overwrite oldest items when full', () => {
      const buffer = createRingBuffer<number>(3);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4); // Should overwrite 1
      buffer.push(5); // Should overwrite 2
      
      expect(buffer.size()).toBe(3);
      expect(buffer.pop()).toBe(3); // Oldest remaining item
      expect(buffer.pop()).toBe(4);
      expect(buffer.pop()).toBe(5);
    });
  });

  describe('Peek Operations', () => {
    it('should peek the most recent item', () => {
      const buffer = createRingBuffer<number>(3);
      
      buffer.push(1);
      expect(buffer.peek()).toBe(1);
      
      buffer.push(2);
      expect(buffer.peek()).toBe(2);
      
      buffer.push(3);
      expect(buffer.peek()).toBe(3);
    });

    it('should peek the oldest item', () => {
      const buffer = createRingBuffer<number>(3);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      
      expect(buffer.peekOldest()).toBe(1);
      
      buffer.push(4); // Overwrites 1
      expect(buffer.peekOldest()).toBe(2);
    });

    it('should return undefined for peek operations on empty buffer', () => {
      const buffer = createRingBuffer<number>(3);
      
      expect(buffer.peek()).toBeUndefined();
      expect(buffer.peekOldest()).toBeUndefined();
    });
  });

  describe('Array Operations', () => {
    it('should convert to array in correct order', () => {
      const buffer = createRingBuffer<number>(5);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      
      expect(buffer.toArray()).toEqual([1, 2, 3]);
    });

    it('should handle wraparound in toArray', () => {
      const buffer = createRingBuffer<number>(3);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4); // Overwrites 1
      buffer.push(5); // Overwrites 2
      
      expect(buffer.toArray()).toEqual([3, 4, 5]);
    });

    it('should get last N items', () => {
      const buffer = createRingBuffer<number>(5);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      
      expect(buffer.getLast(3)).toEqual([3, 4, 5]);
      expect(buffer.getLast(10)).toEqual([1, 2, 3, 4, 5]); // More than capacity
    });
  });

  describe('Iterator Operations', () => {
    it('should iterate over all items', () => {
      const buffer = createRingBuffer<number>(3);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      
      const items: number[] = [];
      for (const item of buffer) {
        items.push(item);
      }
      
      expect(items).toEqual([1, 2, 3]);
    });

    it('should iterate over last N items', () => {
      const buffer = createRingBuffer<number>(5);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      
      const items: number[] = [];
      for (const item of buffer.iterateLast(3)) {
        items.push(item);
      }
      
      expect(items).toEqual([3, 4, 5]);
    });
  });

  describe('Search Operations', () => {
    it('should find items with predicate', () => {
      const buffer = createRingBuffer<number>(5);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      
      expect(buffer.find(x => x > 3)).toBe(4);
      expect(buffer.find(x => x > 10)).toBeUndefined();
    });

    it('should find last item with predicate', () => {
      const buffer = createRingBuffer<number>(5);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      
      expect(buffer.findLast(x => x > 3)).toBe(5);
      expect(buffer.findLast(x => x > 10)).toBeUndefined();
    });

    it('should filter items with predicate', () => {
      const buffer = createRingBuffer<number>(5);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      
      expect(buffer.filter(x => x % 2 === 0)).toEqual([2, 4]);
    });

    it('should map items to new type', () => {
      const buffer = createRingBuffer<number>(3);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      
      expect(buffer.map(x => x * 2)).toEqual([2, 4, 6]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single item buffer', () => {
      const buffer = createRingBuffer<number>(1);
      
      buffer.push(1);
      expect(buffer.size()).toBe(1);
      expect(buffer.isFull()).toBe(true);
      expect(buffer.peek()).toBe(1);
      expect(buffer.peekOldest()).toBe(1);
      
      buffer.push(2); // Overwrites 1
      expect(buffer.size()).toBe(1);
      expect(buffer.peek()).toBe(2);
      expect(buffer.peekOldest()).toBe(2);
    });

    it('should handle clear operation', () => {
      const buffer = createRingBuffer<number>(3);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      
      expect(buffer.size()).toBe(3);
      
      buffer.clear();
      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.isFull()).toBe(false);
    });

    it('should handle pop on empty buffer', () => {
      const buffer = createRingBuffer<number>(3);
      
      expect(buffer.pop()).toBeUndefined();
      expect(buffer.size()).toBe(0);
    });

    it('should handle overflow by N items', () => {
      const buffer = createRingBuffer<number>(3);
      
      // Add 5 items to a buffer of capacity 3
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      
      expect(buffer.size()).toBe(3);
      expect(buffer.toArray()).toEqual([3, 4, 5]);
    });
  });

  describe('Performance', () => {
    it('should handle large number of operations efficiently', () => {
      const buffer = createRingBuffer<number>(100);
      const start = performance.now();
      
      // Perform 10000 operations
      for (let i = 0; i < 10000; i++) {
        buffer.push(i);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
      expect(buffer.size()).toBe(100);
    });
  });
});


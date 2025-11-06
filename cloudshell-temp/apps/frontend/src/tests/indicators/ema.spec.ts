import { describe, it, expect } from 'vitest';
import { EMAAdapter } from '../../engine/compute/adapters/ema';
import { IndicatorSpec } from '../../contracts/indicator';

describe('EMA Adapter', () => {
  const adapter = new EMAAdapter();
  
  const testCandles = [
    { t: 1000, o: 10, h: 12, l: 9, c: 11, v: 100 },
    { t: 2000, o: 11, h: 13, l: 10, c: 12, v: 110 },
    { t: 3000, o: 12, h: 14, l: 11, c: 13, v: 120 },
    { t: 4000, o: 13, h: 15, l: 12, c: 14, v: 130 },
    { t: 5000, o: 14, h: 16, l: 13, c: 15, v: 140 }
  ];
  
  const testSpec: IndicatorSpec = {
    id: 'ema_3:close@1m',
    name: 'EMA',
    inputs: { period: 3, source: 'close' },
    timeframe: '1m',
    pane: 'price'
  };
  
  describe('warmup', () => {
    it('should return correct warmup period', () => {
      expect(adapter.warmup(testSpec)).toBe(2); // period - 1
    });
  });
  
  describe('dependencies', () => {
    it('should return empty dependencies', () => {
      expect(adapter.dependencies(testSpec)).toEqual([]);
    });
  });
  
  describe('batch computation', () => {
    it('should compute EMA correctly with proper seeding', () => {
      const result = adapter.batch(testSpec, testCandles);
      
      expect(result).toHaveLength(5);
      
      // First two values should be null (warmup)
      expect(result[0].values.ema).toBeNull();
      expect(result[1].values.ema).toBeNull();
      
      // Third value: EMA seed = SMA of [11, 12, 13] = 12
      expect(result[2].values.ema).toBeCloseTo(12, 8);
      
      // Fourth value: EMA calculation
      // α = 2/(3+1) = 0.5
      // EMA = 0.5 * 14 + 0.5 * 12 = 13
      expect(result[3].values.ema).toBeCloseTo(13, 8);
      
      // Fifth value: EMA calculation
      // EMA = 0.5 * 15 + 0.5 * 13 = 14
      expect(result[4].values.ema).toBeCloseTo(14, 8);
    });
    
    it('should handle different periods', () => {
      const period2Spec: IndicatorSpec = {
        ...testSpec,
        inputs: { period: 2, source: 'close' }
      };
      
      const result = adapter.batch(period2Spec, testCandles);
      
      // First value should be null (warmup)
      expect(result[0].values.ema).toBeNull();
      
      // Second value: EMA seed = SMA of [11, 12] = 11.5
      expect(result[1].values.ema).toBeCloseTo(11.5, 8);
      
      // Third value: α = 2/(2+1) = 2/3
      // EMA = (2/3) * 13 + (1/3) * 11.5 = 12.5
      expect(result[2].values.ema).toBeCloseTo(12.5, 8);
    });
    
    it('should handle different source values', () => {
      const highSpec: IndicatorSpec = {
        ...testSpec,
        inputs: { period: 2, source: 'high' }
      };
      
      const result = adapter.batch(highSpec, testCandles);
      
      // First value should be null (warmup)
      expect(result[0].values.ema).toBeNull();
      
      // Second value: EMA seed = SMA of [12, 13] = 12.5
      expect(result[1].values.ema).toBeCloseTo(12.5, 8);
    });
  });
  
  describe('incremental computation', () => {
    it('should compute incremental updates correctly', () => {
      const initialState = {
        lastFinalizedIndex: -1,
        lastPartialValues: {},
        rollingSums: {},
        emaSeeds: {},
        rsiSmoothedGains: {},
        rsiSmoothedLosses: {},
        bbVarianceState: {}
      };
      
      // First update
      const result1 = adapter.incremental(testSpec, initialState, {
        t: 1000,
        o: 10,
        h: 12,
        l: 9,
        c: 11,
        v: 100,
        isPartial: false
      });
      
      expect(result1.pointsDelta[0].values.ema).toBeNull(); // Still in warmup
      
      // Second update
      const result2 = adapter.incremental(testSpec, result1.nextState, {
        t: 2000,
        o: 11,
        h: 13,
        l: 10,
        c: 12,
        v: 110,
        isPartial: false
      });
      
      expect(result2.pointsDelta[0].values.ema).toBeNull(); // Still in warmup
      
      // Third update - first valid EMA (seeded with SMA)
      const result3 = adapter.incremental(testSpec, result2.nextState, {
        t: 3000,
        o: 12,
        h: 14,
        l: 11,
        c: 13,
        v: 120,
        isPartial: false
      });
      
      expect(result3.pointsDelta[0].values.ema).toBeCloseTo(12, 8); // SMA of [11, 12, 13]
    });
    
    it('should handle partial updates', () => {
      const state = {
        lastFinalizedIndex: 2,
        lastPartialValues: { ema: 12 },
        rollingSums: {},
        emaSeeds: { ema_3: 12 },
        rsiSmoothedGains: {},
        rsiSmoothedLosses: {},
        bbVarianceState: {},
        ema_values_3: [11, 12, 13]
      };
      
      const result = adapter.incremental(testSpec, state, {
        t: 4000,
        o: 13,
        h: 15,
        l: 12,
        c: 14,
        v: 130,
        isPartial: true
      });
      
      expect(result.pointsDelta[0].status).toBe('partial');
      // α = 0.5, EMA = 0.5 * 14 + 0.5 * 12 = 13
      expect(result.pointsDelta[0].values.ema).toBeCloseTo(13, 8);
    });
  });
  
  describe('edge cases', () => {
    it('should handle period 1', () => {
      const period1Spec: IndicatorSpec = {
        ...testSpec,
        inputs: { period: 1, source: 'close' }
      };
      
      const result = adapter.batch(period1Spec, testCandles);
      
      // All values should be valid (no warmup for period 1)
      expect(result[0].values.ema).toBeCloseTo(11, 8);
      expect(result[1].values.ema).toBeCloseTo(12, 8);
      expect(result[2].values.ema).toBeCloseTo(13, 8);
    });
    
    it('should handle identical values', () => {
      const identicalCandles = [
        { t: 1000, o: 10, h: 10, l: 10, c: 10, v: 100 },
        { t: 2000, o: 10, h: 10, l: 10, c: 10, v: 110 },
        { t: 3000, o: 10, h: 10, l: 10, c: 10, v: 120 },
        { t: 4000, o: 10, h: 10, l: 10, c: 10, v: 130 }
      ];
      
      const result = adapter.batch(testSpec, identicalCandles);
      
      expect(result[0].values.ema).toBeNull();
      expect(result[1].values.ema).toBeNull();
      expect(result[2].values.ema).toBeCloseTo(10, 8); // SMA seed
      expect(result[3].values.ema).toBeCloseTo(10, 8); // EMA remains 10
    });
  });
});


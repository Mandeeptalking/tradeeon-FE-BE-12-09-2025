import { describe, it, expect } from 'vitest';
import { 
  validateCandle, 
  validateIndicatorSpec, 
  validateIndicatorInstanceMeta, 
  validateIndicatorUpdate,
  validateIndicatorPoint 
} from '../contracts/validation';
import { Candle, IndicatorSpec, IndicatorInstanceMeta, IndicatorUpdate, IndicatorPoint } from '../contracts/indicator';

describe('Contract Validation', () => {
  describe('Candle Validation', () => {
    it('should validate a valid candle', () => {
      const validCandle: Candle = {
        t: 1758614400,
        o: 50000.0,
        h: 50100.0,
        l: 49900.0,
        c: 50050.0,
        v: 1000.0,
        f: true
      };

      const result = validateCandle(validCandle);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validCandle);
    });

    it('should reject invalid candle with high < max(open, close)', () => {
      const invalidCandle = {
        t: 1758614400,
        o: 50000.0,
        h: 49900.0, // Invalid: high < open
        l: 49900.0,
        c: 50050.0,
        v: 1000.0,
        f: true
      };

      const result = validateCandle(invalidCandle);
      expect(result.success).toBe(false);
      expect(result.error).toContain('High must be >= max(open, close)');
    });

    it('should reject invalid candle with low > min(open, close)', () => {
      const invalidCandle = {
        t: 1758614400,
        o: 50000.0,
        h: 50100.0,
        l: 50050.0, // Invalid: low > close
        c: 50000.0,
        v: 1000.0,
        f: true
      };

      const result = validateCandle(invalidCandle);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Low must be <= min(open, close)');
    });

    it('should reject candle with negative volume', () => {
      const invalidCandle = {
        t: 1758614400,
        o: 50000.0,
        h: 50100.0,
        l: 49900.0,
        c: 50050.0,
        v: -1000.0, // Invalid: negative volume
        f: true
      };

      const result = validateCandle(invalidCandle);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too small');
    });
  });

  describe('IndicatorSpec Validation', () => {
    it('should validate a valid indicator spec', () => {
      const validSpec: IndicatorSpec = {
        id: 'rsi_14@1m',
        name: 'RSI',
        inputs: { period: 14, source: 'close' },
        timeframe: '1m',
        pane: 'new',
        style: { color: '#6a5acd' },
        version: '1.0.0'
      };

      const result = validateIndicatorSpec(validSpec);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validSpec);
    });

    it('should reject indicator spec with invalid timeframe', () => {
      const invalidSpec = {
        id: 'rsi_14@1m',
        name: 'RSI',
        inputs: { period: 14 },
        timeframe: '2m', // Invalid timeframe
        pane: 'new'
      };

      const result = validateIndicatorSpec(invalidSpec);
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeframe');
    });

    it('should reject indicator spec with empty name', () => {
      const invalidSpec = {
        id: 'rsi_14@1m',
        name: '', // Invalid: empty name
        inputs: { period: 14 },
        timeframe: '1m',
        pane: 'new'
      };

      const result = validateIndicatorSpec(invalidSpec);
      expect(result.success).toBe(false);
      expect(result.error).toContain('name');
    });
  });

  describe('IndicatorInstanceMeta Validation', () => {
    it('should validate a valid indicator instance meta', () => {
      const validMeta: IndicatorInstanceMeta = {
        id: 'rsi_14@1m',
        outputsMeta: [
          { key: 'rsi', type: 'line', overlay: false, levels: [30, 50, 70] }
        ],
        warmup: 14,
        defaultPane: 'new'
      };

      const result = validateIndicatorInstanceMeta(validMeta);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validMeta);
    });

    it('should reject indicator instance meta with invalid output type', () => {
      const invalidMeta = {
        id: 'rsi_14@1m',
        outputsMeta: [
          { key: 'rsi', type: 'invalid', overlay: false } // Invalid type
        ],
        warmup: 14,
        defaultPane: 'new'
      };

      const result = validateIndicatorInstanceMeta(invalidMeta);
      expect(result.success).toBe(false);
      expect(result.error).toContain('type');
    });

    it('should reject indicator instance meta with negative warmup', () => {
      const invalidMeta = {
        id: 'rsi_14@1m',
        outputsMeta: [
          { key: 'rsi', type: 'line', overlay: false }
        ],
        warmup: -1, // Invalid: negative warmup
        defaultPane: 'new'
      };

      const result = validateIndicatorInstanceMeta(invalidMeta);
      expect(result.success).toBe(false);
      expect(result.error).toContain('warmup');
    });
  });

  describe('IndicatorUpdate Validation', () => {
    it('should validate a valid indicator update', () => {
      const validUpdate: IndicatorUpdate = {
        id: 'rsi_14@1m',
        points: [
          {
            t: 1758614400,
            values: { rsi: 45.2 },
            status: 'final'
          },
          {
            t: 1758614460,
            values: { rsi: 47.8 },
            status: 'partial'
          }
        ]
      };

      const result = validateIndicatorUpdate(validUpdate);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validUpdate);
    });

    it('should reject indicator update with invalid status', () => {
      const invalidUpdate = {
        id: 'rsi_14@1m',
        points: [
          {
            t: 1758614400,
            values: { rsi: 45.2 },
            status: 'invalid' // Invalid status
          }
        ]
      };

      const result = validateIndicatorUpdate(invalidUpdate);
      expect(result.success).toBe(false);
      expect(result.error).toContain('status');
    });

    it('should reject indicator update with empty points array', () => {
      const invalidUpdate = {
        id: 'rsi_14@1m',
        points: [] // Invalid: empty points
      };

      const result = validateIndicatorUpdate(invalidUpdate);
      expect(result.success).toBe(false);
      expect(result.error).toContain('points');
    });
  });

  describe('IndicatorPoint Validation', () => {
    it('should validate a valid indicator point', () => {
      const validPoint: IndicatorPoint = {
        t: 1758614400,
        values: { rsi: 45.2, macd: 12.5 },
        status: 'final'
      };

      const result = validateIndicatorPoint(validPoint);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validPoint);
    });

    it('should reject indicator point with negative timestamp', () => {
      const invalidPoint = {
        t: -1, // Invalid: negative timestamp
        values: { rsi: 45.2 },
        status: 'final'
      };

      const result = validateIndicatorPoint(invalidPoint);
      expect(result.success).toBe(false);
      expect(result.error).toContain('t');
    });

    it('should reject indicator point with invalid status', () => {
      const invalidPoint = {
        t: 1758614400,
        values: { rsi: 45.2 },
        status: 'invalid' // Invalid status
      };

      const result = validateIndicatorPoint(invalidPoint);
      expect(result.success).toBe(false);
      expect(result.error).toContain('status');
    });
  });
});

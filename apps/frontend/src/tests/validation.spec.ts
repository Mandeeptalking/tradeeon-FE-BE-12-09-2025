import { describe, it, expect } from 'vitest';
import { 
  validateCandle, 
  validateIndicatorSpec, 
  validateIndicatorInstanceMeta, 
  validateIndicatorUpdate, 
  validateIndicatorPoint,
  validateBatch
} from '../contracts/validation';
import { Candle, IndicatorSpec, IndicatorInstanceMeta, IndicatorUpdate, IndicatorPoint } from '../contracts';

describe('Zod Validation System', () => {
  describe('Candle Validation', () => {
    it('should validate valid candle data', () => {
      const validCandle = {
        t: 1640995200, // 2022-01-01 00:00:00
        o: 100.0,
        h: 105.0,
        l: 95.0,
        c: 102.0,
        v: 1000,
        f: true
      };

      const result = validateCandle(validCandle);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validCandle);
    });

    it('should reject invalid candle data', () => {
      const invalidCandle = {
        t: 1640995200,
        o: 100.0,
        h: 90.0, // Invalid: high < open
        l: 95.0,
        c: 102.0,
        v: 1000
      };

      const result = validateCandle(invalidCandle);
      expect(result.success).toBe(false);
      expect(result.error).toContain('High must be >= max(open, close)');
    });

    it('should reject candle with negative values', () => {
      const invalidCandle = {
        t: -1, // Invalid: negative timestamp
        o: 100.0,
        h: 105.0,
        l: 95.0,
        c: 102.0,
        v: 1000
      };

      const result = validateCandle(invalidCandle);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Expected number to be positive');
    });
  });

  describe('IndicatorSpec Validation', () => {
    it('should validate valid indicator spec', () => {
      const validSpec = {
        id: 'rsi_14:close@15m',
        name: 'RSI',
        inputs: { period: 14, source: 'close' },
        timeframe: '15m',
        pane: 'new' as const,
        style: { color: '#ff0000' },
        version: '1.0.0'
      };

      const result = validateIndicatorSpec(validSpec);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validSpec);
    });

    it('should reject invalid timeframe', () => {
      const invalidSpec = {
        id: 'rsi_14:close@15m',
        name: 'RSI',
        inputs: { period: 14, source: 'close' },
        timeframe: '2m', // Invalid timeframe
        pane: 'new' as const
      };

      const result = validateIndicatorSpec(invalidSpec);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid enum value');
    });

    it('should reject empty name', () => {
      const invalidSpec = {
        id: 'rsi_14:close@15m',
        name: '', // Invalid: empty name
        inputs: { period: 14, source: 'close' },
        timeframe: '15m',
        pane: 'new' as const
      };

      const result = validateIndicatorSpec(invalidSpec);
      expect(result.success).toBe(false);
      expect(result.error).toContain('String must contain at least 1 character(s)');
    });
  });

  describe('IndicatorInstanceMeta Validation', () => {
    it('should validate valid instance meta', () => {
      const validMeta = {
        id: 'rsi_14:close@15m',
        outputsMeta: [
          {
            key: 'rsi',
            type: 'line' as const,
            overlay: false,
            levels: [30, 50, 70]
          }
        ],
        warmup: 14,
        defaultPane: 'new' as const
      };

      const result = validateIndicatorInstanceMeta(validMeta);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validMeta);
    });

    it('should reject invalid output type', () => {
      const invalidMeta = {
        id: 'rsi_14:close@15m',
        outputsMeta: [
          {
            key: 'rsi',
            type: 'invalid' as any, // Invalid type
            overlay: false
          }
        ],
        warmup: 14,
        defaultPane: 'new' as const
      };

      const result = validateIndicatorInstanceMeta(invalidMeta);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid enum value');
    });
  });

  describe('IndicatorPoint Validation', () => {
    it('should validate valid indicator point', () => {
      const validPoint = {
        t: 1640995200,
        values: { rsi: 65.5, macd: 12.3 },
        status: 'final' as const
      };

      const result = validateIndicatorPoint(validPoint);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validPoint);
    });

    it('should validate point with null values', () => {
      const validPoint = {
        t: 1640995200,
        values: { rsi: null, macd: 12.3 },
        status: 'partial' as const
      };

      const result = validateIndicatorPoint(validPoint);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validPoint);
    });

    it('should reject invalid status', () => {
      const invalidPoint = {
        t: 1640995200,
        values: { rsi: 65.5 },
        status: 'invalid' as any // Invalid status
      };

      const result = validateIndicatorPoint(invalidPoint);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid enum value');
    });
  });

  describe('IndicatorUpdate Validation', () => {
    it('should validate valid indicator update', () => {
      const validUpdate = {
        id: 'rsi_14:close@15m',
        points: [
          {
            t: 1640995200,
            values: { rsi: 65.5 },
            status: 'final' as const
          },
          {
            t: 1640995260,
            values: { rsi: 67.2 },
            status: 'final' as const
          }
        ]
      };

      const result = validateIndicatorUpdate(validUpdate);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validUpdate);
    });

    it('should reject empty points array', () => {
      const invalidUpdate = {
        id: 'rsi_14:close@15m',
        points: [] // Invalid: empty array
      };

      const result = validateIndicatorUpdate(invalidUpdate);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Array must contain at least 1 element(s)');
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple candles', () => {
      const candles = [
        {
          t: 1640995200,
          o: 100.0,
          h: 105.0,
          l: 95.0,
          c: 102.0,
          v: 1000,
          f: true
        },
        {
          t: 1640995260,
          o: 102.0,
          h: 108.0,
          l: 98.0,
          c: 106.0,
          v: 1200,
          f: true
        },
        {
          t: 1640995320,
          o: 106.0,
          h: 110.0,
          l: 104.0,
          c: 108.0,
          v: 800,
          f: true
        }
      ];

      const result = validateBatch(validateCandle, candles);
      expect(result.valid).toHaveLength(3);
      expect(result.invalid).toHaveLength(0);
    });

    it('should separate valid and invalid items', () => {
      const mixedCandles = [
        {
          t: 1640995200,
          o: 100.0,
          h: 105.0,
          l: 95.0,
          c: 102.0,
          v: 1000,
          f: true
        },
        {
          t: 1640995260,
          o: 102.0,
          h: 90.0, // Invalid: high < open
          l: 98.0,
          c: 106.0,
          v: 1200,
          f: true
        },
        {
          t: 1640995320,
          o: 106.0,
          h: 110.0,
          l: 104.0,
          c: 108.0,
          v: 800,
          f: true
        }
      ];

      const result = validateBatch(validateCandle, mixedCandles);
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].index).toBe(1);
      expect(result.invalid[0].error).toContain('High must be >= max(open, close)');
    });
  });

  describe('Real-world Data Validation', () => {
    it('should validate Binance kline data', () => {
      const binanceKline = [
        1640995200000, // timestamp
        "100.0",       // open
        "105.0",       // high
        "95.0",        // low
        "102.0",       // close
        "1000.0",      // volume
        1640995259999, // close time
        "1000.0",      // quote asset volume
        10,            // trades count
        "500.0",       // taker buy base asset volume
        "500.0",       // taker buy quote asset volume
        "0"            // ignore
      ];

      // Convert Binance format to our Candle format
      const candle = {
        t: Math.floor(binanceKline[0] / 1000),
        o: parseFloat(binanceKline[1]),
        h: parseFloat(binanceKline[2]),
        l: parseFloat(binanceKline[3]),
        c: parseFloat(binanceKline[4]),
        v: parseFloat(binanceKline[5]),
        f: true
      };

      const result = validateCandle(candle);
      expect(result.success).toBe(true);
    });

    it('should validate RSI indicator data', () => {
      const rsiSpec = {
        id: 'rsi_14:close@1m',
        name: 'RSI',
        inputs: { period: 14, source: 'close' },
        timeframe: '1m',
        pane: 'new' as const
      };

      const rsiMeta = {
        id: 'rsi_14:close@1m',
        outputsMeta: [
          {
            key: 'rsi',
            type: 'line' as const,
            overlay: false,
            levels: [30, 50, 70]
          }
        ],
        warmup: 14,
        defaultPane: 'new' as const
      };

      const rsiUpdate = {
        id: 'rsi_14:close@1m',
        points: [
          {
            t: 1640995200,
            values: { rsi: 65.5 },
            status: 'final' as const
          }
        ]
      };

      expect(validateIndicatorSpec(rsiSpec).success).toBe(true);
      expect(validateIndicatorInstanceMeta(rsiMeta).success).toBe(true);
      expect(validateIndicatorUpdate(rsiUpdate).success).toBe(true);
    });
  });
});


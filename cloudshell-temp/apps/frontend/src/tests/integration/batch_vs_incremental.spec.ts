import { describe, it, expect } from 'vitest';
import { SMAAdapter, EMAAdapter, RSIWilderAdapter, MACDAdapter, BollingerBandsAdapter } from '../../engine/compute/adapters';
import { IndicatorSpec } from '../../contracts/indicator';

describe('Batch vs Incremental Equivalence', () => {
  // Generate test data
  const generateTestCandles = (count: number) => {
    const candles = [];
    let price = 100;
    
    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * 2; // Random change between -1 and 1
      price += change;
      
      candles.push({
        t: 1000 + i * 60000, // 1 minute intervals
        o: price - 0.5,
        h: price + 0.5,
        l: price - 1,
        c: price,
        v: 100 + i
      });
    }
    
    return candles;
  };
  
  const testCases = [
    {
      name: 'SMA',
      adapter: new SMAAdapter(),
      spec: {
        id: 'sma_10:close@1m',
        name: 'SMA',
        inputs: { period: 10, source: 'close' },
        timeframe: '1m',
        pane: 'price' as const
      }
    },
    {
      name: 'EMA',
      adapter: new EMAAdapter(),
      spec: {
        id: 'ema_10:close@1m',
        name: 'EMA',
        inputs: { period: 10, source: 'close' },
        timeframe: '1m',
        pane: 'price' as const
      }
    },
    {
      name: 'RSI',
      adapter: new RSIWilderAdapter(),
      spec: {
        id: 'rsi_14:close@1m',
        name: 'RSI',
        inputs: { period: 14, source: 'close' },
        timeframe: '1m',
        pane: 'new' as const
      }
    },
    {
      name: 'MACD',
      adapter: new MACDAdapter(),
      spec: {
        id: 'macd_12_26_9:close@1m',
        name: 'MACD',
        inputs: { fast: 12, slow: 26, signal: 9, source: 'close' },
        timeframe: '1m',
        pane: 'new' as const
      }
    },
    {
      name: 'Bollinger Bands',
      adapter: new BollingerBandsAdapter(),
      spec: {
        id: 'bb_20_2:close@1m',
        name: 'BB',
        inputs: { period: 20, k: 2, source: 'close' },
        timeframe: '1m',
        pane: 'price' as const
      }
    }
  ];
  
  testCases.forEach(({ name, adapter, spec }) => {
    describe(`${name} Batch vs Incremental`, () => {
      it('should produce identical results for batch and incremental computation', () => {
        const candles = generateTestCandles(100);
        
        // Compute batch
        const batchResult = adapter.batch(spec, candles);
        
        // Compute incremental
        let incrementalResult: any[] = [];
        let state = {
          lastFinalizedIndex: -1,
          lastPartialValues: {},
          rollingSums: {},
          emaSeeds: {},
          rsiSmoothedGains: {},
          rsiSmoothedLosses: {},
          bbVarianceState: {}
        };
        
        // Simulate incremental updates
        for (let i = 0; i < candles.length; i++) {
          const candle = candles[i];
          
          // Send partial update
          const partialResult = adapter.incremental(spec, state, {
            ...candle,
            isPartial: true
          });
          
          incrementalResult.push(...partialResult.pointsDelta);
          state = partialResult.nextState;
          
          // Send final update
          const finalResult = adapter.incremental(spec, state, {
            ...candle,
            isPartial: false
          });
          
          // Replace the partial with final
          incrementalResult[incrementalResult.length - 1] = finalResult.pointsDelta[0];
          state = finalResult.nextState;
        }
        
        // Compare results
        expect(incrementalResult).toHaveLength(batchResult.length);
        
        for (let i = 0; i < batchResult.length; i++) {
          const batchPoint = batchResult[i];
          const incrementalPoint = incrementalResult[i];
          
          expect(incrementalPoint.t).toBe(batchPoint.t);
          expect(incrementalPoint.status).toBe(batchPoint.status);
          
          // Compare values with tolerance
          Object.keys(batchPoint.values).forEach(key => {
            const batchValue = batchPoint.values[key];
            const incrementalValue = incrementalPoint.values[key];
            
            if (batchValue === null) {
              expect(incrementalValue).toBeNull();
            } else {
              expect(incrementalValue).toBeCloseTo(batchValue, 8);
            }
          });
        }
      });
      
      it('should handle partial updates correctly', () => {
        const candles = generateTestCandles(50);
        
        // Compute batch
        const batchResult = adapter.batch(spec, candles);
        
        // Compute incremental with partial updates
        let incrementalResult: any[] = [];
        let state = {
          lastFinalizedIndex: -1,
          lastPartialValues: {},
          rollingSums: {},
          emaSeeds: {},
          rsiSmoothedGains: {},
          rsiSmoothedLosses: {},
          bbVarianceState: {}
        };
        
        for (let i = 0; i < candles.length; i++) {
          const candle = candles[i];
          
          // Send multiple partial updates
          for (let p = 0; p < 3; p++) {
            const partialResult = adapter.incremental(spec, state, {
              ...candle,
              isPartial: true
            });
            
            if (p === 0) {
              incrementalResult.push(...partialResult.pointsDelta);
            } else {
              // Update the last point
              incrementalResult[incrementalResult.length - 1] = partialResult.pointsDelta[0];
            }
            
            state = partialResult.nextState;
          }
          
          // Send final update
          const finalResult = adapter.incremental(spec, state, {
            ...candle,
            isPartial: false
          });
          
          // Replace with final
          incrementalResult[incrementalResult.length - 1] = finalResult.pointsDelta[0];
          state = finalResult.nextState;
        }
        
        // Compare final results
        expect(incrementalResult).toHaveLength(batchResult.length);
        
        for (let i = 0; i < batchResult.length; i++) {
          const batchPoint = batchResult[i];
          const incrementalPoint = incrementalResult[i];
          
          expect(incrementalPoint.t).toBe(batchPoint.t);
          expect(incrementalPoint.status).toBe('final');
          
          Object.keys(batchPoint.values).forEach(key => {
            const batchValue = batchPoint.values[key];
            const incrementalValue = incrementalPoint.values[key];
            
            if (batchValue === null) {
              expect(incrementalValue).toBeNull();
            } else {
              expect(incrementalValue).toBeCloseTo(batchValue, 8);
            }
          });
        }
      });
    });
  });
  
  describe('Performance Tests', () => {
    it('should compute 5 indicators over 1000 candles within reasonable time', () => {
      const candles = generateTestCandles(1000);
      const specs = testCases.map(tc => tc.spec);
      const adapters = testCases.map(tc => tc.adapter);
      
      const startTime = performance.now();
      
      // Compute all indicators
      specs.forEach((spec, index) => {
        const adapter = adapters[index];
        const result = adapter.batch(spec, candles);
        expect(result).toHaveLength(candles.length);
      });
      
      const endTime = performance.now();
      const computeTime = endTime - startTime;
      
      console.log(`Computed 5 indicators over 1000 candles in ${computeTime.toFixed(2)}ms`);
      
      // Should complete within 1000ms (1 second)
      expect(computeTime).toBeLessThan(1000);
    });
  });
});


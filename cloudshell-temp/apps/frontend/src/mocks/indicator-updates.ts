import { IndicatorUpdate } from '../contracts/indicator';

/**
 * Mock indicator updates for testing
 */
export const mockIndicatorUpdates: IndicatorUpdate[] = [
  {
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
        status: 'final'
      },
      {
        t: 1758614520,
        values: { rsi: 52.1 },
        status: 'final'
      },
      {
        t: 1758614580,
        values: { rsi: 48.9 },
        status: 'final'
      },
      {
        t: 1758614640,
        values: { rsi: 51.3 },
        status: 'final'
      }
    ]
  },
  {
    id: 'macd_12_26_9@1m',
    points: [
      {
        t: 1758614400,
        values: { macd: 12.5, signal: 8.2, hist: 4.3 },
        status: 'final'
      },
      {
        t: 1758614460,
        values: { macd: 15.8, signal: 10.1, hist: 5.7 },
        status: 'final'
      },
      {
        t: 1758614520,
        values: { macd: 18.2, signal: 12.5, hist: 5.7 },
        status: 'final'
      },
      {
        t: 1758614580,
        values: { macd: 16.9, signal: 14.2, hist: 2.7 },
        status: 'final'
      },
      {
        t: 1758614640,
        values: { macd: 19.1, signal: 16.8, hist: 2.3 },
        status: 'final'
      }
    ]
  },
  {
    id: 'ema_20@1m',
    points: [
      {
        t: 1758614400,
        values: { ema: 49950.0 },
        status: 'final'
      },
      {
        t: 1758614460,
        values: { ema: 49980.0 },
        status: 'final'
      },
      {
        t: 1758614520,
        values: { ema: 50020.0 },
        status: 'final'
      },
      {
        t: 1758614580,
        values: { ema: 50060.0 },
        status: 'final'
      },
      {
        t: 1758614640,
        values: { ema: 50100.0 },
        status: 'final'
      }
    ]
  },
  {
    id: 'bb_20_2@1m',
    points: [
      {
        t: 1758614400,
        values: { bb_upper: 50200.0, bb_middle: 50000.0, bb_lower: 49800.0 },
        status: 'final'
      },
      {
        t: 1758614460,
        values: { bb_upper: 50250.0, bb_middle: 50050.0, bb_lower: 49850.0 },
        status: 'final'
      },
      {
        t: 1758614520,
        values: { bb_upper: 50300.0, bb_middle: 50100.0, bb_lower: 49900.0 },
        status: 'final'
      },
      {
        t: 1758614580,
        values: { bb_upper: 50350.0, bb_middle: 50150.0, bb_lower: 49950.0 },
        status: 'final'
      },
      {
        t: 1758614640,
        values: { bb_upper: 50400.0, bb_middle: 50200.0, bb_lower: 50000.0 },
        status: 'final'
      }
    ]
  }
];

/**
 * Generate mock indicator updates for a given indicator ID
 */
export const generateMockIndicatorUpdate = (
  indicatorId: string,
  count: number = 10
): IndicatorUpdate => {
  const baseTime = Math.floor(Date.now() / 1000) - (count * 60);
  
  const points = Array.from({ length: count }, (_, i) => ({
    t: baseTime + (i * 60),
    values: generateMockValues(indicatorId),
    status: 'final' as const
  }));

  return {
    id: indicatorId,
    points
  };
};

/**
 * Generate mock values for an indicator
 */
const generateMockValues = (indicatorId: string): Record<string, number> => {
  const basePrice = 50000;
  const randomFactor = (Math.random() - 0.5) * 0.02;

  switch (indicatorId) {
    case 'rsi_14@1m':
      return {
        rsi: Math.max(0, Math.min(100, 50 + Math.sin(Date.now() * 0.001) * 30 + randomFactor * 100))
      };
    
    case 'macd_12_26_9@1m':
      return {
        macd: basePrice * randomFactor,
        signal: basePrice * randomFactor * 0.8,
        hist: basePrice * randomFactor * 0.2
      };
    
    case 'ema_20@1m':
      return {
        ema: basePrice * (1 + randomFactor)
      };
    
    case 'bb_20_2@1m':
      const bbCenter = basePrice * (1 + randomFactor);
      const bbWidth = basePrice * 0.02;
      return {
        bb_upper: bbCenter + bbWidth,
        bb_middle: bbCenter,
        bb_lower: bbCenter - bbWidth
      };
    
    default:
      return {};
  }
};

/**
 * Generate a sequence of partial and final updates for testing
 */
export const generatePartialFinalSequence = (
  indicatorId: string,
  startTime: number,
  intervalSeconds: number = 60
): IndicatorUpdate[] => {
  const updates: IndicatorUpdate[] = [];
  
  // Generate 3 bars with partial and final updates
  for (let bar = 0; bar < 3; bar++) {
    const barTime = startTime + (bar * intervalSeconds);
    
    // Partial updates (3 per bar)
    for (let partial = 0; partial < 3; partial++) {
      const partialTime = barTime + (partial * 20); // 20 seconds apart
      updates.push({
        id: indicatorId,
        points: [{
          t: barTime, // Always use bar time for grouping
          values: generateMockValues(indicatorId),
          status: 'partial'
        }]
      });
    }
    
    // Final update
    updates.push({
      id: indicatorId,
      points: [{
        t: barTime,
        values: generateMockValues(indicatorId),
        status: 'final'
      }]
    });
  }
  
  return updates;
};


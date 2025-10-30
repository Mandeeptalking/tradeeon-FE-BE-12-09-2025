// Central indicator management system
export * from './registry';
export * from './types';

// Import and register all indicators by category
import { EMA } from './trend';
import { RSI } from './momentum';
import MACD from './macd';
import BOLLINGER_BANDS from './bollinger';
import STOCHASTIC from './stochastic';
import WILLIAMS_R from './williamsR';
import ATR from './atr';
import ADX from './adx';

// Re-export individual indicators for direct access
export { EMA, RSI, MACD, BOLLINGER_BANDS, STOCHASTIC, WILLIAMS_R, ATR, ADX };

// Indicator categories for UI organization
export const INDICATOR_CATEGORIES = {
  TREND: {
    name: 'Trend Analysis',
    indicators: ['EMA', 'SMA', 'WMA']
  },
  MOMENTUM: {
    name: 'Momentum Oscillators',
    indicators: ['RSI', 'MACD', 'STOCHASTIC', 'WILLIAMS_R', 'ADX']
  },
  VOLATILITY: {
    name: 'Volatility',
    indicators: ['BOLLINGER_BANDS', 'ATR']
  },
  VOLUME: {
    name: 'Volume',
    indicators: ['Volume', 'OBV', 'VWAP']
  }
} as const;

// Available indicators with metadata
export const AVAILABLE_INDICATORS = {
  EMA: {
    name: 'Exponential Moving Average',
    shortName: 'EMA',
    category: 'TREND',
    pane: 'price',
    description: 'Trend-following indicator that gives more weight to recent prices',
    defaultParams: {
      length: 20,
      source: 'close'
    },
    defaultStyle: {
      color: '#FFA500',
      width: 1.8
    },
    paramConfig: {
      length: { type: 'number', min: 1, max: 200, step: 1, label: 'Length' },
      source: { 
        type: 'select', 
        options: ['close', 'open', 'high', 'low', 'hlc3', 'ohlc4'],
        label: 'Source'
      }
    }
  },
  RSI: {
    name: 'Relative Strength Index',
    shortName: 'RSI',
    category: 'MOMENTUM',
    pane: 'rsi',
    description: 'Momentum oscillator measuring speed and magnitude of price changes',
    defaultParams: {
      length: 14,
      source: 'close',
      smoothingType: 'EMA',
      smoothingLength: 14,
      showGradientFill: true,
      overboughtLevel: 70,
      oversoldLevel: 30
    },
    defaultStyle: {
      color: '#7E57C2',
      width: 1.5
    },
    paramConfig: {
      length: { type: 'number', min: 1, max: 100, step: 1, label: 'RSI Length' },
      source: { 
        type: 'select', 
        options: ['close', 'open', 'high', 'low', 'hlc3', 'ohlc4'],
        label: 'Source'
      },
      smoothingType: {
        type: 'select',
        options: ['None', 'SMA', 'EMA', 'RMA', 'WMA'],
        label: 'Smoothing Type'
      },
      smoothingLength: { type: 'number', min: 1, max: 50, step: 1, label: 'Smoothing Length' },
      overboughtLevel: { type: 'number', min: 50, max: 95, step: 5, label: 'Overbought Level' },
      oversoldLevel: { type: 'number', min: 5, max: 50, step: 5, label: 'Oversold Level' },
      showGradientFill: { type: 'boolean', label: 'Show Gradient Fill' }
    }
  },
  MACD: {
    name: 'Moving Average Convergence Divergence',
    shortName: 'MACD',
    category: 'MOMENTUM',
    pane: 'macd',
    description: 'Trend-following momentum indicator showing relationship between two moving averages',
    defaultParams: {
      fast: 12,
      slow: 26,
      signal: 9
    },
    defaultStyle: {
      color: '#2196F3',
      width: 1.5
    },
    paramConfig: {
      fast: { type: 'number', min: 1, max: 50, step: 1, label: 'Fast Period' },
      slow: { type: 'number', min: 1, max: 100, step: 1, label: 'Slow Period' },
      signal: { type: 'number', min: 1, max: 50, step: 1, label: 'Signal Period' }
    }
  },
  BOLLINGER_BANDS: {
    name: 'Bollinger Bands',
    shortName: 'BB',
    category: 'VOLATILITY',
    pane: 'price',
    description: 'Volatility indicator showing price bands around a moving average',
    defaultParams: {
      period: 20,
      std_dev: 2
    },
    defaultStyle: {
      upperColor: '#8B4513',
      middleColor: '#4169E1',
      lowerColor: '#8B4513',
      fillColor: 'rgba(100, 149, 237, 0.1)',
      lineWidth: 1
    },
    paramConfig: {
      period: { type: 'number', min: 1, max: 100, step: 1, label: 'Period' },
      std_dev: { type: 'number', min: 0.1, max: 5, step: 0.1, label: 'Standard Deviation' },
      source: { 
        type: 'select', 
        options: ['close', 'open', 'high', 'low', 'hlc3', 'ohlc4'],
        label: 'Source'
      }
    }
  },
  STOCHASTIC: {
    name: 'Stochastic Oscillator',
    shortName: 'Stoch',
    category: 'MOMENTUM',
    pane: 'stochastic',
    description: 'Momentum oscillator comparing closing price to price range over a period',
    defaultParams: {
      k_period: 14,
      d_period: 3,
      smooth_k: 1
    },
    defaultStyle: {
      kColor: '#FF6B6B',
      dColor: '#4ECDC4',
      lineWidth: 1.5
    },
    paramConfig: {
      k_period: { type: 'number', min: 1, max: 50, step: 1, label: '%K Period' },
      d_period: { type: 'number', min: 1, max: 20, step: 1, label: '%D Period' },
      smooth_k: { type: 'number', min: 1, max: 10, step: 1, label: '%K Smoothing' }
    }
  },
  WILLIAMS_R: {
    name: 'Williams %R',
    shortName: 'Williams %R',
    category: 'MOMENTUM',
    pane: 'williams_r',
    description: 'Momentum oscillator with inverted scale (-100 to 0)',
    defaultParams: {
      period: 14
    },
    defaultStyle: {
      color: '#FF9800',
      width: 1.5
    },
    paramConfig: {
      period: { type: 'number', min: 1, max: 50, step: 1, label: 'Period' }
    }
  },
  ATR: {
    name: 'Average True Range',
    shortName: 'ATR',
    category: 'VOLATILITY',
    pane: 'atr',
    description: 'Measures market volatility by averaging true ranges over a period',
    defaultParams: {
      period: 14
    },
    defaultStyle: {
      color: '#9C27B0',
      width: 1.5
    },
    paramConfig: {
      period: { type: 'number', min: 1, max: 50, step: 1, label: 'Period' }
    }
  },
  ADX: {
    name: 'Average Directional Index',
    shortName: 'ADX',
    category: 'MOMENTUM',
    pane: 'adx',
    description: 'Trend strength indicator showing directional movement with DI+ and DI-',
    defaultParams: {
      period: 14,
      threshold: 20
    },
    defaultStyle: {
      // DI+ settings
      showDiPlus: true,
      diPlusColor: '#4CAF50',
      diPlusWidth: 1.5,
      diPlusStyle: 'solid',
      // DI- settings
      showDiMinus: true,
      diMinusColor: '#F44336',
      diMinusWidth: 1.5,
      diMinusStyle: 'solid',
      // ADX settings
      showAdx: true,
      adxColor: '#1976D2',
      adxWidth: 2,
      adxStyle: 'solid',
      // Threshold settings
      showThreshold: true,
      thresholdColor: 'rgba(0, 0, 0, 0.5)',
      thresholdWidth: 1
    },
    paramConfig: {
      period: { type: 'number', min: 1, max: 50, step: 1, label: 'Period' },
      threshold: { type: 'number', min: 0, max: 100, step: 1, label: 'Threshold Level' }
    }
  }
} as const;

// Helper functions for indicator management
export function getIndicatorMetadata(name: string) {
  return AVAILABLE_INDICATORS[name as keyof typeof AVAILABLE_INDICATORS];
}

export function getIndicatorsByCategory(category: keyof typeof INDICATOR_CATEGORIES) {
  return INDICATOR_CATEGORIES[category].indicators
    .map(name => ({ name, ...getIndicatorMetadata(name) }))
    .filter(Boolean);
}

export function getAllAvailableIndicators() {
  return Object.entries(AVAILABLE_INDICATORS).map(([name, metadata]) => ({
    name,
    ...metadata
  }));
}

// Validation helpers
export function validateIndicatorParams(indicatorName: string, params: Record<string, any>): boolean {
  const metadata = getIndicatorMetadata(indicatorName);
  if (!metadata) return false;

  for (const [key, config] of Object.entries(metadata.paramConfig)) {
    const value = params[key];
    if (value === undefined) continue;

    if (config.type === 'number') {
      if (typeof value !== 'number') return false;
      if (config.min !== undefined && value < config.min) return false;
      if (config.max !== undefined && value > config.max) return false;
    } else if (config.type === 'select') {
      if (!config.options.includes(value)) return false;
    } else if (config.type === 'boolean') {
      if (typeof value !== 'boolean') return false;
    }
  }

  return true;
}

// Export types for external use
export type IndicatorName = keyof typeof AVAILABLE_INDICATORS;
export type IndicatorCategory = keyof typeof INDICATOR_CATEGORIES;
export type IndicatorMetadata = typeof AVAILABLE_INDICATORS[IndicatorName];

/**
 * Example Trading Strategies
 * Pre-built strategies to demonstrate the strategy builder capabilities
 */

import { Strategy } from './strategyEngine';

export const EXAMPLE_STRATEGIES: Strategy[] = [
  {
    id: 'rsi_oversold_strategy',
    name: 'RSI Oversold Strategy',
    description: 'Buy when RSI is below 30 and MACD histogram is positive, sell when RSI crosses above 70',
    symbol: 'BTCUSDT',
    timeframe: '4h',
    conditions: [
      {
        id: '1',
        type: 'indicator',
        operator: 'less_than',
        value: 30,
        indicator: 'rsi',
        parameter: 'rsi',
        timeframe: '4h'
      },
      {
        id: '2',
        type: 'indicator',
        operator: 'greater_than',
        value: 0,
        indicator: 'macd',
        parameter: 'histogram',
        timeframe: '4h'
      }
    ],
    entry_actions: [
      {
        id: '1',
        type: 'buy',
        amount: 100,
        amount_type: 'fixed',
        order_type: 'market'
      }
    ],
    exit_actions: [
      {
        id: '1',
        type: 'sell',
        amount: 100,
        amount_type: 'percentage',
        order_type: 'market'
      }
    ],
    risk_management: {
      stop_loss: 3,
      take_profit: 6,
      max_position_size: 500,
      max_daily_trades: 5
    },
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  {
    id: 'bollinger_squeeze_strategy',
    name: 'Bollinger Band Squeeze Strategy',
    description: 'Buy when price breaks above upper Bollinger Band with high volume',
    symbol: 'ETHUSDT',
    timeframe: '1h',
    conditions: [
      {
        id: '1',
        type: 'indicator',
        operator: 'greater_than',
        value: 0,
        indicator: 'price_action',
        parameter: 'price',
        timeframe: '1h'
      },
      {
        id: '2',
        type: 'volume',
        operator: 'crosses_above',
        value: 0,
        indicator: undefined,
        parameter: undefined,
        timeframe: '1h'
      }
    ],
    entry_actions: [
      {
        id: '1',
        type: 'buy',
        amount: 10,
        amount_type: 'percentage',
        order_type: 'market'
      }
    ],
    exit_actions: [
      {
        id: '1',
        type: 'sell',
        amount: 100,
        amount_type: 'percentage',
        order_type: 'market'
      }
    ],
    risk_management: {
      stop_loss: 2,
      take_profit: 4,
      max_position_size: 1000,
      max_daily_trades: 10
    },
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'ema_crossover_strategy',
    name: 'EMA Crossover Strategy',
    description: 'Buy when fast EMA crosses above slow EMA, sell when it crosses below',
    symbol: 'ADAUSDT',
    timeframe: '30m',
    conditions: [
      {
        id: '1',
        type: 'indicator',
        operator: 'crosses_above',
        value: 0,
        indicator: 'ema',
        parameter: 'ema',
        timeframe: '30m'
      }
    ],
    entry_actions: [
      {
        id: '1',
        type: 'buy',
        amount: 200,
        amount_type: 'fixed',
        order_type: 'market'
      }
    ],
    exit_actions: [
      {
        id: '1',
        type: 'sell',
        amount: 100,
        amount_type: 'percentage',
        order_type: 'market'
      }
    ],
    risk_management: {
      stop_loss: 1.5,
      take_profit: 3,
      max_position_size: 800,
      max_daily_trades: 15
    },
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'stochastic_reversal_strategy',
    name: 'Stochastic Reversal Strategy',
    description: 'Buy when Stochastic %K crosses above %D from oversold levels',
    symbol: 'SOLUSDT',
    timeframe: '2h',
    conditions: [
      {
        id: '1',
        type: 'indicator',
        operator: 'less_than',
        value: 20,
        indicator: 'stochastic',
        parameter: 'k_percent',
        timeframe: '2h'
      },
      {
        id: '2',
        type: 'indicator',
        operator: 'crosses_above',
        value: 0,
        indicator: 'stochastic',
        parameter: 'd_percent',
        timeframe: '2h'
      }
    ],
    entry_actions: [
      {
        id: '1',
        type: 'buy',
        amount: 15,
        amount_type: 'percentage',
        order_type: 'limit'
      }
    ],
    exit_actions: [
      {
        id: '1',
        type: 'sell',
        amount: 100,
        amount_type: 'percentage',
        order_type: 'market'
      }
    ],
    risk_management: {
      stop_loss: 4,
      take_profit: 8,
      max_position_size: 300,
      max_daily_trades: 3
    },
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'macd_momentum_strategy',
    name: 'MACD Momentum Strategy',
    description: 'Buy when MACD line crosses above signal line with positive histogram',
    symbol: 'XRPUSDT',
    timeframe: '1d',
    conditions: [
      {
        id: '1',
        type: 'indicator',
        operator: 'crosses_above',
        value: 0,
        indicator: 'macd',
        parameter: 'signal',
        timeframe: '1d'
      },
      {
        id: '2',
        type: 'indicator',
        operator: 'greater_than',
        value: 0,
        indicator: 'macd',
        parameter: 'histogram',
        timeframe: '1d'
      }
    ],
    entry_actions: [
      {
        id: '1',
        type: 'buy',
        amount: 50,
        amount_type: 'risk_based',
        order_type: 'market'
      }
    ],
    exit_actions: [
      {
        id: '1',
        type: 'sell',
        amount: 100,
        amount_type: 'percentage',
        order_type: 'market'
      }
    ],
    risk_management: {
      stop_loss: 5,
      take_profit: 10,
      max_position_size: 2000,
      max_daily_trades: 2
    },
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'multi_timeframe_strategy',
    name: 'Multi-Timeframe Strategy',
    description: 'Complex strategy using multiple timeframes and indicators for high-probability entries',
    symbol: 'BTCUSDT',
    timeframe: '4h',
    conditions: [
      {
        id: '1',
        type: 'indicator',
        operator: 'less_than',
        value: 35,
        indicator: 'rsi',
        parameter: 'rsi',
        timeframe: '4h'
      },
      {
        id: '2',
        type: 'indicator',
        operator: 'greater_than',
        value: 0,
        indicator: 'macd',
        parameter: 'histogram',
        timeframe: '1h'
      },
      {
        id: '3',
        type: 'indicator',
        operator: 'less_than',
        value: 0,
        indicator: 'price_action',
        parameter: 'price',
        timeframe: '4h'
      }
    ],
    entry_actions: [
      {
        id: '1',
        type: 'buy',
        amount: 25,
        amount_type: 'percentage',
        order_type: 'market'
      }
    ],
    exit_actions: [
      {
        id: '1',
        type: 'sell',
        amount: 100,
        amount_type: 'percentage',
        order_type: 'market'
      }
    ],
    risk_management: {
      stop_loss: 2.5,
      take_profit: 7.5,
      max_position_size: 1500,
      max_daily_trades: 8
    },
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

/**
 * Get strategy by ID
 */
export const getStrategyById = (id: string): Strategy | undefined => {
  return EXAMPLE_STRATEGIES.find(strategy => strategy.id === id);
};

/**
 * Get strategies by symbol
 */
export const getStrategiesBySymbol = (symbol: string): Strategy[] => {
  return EXAMPLE_STRATEGIES.filter(strategy => strategy.symbol === symbol);
};

/**
 * Get strategies by timeframe
 */
export const getStrategiesByTimeframe = (timeframe: string): Strategy[] => {
  return EXAMPLE_STRATEGIES.filter(strategy => strategy.timeframe === timeframe);
};

/**
 * Get all available symbols from example strategies
 */
export const getAvailableSymbols = (): string[] => {
  const symbols = new Set(EXAMPLE_STRATEGIES.map(strategy => strategy.symbol));
  return Array.from(symbols).sort();
};

/**
 * Get all available timeframes from example strategies
 */
export const getAvailableTimeframes = (): string[] => {
  const timeframes = new Set(EXAMPLE_STRATEGIES.map(strategy => strategy.timeframe));
  return Array.from(timeframes).sort();
};




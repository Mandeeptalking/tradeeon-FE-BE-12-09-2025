// Shared indicator registry for frontend and backend consistency

export interface IndicatorParam {
  type: 'number' | 'select' | 'boolean' | 'toggle';
  label: string;
  default: any;
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

export interface IndicatorDefinition {
  key: string;
  label: string;
  category: 'volume' | 'momentum' | 'trend' | 'volatility';
  description: string;
  params: Record<string, IndicatorParam>;
  outputs: string[];
  components: string[];
  pane: 'main' | 'separate';
  yAxis?: {
    min?: number;
    max?: number;
    autoScale?: boolean;
  };
}

export const INDICATOR_REGISTRY: Record<string, IndicatorDefinition> = {
  vol: {
    key: 'vol',
    label: 'Volume',
    category: 'volume',
    description: 'Shows trading volume for each time period',
    params: {},
    outputs: ['Volume'],
    components: ['Volume'],
    pane: 'separate',
  },
  
  rsi: {
    key: 'rsi',
    label: 'Relative Strength Index',
    category: 'momentum',
    description: 'Momentum oscillator that measures the speed and change of price movements',
    params: {
      length: {
        type: 'number',
        label: 'Length',
        default: 14,
        min: 2,
        max: 100,
        step: 1,
      },
      source: {
        type: 'select',
        label: 'Source',
        default: 'close',
        options: [
          { value: 'close', label: 'Close' },
          { value: 'open', label: 'Open' },
          { value: 'high', label: 'High' },
          { value: 'low', label: 'Low' },
        ],
      },
      mode: {
        type: 'toggle',
        label: 'Mode',
        default: 'classic',
        options: [
          { value: 'classic', label: 'Classic' },
          { value: 'extended', label: 'Extended' },
        ],
      },
      ma: {
        type: 'number',
        label: 'RSI MA Length (Optional)',
        default: null,
        min: 2,
        max: 50,
        step: 1,
      },
      overbought: {
        type: 'number',
        label: 'Overbought Level',
        default: 70,
        min: 50,
        max: 100,
        step: 1,
      },
      oversold: {
        type: 'number',
        label: 'Oversold Level',
        default: 30,
        min: 0,
        max: 50,
        step: 1,
      },
    },
    outputs: ['RSI', 'RSI_MA?'],
    components: ['RSI', 'RSI_MA', 'Overbought', 'Oversold'],
    pane: 'separate',
    yAxis: {
      autoScale: true, // Will be overridden based on mode
    },
  },
};

export const getIndicatorDefinition = (key: string): IndicatorDefinition | undefined => {
  return INDICATOR_REGISTRY[key];
};

export const getIndicatorsByCategory = (category: string): IndicatorDefinition[] => {
  return Object.values(INDICATOR_REGISTRY).filter(ind => ind.category === category);
};



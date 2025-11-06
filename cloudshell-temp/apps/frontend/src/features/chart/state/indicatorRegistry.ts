export interface IndicatorDefinition {
  key: string;
  label: string;
  description: string;
  params: Record<string, any>;
  outputs: string[];
  components: string[];
}

export interface RSISettings {
  length: number;
  source: 'close' | 'open' | 'high' | 'low';
  mode: 'classic' | 'extended';
  ma: number | null;
  overbought: number;
  oversold: number;
}

export const INDICATOR_REGISTRY: IndicatorDefinition[] = [
  {
    key: 'RSI',
    label: 'Relative Strength Index',
    description: 'Momentum oscillator measuring speed and magnitude of price changes',
    params: {
      length: 14,
      source: 'close',
      mode: 'classic', // 'classic' (0-100) | 'extended' (unbounded)
      ma: null, // Optional RSI MA smoothing
      overbought: 70,
      oversold: 30,
    } as RSISettings,
    outputs: ['RSI', 'RSI_MA?'],
    components: ['RSI_Line', 'RSI_MA_Line', 'Overbought_Zone', 'Oversold_Zone'],
  },
  // Future indicators can be added here
];

export const getIndicatorDefinition = (key: string): IndicatorDefinition | undefined => {
  return INDICATOR_REGISTRY.find(indicator => indicator.key === key);
};

export const getDefaultSettings = (key: string): any => {
  const definition = getIndicatorDefinition(key);
  return definition ? { ...definition.params } : {};
};

// RSI Calculation Functions
export interface RSIData {
  time: number;
  rsi: number;
  rsiMA?: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const calculateRSI = (candles: CandleData[], settings: RSISettings): RSIData[] => {
  if (candles.length < settings.length + 1) return [];
  
  const rsiData: RSIData[] = [];
  const { length, source, mode, ma } = settings;
  
  // Calculate gains and losses
  const changes: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i][source];
    const previous = candles[i - 1][source];
    changes.push(current - previous);
  }
  
  // Calculate RSI using Wilder's smoothing
  for (let i = length - 1; i < changes.length; i++) {
    let avgGain = 0;
    let avgLoss = 0;
    
    if (i === length - 1) {
      // Initial calculation - simple average
      const gains = changes.slice(0, length).filter(c => c > 0);
      const losses = changes.slice(0, length).filter(c => c < 0).map(c => -c);
      
      avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / length : 0;
      avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / length : 0;
    } else {
      // Wilder's smoothing
      const prevRSI = rsiData[rsiData.length - 1];
      const change = changes[i];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      
      // Get previous averages (reverse calculate from RS)
      const prevRS = mode === 'classic' 
        ? (100 - prevRSI.rsi) / prevRSI.rsi * 100
        : (prevRSI.rsi / 100) + 1;
      const prevAvgGain = prevRS * avgLoss;
      const prevAvgLoss = avgLoss;
      
      avgGain = (prevAvgGain * (length - 1) + gain) / length;
      avgLoss = (prevAvgLoss * (length - 1) + loss) / length;
    }
    
    // Calculate RSI
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi: number;
    
    if (mode === 'extended') {
      // Extended RSI: (RS - 1) * 100
      rsi = (rs - 1) * 100;
    } else {
      // Classic RSI: 100 - (100 / (1 + RS))
      rsi = 100 - (100 / (1 + rs));
    }
    
    const dataPoint: RSIData = {
      time: candles[i + 1].time, // +1 because changes array is offset by 1
      rsi: Math.max(-500, Math.min(500, rsi)), // Clamp extreme values
    };
    
    // Add RSI MA if enabled
    if (ma && rsiData.length >= ma - 1) {
      const recentRSI = rsiData.slice(-(ma - 1)).map(d => d.rsi);
      recentRSI.push(rsi);
      dataPoint.rsiMA = recentRSI.reduce((a, b) => a + b, 0) / ma;
    }
    
    rsiData.push(dataPoint);
  }
  
  return rsiData;
};



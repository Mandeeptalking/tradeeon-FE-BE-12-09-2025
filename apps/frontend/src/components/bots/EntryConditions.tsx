import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  X,
  Sparkles,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export interface EntryCondition {
  id: string;
  name: string;
  enabled: boolean;
  indicator: string; // All indicators from clean charts
  component?: string; // Component of the indicator (e.g., 'rsi_line', 'macd_line', 'histogram')
  operator: string; // Operator specific to indicator/component
  value?: number;
  lowerBound?: number;
  upperBound?: number;
  period?: number; // For RSI, EMA, SMA, CCI, MFI, etc.
  fastPeriod?: number; // For MACD
  slowPeriod?: number; // For MACD
  signalPeriod?: number; // For MACD
  timeframe: string;
  logicGate?: 'AND' | 'OR';
  // Additional parameters for specific indicators
  maType?: 'EMA' | 'SMA' | 'WMA' | 'TEMA' | 'KAMA' | 'MAMA' | 'VWMA' | 'Hull'; // For MA types
  source?: 'close' | 'open' | 'high' | 'low' | 'hlc3' | 'ohlc4'; // Price source
}

export interface EntryConditionsData {
  entryType: 'immediate' | 'conditional'; // How to enter trades
  orderType?: 'market' | 'limit'; // Order type for immediate entry
  limitPrice?: number; // Limit price when orderType is 'limit' (for single pair)
  limitPrices?: { [pair: string]: number }; // Limit prices per pair (for 2-5 pairs)
  limitPricePercent?: number; // Percentage offset from current price (for 6+ pairs, e.g., -2 means 2% below)
  enabled: boolean; // For conditional entry
  conditions: EntryCondition[];
  logicGate: 'AND' | 'OR'; // Logic gate between conditions
}

export interface EntryConditionsProps {
  conditions: EntryConditionsData;
  onChange: (conditions: EntryConditionsData) => void;
  className?: string;
  showTitle?: boolean;
  selectedPairs?: string[]; // Trading pairs from bot configuration
}

// Predefined entry condition templates
const PREDEFINED_CONDITIONS: Omit<EntryCondition, 'id'>[] = [
  {
    name: 'RSI Oversold',
    enabled: true,
    indicator: 'RSI',
    component: 'rsi_line',
    operator: 'crosses_below',
    value: 30,
    period: 14,
    timeframe: '1h',
  },
  {
    name: 'RSI Overbought',
    enabled: true,
    indicator: 'RSI',
    component: 'rsi_line',
    operator: 'crosses_above',
    value: 70,
    period: 14,
    timeframe: '1h',
  },
  {
    name: 'RSI Crosses Below 30',
    enabled: true,
    indicator: 'RSI',
    component: 'rsi_line',
    operator: 'crosses_below',
    value: 30,
    period: 14,
    timeframe: '4h',
  },
  {
    name: 'RSI Crosses Above 70',
    enabled: true,
    indicator: 'RSI',
    component: 'rsi_line',
    operator: 'crosses_above',
    value: 70,
    period: 14,
    timeframe: '4h',
  },
  {
    name: 'RSI Below 40',
    enabled: true,
    indicator: 'RSI',
    component: 'rsi_line',
    operator: 'less_than',
    value: 40,
    period: 14,
    timeframe: '1h',
  },
  {
    name: 'MACD Bullish Crossover',
    enabled: true,
    indicator: 'MACD',
    component: 'histogram',
    operator: 'crosses_above',
    value: 0,
    timeframe: '4h',
  },
  {
    name: 'MACD Bearish Crossover',
    enabled: true,
    indicator: 'MACD',
    component: 'histogram',
    operator: 'crosses_below',
    value: 0,
    timeframe: '4h',
  },
  {
    name: 'Price Crosses Above EMA 20',
    enabled: true,
    indicator: 'EMA',
    component: 'line',
    operator: 'crosses_above',
    period: 20,
    timeframe: '1h',
  },
  {
    name: 'Price Crosses Below EMA 20',
    enabled: true,
    indicator: 'EMA',
    component: 'line',
    operator: 'crosses_below',
    period: 20,
    timeframe: '1h',
  },
  {
    name: 'MACD Line Crosses Signal',
    enabled: true,
    indicator: 'MACD',
    component: 'macd_line',
    operator: 'crosses_above',
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    timeframe: '4h',
  },
];

// Available indicators from clean charts
const INDICATORS = [
  // Momentum Oscillators
  { value: 'RSI', label: 'RSI (Relative Strength Index)', category: 'Momentum', icon: BarChart3 },
  { value: 'MACD', label: 'MACD (Moving Average Convergence Divergence)', category: 'Momentum', icon: TrendingUp },
  { value: 'STOCHASTIC', label: 'Stochastic Oscillator', category: 'Momentum', icon: BarChart3 },
  { value: 'WILLIAMS_R', label: 'Williams %R', category: 'Momentum', icon: BarChart3 },
  { value: 'CCI', label: 'CCI (Commodity Channel Index)', category: 'Momentum', icon: BarChart3 },
  { value: 'MFI', label: 'MFI (Money Flow Index)', category: 'Momentum', icon: BarChart3 },
  { value: 'ADX', label: 'ADX (Average Directional Index)', category: 'Momentum', icon: TrendingUp },
  
  // Trend Indicators
  { value: 'EMA', label: 'EMA (Exponential Moving Average)', category: 'Trend', icon: TrendingUp },
  { value: 'SMA', label: 'SMA (Simple Moving Average)', category: 'Trend', icon: TrendingUp },
  { value: 'WMA', label: 'WMA (Weighted Moving Average)', category: 'Trend', icon: TrendingUp },
  { value: 'TEMA', label: 'TEMA (Triple Exponential Moving Average)', category: 'Trend', icon: TrendingUp },
  { value: 'HULL', label: 'Hull Moving Average', category: 'Trend', icon: TrendingUp },
  
  // Volatility Indicators
  { value: 'BOLLINGER_BANDS', label: 'Bollinger Bands', category: 'Volatility', icon: BarChart3 },
  { value: 'ATR', label: 'ATR (Average True Range)', category: 'Volatility', icon: BarChart3 },
  { value: 'KELTNER_CHANNELS', label: 'Keltner Channels', category: 'Volatility', icon: BarChart3 },
  
  // Volume Indicators
  { value: 'OBV', label: 'OBV (On-Balance Volume)', category: 'Volume', icon: BarChart3 },
  { value: 'VWAP', label: 'VWAP (Volume Weighted Average Price)', category: 'Volume', icon: BarChart3 },
  
  // Price Action
  { value: 'Price', label: 'Price Action', category: 'Price', icon: Zap },
];

// Indicator components - what parts of each indicator can be used in conditions
const INDICATOR_COMPONENTS: Record<string, Array<{ value: string; label: string; description: string }>> = {
  RSI: [
    { value: 'rsi_line', label: 'RSI Line', description: 'RSI value (0-100)' },
    { value: 'overbought', label: 'Overbought Level', description: 'RSI crosses above overbought level (default: 70)' },
    { value: 'oversold', label: 'Oversold Level', description: 'RSI crosses below oversold level (default: 30)' },
  ],
  MACD: [
    { value: 'macd_line', label: 'MACD Line', description: 'MACD Line (12-period EMA - 26-period EMA)' },
    { value: 'signal_line', label: 'Signal Line', description: 'Signal Line (9-period EMA of MACD Line)' },
    { value: 'histogram', label: 'Histogram', description: 'MACD Histogram (MACD Line - Signal Line)' },
    { value: 'zero_line', label: 'Zero Line', description: 'Zero Line crossover' },
  ],
  STOCHASTIC: [
    { value: 'k_percent', label: '%K Line', description: 'Stochastic %K line' },
    { value: 'd_percent', label: '%D Line', description: 'Stochastic %D line (SMA of %K)' },
    { value: 'overbought', label: 'Overbought', description: 'Above 80' },
    { value: 'oversold', label: 'Oversold', description: 'Below 20' },
  ],
  WILLIAMS_R: [
    { value: 'williams_line', label: 'Williams %R', description: 'Williams %R value (-100 to 0)' },
    { value: 'overbought', label: 'Overbought', description: 'Above -20' },
    { value: 'oversold', label: 'Oversold', description: 'Below -80' },
  ],
  CCI: [
    { value: 'cci_line', label: 'CCI Line', description: 'Commodity Channel Index' },
    { value: 'overbought', label: 'Overbought', description: 'Above +100' },
    { value: 'oversold', label: 'Oversold', description: 'Below -100' },
  ],
  MFI: [
    { value: 'mfi_line', label: 'MFI Line', description: 'Money Flow Index (0-100)' },
    { value: 'overbought', label: 'Overbought', description: 'Above 80' },
    { value: 'oversold', label: 'Oversold', description: 'Below 20' },
  ],
  ADX: [
    { value: 'adx_line', label: 'ADX Line', description: 'Average Directional Index (trend strength)' },
    { value: 'plus_di', label: '+DI', description: 'Positive Directional Indicator' },
    { value: 'minus_di', label: '-DI', description: 'Negative Directional Indicator' },
  ],
  EMA: [
    { value: 'line', label: 'EMA Line', description: 'Exponential Moving Average' },
  ],
  SMA: [
    { value: 'line', label: 'SMA Line', description: 'Simple Moving Average' },
  ],
  WMA: [
    { value: 'line', label: 'WMA Line', description: 'Weighted Moving Average' },
  ],
  TEMA: [
    { value: 'line', label: 'TEMA Line', description: 'Triple Exponential Moving Average' },
  ],
  HULL: [
    { value: 'line', label: 'Hull MA Line', description: 'Hull Moving Average' },
  ],
  BOLLINGER_BANDS: [
    { value: 'upper_band', label: 'Upper Band', description: 'Upper Bollinger Band' },
    { value: 'middle_band', label: 'Middle Band', description: 'Middle Bollinger Band (SMA)' },
    { value: 'lower_band', label: 'Lower Band', description: 'Lower Bollinger Band' },
    { value: 'bandwidth', label: 'Bandwidth', description: 'Bandwidth ((Upper - Lower) / Middle)' },
  ],
  ATR: [
    { value: 'atr_line', label: 'ATR Line', description: 'Average True Range value' },
  ],
  KELTNER_CHANNELS: [
    { value: 'upper_channel', label: 'Upper Channel', description: 'Upper Keltner Channel' },
    { value: 'middle_channel', label: 'Middle Channel', description: 'Middle Keltner Channel (EMA)' },
    { value: 'lower_channel', label: 'Lower Channel', description: 'Lower Keltner Channel' },
  ],
  OBV: [
    { value: 'obv_line', label: 'OBV Line', description: 'On-Balance Volume' },
  ],
  VWAP: [
    { value: 'vwap_line', label: 'VWAP Line', description: 'Volume Weighted Average Price' },
  ],
  Price: [
    { value: 'close', label: 'Close Price', description: 'Closing price' },
    { value: 'open', label: 'Open Price', description: 'Opening price' },
    { value: 'high', label: 'High Price', description: 'High price' },
    { value: 'low', label: 'Low Price', description: 'Low price' },
  ],
};

// Operators by indicator component - each component has specific operators
const COMPONENT_OPERATORS: Record<string, Array<{ value: string; label: string }>> = {
  // RSI
  'rsi_line': [
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'between', label: 'Between' },
  ],
  'overbought': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
  ],
  'oversold': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
  ],
  
  // MACD
  'macd_line': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
  ],
  'signal_line': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  'histogram': [
    { value: 'crosses_above', label: 'Crosses Above Zero' },
    { value: 'crosses_below', label: 'Crosses Below Zero' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  'zero_line': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
  ],
  
  // Stochastic
  'k_percent': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  'd_percent': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  
  // Williams %R
  'williams_line': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  
  // CCI
  'cci_line': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  
  // MFI
  'mfi_line': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  
  // ADX
  'adx_line': [
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  'plus_di': [
    { value: 'crosses_above', label: 'Crosses Above -DI' },
    { value: 'crosses_below', label: 'Crosses Below -DI' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  'minus_di': [
    { value: 'crosses_above', label: 'Crosses Above +DI' },
    { value: 'crosses_below', label: 'Crosses Below +DI' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  
  // Moving Averages (EMA, SMA, WMA, TEMA, HULL)
  'line': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
    { value: 'price_above', label: 'Price Above' },
    { value: 'price_below', label: 'Price Below' },
  ],
  
  // Bollinger Bands
  'upper_band': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
  ],
  'middle_band': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
  ],
  'lower_band': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
  ],
  'bandwidth': [
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  
  // ATR
  'atr_line': [
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  
  // Keltner Channels
  'upper_channel': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
  ],
  'middle_channel': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
  ],
  'lower_channel': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
  ],
  
  // OBV
  'obv_line': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  
  // VWAP
  'vwap_line': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
  ],
  
  // Price Action
  'close': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  'open': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  'high': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  'low': [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
};

// Available timeframes
const TIMEFRAMES = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
];

const EntryConditions: React.FC<EntryConditionsProps> = ({
  conditions,
  onChange,
  className = '',
  showTitle = true,
  selectedPairs = [],
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [expandedCondition, setExpandedCondition] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const handleAddPreset = (preset: Omit<EntryCondition, 'id'>) => {
    const newCondition: EntryCondition = {
      ...preset,
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    onChange({
      ...conditions,
      conditions: [...conditions.conditions, newCondition],
    });
    setShowPresets(false);
  };

  const handleAddCustom = () => {
    const defaultIndicator = 'RSI';
    const defaultComponent = INDICATOR_COMPONENTS[defaultIndicator]?.[0]?.value || '';
    const defaultOperator = defaultComponent ? COMPONENT_OPERATORS[defaultComponent]?.[0]?.value || 'crosses_below' : 'crosses_below';
    
    const newCondition: EntryCondition = {
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Custom Condition',
      enabled: true,
      indicator: defaultIndicator,
      component: defaultComponent,
      operator: defaultOperator,
      value: 30,
      period: 14,
      timeframe: '1h',
    };
    
    onChange({
      ...conditions,
      conditions: [...conditions.conditions, newCondition],
    });
    setExpandedCondition(newCondition.id);
  };

  const handleUpdateCondition = (id: string, updates: Partial<EntryCondition>) => {
    onChange({
      ...conditions,
      conditions: conditions.conditions.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    });
  };

  const handleRemoveCondition = (id: string) => {
    onChange({
      ...conditions,
      conditions: conditions.conditions.filter((c) => c.id !== id),
    });
  };

  const handleToggleCondition = (id: string) => {
    handleUpdateCondition(id, {
      enabled: !conditions.conditions.find((c) => c.id === id)?.enabled,
    });
  };

  const formatConditionDescription = (condition: EntryCondition): string => {
    const indicator = INDICATORS.find((ind) => ind.value === condition.indicator);
    const component = condition.component 
      ? INDICATOR_COMPONENTS[condition.indicator]?.find((c) => c.value === condition.component)
      : null;
    const operator = condition.component && COMPONENT_OPERATORS[condition.component]
      ? COMPONENT_OPERATORS[condition.component]?.find((op) => op.value === condition.operator)
      : null;
    
    if (!indicator) return condition.name;
    
    let desc = indicator.label;
    if (component) {
      desc += ` ${component.label}`;
    }
    if (operator) {
      desc += ` ${operator.label}`;
    }
    
    if (condition.operator === 'between' && condition.lowerBound !== undefined && condition.upperBound !== undefined) {
      desc += ` ${condition.lowerBound}-${condition.upperBound}`;
    } else if (condition.value !== undefined) {
      desc += ` ${condition.value}`;
    }
    
    if (condition.period) {
      desc += ` (Period: ${condition.period})`;
    }
    if (condition.fastPeriod && condition.slowPeriod) {
      desc += ` (Fast: ${condition.fastPeriod}, Slow: ${condition.slowPeriod})`;
    }
    
    desc += ` on ${TIMEFRAMES.find((tf) => tf.value === condition.timeframe)?.label || condition.timeframe}`;
    
    return desc;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && (
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
            <Target className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Entry Conditions
            </h3>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-0.5`}>
              Define when your bot should start trading
            </p>
          </div>
        </div>
      )}

      {/* Entry Type Selection */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200 bg-white'}`}>
        <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3 block`}>
          Entry Type
        </label>
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={conditions.entryType === 'immediate' ? 'default' : 'outline'}
            onClick={() => onChange({ ...conditions, entryType: 'immediate', orderType: conditions.orderType || 'market' })}
            className={`flex-1 ${
              conditions.entryType === 'immediate' 
                ? isDark 
                  ? 'ring-2 ring-yellow-500/50 shadow-lg shadow-yellow-500/20' 
                  : 'ring-2 ring-yellow-500/30 shadow-md'
                : ''
            }`}
          >
            <Zap className={`w-4 h-4 mr-2 ${conditions.entryType === 'immediate' ? 'text-yellow-300' : ''}`} />
            Enter Immediately
            {conditions.entryType === 'immediate' && (
              <CheckCircle2 className="w-4 h-4 ml-2" />
            )}
          </Button>
          <Button
            type="button"
            variant={conditions.entryType === 'conditional' ? 'default' : 'outline'}
            onClick={() => onChange({ ...conditions, entryType: 'conditional', enabled: true })}
            className={`flex-1 ${
              conditions.entryType === 'conditional' 
                ? isDark 
                  ? 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20' 
                  : 'ring-2 ring-blue-500/30 shadow-md'
                : ''
            }`}
          >
            <Target className={`w-4 h-4 mr-2 ${conditions.entryType === 'conditional' ? 'text-blue-300' : ''}`} />
            Wait for Conditions
            {conditions.entryType === 'conditional' && (
              <CheckCircle2 className="w-4 h-4 ml-2" />
            )}
          </Button>
        </div>

        {/* Immediate Entry Options */}
        {conditions.entryType === 'immediate' && (
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} space-y-3`}>
            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                Order Type
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={conditions.orderType === 'market' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onChange({ ...conditions, orderType: 'market', limitPrice: undefined, limitPrices: undefined, limitPricePercent: undefined })}
                  className={`flex-1 ${
                    conditions.orderType === 'market' 
                      ? isDark 
                        ? 'ring-2 ring-green-500/50 shadow-lg shadow-green-500/20' 
                        : 'ring-2 ring-green-500/30 shadow-md'
                      : ''
                  }`}
                >
                  Market Order
                  {conditions.orderType === 'market' && (
                    <CheckCircle2 className="w-3 h-3 ml-1.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant={conditions.orderType === 'limit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    // Initialize based on number of pairs
                    const newConditions = { ...conditions, orderType: 'limit' };
                    if (selectedPairs.length === 1) {
                      // Single pair: use exact limitPrice
                      newConditions.limitPrice = conditions.limitPrice || 0;
                      newConditions.limitPrices = undefined;
                      newConditions.limitPricePercent = undefined;
                    } else if (selectedPairs.length <= 5) {
                      // 2-5 pairs: use individual limitPrices
                      const initialLimitPrices: { [pair: string]: number } = {};
                      selectedPairs.forEach(pair => {
                        if (conditions.limitPrices?.[pair]) {
                          initialLimitPrices[pair] = conditions.limitPrices[pair];
                        }
                      });
                      newConditions.limitPrices = Object.keys(initialLimitPrices).length > 0 ? initialLimitPrices : undefined;
                      newConditions.limitPrice = undefined;
                      newConditions.limitPricePercent = undefined;
                    } else {
                      // 6+ pairs: use percentage offset
                      newConditions.limitPricePercent = conditions.limitPricePercent || -2; // Default to 2% below
                      newConditions.limitPrice = undefined;
                      newConditions.limitPrices = undefined;
                    }
                    onChange(newConditions);
                  }}
                  className={`flex-1 ${
                    conditions.orderType === 'limit' 
                      ? isDark 
                        ? 'ring-2 ring-orange-500/50 shadow-lg shadow-orange-500/20' 
                        : 'ring-2 ring-orange-500/30 shadow-md'
                      : ''
                  }`}
                >
                  Limit Order
                  {conditions.orderType === 'limit' && (
                    <CheckCircle2 className="w-3 h-3 ml-1.5" />
                  )}
                </Button>
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {conditions.orderType === 'market'
                  ? 'Order will execute immediately at current market price'
                  : 'Order will execute when price reaches your specified limit price'}
              </p>
            </div>

            {/* Limit Price Input - Only show when Limit Order is selected */}
            {conditions.orderType === 'limit' && (
              <div className="space-y-3">
                {selectedPairs.length === 0 ? (
                  <div className={`p-3 rounded-lg ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                    <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      Please select trading pairs in Bot Configuration first
                    </p>
                  </div>
                ) : selectedPairs.length === 1 ? (
                  // Single pair - show single exact price input
                  <div>
                    <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                      Limit Price for {selectedPairs[0].replace(/([A-Z]+)(USDT|BUSD|BTC|ETH)$/, '$1/$2')} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.00000001"
                      value={conditions.limitPrice || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                        onChange({ ...conditions, limitPrice: value, limitPrices: undefined, limitPricePercent: undefined });
                      }}
                      className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                      placeholder="Enter limit price"
                    />
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      The order will execute when the market price reaches this limit price
                    </p>
                  </div>
                ) : selectedPairs.length <= 5 ? (
                  // 2-5 pairs - show table with individual inputs
                  <div>
                    <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                      Limit Prices <span className="text-red-500">*</span>
                    </label>
                    <div className={`rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'} overflow-hidden`}>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full">
                          <thead className={`${isDark ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}`}>
                            <tr>
                              <th className={`text-left py-2 px-3 text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Trading Pair
                              </th>
                              <th className={`text-left py-2 px-3 text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Limit Price
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPairs.map((pair) => {
                              const formattedPair = pair.replace(/([A-Z]+)(USDT|BUSD|BTC|ETH)$/, '$1/$2');
                              const pairPrice = conditions.limitPrices?.[pair] || '';
                              return (
                                <tr key={pair} className={`border-b ${isDark ? 'border-gray-700/50' : 'border-gray-100'} last:border-0`}>
                                  <td className={`py-2 px-3 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {formattedPair}
                                  </td>
                                  <td className="py-2 px-3">
                                    <Input
                                      type="number"
                                      step="0.00000001"
                                      value={pairPrice}
                                      onChange={(e) => {
                                        const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                        const newLimitPrices = {
                                          ...(conditions.limitPrices || {}),
                                          [pair]: value,
                                        };
                                        // Remove pair from limitPrices if value is empty
                                        if (value === undefined) {
                                          delete newLimitPrices[pair];
                                        }
                                        onChange({
                                          ...conditions,
                                          limitPrices: Object.keys(newLimitPrices).length > 0 ? newLimitPrices : undefined,
                                          limitPrice: undefined,
                                          limitPricePercent: undefined,
                                        });
                                      }}
                                      className={`w-full ${isDark ? 'bg-gray-900 border-gray-700 text-white' : ''}`}
                                      placeholder="Enter price"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Set individual limit prices for each trading pair. Orders will execute when market prices reach these limits.
                    </p>
                  </div>
                ) : (
                  // 6+ pairs - use percentage offset (more practical)
                  <div>
                    <div className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                      <div className="flex items-start gap-2">
                        <Info className={`w-4 h-4 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        <div>
                          <p className={`text-xs font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                            Percentage-Based Limit Orders
                          </p>
                          <p className={`text-xs mt-1 ${isDark ? 'text-blue-400/80' : 'text-blue-700'}`}>
                            With {selectedPairs.length} pairs, limit orders use a percentage offset from current market price. This applies to all selected pairs.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                        Price Offset (%) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          step="0.1"
                          value={conditions.limitPricePercent !== undefined ? Math.abs(conditions.limitPricePercent) : ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Math.abs(parseFloat(e.target.value));
                            onChange({
                              ...conditions,
                              limitPricePercent: value !== undefined ? -value : undefined, // Negative means below current price
                              limitPrice: undefined,
                              limitPrices: undefined,
                            });
                          }}
                          className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                          placeholder="2.5"
                        />
                        <Select
                          value={conditions.limitPricePercent !== undefined && conditions.limitPricePercent < 0 ? 'below' : 'above'}
                          onValueChange={(value) => {
                            const currentPercent = Math.abs(conditions.limitPricePercent || 0);
                            onChange({
                              ...conditions,
                              limitPricePercent: value === 'below' ? -currentPercent : currentPercent,
                            });
                          }}
                        >
                          <SelectTrigger className={`w-32 ${isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="below">Below</SelectItem>
                            <SelectItem value="above">Above</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {conditions.limitPricePercent !== undefined ? (
                          <>
                            Orders will execute when prices are{' '}
                            <span className="font-medium">
                              {Math.abs(conditions.limitPricePercent)}% {conditions.limitPricePercent < 0 ? 'below' : 'above'}{' '}
                            </span>
                            current market price for all {selectedPairs.length} pairs.
                          </>
                        ) : (
                          'Enter a percentage offset (e.g., 2.5 means 2.5% below/above current price)'
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Conditional Entry Options */}
        {conditions.entryType === 'conditional' && (
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Enable Entry Conditions
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                  Wait for technical indicators before starting trades
                </p>
              </div>
              <button
                onClick={() => onChange({ ...conditions, enabled: !conditions.enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  conditions.enabled
                    ? 'bg-blue-500'
                    : isDark
                    ? 'bg-gray-700'
                    : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    conditions.enabled ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {conditions.entryType === 'conditional' && conditions.enabled && (
        <>
          {/* Logic Gate Selection */}
          {conditions.conditions.length > 1 && (
            <div className={`p-4 rounded-lg border ${isDark ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200 bg-white'}`}>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                Logic Gate
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={conditions.logicGate === 'AND' ? 'default' : 'outline'}
                  onClick={() => onChange({ ...conditions, logicGate: 'AND' })}
                  className="flex-1"
                >
                  ALL (AND)
                </Button>
                <Button
                  type="button"
                  variant={conditions.logicGate === 'OR' ? 'default' : 'outline'}
                  onClick={() => onChange({ ...conditions, logicGate: 'OR' })}
                  className="flex-1"
                >
                  ANY (OR)
                </Button>
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {conditions.logicGate === 'AND'
                  ? 'All enabled conditions must be true for entry'
                  : 'At least one enabled condition must be true for entry'}
              </p>
            </div>
          )}

          {/* Conditions List */}
          <div className="space-y-2">
            {conditions.conditions.map((condition, index) => {
              const isExpanded = expandedCondition === condition.id;
              
              return (
                <div
                  key={condition.id}
                  className={`rounded-lg border transition-all ${
                    isDark
                      ? 'border-gray-700/50 bg-gray-800/30'
                      : 'border-gray-200 bg-white'
                  } ${!condition.enabled ? 'opacity-60' : ''}`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => handleToggleCondition(condition.id)}
                          className={`mt-1 p-1 rounded ${
                            condition.enabled
                              ? isDark
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-blue-100 text-blue-600'
                              : isDark
                              ? 'bg-gray-700 text-gray-500'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          {condition.enabled ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-current" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {condition.name}
                            </span>
                            {index > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {conditions.logicGate}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formatConditionDescription(condition)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setExpandedCondition(isExpanded ? null : condition.id)
                          }
                          className={`p-1 rounded transition-colors ${
                            isDark
                              ? 'hover:bg-gray-700 text-gray-400'
                              : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveCondition(condition.id)}
                          className={`p-1 rounded transition-colors ${
                            isDark
                              ? 'hover:bg-gray-700 text-gray-400'
                              : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Configuration */}
                    {isExpanded && (
                      <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'} space-y-4`}>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                              Condition Name
                            </label>
                            <Input
                              value={condition.name}
                              onChange={(e) =>
                                handleUpdateCondition(condition.id, { name: e.target.value })
                              }
                              className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                              placeholder="RSI Oversold"
                            />
                          </div>
                          <div>
                            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                              Indicator
                            </label>
                            <Select
                              value={condition.indicator}
                              onValueChange={(value: EntryCondition['indicator']) =>
                                handleUpdateCondition(condition.id, { indicator: value })
                              }
                            >
                              <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INDICATORS.map((ind) => (
                                  <SelectItem key={ind.value} value={ind.value}>
                                    {ind.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Component Selection */}
                          {INDICATOR_COMPONENTS[condition.indicator] && INDICATOR_COMPONENTS[condition.indicator].length > 0 && (
                            <div>
                              <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                Component
                              </label>
                              <Select
                                value={condition.component || ''}
                                onValueChange={(value) => {
                                  // Reset operator when component changes
                                  const newComponent = value;
                                  const availableOps = COMPONENT_OPERATORS[newComponent] || [];
                                  handleUpdateCondition(condition.id, {
                                    component: newComponent,
                                    operator: availableOps[0]?.value || condition.operator,
                                  });
                                }}
                              >
                                <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                                  <SelectValue placeholder="Select component" />
                                </SelectTrigger>
                                <SelectContent>
                                  {INDICATOR_COMPONENTS[condition.indicator].map((comp) => (
                                    <SelectItem key={comp.value} value={comp.value}>
                                      <div>
                                        <div className="font-medium">{comp.label}</div>
                                        <div className="text-xs text-gray-500">{comp.description}</div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                              Operator
                            </label>
                            <Select
                              value={condition.operator}
                              onValueChange={(value) =>
                                handleUpdateCondition(condition.id, { operator: value })
                              }
                              disabled={!condition.component || !COMPONENT_OPERATORS[condition.component]}
                            >
                              <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                                <SelectValue placeholder={condition.component ? "Select operator" : "Select component first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {(condition.component ? COMPONENT_OPERATORS[condition.component] : []).map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                              Timeframe
                            </label>
                            <Select
                              value={condition.timeframe}
                              onValueChange={(value) =>
                                handleUpdateCondition(condition.id, { timeframe: value })
                              }
                            >
                              <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIMEFRAMES.map((tf) => (
                                  <SelectItem key={tf.value} value={tf.value}>
                                    {tf.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Period/Parameters based on indicator type */}
                          {['RSI', 'EMA', 'SMA', 'WMA', 'TEMA', 'HULL', 'CCI', 'MFI', 'STOCHASTIC', 'WILLIAMS_R', 'ATR', 'ADX', 'OBV'].includes(condition.indicator) && (
                            <div>
                              <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                Period
                              </label>
                              <Input
                                type="number"
                                value={condition.period || ''}
                                onChange={(e) =>
                                  handleUpdateCondition(condition.id, {
                                    period: parseInt(e.target.value) || undefined,
                                  })
                                }
                                className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                placeholder={condition.indicator === 'RSI' ? '14' : condition.indicator === 'EMA' ? '20' : '14'}
                              />
                            </div>
                          )}
                          
                          {/* MACD Parameters */}
                          {condition.indicator === 'MACD' && (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                  Fast Period
                                </label>
                                <Input
                                  type="number"
                                  value={condition.fastPeriod || ''}
                                  onChange={(e) =>
                                    handleUpdateCondition(condition.id, {
                                      fastPeriod: parseInt(e.target.value) || undefined,
                                    })
                                  }
                                  className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                  placeholder="12"
                                />
                              </div>
                              <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                  Slow Period
                                </label>
                                <Input
                                  type="number"
                                  value={condition.slowPeriod || ''}
                                  onChange={(e) =>
                                    handleUpdateCondition(condition.id, {
                                      slowPeriod: parseInt(e.target.value) || undefined,
                                    })
                                  }
                                  className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                  placeholder="26"
                                />
                              </div>
                              <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                  Signal Period
                                </label>
                                <Input
                                  type="number"
                                  value={condition.signalPeriod || ''}
                                  onChange={(e) =>
                                    handleUpdateCondition(condition.id, {
                                      signalPeriod: parseInt(e.target.value) || undefined,
                                    })
                                  }
                                  className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                  placeholder="9"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Value Inputs */}
                        {condition.operator === 'between' ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                Lower Bound
                              </label>
                              <Input
                                type="number"
                                value={condition.lowerBound || ''}
                                onChange={(e) =>
                                  handleUpdateCondition(condition.id, {
                                    lowerBound: parseFloat(e.target.value) || undefined,
                                  })
                                }
                                className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                placeholder="25"
                              />
                            </div>
                            <div>
                              <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                Upper Bound
                              </label>
                              <Input
                                type="number"
                                value={condition.upperBound || ''}
                                onChange={(e) =>
                                  handleUpdateCondition(condition.id, {
                                    upperBound: parseFloat(e.target.value) || undefined,
                                  })
                                }
                                className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                placeholder="35"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                              Value
                            </label>
                            <Input
                              type="number"
                              step="0.1"
                              value={condition.value || ''}
                              onChange={(e) =>
                                handleUpdateCondition(condition.id, {
                                  value: parseFloat(e.target.value) || undefined,
                                })
                              }
                              className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                              placeholder="30"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Condition Buttons */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPresets(!showPresets)}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Add Preset Condition
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
              </Button>

              {showPresets && (
                <div
                  className={`absolute z-50 w-full mt-2 rounded-lg border shadow-lg ${
                    isDark
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200'
                  } max-h-80 overflow-y-auto`}
                >
                  <div className="p-2">
                    <div className={`text-xs font-medium px-2 py-1 mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Popular Conditions
                    </div>
                    {PREDEFINED_CONDITIONS.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleAddPreset(preset)}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-opacity-50 transition-colors ${
                          isDark
                            ? 'hover:bg-gray-700 text-gray-300'
                            : 'hover:bg-gray-50 text-gray-900'
                        }`}
                      >
                        <div className="font-medium text-sm">{preset.name}</div>
                        <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                          {formatConditionDescription(preset as EntryCondition)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddCustom}
            >
              <Plus className="w-4 h-4 mr-2" />
              Custom
            </Button>
          </div>

          {conditions.conditions.length === 0 && (
            <div className={`p-6 rounded-lg border border-dashed text-center ${
              isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50'
            }`}>
              <Target className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                No entry conditions configured
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Add preset or custom conditions to define when trading should start
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EntryConditions;


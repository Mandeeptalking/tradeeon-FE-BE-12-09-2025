import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Plus, Info, AlertCircle } from 'lucide-react';

interface MainConditionBuilderProps {
  onConditionChange?: (condition: MainCondition) => void;
}

interface MainCondition {
  id: string;
  type: 'indicator' | 'truthy' | 'price_action';
  indicator?: string;
  component?: string;
  timeframe: string;
  operator: string;
  value?: number;
  description: string;
}

// Available indicators
const AVAILABLE_INDICATORS = [
  // Trend Indicators
  { id: 'ema', name: 'EMA', description: 'Exponential Moving Average' },
  { id: 'sma', name: 'SMA', description: 'Simple Moving Average' },
  { id: 'wma', name: 'WMA', description: 'Weighted Moving Average' },
  { id: 'tema', name: 'TEMA', description: 'Triple Exponential Moving Average' },
  { id: 'kama', name: 'KAMA', description: 'Kaufman Adaptive Moving Average' },
  { id: 'mama', name: 'MAMA', description: 'MESA Adaptive Moving Average' },
  { id: 'vwma', name: 'VWMA', description: 'Volume Weighted Moving Average' },
  { id: 'hull', name: 'Hull MA', description: 'Hull Moving Average' },
  
  // Oscillators
  { id: 'rsi', name: 'RSI', description: 'Relative Strength Index' },
  { id: 'stochastic', name: 'Stochastic', description: 'Stochastic Oscillator' },
  { id: 'williams_r', name: 'Williams %R', description: 'Williams Percent Range' },
  { id: 'cci', name: 'CCI', description: 'Commodity Channel Index' },
  { id: 'roc', name: 'ROC', description: 'Rate of Change' },
  { id: 'momentum', name: 'Momentum', description: 'Momentum Oscillator' },
  { id: 'macd', name: 'MACD', description: 'Moving Average Convergence Divergence' },
  { id: 'ppo', name: 'PPO', description: 'Percentage Price Oscillator' },
  { id: 'apo', name: 'APO', description: 'Absolute Price Oscillator' },
  { id: 'bias', name: 'BIAS', description: 'Bias Indicator' },
  
  // Volatility Indicators
  { id: 'bollinger', name: 'Bollinger Bands', description: 'Bollinger Bands' },
  { id: 'atr', name: 'ATR', description: 'Average True Range' },
  { id: 'natr', name: 'NATR', description: 'Normalized ATR' },
  { id: 'trange', name: 'True Range', description: 'True Range' },
  { id: 'kc', name: 'Keltner Channels', description: 'Keltner Channels' },
  { id: 'dc', name: 'Donchian Channels', description: 'Donchian Channels' },
  { id: 'ui', name: 'Ulcer Index', description: 'Ulcer Index' },
  
  // Volume Indicators
  { id: 'ad', name: 'A/D Line', description: 'Accumulation/Distribution Line' },
  { id: 'adosc', name: 'A/D Oscillator', description: 'Accumulation/Distribution Oscillator' },
  { id: 'obv', name: 'OBV', description: 'On Balance Volume' },
  { id: 'vwap', name: 'VWAP', description: 'Volume Weighted Average Price' },
  { id: 'mfi', name: 'MFI', description: 'Money Flow Index' },
  { id: 'eom', name: 'EOM', description: 'Ease of Movement' },
  { id: 'vwma', name: 'VWMA', description: 'Volume Weighted Moving Average' },
  { id: 'volume', name: 'Volume', description: 'Volume' },
  { id: 'volume_sma', name: 'Volume SMA', description: 'Volume Simple Moving Average' },
  
  // Momentum Indicators
  { id: 'adx', name: 'ADX', description: 'Average Directional Index' },
  { id: 'aroon', name: 'Aroon', description: 'Aroon Indicator' },
  { id: 'aroon_osc', name: 'Aroon Oscillator', description: 'Aroon Oscillator' },
  { id: 'bop', name: 'BOP', description: 'Balance of Power' },
  { id: 'cmf', name: 'CMF', description: 'Chaikin Money Flow' },
  { id: 'dx', name: 'DX', description: 'Directional Movement Index' },
  { id: 'minus_di', name: '-DI', description: 'Minus Directional Indicator' },
  { id: 'plus_di', name: '+DI', description: 'Plus Directional Indicator' },
  { id: 'minus_dm', name: '-DM', description: 'Minus Directional Movement' },
  { id: 'plus_dm', name: '+DM', description: 'Plus Directional Movement' },
  
  // Support/Resistance
  { id: 'psar', name: 'Parabolic SAR', description: 'Parabolic Stop and Reverse' },
  { id: 'supertrend', name: 'SuperTrend', description: 'SuperTrend Indicator' },
  { id: 'zigzag', name: 'ZigZag', description: 'ZigZag Indicator' },
  
  // Other
  { id: 'ichimoku', name: 'Ichimoku', description: 'Ichimoku Cloud' },
  { id: 'fibonacci', name: 'Fibonacci', description: 'Fibonacci Retracement' },
  { id: 'pivot', name: 'Pivot Points', description: 'Pivot Points' }
];

// Available timeframes
const AVAILABLE_TIMEFRAMES = [
  '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'
];

// Indicator components mapping
const INDICATOR_COMPONENTS: { [key: string]: Array<{ id: string; name: string; description: string }> } = {
  // MACD Components
  'macd': [
    { id: 'macd_line', name: 'MACD Line', description: 'MACD Line (12-period EMA - 26-period EMA)' },
    { id: 'signal_line', name: 'Signal Line', description: 'Signal Line (9-period EMA of MACD Line)' },
    { id: 'histogram', name: 'Histogram', description: 'MACD Histogram (MACD Line - Signal Line)' },
    { id: 'zero_line', name: 'Zero Line', description: 'Zero Line (reference line at 0)' }
  ],
  
  // RSI Components
  'rsi': [
    { id: 'rsi_line', name: 'RSI Line', description: 'RSI Line (0-100 scale)' },
    { id: 'overbought', name: 'Overbought Level', description: 'Overbought Level (typically 70)' },
    { id: 'oversold', name: 'Oversold Level', description: 'Oversold Level (typically 30)' }
  ],
  
  // Bollinger Bands Components
  'bollinger': [
    { id: 'upper_band', name: 'Upper Band', description: 'Upper Bollinger Band' },
    { id: 'middle_band', name: 'Middle Band', description: 'Middle Bollinger Band (SMA)' },
    { id: 'lower_band', name: 'Lower Band', description: 'Lower Bollinger Band' },
    { id: 'bandwidth', name: 'Bandwidth', description: 'Bandwidth (Upper - Lower / Middle)' },
    { id: 'percent_b', name: '%B', description: '%B (Price position within bands)' }
  ],
  
  // Stochastic Components
  'stochastic': [
    { id: 'k_percent', name: '%K', description: 'Stochastic %K Line' },
    { id: 'd_percent', name: '%D', description: 'Stochastic %D Line (SMA of %K)' },
    { id: 'overbought', name: 'Overbought Level', description: 'Overbought Level (typically 80)' },
    { id: 'oversold', name: 'Oversold Level', description: 'Oversold Level (typically 20)' }
  ],
  
  // ATR Components
  'atr': [
    { id: 'atr_line', name: 'ATR Line', description: 'Average True Range Line' },
    { id: 'high_volatility', name: 'High Volatility', description: 'High Volatility Level' },
    { id: 'low_volatility', name: 'Low Volatility', description: 'Low Volatility Level' }
  ],
  
  // ADX Components
  'adx': [
    { id: 'adx_line', name: 'ADX Line', description: 'ADX Line (trend strength)' },
    { id: 'plus_di', name: '+DI', description: 'Plus Directional Indicator' },
    { id: 'minus_di', name: '-DI', description: 'Minus Directional Indicator' },
    { id: 'strong_trend', name: 'Strong Trend', description: 'Strong Trend Level (typically 25)' }
  ],
  
  // Moving Averages Components
  'ema': [
    { id: 'ema_line', name: 'EMA Line', description: 'Exponential Moving Average Line' }
  ],
  'sma': [
    { id: 'sma_line', name: 'SMA Line', description: 'Simple Moving Average Line' }
  ],
  'wma': [
    { id: 'wma_line', name: 'WMA Line', description: 'Weighted Moving Average Line' }
  ],
  
  // Volume Indicators Components
  'obv': [
    { id: 'obv_line', name: 'OBV Line', description: 'On Balance Volume Line' }
  ],
  'mfi': [
    { id: 'mfi_line', name: 'MFI Line', description: 'Money Flow Index Line' },
    { id: 'overbought', name: 'Overbought Level', description: 'Overbought Level (typically 80)' },
    { id: 'oversold', name: 'Oversold Level', description: 'Oversold Level (typically 20)' }
  ],
  'vwap': [
    { id: 'vwap_line', name: 'VWAP Line', description: 'Volume Weighted Average Price Line' }
  ],
  
  // Ichimoku Components
  'ichimoku': [
    { id: 'tenkan_sen', name: 'Tenkan-sen', description: 'Tenkan-sen (Conversion Line)' },
    { id: 'kijun_sen', name: 'Kijun-sen', description: 'Kijun-sen (Base Line)' },
    { id: 'senkou_span_a', name: 'Senkou Span A', description: 'Senkou Span A (Leading Span A)' },
    { id: 'senkou_span_b', name: 'Senkou Span B', description: 'Senkou Span B (Leading Span B)' },
    { id: 'chikou_span', name: 'Chikou Span', description: 'Chikou Span (Lagging Span)' },
    { id: 'kumo', name: 'Kumo', description: 'Kumo Cloud (between Senkou Spans)' }
  ],
  
  // Parabolic SAR Components
  'psar': [
    { id: 'psar_dots', name: 'PSAR Dots', description: 'Parabolic SAR Dots' },
    { id: 'trend_direction', name: 'Trend Direction', description: 'Trend Direction (Bullish/Bearish)' }
  ]
};

// Available operators based on condition type
const INDICATOR_OPERATORS = [
  { value: 'greater_than', label: 'Greater Than (>' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'equals', label: 'Equals (=)' },
  { value: 'crosses_above', label: 'Crosses Above' },
  { value: 'crosses_below', label: 'Crosses Below' },
  { value: 'between', label: 'Between' }
];

// Component-specific operators mapping
const COMPONENT_OPERATORS: { [key: string]: string[] } = {
  // MACD Components
  'macd_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'signal_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'histogram': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'zero_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  
  // RSI Components
  'rsi_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'overbought': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'oversold': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  
  // Bollinger Bands Components
  'upper_band': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'middle_band': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'lower_band': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'bandwidth': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'percent_b': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  
  // Stochastic Components
  'k_percent': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'd_percent': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'overbought': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'oversold': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  
  // ATR Components
  'atr_line': ['greater_than', 'less_than'],
  'high_volatility': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'low_volatility': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  
  // ADX Components
  'adx_line': ['greater_than', 'less_than'],
  'plus_di': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'minus_di': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'strong_trend': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  
  // Moving Averages Components
  'ema_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'sma_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'wma_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  
  // Volume Indicators Components
  'obv_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'mfi_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'overbought': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'oversold': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'vwap_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  
  // Ichimoku Components
  'tenkan_sen': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'kijun_sen': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'senkou_span_a': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'senkou_span_b': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'chikou_span': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'kumo': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  
  // Parabolic SAR Components
  'psar_dots': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'trend_direction': ['equals'] // Only equals makes sense for trend direction
};

const PRICE_ACTION_OPERATORS = [
  { value: 'price_breaks_resistance', label: 'Price Breaks Resistance' },
  { value: 'price_breaks_support', label: 'Price Breaks Support' },
  { value: 'price_touches_resistance', label: 'Price Touches Resistance' },
  { value: 'price_touches_support', label: 'Price Touches Support' },
  { value: 'price_pullback', label: 'Price Pullback' },
  { value: 'price_momentum', label: 'Price Momentum' }
];

const TRUTHY_OPERATORS = [
  { value: 'true', label: 'True' },
  { value: 'false', label: 'False' }
];

export default function MainConditionBuilder({ onConditionChange }: MainConditionBuilderProps) {
  const [condition, setCondition] = useState<MainCondition>({
    id: 'main_condition_1',
    type: 'indicator',
    indicator: 'rsi',
    component: 'rsi_line',
    timeframe: '4h',
    operator: 'less_than',
    value: 30,
    description: 'RSI Line is below 30'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTypeChange = (type: 'indicator' | 'truthy' | 'price_action') => {
    const newCondition = { ...condition, type };
    
    // Reset operator and value based on type
    if (type === 'indicator') {
      newCondition.operator = 'less_than';
      newCondition.value = 30;
      newCondition.indicator = 'rsi';
    } else if (type === 'price_action') {
      newCondition.operator = 'price_breaks_resistance';
      newCondition.value = undefined;
      newCondition.indicator = undefined;
    } else if (type === 'truthy') {
      newCondition.operator = 'true';
      newCondition.value = undefined;
      newCondition.indicator = undefined;
    }
    
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleIndicatorChange = (indicator: string) => {
    const components = INDICATOR_COMPONENTS[indicator];
    const defaultComponent = components && components.length > 0 ? components[0].id : undefined;
    
    // Get default operator for the default component
    const availableOperators = defaultComponent ? COMPONENT_OPERATORS[defaultComponent] || [] : [];
    const defaultOperator = availableOperators.length > 0 ? availableOperators[0] : 'greater_than';
    
    const newCondition = { 
      ...condition, 
      indicator, 
      component: defaultComponent,
      operator: defaultOperator,
      description: generateDescription({ ...condition, indicator, component: defaultComponent, operator: defaultOperator }) 
    };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleComponentChange = (component: string) => {
    // Get available operators for the new component
    const availableOperators = COMPONENT_OPERATORS[component] || [];
    const defaultOperator = availableOperators.length > 0 ? availableOperators[0] : 'greater_than';
    
    // Reset operator if current operator is not valid for the new component
    const newOperator = availableOperators.includes(condition.operator) ? condition.operator : defaultOperator;
    
    const newCondition = { 
      ...condition, 
      component, 
      operator: newOperator,
      description: generateDescription({ ...condition, component, operator: newOperator }) 
    };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleTimeframeChange = (timeframe: string) => {
    const newCondition = { ...condition, timeframe, description: generateDescription({ ...condition, timeframe }) };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleOperatorChange = (operator: string) => {
    const newCondition = { ...condition, operator, description: generateDescription({ ...condition, operator }) };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleValueChange = (value: number) => {
    const newCondition = { ...condition, value, description: generateDescription({ ...condition, value }) };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const generateDescription = (cond: MainCondition): string => {
    if (cond.type === 'indicator' && cond.indicator) {
      const indicator = AVAILABLE_INDICATORS.find(ind => ind.id === cond.indicator);
      const component = INDICATOR_COMPONENTS[cond.indicator]?.find(comp => comp.id === cond.component);
      const operator = INDICATOR_OPERATORS.find(op => op.value === cond.operator);
      
      const componentName = component?.name || indicator?.name || 'Indicator';
      
      if (operator?.value === 'between') {
        return `${componentName} is between values on ${cond.timeframe}`;
      } else if (operator?.value === 'crosses_above' || operator?.value === 'crosses_below') {
        return `${componentName} ${operator.label.toLowerCase()} on ${cond.timeframe}`;
      } else {
        return `${componentName} ${operator?.label.toLowerCase()} ${cond.value || ''} on ${cond.timeframe}`;
      }
    } else if (cond.type === 'price_action') {
      const operator = PRICE_ACTION_OPERATORS.find(op => op.value === cond.operator);
      return `${operator?.label} on ${cond.timeframe}`;
    } else if (cond.type === 'truthy') {
      return `Condition is ${cond.operator} on ${cond.timeframe}`;
    }
    return 'Main entry condition';
  };

  const getAvailableOperators = () => {
    switch (condition.type) {
      case 'indicator':
        // If component is selected, return component-specific operators
        if (condition.component && COMPONENT_OPERATORS[condition.component]) {
          const componentOperatorValues = COMPONENT_OPERATORS[condition.component];
          return INDICATOR_OPERATORS.filter(op => componentOperatorValues.includes(op.value));
        }
        return INDICATOR_OPERATORS;
      case 'price_action':
        return PRICE_ACTION_OPERATORS;
      case 'truthy':
        return TRUTHY_OPERATORS;
      default:
        return INDICATOR_OPERATORS;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Main Entry Condition
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              This is the primary condition that triggers your trade entry. Only one main condition is allowed.
            </p>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Primary Trigger
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Compact Row Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Condition Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <div className="flex gap-1">
              <Button
                variant={condition.type === 'indicator' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTypeChange('indicator')}
                className={`text-xs px-2 py-1 ${condition.type === 'indicator' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                Indicator
              </Button>
              <Button
                variant={condition.type === 'price_action' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTypeChange('price_action')}
                className={`text-xs px-2 py-1 ${condition.type === 'price_action' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                Price Action
              </Button>
            </div>
          </div>

          {/* Indicator Selection (only for indicator type) */}
          {condition.type === 'indicator' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Indicator
              </label>
              <select
                value={condition.indicator || ''}
                onChange={(e) => handleIndicatorChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
              >
                <option value="">Select Indicator</option>
                {AVAILABLE_INDICATORS.map(indicator => (
                  <option key={indicator.id} value={indicator.id}>
                    {indicator.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Component Selection (only for indicator type with components) */}
          {condition.type === 'indicator' && condition.indicator && INDICATOR_COMPONENTS[condition.indicator] && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Component
              </label>
              <select
                value={condition.component || ''}
                onChange={(e) => handleComponentChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
              >
                <option value="">Select Component</option>
                {INDICATOR_COMPONENTS[condition.indicator].map(component => (
                  <option key={component.id} value={component.id}>
                    {component.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Timeframe Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeframe
            </label>
            <select
              value={condition.timeframe}
              onChange={(e) => handleTimeframeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
            >
              {AVAILABLE_TIMEFRAMES.map(timeframe => (
                <option key={timeframe} value={timeframe}>
                  {timeframe}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operator
            </label>
            <select
              value={condition.operator}
              onChange={(e) => handleOperatorChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
            >
              {getAvailableOperators().map(operator => (
                <option key={operator.value} value={operator.value}>
                  {operator.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Value Input Row (only for indicator type with numeric operators) */}
        {condition.type === 'indicator' && 
         condition.operator !== 'crosses_above' && 
         condition.operator !== 'crosses_below' && 
         condition.operator !== 'between' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="number"
                value={condition.value || ''}
                onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                placeholder="Enter value"
              />
            </div>
            <div className="md:col-span-2"></div>
          </div>
        )}

        {/* Compact Condition Description */}
        <div className="bg-gray-50 p-2 rounded text-xs">
          <span className="text-gray-600 font-medium">Condition: </span>
          <span className="text-gray-800">{condition.description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

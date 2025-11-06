import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  X, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Eye,
  Play,
  Info
} from 'lucide-react';

interface Condition {
  id: string;
  type: 'entry' | 'confirmation' | 'filter' | 'exit_profit' | 'exit_loss' | 'exit_time';
  category: 'indicator' | 'price_action' | 'volume' | 'time' | 'risk';
  indicator?: string;
  component?: string;
  operator: string;
  value?: number;
  timeframe: string;
  description: string;
  isActive: boolean;
  priority: number;
}

interface ConditionEditorProps {
  condition: Condition | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (condition: Condition) => void;
}

const AVAILABLE_INDICATORS = [
  // Trend Indicators
  { id: 'ema', name: 'EMA', category: 'trend', components: ['line'] },
  { id: 'sma', name: 'SMA', category: 'trend', components: ['line'] },
  { id: 'macd', name: 'MACD', category: 'trend', components: ['macd_line', 'signal_line', 'histogram', 'zero_line'] },
  { id: 'adx', name: 'ADX', category: 'trend', components: ['adx_line', 'plus_di', 'minus_di'] },
  { id: 'psar', name: 'Parabolic SAR', category: 'trend', components: ['psar_dots'] },
  
  // Momentum Indicators
  { id: 'rsi', name: 'RSI', category: 'momentum', components: ['rsi_line', 'overbought', 'oversold'] },
  { id: 'stoch', name: 'Stochastic', category: 'momentum', components: ['k_percent', 'd_percent', 'overbought', 'oversold'] },
  { id: 'cci', name: 'CCI', category: 'momentum', components: ['cci_line', 'overbought', 'oversold'] },
  { id: 'williams', name: 'Williams %R', category: 'momentum', components: ['williams_line', 'overbought', 'oversold'] },
  
  // Volatility Indicators
  { id: 'bb', name: 'Bollinger Bands', category: 'volatility', components: ['upper_band', 'middle_band', 'lower_band', 'bandwidth'] },
  { id: 'atr', name: 'ATR', category: 'volatility', components: ['atr_line'] },
  { id: 'kc', name: 'Keltner Channels', category: 'volatility', components: ['upper_channel', 'middle_channel', 'lower_channel'] },
  
  // Volume Indicators
  { id: 'obv', name: 'OBV', category: 'volume', components: ['obv_line'] },
  { id: 'mfi', name: 'MFI', category: 'volume', components: ['mfi_line', 'overbought', 'oversold'] },
  { id: 'vwap', name: 'VWAP', category: 'volume', components: ['vwap_line'] },
];

const INDICATOR_COMPONENTS: { [key: string]: Array<{ id: string; name: string; description: string }> } = {
  'macd': [
    { id: 'macd_line', name: 'MACD Line', description: 'MACD Line (12-period EMA - 26-period EMA)' },
    { id: 'signal_line', name: 'Signal Line', description: 'Signal Line (9-period EMA of MACD Line)' },
    { id: 'histogram', name: 'Histogram', description: 'MACD Histogram (MACD Line - Signal Line)' },
    { id: 'zero_line', name: 'Zero Line', description: 'Zero Line (reference line at 0)' }
  ],
  'rsi': [
    { id: 'rsi_line', name: 'RSI Line', description: 'RSI value (0-100)' },
    { id: 'overbought', name: 'Overbought Level', description: 'RSI above 70 (overbought)' },
    { id: 'oversold', name: 'Oversold Level', description: 'RSI below 30 (oversold)' }
  ],
  'bb': [
    { id: 'upper_band', name: 'Upper Band', description: 'Upper Bollinger Band' },
    { id: 'middle_band', name: 'Middle Band', description: 'Middle Bollinger Band (SMA)' },
    { id: 'lower_band', name: 'Lower Band', description: 'Lower Bollinger Band' },
    { id: 'bandwidth', name: 'Bandwidth', description: 'Bandwidth (Upper - Lower) / Middle' }
  ],
  'stoch': [
    { id: 'k_percent', name: '%K Line', description: 'Stochastic %K line' },
    { id: 'd_percent', name: '%D Line', description: 'Stochastic %D line (SMA of %K)' },
    { id: 'overbought', name: 'Overbought', description: 'Above 80' },
    { id: 'oversold', name: 'Oversold', description: 'Below 20' }
  ],
  'atr': [
    { id: 'atr_line', name: 'ATR Line', description: 'Average True Range value' }
  ],
  'adx': [
    { id: 'adx_line', name: 'ADX Line', description: 'Average Directional Index' },
    { id: 'plus_di', name: '+DI', description: 'Positive Directional Indicator' },
    { id: 'minus_di', name: '-DI', description: 'Negative Directional Indicator' }
  ],
  'psar': [
    { id: 'psar_dots', name: 'PSAR Dots', description: 'Parabolic SAR dots' }
  ],
  'cci': [
    { id: 'cci_line', name: 'CCI Line', description: 'Commodity Channel Index' },
    { id: 'overbought', name: 'Overbought', description: 'Above +100' },
    { id: 'oversold', name: 'Oversold', description: 'Below -100' }
  ],
  'williams': [
    { id: 'williams_line', name: 'Williams %R', description: 'Williams %R value' },
    { id: 'overbought', name: 'Overbought', description: 'Above -20' },
    { id: 'oversold', name: 'Oversold', description: 'Below -80' }
  ],
  'kc': [
    { id: 'upper_channel', name: 'Upper Channel', description: 'Upper Keltner Channel' },
    { id: 'middle_channel', name: 'Middle Channel', description: 'Middle Keltner Channel (EMA)' },
    { id: 'lower_channel', name: 'Lower Channel', description: 'Lower Keltner Channel' }
  ],
  'obv': [
    { id: 'obv_line', name: 'OBV Line', description: 'On-Balance Volume' }
  ],
  'mfi': [
    { id: 'mfi_line', name: 'MFI Line', description: 'Money Flow Index' },
    { id: 'overbought', name: 'Overbought', description: 'Above 80' },
    { id: 'oversold', name: 'Oversold', description: 'Below 20' }
  ],
  'vwap': [
    { id: 'vwap_line', name: 'VWAP Line', description: 'Volume Weighted Average Price' }
  ],
  'ema': [
    { id: 'line', name: 'EMA Line', description: 'Exponential Moving Average' }
  ],
  'sma': [
    { id: 'line', name: 'SMA Line', description: 'Simple Moving Average' }
  ]
};

const COMPONENT_OPERATORS: { [key: string]: string[] } = {
  'macd_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'signal_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'histogram': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'zero_line': ['crosses_above', 'crosses_below'],
  'rsi_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'overbought': ['crosses_above', 'crosses_below'],
  'oversold': ['crosses_above', 'crosses_below'],
  'upper_band': ['crosses_above', 'crosses_below'],
  'middle_band': ['crosses_above', 'crosses_below'],
  'lower_band': ['crosses_above', 'crosses_below'],
  'bandwidth': ['greater_than', 'less_than'],
  'k_percent': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'd_percent': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'atr_line': ['greater_than', 'less_than'],
  'adx_line': ['greater_than', 'less_than'],
  'plus_di': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'minus_di': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'psar_dots': ['crosses_above', 'crosses_below'],
  'cci_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'williams_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'upper_channel': ['crosses_above', 'crosses_below'],
  'middle_channel': ['crosses_above', 'crosses_below'],
  'lower_channel': ['crosses_above', 'crosses_below'],
  'obv_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'mfi_line': ['greater_than', 'less_than', 'crosses_above', 'crosses_below'],
  'vwap_line': ['crosses_above', 'crosses_below'],
  'line': ['crosses_above', 'crosses_below']
};

const AVAILABLE_OPERATORS = {
  'crosses_above': { symbol: '↗', name: 'Crosses Above', description: 'Line crosses above another line' },
  'crosses_below': { symbol: '↘', name: 'Crosses Below', description: 'Line crosses below another line' },
  'greater_than': { symbol: '>', name: 'Greater Than', description: 'Value is greater than threshold' },
  'less_than': { symbol: '<', name: 'Less Than', description: 'Value is less than threshold' },
  'equals': { symbol: '=', name: 'Equals', description: 'Value equals threshold' },
  'divergence': { symbol: '↔', name: 'Divergence', description: 'Price and indicator move in opposite directions' },
  'convergence': { symbol: '→', name: 'Convergence', description: 'Price and indicator move in same direction' },
};

const TIMEFRAMES = [
  { id: '1m', name: '1 Minute', description: 'Very short-term signals' },
  { id: '5m', name: '5 Minutes', description: 'Short-term scalping' },
  { id: '15m', name: '15 Minutes', description: 'Intraday trading' },
  { id: '1h', name: '1 Hour', description: 'Swing trading' },
  { id: '4h', name: '4 Hours', description: 'Position trading' },
  { id: '1d', name: '1 Day', description: 'Long-term trends' },
];

export default function ConditionEditor({ condition, isOpen, onClose, onSave }: ConditionEditorProps) {
  const [formData, setFormData] = useState<Condition>(condition || {
    id: '',
    type: 'entry',
    category: 'indicator',
    operator: 'greater_than',
    timeframe: '1h',
    description: '',
    isActive: true,
    priority: 1,
  });

  React.useEffect(() => {
    if (condition) {
      setFormData(condition);
    }
  }, [condition]);

  const handleSave = () => {
    const updatedCondition = {
      ...formData,
      description: generateDescription(formData),
    };
    onSave(updatedCondition);
    onClose();
  };

  const generateDescription = (data: Condition): string => {
    if (data.category === 'indicator' && data.indicator && data.component) {
      const indicator = AVAILABLE_INDICATORS.find(i => i.id === data.indicator);
      const component = INDICATOR_COMPONENTS[data.indicator]?.find(c => c.id === data.component);
      const operator = AVAILABLE_OPERATORS[data.operator as keyof typeof AVAILABLE_OPERATORS];
      
      if (indicator && component && operator) {
        let desc = `${indicator.name} ${component.name} ${operator.name}`;
        if (data.value !== undefined) {
          desc += ` ${data.value}`;
        }
        desc += ` on ${TIMEFRAMES.find(t => t.id === data.timeframe)?.name}`;
        return desc;
      }
    }
    return data.description || 'New condition';
  };

  const getAvailableOperators = (): string[] => {
    if (formData.indicator && formData.component) {
      return COMPONENT_OPERATORS[formData.component] || [];
    }
    return Object.keys(AVAILABLE_OPERATORS);
  };

  const handleIndicatorChange = (indicatorId: string) => {
    const indicator = AVAILABLE_INDICATORS.find(i => i.id === indicatorId);
    const components = INDICATOR_COMPONENTS[indicatorId] || [];
    const defaultComponent = components[0]?.id || '';
    const availableOps = COMPONENT_OPERATORS[defaultComponent] || [];
    const defaultOperator = availableOps[0] || 'greater_than';

    setFormData(prev => ({
      ...prev,
      indicator: indicatorId,
      component: defaultComponent,
      operator: defaultOperator,
    }));
  };

  const handleComponentChange = (componentId: string) => {
    const availableOps = COMPONENT_OPERATORS[componentId] || [];
    const defaultOperator = availableOps[0] || 'greater_than';

    setFormData(prev => ({
      ...prev,
      component: componentId,
      operator: availableOps.includes(prev.operator) ? prev.operator : defaultOperator,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[70vh] overflow-y-auto bg-white shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Edit Condition
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 p-4">
          {/* Condition Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Condition['type'] }))}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="entry">Entry Condition</option>
              <option value="confirmation">Confirmation Condition</option>
              <option value="filter">Filter Condition</option>
              <option value="exit_profit">Take Profit Condition</option>
              <option value="exit_loss">Stop Loss Condition</option>
              <option value="exit_time">Time-based Exit</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Condition['category'] }))}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="indicator">Technical Indicator</option>
              <option value="price_action">Price Action</option>
              <option value="volume">Volume</option>
              <option value="time">Time-based</option>
              <option value="risk">Risk Management</option>
            </select>
          </div>

          {/* Indicator Selection */}
          {formData.category === 'indicator' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indicator
                </label>
                <select
                  value={formData.indicator || ''}
                  onChange={(e) => handleIndicatorChange(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select Indicator</option>
                  {AVAILABLE_INDICATORS.map(indicator => (
                    <option key={indicator.id} value={indicator.id}>
                      {indicator.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Component Selection */}
              {formData.indicator && INDICATOR_COMPONENTS[formData.indicator] && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Component
                  </label>
                  <select
                    value={formData.component || ''}
                    onChange={(e) => handleComponentChange(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Select Component</option>
                    {INDICATOR_COMPONENTS[formData.indicator].map(component => (
                      <option key={component.id} value={component.id}>
                        {component.name}
                      </option>
                    ))}
                  </select>
                  {formData.component && (
                    <p className="text-xs text-gray-500 mt-1">
                      {INDICATOR_COMPONENTS[formData.indicator].find(c => c.id === formData.component)?.description}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Operator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operator
            </label>
            <select
              value={formData.operator}
              onChange={(e) => setFormData(prev => ({ ...prev, operator: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {getAvailableOperators().map(operator => (
                <option key={operator} value={operator}>
                  {AVAILABLE_OPERATORS[operator as keyof typeof AVAILABLE_OPERATORS]?.name || operator}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {AVAILABLE_OPERATORS[formData.operator as keyof typeof AVAILABLE_OPERATORS]?.description}
            </p>
          </div>

          {/* Value Input */}
          {['greater_than', 'less_than', 'equals'].includes(formData.operator) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="number"
                value={formData.value || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || undefined }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Enter threshold value"
              />
            </div>
          )}

          {/* Timeframe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeframe
            </label>
            <select
              value={formData.timeframe}
              onChange={(e) => setFormData(prev => ({ ...prev, timeframe: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {TIMEFRAMES.map(timeframe => (
                <option key={timeframe.id} value={timeframe.id}>
                  {timeframe.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {TIMEFRAMES.find(t => t.id === formData.timeframe)?.description}
            </p>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher numbers = higher priority (1-10)
            </p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-2 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1 text-xs">Condition Preview</h4>
            <p className="text-xs text-gray-700">{generateDescription(formData)}</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Condition
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

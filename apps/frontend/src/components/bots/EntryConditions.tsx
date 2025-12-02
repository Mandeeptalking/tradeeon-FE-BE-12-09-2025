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
  indicator: 'RSI' | 'MACD' | 'EMA' | 'SMA' | 'Price';
  component?: string;
  operator: string;
  value?: number;
  lowerBound?: number;
  upperBound?: number;
  period?: number;
  timeframe: string;
  logicGate?: 'AND' | 'OR';
}

export interface EntryConditionsData {
  entryType: 'immediate' | 'conditional'; // How to enter trades
  orderType?: 'market' | 'limit'; // Order type for immediate entry
  limitPrice?: number; // Limit price when orderType is 'limit' (for single pair)
  limitPrices?: { [pair: string]: number }; // Limit prices per pair (for multiple pairs)
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
    name: 'Price Above EMA 20',
    enabled: true,
    indicator: 'EMA',
    component: 'ema_line',
    operator: 'crosses_above',
    period: 20,
    timeframe: '1h',
  },
  {
    name: 'Price Below EMA 20',
    enabled: true,
    indicator: 'EMA',
    component: 'ema_line',
    operator: 'crosses_below',
    period: 20,
    timeframe: '1h',
  },
  {
    name: 'EMA 9 Crosses Above EMA 26',
    enabled: true,
    indicator: 'EMA',
    component: 'crossover',
    operator: 'crosses_above',
    period: 9,
    timeframe: '4h',
  },
];

// Available indicators
const INDICATORS = [
  { value: 'RSI', label: 'RSI (Relative Strength Index)', icon: BarChart3 },
  { value: 'MACD', label: 'MACD', icon: TrendingUp },
  { value: 'EMA', label: 'EMA (Exponential Moving Average)', icon: TrendingUp },
  { value: 'SMA', label: 'SMA (Simple Moving Average)', icon: TrendingUp },
  { value: 'Price', label: 'Price Action', icon: Zap },
];

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

// Operators by indicator
const OPERATORS: Record<string, Array<{ value: string; label: string }>> = {
  RSI: [
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'between', label: 'Between' },
  ],
  MACD: [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
  ],
  EMA: [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  SMA: [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  Price: [
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
};

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
    const newCondition: EntryCondition = {
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Custom Condition',
      enabled: true,
      indicator: 'RSI',
      component: 'rsi_line',
      operator: 'crosses_below',
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
    const operator = OPERATORS[condition.indicator]?.find(
      (op) => op.value === condition.operator
    );
    
    if (!indicator || !operator) return condition.name;
    
    let desc = `${indicator.label} ${operator.label}`;
    
    if (condition.operator === 'between' && condition.lowerBound !== undefined && condition.upperBound !== undefined) {
      desc += ` ${condition.lowerBound}-${condition.upperBound}`;
    } else if (condition.value !== undefined) {
      desc += ` ${condition.value}`;
    }
    
    if (condition.period) {
      desc += ` (Period: ${condition.period})`;
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
                  onClick={() => onChange({ ...conditions, orderType: 'market', limitPrice: undefined, limitPrices: undefined })}
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
                    // Initialize limitPrices if multiple pairs, otherwise use limitPrice
                    const newConditions = { ...conditions, orderType: 'limit' };
                    if (selectedPairs.length > 1) {
                      // Initialize limitPrices object for multiple pairs
                      const initialLimitPrices: { [pair: string]: number } = {};
                      selectedPairs.forEach(pair => {
                        if (conditions.limitPrices?.[pair]) {
                          initialLimitPrices[pair] = conditions.limitPrices[pair];
                        }
                      });
                      newConditions.limitPrices = Object.keys(initialLimitPrices).length > 0 ? initialLimitPrices : undefined;
                      newConditions.limitPrice = undefined;
                    } else if (selectedPairs.length === 1) {
                      // Use limitPrice for single pair
                      newConditions.limitPrice = conditions.limitPrice || 0;
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
                  // Single pair - show single input
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
                        onChange({ ...conditions, limitPrice: value, limitPrices: undefined });
                      }}
                      className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                      placeholder="Enter limit price"
                    />
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      The order will execute when the market price reaches this limit price
                    </p>
                  </div>
                ) : (
                  // Multiple pairs - show table with individual inputs
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
                                          limitPrice: undefined, // Clear single limitPrice when using multiple
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
                            >
                              <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OPERATORS[condition.indicator]?.map((op) => (
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

                          {(condition.indicator === 'RSI' || condition.indicator === 'EMA' || condition.indicator === 'SMA') && (
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
                                placeholder="14"
                              />
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


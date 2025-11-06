import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Target, TrendingUp, Plus } from 'lucide-react';

interface MainEntryCondition {
  id: string;
  type: 'indicator' | 'price_action';
  indicator?: string;
  component?: string;
  timeframe: string;
  operator: string;
  value?: number;
  upperBound?: number;
  lowerBound?: number;
  barsCount?: number;
  description: string;
  triggerMode?: 'once' | 'per_bar' | 'per_bar_close' | 'per_minute';
}

// Only RSI for now - we'll add other indicators one by one
const AVAILABLE_INDICATORS = [
  { id: 'rsi', name: 'RSI', description: 'Relative Strength Index', category: 'Momentum' }
];

// Available timeframes
const AVAILABLE_TIMEFRAMES = [
  '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'
];

// RSI Components only
const INDICATOR_COMPONENTS: { [key: string]: Array<{ id: string; name: string; description: string }> } = {
  'rsi': [
    { id: 'rsi_line', name: 'RSI Line', description: 'RSI Line value (0-100)' },
    { id: 'rsi_overbought', name: 'Overbought (70)', description: 'Overbought level at 70' },
    { id: 'rsi_oversold', name: 'Oversold (30)', description: 'Oversold level at 30' }
  ]
};

// All possible operators based on TradingView RSI conditions
const INDICATOR_OPERATORS = [
  { value: 'crossing', label: 'Crossing' },
  { value: 'crossing_up', label: 'Crossing Up' },
  { value: 'crossing_down', label: 'Crossing Down' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'equals', label: 'Equals' },
  { value: 'entering_channel', label: 'Entering Channel' },
  { value: 'exiting_channel', label: 'Exiting Channel' },
  { value: 'inside_channel', label: 'Inside Channel' },
  { value: 'outside_channel', label: 'Outside Channel' },
  { value: 'moving_up', label: 'Moving Up' },
  { value: 'moving_down', label: 'Moving Down' },
  { value: 'percent_moving_up', label: '% Moving Up' },
  { value: 'percent_moving_down', label: '% Moving Down' },
  { value: 'line_crosses_above', label: 'Line Crosses Above' },
  { value: 'line_crosses_below', label: 'Line Crosses Below' },
  { value: 'crosses_zero', label: 'Crosses Zero' }
];

// RSI-specific operators mapping based on TradingView's RSI alert conditions
const COMPONENT_OPERATORS: { [key: string]: string[] } = {
  // RSI Line - can use all comparison, crossing, channel, and momentum operators
  'rsi_line': [
    'crossing', 'crossing_up', 'crossing_down',
    'greater_than', 'less_than', 'equals',
    'entering_channel', 'exiting_channel', 'inside_channel', 'outside_channel',
    'moving_up', 'moving_down',
    'percent_moving_up', 'percent_moving_down'
  ],
  
  // Overbought level (70) - mostly crossing operators
  'rsi_overbought': ['crossing', 'crossing_up', 'crossing_down', 'entering_channel', 'exiting_channel'],
  
  // Oversold level (30) - mostly crossing operators
  'rsi_oversold': ['crossing', 'crossing_up', 'crossing_down', 'entering_channel', 'exiting_channel']
};

interface SetupMainEntryConditionProps {
  onConditionChange?: (condition: MainEntryCondition) => void;
}

export default function SetupMainEntryCondition({ onConditionChange }: SetupMainEntryConditionProps) {
  const [condition, setCondition] = useState<MainEntryCondition>({
    id: 'main_entry_condition_1',
    type: 'indicator',
    indicator: 'rsi',
    component: 'rsi_line',
    timeframe: '4h',
    operator: 'moving_down',
    value: 1.0,
    barsCount: 2,
    upperBound: 70,
    lowerBound: 30,
    description: 'RSI Line moving down',
    triggerMode: 'once'
  });

  const handleIndicatorChange = (indicator: string) => {
    const newCondition: MainEntryCondition = { ...condition, indicator };
    const components = INDICATOR_COMPONENTS[indicator];
    if (components && components.length > 0) {
      newCondition.component = components[0].id;
    } else {
      newCondition.component = undefined;
    }
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleComponentChange = (component: string) => {
    const newCondition = { ...condition, component };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleTimeframeChange = (timeframe: string) => {
    const newCondition = { ...condition, timeframe };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleOperatorChange = (operator: string) => {
    const newCondition = { ...condition, operator };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleValueChange = (value: number) => {
    const newCondition = { ...condition, value };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleUpperBoundChange = (upperBound: number) => {
    const newCondition = { ...condition, upperBound };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleLowerBoundChange = (lowerBound: number) => {
    const newCondition = { ...condition, lowerBound };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleBarsCountChange = (barsCount: number) => {
    const newCondition = { ...condition, barsCount };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleTriggerModeChange = (mode: 'once' | 'per_bar' | 'per_bar_close' | 'per_minute') => {
    const newCondition = { ...condition, triggerMode: mode };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const generateDescription = () => {
    if (condition.type === 'indicator' && condition.indicator && condition.component) {
      const indicator = AVAILABLE_INDICATORS.find(ind => ind.id === condition.indicator);
      const component = INDICATOR_COMPONENTS[condition.indicator]?.find(comp => comp.id === condition.component);
      const operator = INDICATOR_OPERATORS.find(op => op.value === condition.operator);
      
      if (indicator && component && operator) {
        const channelOps = ['entering_channel', 'exiting_channel', 'inside_channel', 'outside_channel'];
        const movingOps = ['moving_up', 'moving_down', 'percent_moving_up', 'percent_moving_down'];
        
        if (channelOps.includes(condition.operator) && condition.upperBound !== undefined && condition.lowerBound !== undefined) {
          return `${indicator.name} ${component.name} ${operator.label} (${condition.lowerBound} - ${condition.upperBound})`;
        }
        
        if (movingOps.includes(condition.operator) && condition.value !== undefined && condition.barsCount !== undefined) {
          return `${indicator.name} ${component.name} ${operator.label} ${condition.value} in ${condition.barsCount} bar${condition.barsCount > 1 ? 's' : ''}`;
        }
        
        return `${indicator.name} ${component.name} ${operator.label} ${condition.value !== undefined ? condition.value : ''}`.trim();
      }
    }
    return 'Main Entry Condition';
  };

  const getAvailableOperators = () => {
    if (condition.component) {
      const allowedOperators = COMPONENT_OPERATORS[condition.component] || [];
      return INDICATOR_OPERATORS.filter(op => allowedOperators.includes(op.value));
    }
    return INDICATOR_OPERATORS;
  };

  // Check if operator is a moving operator
  const isMovingOperator = ['moving_up', 'moving_down', 'percent_moving_up', 'percent_moving_down'].includes(condition.operator);
  const isChannelOperator = ['entering_channel', 'exiting_channel', 'inside_channel', 'outside_channel'].includes(condition.operator);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-gray-700/50 transition-all duration-300">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-500/20 border border-blue-500/50 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Main Entry Condition</h3>
            <p className="text-gray-400 text-xs">Define the primary condition that triggers entry</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Condition Section - TradingView Style */}
          <div className="bg-gray-800/30 rounded-lg p-3 space-y-3">
            {/* Indicator Row */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-gray-300 text-xs mb-1 block">Indicator</Label>
                <Select value={condition.indicator} onValueChange={handleIndicatorChange}>
                  <SelectTrigger className="bg-white/5 border-gray-600 text-white h-9 text-sm">
                    <SelectValue placeholder="Select indicator" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {AVAILABLE_INDICATORS.map(indicator => (
                      <SelectItem key={indicator.id} value={indicator.id} className="text-white hover:bg-gray-700 text-sm">
                        {indicator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Component */}
              {condition.indicator && INDICATOR_COMPONENTS[condition.indicator] && (
                <div className="flex-1">
                  <Label className="text-gray-300 text-xs mb-1 block">Component</Label>
                  <Select value={condition.component} onValueChange={handleComponentChange}>
                    <SelectTrigger className="bg-white/5 border-gray-600 text-white h-9 text-sm">
                      <SelectValue placeholder="Select component" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {INDICATOR_COMPONENTS[condition.indicator].map(component => (
                        <SelectItem key={component.id} value={component.id} className="text-white hover:bg-gray-700 text-sm">
                          {component.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Operator and Parameters Row */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-gray-300 text-xs mb-1 block">Operator</Label>
                <Select value={condition.operator} onValueChange={handleOperatorChange}>
                  <SelectTrigger className="bg-white/5 border-gray-600 text-white h-9 text-sm">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {getAvailableOperators().map(operator => (
                      <SelectItem key={operator.value} value={operator.value} className="text-white hover:bg-gray-700 text-sm">
                        {operator.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Value/Bounds Inputs based on operator type */}
              {isChannelOperator ? (
                <>
                  <div className="flex-1">
                    <Label className="text-gray-300 text-xs mb-1 block">Lower Bound</Label>
                    <Input
                      type="number"
                      value={condition.lowerBound || ''}
                      onChange={(e) => handleLowerBoundChange(Number(e.target.value))}
                      placeholder="Lower"
                      className="bg-white/5 border-gray-600 text-white placeholder-gray-400 h-9 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-gray-300 text-xs mb-1 block">Upper Bound</Label>
                    <Input
                      type="number"
                      value={condition.upperBound || ''}
                      onChange={(e) => handleUpperBoundChange(Number(e.target.value))}
                      placeholder="Upper"
                      className="bg-white/5 border-gray-600 text-white placeholder-gray-400 h-9 text-sm"
                    />
                  </div>
                </>
              ) : isMovingOperator ? (
                <>
                  <div className="w-24">
                    <Label className="text-gray-300 text-xs mb-1 block">
                      {['percent_moving_up', 'percent_moving_down'].includes(condition.operator) ? 'Value (%)' : 'Value'}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={condition.value || ''}
                        onChange={(e) => handleValueChange(Number(e.target.value))}
                        placeholder="0.00"
                        className="bg-white/5 border-gray-600 text-white placeholder-gray-400 h-9 text-sm pr-8"
                      />
                      {['percent_moving_up', 'percent_moving_down'].includes(condition.operator) && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm mb-1">in</span>
                  <div className="w-24">
                    <Label className="text-gray-300 text-xs mb-1 block">Bars</Label>
                    <Input
                      type="number"
                      value={condition.barsCount || ''}
                      onChange={(e) => handleBarsCountChange(Number(e.target.value))}
                      placeholder="2"
                      className="bg-white/5 border-gray-600 text-white placeholder-gray-400 h-9 text-sm"
                    />
                  </div>
                  <span className="text-gray-400 text-sm mb-1">bars</span>
                </>
              ) : (
                <div className="flex-1">
                  <Label className="text-gray-300 text-xs mb-1 block">Value</Label>
                  <Input
                    type="number"
                    value={condition.value || ''}
                    onChange={(e) => handleValueChange(Number(e.target.value))}
                    placeholder="Enter threshold"
                    className="bg-white/5 border-gray-600 text-white placeholder-gray-400 h-9 text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Timeframe Row */}
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center gap-4">
              <Label className="text-gray-300 text-xs">Interval:</Label>
              <div className="flex items-center gap-2">
                <Select value={condition.timeframe} onValueChange={handleTimeframeChange}>
                  <SelectTrigger className="bg-white/5 border-gray-600 text-white h-8 text-sm w-24">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {AVAILABLE_TIMEFRAMES.map(timeframe => (
                      <SelectItem key={timeframe} value={timeframe} className="text-white hover:bg-gray-700 text-sm">
                        {timeframe}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Trigger Section */}
          <div className="bg-gray-800/30 rounded-lg p-3">
            <Label className="text-gray-300 text-xs mb-3 block">Trigger:</Label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleTriggerModeChange('once')}
                className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                  condition.triggerMode === 'once'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                Only once
              </button>
              <button
                onClick={() => handleTriggerModeChange('per_bar')}
                className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                  condition.triggerMode === 'per_bar'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                Once per bar
              </button>
              <button
                onClick={() => handleTriggerModeChange('per_bar_close')}
                className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                  condition.triggerMode === 'per_bar_close'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                Once per bar close
              </button>
              <button
                onClick={() => handleTriggerModeChange('per_minute')}
                className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                  condition.triggerMode === 'per_minute'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                Once per minute
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-2">
              {condition.triggerMode === 'once' && 'The alert will only trigger once and will not be repeated.'}
              {condition.triggerMode === 'per_bar' && 'The alert will trigger once per bar if the condition is met.'}
              {condition.triggerMode === 'per_bar_close' && 'The alert will trigger once per bar close if the condition is met.'}
              {condition.triggerMode === 'per_minute' && 'The alert will trigger once per minute if the condition is met.'}
            </p>
          </div>

          {/* Condition Preview */}
          <div className="bg-white/5 border border-gray-600 rounded-lg p-3">
            <p className="text-gray-300 text-xs font-medium mb-1">Preview</p>
            <p className="text-white text-sm">{generateDescription()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Trash2, Play, Save, Settings, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import StrategyTester from './StrategyTester';

// Types for strategy building
interface Indicator {
  id: string;
  name: string;
  description: string;
  parameters: IndicatorParameter[];
  outputs: string[];
}

interface IndicatorParameter {
  name: string;
  type: 'number' | 'select';
  defaultValue: any;
  options?: string[];
  min?: number;
  max?: number;
}

interface Condition {
  id: string;
  type: 'indicator' | 'price_action' | 'volume';
  operator: 'greater_than' | 'less_than' | 'equals' | 'crosses_above' | 'crosses_below' | 'between';
  value: any;
  indicator?: string;
  parameter?: string;
  timeframe: string;
}

interface Action {
  id: string;
  type: 'buy' | 'sell' | 'close_position';
  amount: number;
  amount_type: 'percentage' | 'fixed' | 'risk_based';
  order_type: 'market' | 'limit' | 'stop';
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  symbol: string;
  timeframe: string;
  conditions: Condition[];
  entry_actions: Action[];
  exit_actions: Action[];
  risk_management: {
    stop_loss: number;
    take_profit: number;
    max_position_size: number;
    max_daily_trades: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Available indicators
const AVAILABLE_INDICATORS: Indicator[] = [
  {
    id: 'rsi',
    name: 'RSI',
    description: 'Relative Strength Index',
    parameters: [
      { name: 'period', type: 'number', defaultValue: 14, min: 2, max: 100 }
    ],
    outputs: ['rsi']
  },
  {
    id: 'ema',
    name: 'EMA',
    description: 'Exponential Moving Average',
    parameters: [
      { name: 'period', type: 'number', defaultValue: 20, min: 1, max: 200 }
    ],
    outputs: ['ema']
  },
  {
    id: 'macd',
    name: 'MACD',
    description: 'Moving Average Convergence Divergence',
    parameters: [
      { name: 'fast_period', type: 'number', defaultValue: 12, min: 1, max: 50 },
      { name: 'slow_period', type: 'number', defaultValue: 26, min: 1, max: 100 },
      { name: 'signal_period', type: 'number', defaultValue: 9, min: 1, max: 50 }
    ],
    outputs: ['macd', 'signal', 'histogram']
  },
  {
    id: 'stochastic',
    name: 'Stochastic',
    description: 'Stochastic Oscillator',
    parameters: [
      { name: 'k_period', type: 'number', defaultValue: 14, min: 1, max: 50 },
      { name: 'd_period', type: 'number', defaultValue: 3, min: 1, max: 20 }
    ],
    outputs: ['k_percent', 'd_percent']
  },
  {
    id: 'bollinger_bands',
    name: 'Bollinger Bands',
    description: 'Bollinger Bands',
    parameters: [
      { name: 'period', type: 'number', defaultValue: 20, min: 2, max: 100 },
      { name: 'std_dev', type: 'number', defaultValue: 2, min: 0.1, max: 5 }
    ],
    outputs: ['upper_band', 'middle_band', 'lower_band']
  },
  {
    id: 'atr',
    name: 'ATR',
    description: 'Average True Range',
    parameters: [
      { name: 'period', type: 'number', defaultValue: 14, min: 1, max: 100 }
    ],
    outputs: ['atr']
  }
];

const TIMEFRAMES = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' }
];

const OPERATORS = [
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'equals', label: 'Equals (=)' },
  { value: 'crosses_above', label: 'Crosses Above' },
  { value: 'crosses_below', label: 'Crosses Below' },
  { value: 'between', label: 'Between' }
];

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT', 
  'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT'
];

interface StrategyBuilderProps {
  initialStrategy?: Strategy | null;
  onSave?: (strategy: Strategy) => void;
  onCancel?: () => void;
}

export default function StrategyBuilder({ initialStrategy, onSave, onCancel }: StrategyBuilderProps = {}) {
  const [strategy, setStrategy] = useState<Strategy>(
    initialStrategy || {
      id: '',
      name: '',
      description: '',
      symbol: 'BTCUSDT',
      timeframe: '4h',
      conditions: [],
      entry_actions: [],
      exit_actions: [],
      risk_management: {
        stop_loss: 2,
        take_profit: 4,
        max_position_size: 100,
        max_daily_trades: 10
      },
      is_active: false,
      created_at: '',
      updated_at: ''
    }
  );

  const [activeTab, setActiveTab] = useState('conditions');
  const [showPreview, setShowPreview] = useState(false);
  const [showTester, setShowTester] = useState(false);

  // Add new condition
  const addCondition = () => {
    const newCondition: Condition = {
      id: Date.now().toString(),
      type: 'indicator',
      operator: 'greater_than',
      value: '',
      indicator: 'rsi',
      parameter: 'rsi',
      timeframe: strategy.timeframe
    };
    
    setStrategy(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  };

  // Remove condition
  const removeCondition = (conditionId: string) => {
    setStrategy(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== conditionId)
    }));
  };

  // Update condition
  const updateCondition = (conditionId: string, updates: Partial<Condition>) => {
    setStrategy(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => 
        c.id === conditionId ? { ...c, ...updates } : c
      )
    }));
  };

  // Add entry action
  const addEntryAction = () => {
    const newAction: Action = {
      id: Date.now().toString(),
      type: 'buy',
      amount: 100,
      amount_type: 'fixed',
      order_type: 'market'
    };
    
    setStrategy(prev => ({
      ...prev,
      entry_actions: [...prev.entry_actions, newAction]
    }));
  };

  // Remove entry action
  const removeEntryAction = (actionId: string) => {
    setStrategy(prev => ({
      ...prev,
      entry_actions: prev.entry_actions.filter(a => a.id !== actionId)
    }));
  };

  // Update entry action
  const updateEntryAction = (actionId: string, updates: Partial<Action>) => {
    setStrategy(prev => ({
      ...prev,
      entry_actions: prev.entry_actions.map(a => 
        a.id === actionId ? { ...a, ...updates } : a
      )
    }));
  };

  // Validate strategy
  const validateStrategy = (): string[] => {
    const errors: string[] = [];
    
    if (!strategy.name.trim()) {
      errors.push('Strategy name is required');
    }
    
    if (strategy.conditions.length === 0) {
      errors.push('At least one condition is required');
    }
    
    if (strategy.entry_actions.length === 0) {
      errors.push('At least one entry action is required');
    }
    
    strategy.conditions.forEach((condition, index) => {
      if (!condition.value && condition.operator !== 'crosses_above' && condition.operator !== 'crosses_below') {
        errors.push(`Condition ${index + 1}: Value is required`);
      }
    });
    
    return errors;
  };

  // Save strategy
  const saveStrategy = () => {
    const errors = validateStrategy();
    if (errors.length > 0) {
      toast.error(`Validation failed: ${errors.join(', ')}`);
      return;
    }
    
    // Generate ID and timestamps if new strategy
    const strategyToSave = {
      ...strategy,
      id: strategy.id || `strategy_${Date.now()}`,
      created_at: strategy.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (onSave) {
      onSave(strategyToSave);
    } else {
      // Default behavior
      toast.success('Strategy saved successfully!');
      console.log('Saving strategy:', strategyToSave);
    }
  };

  // Test strategy
  const testStrategy = () => {
    const errors = validateStrategy();
    if (errors.length > 0) {
      toast.error(`Cannot test: ${errors.join(', ')}`);
      return;
    }
    
    setShowTester(true);
    toast.success('Strategy test started!');
  };

  // Get indicator info
  const getIndicatorInfo = (indicatorId: string) => {
    return AVAILABLE_INDICATORS.find(ind => ind.id === indicatorId);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Strategy Builder</h1>
          <p className="text-gray-600 mt-2">Create and test your trading strategies with advanced conditions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" onClick={testStrategy}>
            <Play className="w-4 h-4 mr-2" />
            Test Strategy
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={saveStrategy}>
            <Save className="w-4 h-4 mr-2" />
            Save Strategy
          </Button>
        </div>
      </div>

      {/* Strategy Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Strategy Name</Label>
              <Input
                id="name"
                value={strategy.name}
                onChange={(e) => setStrategy(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., RSI Oversold Strategy"
              />
            </div>
            <div>
              <Label htmlFor="symbol">Trading Symbol</Label>
              <Select 
                value={strategy.symbol} 
                onValueChange={(value) => setStrategy(prev => ({ ...prev, symbol: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYMBOLS.map(symbol => (
                    <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select 
                value={strategy.timeframe} 
                onValueChange={(value) => setStrategy(prev => ({ ...prev, timeframe: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map(tf => (
                    <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={strategy.description}
                onChange={(e) => setStrategy(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your strategy"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Builder Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="conditions">Entry Conditions</TabsTrigger>
          <TabsTrigger value="actions">Entry Actions</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
          <TabsTrigger value="settings">Advanced Settings</TabsTrigger>
        </TabsList>

        {/* Entry Conditions Tab */}
        <TabsContent value="conditions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Entry Conditions</CardTitle>
                <Button onClick={addCondition} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Condition
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {strategy.conditions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No conditions added yet. Click "Add Condition" to start building your strategy.</p>
                </div>
              ) : (
                strategy.conditions.map((condition, index) => (
                  <Card key={condition.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Condition {index + 1}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeCondition(condition.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Condition Type</Label>
                          <Select 
                            value={condition.type} 
                            onValueChange={(value) => updateCondition(condition.id, { type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="indicator">Indicator</SelectItem>
                              <SelectItem value="price_action">Price Action</SelectItem>
                              <SelectItem value="volume">Volume</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {condition.type === 'indicator' && (
                          <div>
                            <Label>Indicator</Label>
                            <Select 
                              value={condition.indicator || ''} 
                              onValueChange={(value) => updateCondition(condition.id, { 
                                indicator: value,
                                parameter: getIndicatorInfo(value)?.outputs[0] || ''
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_INDICATORS.map(ind => (
                                  <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {condition.type === 'indicator' && condition.indicator && (
                          <div>
                            <Label>Parameter</Label>
                            <Select 
                              value={condition.parameter || ''} 
                              onValueChange={(value) => updateCondition(condition.id, { parameter: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getIndicatorInfo(condition.indicator!)?.outputs.map(output => (
                                  <SelectItem key={output} value={output}>{output}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div>
                          <Label>Operator</Label>
                          <Select 
                            value={condition.operator} 
                            onValueChange={(value) => updateCondition(condition.id, { operator: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OPERATORS.map(op => (
                                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {(condition.operator !== 'crosses_above' && condition.operator !== 'crosses_below') && (
                          <div>
                            <Label>Value</Label>
                            <Input
                              type="number"
                              value={condition.value}
                              onChange={(e) => updateCondition(condition.id, { value: parseFloat(e.target.value) || 0 })}
                              placeholder="Enter value"
                            />
                          </div>
                        )}

                        <div>
                          <Label>Timeframe</Label>
                          <Select 
                            value={condition.timeframe} 
                            onValueChange={(value) => updateCondition(condition.id, { timeframe: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIMEFRAMES.map(tf => (
                                <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Show indicator description */}
                      {condition.type === 'indicator' && condition.indicator && (
                        <div className="mt-2">
                          <Badge variant="secondary">
                            {getIndicatorInfo(condition.indicator)?.description}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entry Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Entry Actions</CardTitle>
                <Button onClick={addEntryAction} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Action
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {strategy.entry_actions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No entry actions defined. Add actions to execute when conditions are met.</p>
                </div>
              ) : (
                strategy.entry_actions.map((action, index) => (
                  <Card key={action.id} className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Action {index + 1}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeEntryAction(action.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Action Type</Label>
                          <Select 
                            value={action.type} 
                            onValueChange={(value) => updateEntryAction(action.id, { type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="buy">Buy</SelectItem>
                              <SelectItem value="sell">Sell</SelectItem>
                              <SelectItem value="close_position">Close Position</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            value={action.amount}
                            onChange={(e) => updateEntryAction(action.id, { amount: parseFloat(e.target.value) || 0 })}
                            placeholder="Enter amount"
                          />
                        </div>

                        <div>
                          <Label>Amount Type</Label>
                          <Select 
                            value={action.amount_type} 
                            onValueChange={(value) => updateEntryAction(action.id, { amount_type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed USD</SelectItem>
                              <SelectItem value="percentage">Percentage of Balance</SelectItem>
                              <SelectItem value="risk_based">Risk-Based</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Order Type</Label>
                          <Select 
                            value={action.order_type} 
                            onValueChange={(value) => updateEntryAction(action.id, { order_type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="market">Market Order</SelectItem>
                              <SelectItem value="limit">Limit Order</SelectItem>
                              <SelectItem value="stop">Stop Order</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Management Tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stop_loss">Stop Loss (%)</Label>
                  <Input
                    id="stop_loss"
                    type="number"
                    value={strategy.risk_management.stop_loss}
                    onChange={(e) => setStrategy(prev => ({
                      ...prev,
                      risk_management: {
                        ...prev.risk_management,
                        stop_loss: parseFloat(e.target.value) || 0
                      }
                    }))}
                    placeholder="2"
                  />
                </div>
                <div>
                  <Label htmlFor="take_profit">Take Profit (%)</Label>
                  <Input
                    id="take_profit"
                    type="number"
                    value={strategy.risk_management.take_profit}
                    onChange={(e) => setStrategy(prev => ({
                      ...prev,
                      risk_management: {
                        ...prev.risk_management,
                        take_profit: parseFloat(e.target.value) || 0
                      }
                    }))}
                    placeholder="4"
                  />
                </div>
                <div>
                  <Label htmlFor="max_position">Max Position Size (USD)</Label>
                  <Input
                    id="max_position"
                    type="number"
                    value={strategy.risk_management.max_position_size}
                    onChange={(e) => setStrategy(prev => ({
                      ...prev,
                      risk_management: {
                        ...prev.risk_management,
                        max_position_size: parseFloat(e.target.value) || 0
                      }
                    }))}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="max_trades">Max Daily Trades</Label>
                  <Input
                    id="max_trades"
                    type="number"
                    value={strategy.risk_management.max_daily_trades}
                    onChange={(e) => setStrategy(prev => ({
                      ...prev,
                      risk_management: {
                        ...prev.risk_management,
                        max_daily_trades: parseInt(e.target.value) || 0
                      }
                    }))}
                    placeholder="10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={strategy.is_active}
                  onChange={(e) => setStrategy(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="is_active">Enable Strategy</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Strategy Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Strategy Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(strategy, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Strategy Tester */}
      {showTester && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Strategy Testing</h2>
            <Button variant="outline" onClick={() => setShowTester(false)}>
              Close Tester
            </Button>
          </div>
          <StrategyTester strategy={strategy} />
        </div>
      )}
    </div>
  );
}

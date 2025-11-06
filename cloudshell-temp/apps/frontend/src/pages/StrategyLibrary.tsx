import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Search, 
  TrendingUp, 
  Clock, 
  Target, 
  Shield, 
  Play, 
  Copy,
  Eye,
  Star,
  Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  EXAMPLE_STRATEGIES, 
  getStrategiesBySymbol, 
  getStrategiesByTimeframe,
  getAvailableSymbols,
  getAvailableTimeframes 
} from '../lib/exampleStrategies';
import { Strategy } from '../lib/strategyEngine';

interface StrategyLibraryProps {
  onLoadStrategy?: (strategy: Strategy) => void;
  onViewStrategy?: (strategy: Strategy) => void;
}

export default function StrategyLibrary({ onLoadStrategy, onViewStrategy }: StrategyLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Filter strategies
  const filteredStrategies = EXAMPLE_STRATEGIES.filter(strategy => {
    const matchesSearch = strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         strategy.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSymbol = selectedSymbol === 'all' || strategy.symbol === selectedSymbol;
    const matchesTimeframe = selectedTimeframe === 'all' || strategy.timeframe === selectedTimeframe;
    
    return matchesSearch && matchesSymbol && matchesTimeframe;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'symbol':
        return a.symbol.localeCompare(b.symbol);
      case 'timeframe':
        return a.timeframe.localeCompare(b.timeframe);
      case 'complexity':
        return b.conditions.length - a.conditions.length;
      default:
        return 0;
    }
  });

  const handleLoadStrategy = (strategy: Strategy) => {
    if (onLoadStrategy) {
      onLoadStrategy(strategy);
      toast.success(`Loaded strategy: ${strategy.name}`);
    } else {
      toast.success('Strategy loaded (no callback provided)');
    }
  };

  const handleViewStrategy = (strategy: Strategy) => {
    if (onViewStrategy) {
      onViewStrategy(strategy);
    }
  };

  const handleCopyStrategy = (strategy: Strategy) => {
    // Copy strategy to clipboard
    const strategyJson = JSON.stringify(strategy, null, 2);
    navigator.clipboard.writeText(strategyJson).then(() => {
      toast.success('Strategy copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy strategy');
    });
  };

  const getComplexityBadge = (conditionCount: number) => {
    if (conditionCount <= 2) {
      return <Badge variant="secondary">Simple</Badge>;
    } else if (conditionCount <= 4) {
      return <Badge variant="default">Medium</Badge>;
    } else {
      return <Badge variant="destructive">Complex</Badge>;
    }
  };

  const getRiskLevelBadge = (stopLoss: number) => {
    if (stopLoss <= 2) {
      return <Badge variant="destructive">High Risk</Badge>;
    } else if (stopLoss <= 4) {
      return <Badge variant="default">Medium Risk</Badge>;
    } else {
      return <Badge variant="secondary">Low Risk</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Strategy Library</h1>
          <p className="text-gray-600 mt-2">Browse and load pre-built trading strategies</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search strategies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Symbol</label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Symbols</SelectItem>
                  {getAvailableSymbols().map(symbol => (
                    <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Timeframe</label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Timeframes</SelectItem>
                  {getAvailableTimeframes().map(timeframe => (
                    <SelectItem key={timeframe} value={timeframe}>{timeframe}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="symbol">Symbol</SelectItem>
                  <SelectItem value="timeframe">Timeframe</SelectItem>
                  <SelectItem value="complexity">Complexity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStrategies.map((strategy) => (
          <Card key={strategy.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{strategy.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{strategy.symbol}</Badge>
                    <Badge variant="outline">{strategy.timeframe}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {getComplexityBadge(strategy.conditions.length)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 line-clamp-2">
                {strategy.description}
              </p>
              
              {/* Strategy Stats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center text-gray-600">
                    <Target className="w-4 h-4 mr-1" />
                    Conditions
                  </span>
                  <span className="font-medium">{strategy.conditions.length}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center text-gray-600">
                    <Shield className="w-4 h-4 mr-1" />
                    Stop Loss
                  </span>
                  <span className="font-medium">{strategy.risk_management.stop_loss}%</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center text-gray-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Take Profit
                  </span>
                  <span className="font-medium">{strategy.risk_management.take_profit}%</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-1" />
                    Max Trades/Day
                  </span>
                  <span className="font-medium">{strategy.risk_management.max_daily_trades}</span>
                </div>
              </div>
              
              {/* Risk Level */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Risk Level:</span>
                {getRiskLevelBadge(strategy.risk_management.stop_loss)}
              </div>
              
              {/* Entry Conditions Preview */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Entry Conditions:</h5>
                <div className="space-y-1">
                  {strategy.conditions.slice(0, 2).map((condition, index) => (
                    <div key={condition.id} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                      {index + 1}. {condition.type} - {condition.operator} {condition.value}
                    </div>
                  ))}
                  {strategy.conditions.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{strategy.conditions.length - 2} more conditions
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={() => handleLoadStrategy(strategy)}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Load
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleViewStrategy(strategy)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleCopyStrategy(strategy)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredStrategies.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No strategies found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </CardContent>
        </Card>
      )}
      
      {/* Summary Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{EXAMPLE_STRATEGIES.length}</div>
              <div className="text-sm text-gray-600">Total Strategies</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{getAvailableSymbols().length}</div>
              <div className="text-sm text-gray-600">Trading Pairs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{getAvailableTimeframes().length}</div>
              <div className="text-sm text-gray-600">Timeframes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{filteredStrategies.length}</div>
              <div className="text-sm text-gray-600">Filtered Results</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Play, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  BarChart3,
  Calendar,
  DollarSign,
  Percent,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  StrategyBacktester, 
  BacktestResult, 
  Strategy, 
  Candle,
  StrategyManager 
} from '../lib/strategyEngine';

interface StrategyTesterProps {
  strategy: Strategy;
  historicalData?: Candle[];
}

export default function StrategyTester({ strategy, historicalData }: StrategyTesterProps) {
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock historical data for testing
  const generateMockData = (symbol: string, days: number = 365): Candle[] => {
    const data: Candle[] = [];
    const basePrice = symbol === 'BTCUSDT' ? 45000 : 3000;
    let currentPrice = basePrice;
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < days * 24; i++) { // Hourly data
      const timestamp = startTime + (i * 60 * 60 * 1000);
      const volatility = 0.02; // 2% hourly volatility
      const change = (Math.random() - 0.5) * volatility;
      const volume = Math.random() * 1000000;
      
      const open = currentPrice;
      const close = currentPrice * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      data.push({
        t: timestamp,
        o: open,
        h: high,
        l: low,
        c: close,
        v: volume,
        x: true
      });
      
      currentPrice = close;
    }
    
    return data;
  };

  const runBacktest = async () => {
    if (!strategy) {
      toast.error('No strategy provided');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      // Use provided data or generate mock data
      const data = historicalData || generateMockData(strategy.symbol, 365);
      
      // Run backtest
      const result = StrategyBacktester.backtest(strategy, data);
      
      // Complete progress
      setProgress(100);
      setTimeout(() => {
        setBacktestResult(result);
        setIsRunning(false);
        setProgress(0);
        clearInterval(progressInterval);
        toast.success('Backtest completed successfully!');
      }, 500);
      
    } catch (error) {
      console.error('Backtest error:', error);
      toast.error('Backtest failed');
      setIsRunning(false);
      setProgress(0);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getPerformanceColor = (value: number, isPositive: boolean) => {
    if (value === 0) return 'text-gray-600';
    return (value > 0 && isPositive) || (value < 0 && !isPositive) ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Strategy Backtester</h1>
          <p className="text-gray-600 mt-2">Test your strategy against historical data</p>
        </div>
        <Button 
          onClick={runBacktest} 
          disabled={isRunning}
          className="min-w-[150px]"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Testing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Backtest
            </>
          )}
        </Button>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Running backtest...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategy Info */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold text-gray-700">Strategy Name</h4>
              <p className="text-lg">{strategy.name}</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700">Symbol</h4>
              <p className="text-lg">{strategy.symbol}</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700">Timeframe</h4>
              <p className="text-lg">{strategy.timeframe}</p>
            </div>
          </div>
          {strategy.description && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-700">Description</h4>
              <p className="text-gray-600">{strategy.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backtest Results */}
      {backtestResult && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="equity">Equity Curve</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total P&L */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total P&L</p>
                      <p className={`text-2xl font-bold ${getPerformanceColor(backtestResult.total_pnl, true)}`}>
                        {formatCurrency(backtestResult.total_pnl)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Win Rate */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Win Rate</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatPercent(backtestResult.win_rate)}
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Trades */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Trades</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {backtestResult.total_trades}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Max Drawdown */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Max Drawdown</p>
                      <p className={`text-2xl font-bold ${getPerformanceColor(backtestResult.max_drawdown, false)}`}>
                        {formatPercent(backtestResult.max_drawdown)}
                      </p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Winning Trades</span>
                    <span className="font-semibold text-green-600">{backtestResult.winning_trades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Losing Trades</span>
                    <span className="font-semibold text-red-600">{backtestResult.losing_trades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sharpe Ratio</span>
                    <span className="font-semibold">{backtestResult.sharpe_ratio.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Risk Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stop Loss</span>
                    <span className="font-semibold">{formatPercent(strategy.risk_management.stop_loss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Take Profit</span>
                    <span className="font-semibold">{formatPercent(strategy.risk_management.take_profit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Position Size</span>
                    <span className="font-semibold">{formatCurrency(strategy.risk_management.max_position_size)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold">Overall Performance</h4>
                      <p className="text-sm text-gray-600">
                        {backtestResult.total_pnl > 0 ? 'Profitable' : 'Loss-making'} strategy
                      </p>
                    </div>
                    <Badge variant={backtestResult.total_pnl > 0 ? 'default' : 'destructive'}>
                      {backtestResult.total_pnl > 0 ? 'PROFITABLE' : 'UNPROFITABLE'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h5 className="font-semibold text-green-600 mb-2">Strengths</h5>
                      <ul className="text-sm space-y-1">
                        {backtestResult.win_rate > 60 && (
                          <li>• High win rate ({formatPercent(backtestResult.win_rate)})</li>
                        )}
                        {backtestResult.max_drawdown < 10 && (
                          <li>• Low maximum drawdown ({formatPercent(backtestResult.max_drawdown)})</li>
                        )}
                        {backtestResult.sharpe_ratio > 1 && (
                          <li>• Good risk-adjusted returns (Sharpe: {backtestResult.sharpe_ratio.toFixed(2)})</li>
                        )}
                        {backtestResult.total_trades > 50 && (
                          <li>• Sufficient trade sample ({backtestResult.total_trades} trades)</li>
                        )}
                      </ul>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h5 className="font-semibold text-red-600 mb-2">Areas for Improvement</h5>
                      <ul className="text-sm space-y-1">
                        {backtestResult.win_rate < 40 && (
                          <li>• Low win rate ({formatPercent(backtestResult.win_rate)})</li>
                        )}
                        {backtestResult.max_drawdown > 20 && (
                          <li>• High maximum drawdown ({formatPercent(backtestResult.max_drawdown)})</li>
                        )}
                        {backtestResult.sharpe_ratio < 0.5 && (
                          <li>• Poor risk-adjusted returns (Sharpe: {backtestResult.sharpe_ratio.toFixed(2)})</li>
                        )}
                        {backtestResult.total_trades < 20 && (
                          <li>• Insufficient trade sample ({backtestResult.total_trades} trades)</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trades Tab */}
          <TabsContent value="trades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trade History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Trade ID</th>
                        <th className="text-left p-2">Side</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Price</th>
                        <th className="text-left p-2">P&L</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backtestResult.trades.map((trade, index) => (
                        <tr key={trade.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{trade.id}</td>
                          <td className="p-2">
                            <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                              {trade.side.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-2">{formatCurrency(trade.amount)}</td>
                          <td className="p-2">{formatCurrency(trade.price)}</td>
                          <td className={`p-2 font-semibold ${
                            (trade.pnl || 0) > 0 ? 'text-green-600' : 
                            (trade.pnl || 0) < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {trade.pnl ? formatCurrency(trade.pnl) : '-'}
                          </td>
                          <td className="p-2">
                            <Badge variant={trade.status === 'closed' ? 'default' : 'secondary'}>
                              {trade.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-2">
                            {new Date(trade.timestamp).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Equity Curve Tab */}
          <TabsContent value="equity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Equity Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Equity curve chart would be displayed here</p>
                  <p className="text-sm text-gray-400 mt-2">
                    (Chart visualization would show equity progression over time)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Entry Conditions</h4>
                    <p className="text-sm text-blue-700">
                      Strategy triggers when all conditions are met:
                    </p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      {strategy.conditions.map((condition, index) => (
                        <li key={condition.id}>
                          {index + 1}. {condition.type} - {condition.operator} {condition.value}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Risk Management</h4>
                    <p className="text-sm text-green-700">
                      Built-in risk controls:
                    </p>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                      <li>• Stop Loss: {formatPercent(strategy.risk_management.stop_loss)}</li>
                      <li>• Take Profit: {formatPercent(strategy.risk_management.take_profit)}</li>
                      <li>• Max Position: {formatCurrency(strategy.risk_management.max_position_size)}</li>
                      <li>• Max Daily Trades: {strategy.risk_management.max_daily_trades}</li>
                    </ul>
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Recommendations
                  </h4>
                  <div className="text-sm text-yellow-800 space-y-2">
                    {backtestResult.win_rate < 50 && (
                      <p>• Consider refining entry conditions to improve win rate</p>
                    )}
                    {backtestResult.max_drawdown > 15 && (
                      <p>• Tighten stop loss or reduce position size to lower drawdown</p>
                    )}
                    {backtestResult.total_trades < 30 && (
                      <p>• Strategy may need more time to validate with larger sample size</p>
                    )}
                    {backtestResult.sharpe_ratio < 1 && (
                      <p>• Focus on improving risk-adjusted returns</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}




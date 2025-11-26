import React, { useState, useEffect } from 'react';
import { StrategyBacktester, Strategy, StrategyEvaluator, IndicatorCalculator } from '../lib/strategyEngine';
import { Candle } from '../types/market';
import { fetchSymbols, type SymbolInfo } from '../lib/binance';
import { INTERVALS, INTERVAL_LABELS } from '../lib/timeframes';
import { Search, ChevronDown, Play, BarChart3, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { logger } from '../utils/logger';

const BacktestPage: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historicalData, setHistoricalData] = useState<Candle[]>([]);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [availableSymbols, setAvailableSymbols] = useState<SymbolInfo[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<SymbolInfo[]>([]);
  const [symbolSearchQuery, setSymbolSearchQuery] = useState('');
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [isIntervalDropdownOpen, setIsIntervalDropdownOpen] = useState(false);
  
  // Strategy configuration
  const [strategyConfig, setStrategyConfig] = useState({
    name: 'Test Strategy',
    rsiPeriod: 14,
    rsiOversold: 30,
    rsiOverbought: 70,
    stopLoss: 5, // 5%
    takeProfit: 10, // 10%
    positionSize: 100, // Fixed amount
    positionSizeType: 'fixed' as 'fixed' | 'percentage'
  });

  // Load symbols on mount
  useEffect(() => {
    const loadSymbols = async () => {
      try {
        const symbols = await fetchSymbols();
        const tradingSymbols = symbols
          .filter(s => s.status === 'TRADING')
          .sort((a, b) => {
            if (a.quoteAsset === 'USDT' && b.quoteAsset !== 'USDT') return -1;
            if (a.quoteAsset !== 'USDT' && b.quoteAsset === 'USDT') return 1;
            return a.symbol.localeCompare(b.symbol);
          });
        setAvailableSymbols(tradingSymbols);
        setFilteredSymbols(tradingSymbols);
      } catch (error) {
        console.error('Failed to load symbols:', error);
        // Fallback symbols
        const fallback: SymbolInfo[] = [
          { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
          { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
        ];
        setAvailableSymbols(fallback);
        setFilteredSymbols(fallback);
      }
    };
    loadSymbols();
  }, []);

  // Filter symbols based on search query
  useEffect(() => {
    if (!symbolSearchQuery.trim()) {
      setFilteredSymbols(availableSymbols);
    } else {
      const query = symbolSearchQuery.toLowerCase();
      const filtered = availableSymbols.filter(s =>
        s.symbol.toLowerCase().includes(query) ||
        s.baseAsset.toLowerCase().includes(query) ||
        s.quoteAsset.toLowerCase().includes(query)
      );
      setFilteredSymbols(filtered);
    }
  }, [symbolSearchQuery, availableSymbols]);

  // Fetch historical data with date range
  const loadHistoricalData = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setIsLoadingData(true);
    try {
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime() + 86400000 - 1; // End of day
      
      // Fetch data in batches (Binance limit is 1000 per request)
      const allData: Candle[] = [];
      let currentEndTime = endTime;
      const limit = 1000;
      
      logger.info(`Loading historical data for ${symbol} from ${startDate} to ${endDate}`);
      
      while (currentEndTime > startTime) {
        const params = new URLSearchParams({
          symbol,
          interval,
          limit: limit.toString(),
          endTime: currentEndTime.toString()
        });
        
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?${params.toString()}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.length === 0) break;
        
        const formattedData = data.map((kline: any[]) => ({
          time: Math.floor(kline[0] / 1000),
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5] || 0),
        }));
        
        allData.unshift(...formattedData);
        
        // Check if we've reached start time
        if (formattedData[0].time * 1000 <= startTime) {
          // Filter to only include data within range
          const filtered = allData.filter(c => 
            c.time * 1000 >= startTime && c.time * 1000 <= endTime
          );
          setHistoricalData(filtered);
          logger.info(`Loaded ${filtered.length} candles for backtesting`);
          break;
        }
        
        currentEndTime = data[0][0] - 1;
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
      }
      
      if (allData.length > 0 && allData[0].time * 1000 < startTime) {
        const filtered = allData.filter(c => 
          c.time * 1000 >= startTime && c.time * 1000 <= endTime
        );
        setHistoricalData(filtered);
        logger.info(`Loaded ${filtered.length} candles for backtesting`);
      } else if (allData.length > 0) {
        setHistoricalData(allData);
        logger.info(`Loaded ${allData.length} candles for backtesting`);
      }
      
    } catch (error) {
      console.error('Failed to load historical data:', error);
      logger.error('Failed to load historical data:', error);
      alert('Failed to load historical data: ' + (error as Error).message);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Build strategy from configuration
  const buildStrategy = (): Strategy => {
    // Calculate RSI for all candles
    const closes = historicalData.map(c => c.close);
    const rsiValues = IndicatorCalculator.calculateRSI(closes, strategyConfig.rsiPeriod);
    
    // Create conditions: RSI < oversold for entry
    const conditions = [
      {
        id: 'rsi_oversold',
        type: 'indicator' as const,
        operator: 'less_than' as const,
        value: strategyConfig.rsiOversold,
        indicator: 'rsi', // Must be lowercase to match StrategyEvaluator
        parameter: 'value',
        timeframe: interval
      }
    ];
    
    return {
      id: 'backtest-strategy',
      name: strategyConfig.name,
      description: `RSI-based strategy: Buy when RSI < ${strategyConfig.rsiOversold}`,
      symbol: symbol,
      timeframe: interval,
      conditions: conditions,
      entry_actions: [{
        id: 'entry1',
        type: 'buy',
        amount: strategyConfig.positionSizeType === 'percentage' 
          ? strategyConfig.positionSize 
          : strategyConfig.positionSize,
        amount_type: strategyConfig.positionSizeType,
        order_type: 'market'
      }],
      exit_actions: [],
      risk_management: {
        stop_loss: strategyConfig.stopLoss,
        take_profit: strategyConfig.takeProfit,
        max_position_size: 1000,
        max_daily_trades: 10
      },
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  // Run backtest
  const runBacktest = () => {
    if (historicalData.length === 0) {
      alert('Please load historical data first');
      return;
    }

    if (historicalData.length < 50) {
      alert('Need at least 50 candles for backtesting');
      return;
    }

    setIsLoading(true);
    try {
      const strategy = buildStrategy();
      logger.info('Running backtest with strategy:', strategy);
      const result = StrategyBacktester.backtest(strategy, historicalData);
      setBacktestResult(result);
      logger.info('Backtest completed:', result);
    } catch (error) {
      console.error('Backtest failed:', error);
      logger.error('Backtest failed:', error);
      alert('Backtest failed: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown="symbol"]') && !target.closest('[data-dropdown="interval"]')) {
        setIsSymbolDropdownOpen(false);
        setIsIntervalDropdownOpen(false);
      }
    };

    if (isSymbolDropdownOpen || isIntervalDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSymbolDropdownOpen, isIntervalDropdownOpen]);

  // Set default dates (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Strategy Backtesting</h1>
          <p className="text-gray-600 mt-2">Test your trading strategies on historical data</p>
        </div>
        
        {/* Configuration Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Data Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Symbol Selection */}
            <div className="relative">
              <label className="block text-sm font-medium mb-2">Trading Pair</label>
              <div className="relative" data-dropdown="symbol">
                <button
                  type="button"
                  onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between"
                >
                  <span>{symbol}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isSymbolDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isSymbolDropdownOpen && (
                  <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 w-full overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search pairs..."
                          value={symbolSearchQuery}
                          onChange={(e) => setSymbolSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-80">
                      {filteredSymbols.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">No symbols found</div>
                      ) : (
                        filteredSymbols.slice(0, 200).map((sym) => (
                          <button
                            key={sym.symbol}
                            type="button"
                            onClick={() => {
                              setSymbol(sym.symbol);
                              setIsSymbolDropdownOpen(false);
                              setSymbolSearchQuery('');
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                              symbol === sym.symbol ? 'bg-blue-100 font-medium' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{sym.symbol}</span>
                              <span className="text-xs text-gray-500">{sym.baseAsset}/{sym.quoteAsset}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Interval Selection */}
            <div className="relative">
              <label className="block text-sm font-medium mb-2">Timeframe</label>
              <div className="relative" data-dropdown="interval">
                <button
                  type="button"
                  onClick={() => setIsIntervalDropdownOpen(!isIntervalDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between"
                >
                  <span>{interval} - {INTERVAL_LABELS[interval as keyof typeof INTERVAL_LABELS]}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isIntervalDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isIntervalDropdownOpen && (
                  <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden w-full">
                    {INTERVALS.map((int) => (
                      <button
                        key={int}
                        type="button"
                        onClick={() => {
                          setInterval(int);
                          setIsIntervalDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                          interval === int ? 'bg-blue-100 font-medium' : ''
                        }`}
                      >
                        {int} - {INTERVAL_LABELS[int]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            {/* End Date */}
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
          
          <div className="flex gap-4 items-center">
            <Button
              onClick={loadHistoricalData}
              disabled={isLoadingData || !startDate || !endDate}
              className="flex items-center gap-2"
            >
              {isLoadingData ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  Load Historical Data
                </>
              )}
            </Button>
            
            {historicalData.length > 0 && (
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium text-green-600">✓</span>
                <span className="ml-2">Loaded {historicalData.length} candles</span>
                <span className="ml-2 text-gray-400">
                  ({new Date(historicalData[0].time * 1000).toLocaleDateString()} to {new Date(historicalData[historicalData.length - 1].time * 1000).toLocaleDateString()})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Strategy Configuration */}
        {historicalData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Strategy Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Strategy Name</label>
                <input
                  type="text"
                  value={strategyConfig.name}
                  onChange={(e) => setStrategyConfig({...strategyConfig, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">RSI Period</label>
                <input
                  type="number"
                  value={strategyConfig.rsiPeriod}
                  onChange={(e) => setStrategyConfig({...strategyConfig, rsiPeriod: parseInt(e.target.value) || 14})}
                  min="2"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">RSI Oversold (Buy Signal)</label>
                <input
                  type="number"
                  value={strategyConfig.rsiOversold}
                  onChange={(e) => setStrategyConfig({...strategyConfig, rsiOversold: parseInt(e.target.value) || 30})}
                  min="0"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Stop Loss (%)</label>
                <input
                  type="number"
                  value={strategyConfig.stopLoss}
                  onChange={(e) => setStrategyConfig({...strategyConfig, stopLoss: parseFloat(e.target.value) || 5})}
                  min="0"
                  max="50"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Take Profit (%)</label>
                <input
                  type="number"
                  value={strategyConfig.takeProfit}
                  onChange={(e) => setStrategyConfig({...strategyConfig, takeProfit: parseFloat(e.target.value) || 10})}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Position Size</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={strategyConfig.positionSize}
                    onChange={(e) => setStrategyConfig({...strategyConfig, positionSize: parseFloat(e.target.value) || 100})}
                    min="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <select
                    value={strategyConfig.positionSizeType}
                    onChange={(e) => setStrategyConfig({...strategyConfig, positionSizeType: e.target.value as 'fixed' | 'percentage'})}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="fixed">USD</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Strategy Logic:</strong> Buy when RSI falls below {strategyConfig.rsiOversold}, 
                sell when price drops {strategyConfig.stopLoss}% (stop loss) or rises {strategyConfig.takeProfit}% (take profit).
              </p>
            </div>
            
            <div className="mt-4">
              <Button
                onClick={runBacktest}
                disabled={isLoading || historicalData.length < 50}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Play className="w-5 h-5" />
                {isLoading ? 'Running Backtest...' : 'Run Backtest'}
              </Button>
            </div>
          </div>
        )}

        {/* Backtest Results */}
        {backtestResult && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Backtest Results</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Trades</p>
                <p className="text-3xl font-bold">{backtestResult.total_trades}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {backtestResult.winning_trades} wins, {backtestResult.losing_trades} losses
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Win Rate</p>
                <p className="text-3xl font-bold">{backtestResult.win_rate.toFixed(2)}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {backtestResult.winning_trades} / {backtestResult.total_trades} trades
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total P&L</p>
                <p className={`text-3xl font-bold ${backtestResult.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${backtestResult.total_pnl.toFixed(2)}
                </p>
                <p className={`text-xs mt-1 ${backtestResult.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {backtestResult.total_pnl >= 0 ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
                  {((backtestResult.total_pnl / 10000) * 100).toFixed(2)}% return
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Max Drawdown</p>
                <p className="text-3xl font-bold text-red-600">
                  {backtestResult.max_drawdown.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Maximum loss from peak</p>
              </div>
            </div>
            
            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Sharpe Ratio</p>
                <p className="text-2xl font-bold">{backtestResult.sharpe_ratio.toFixed(2)}</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 mb-1">Average Trade P&L</p>
                <p className={`text-2xl font-bold ${backtestResult.total_trades > 0 ? (backtestResult.total_pnl / backtestResult.total_trades >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}`}>
                  ${backtestResult.total_trades > 0 ? (backtestResult.total_pnl / backtestResult.total_trades).toFixed(2) : '0.00'}
                </p>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-600 mb-1">Data Period</p>
                <p className="text-sm font-medium">
                  {historicalData.length > 0 && (
                    <>
                      {new Date(historicalData[0].time * 1000).toLocaleDateString()} to {new Date(historicalData[historicalData.length - 1].time * 1000).toLocaleDateString()}
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">{historicalData.length} candles</p>
              </div>
            </div>
            
            {/* Trades List */}
            {backtestResult.trades && backtestResult.trades.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Trade History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Side</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P&L</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {backtestResult.trades.slice(0, 50).map((trade: any, index: number) => (
                        <tr key={trade.id || index}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(trade.timestamp * 1000).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              trade.side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {trade.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">${trade.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">${trade.amount.toFixed(2)}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${
                            trade.pnl && trade.pnl > 0 ? 'text-green-600' : trade.pnl && trade.pnl < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              trade.status === 'closed' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {trade.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {backtestResult.trades.length > 50 && (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      Showing first 50 of {backtestResult.trades.length} trades
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestPage;


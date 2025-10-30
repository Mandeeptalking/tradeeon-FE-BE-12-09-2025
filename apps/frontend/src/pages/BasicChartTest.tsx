import React, { useState, useEffect, useRef } from 'react';
import { 
  createChart, 
  CandlestickData, 
  Time, 
  IChartApi, 
  ISeriesApi
} from 'lightweight-charts';

/**
 * Basic Chart Test - Minimal implementation to isolate the issue
 */
const BasicChartTest: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1m');
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load historical data
  const loadHistoricalData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`🔄 Loading historical data for ${symbol} ${timeframe}...`);
      
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=100`);
      const data = await response.json();
      
      const chartData: CandlestickData[] = data.map((k: any[]) => ({
        time: Math.floor(k[0] / 1000) as Time,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
      }));
      
      setCandles(chartData);
      console.log(`✅ Loaded ${chartData.length} historical candles`);
      
      // Set data to chart if it exists
      if (seriesRef.current) {
        seriesRef.current.setData(chartData);
        console.log('✅ Data set to chart');
      }
      
    } catch (error) {
      console.error('❌ Error loading historical data:', error);
      setError('Failed to load historical data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    try {
      console.log('🔄 Initializing chart...');
      setError(null);
      
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: {
          background: { color: '#ffffff' },
          textColor: '#1f2937',
        },
        grid: {
          vertLines: { color: '#e5e7eb' },
          horzLines: { color: '#e5e7eb' },
        },
        crosshair: {
          mode: 1,
        },
        rightPriceScale: {
          borderColor: '#d1d5db',
        },
        timeScale: {
          borderColor: '#d1d5db',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      console.log('✅ Chart created');

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      console.log('✅ Candlestick series added');

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;

      console.log('✅ Chart initialization complete');

      // Load data
      loadHistoricalData();

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.resize(chartContainerRef.current.clientWidth, 400);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    } catch (error) {
      console.error('❌ Error initializing chart:', error);
      setError(`Chart initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Reload data when symbol or timeframe changes
  useEffect(() => {
    if (chartRef.current && seriesRef.current) {
      loadHistoricalData();
    }
  }, [symbol, timeframe]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Basic Chart Test</h1>
          
          <div className="flex items-center space-x-4">
            {/* Symbol Selection */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Symbol:</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BTCUSDT">BTCUSDT</option>
                <option value="ETHUSDT">ETHUSDT</option>
                <option value="ADAUSDT">ADAUSDT</option>
              </select>
            </div>

            {/* Timeframe Selection */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Timeframe:</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1h</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-green-500'}`} />
              <span className="text-sm text-gray-700">
                {isLoading ? 'Loading...' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chart Area */}
      <div className="p-6">
        <div
          ref={chartContainerRef}
          className="w-full border border-gray-300 rounded"
          style={{ height: '400px' }}
        />
        
        <div className="mt-4 text-sm text-gray-600">
          <p>Symbol: {symbol} | Timeframe: {timeframe} | Candles: {candles.length}</p>
          <p>Chart Status: {chartRef.current ? '✅ Initialized' : '❌ Not initialized'}</p>
          <p>Series Status: {seriesRef.current ? '✅ Ready' : '❌ Not ready'}</p>
        </div>
      </div>
    </div>
  );
};

export default BasicChartTest;


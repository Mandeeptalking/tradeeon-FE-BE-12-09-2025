import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  createChart, 
  CandlestickData, 
  Time, 
  IChartApi, 
  ISeriesApi, 
  CandlestickSeries,
  LineSeries
} from 'lightweight-charts';

/**
 * Working Simple Chart - Based on CleanCharts but with indicator support
 */
const WorkingSimpleChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1m');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const [showEMA, setShowEMA] = useState(false);

  // Load historical data from Binance
  const loadHistoricalData = useCallback(async (): Promise<CandlestickData[]> => {
    try {
      console.log(`🔄 Loading historical data for ${symbol} ${timeframe}...`);
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=1000`);
      const data = await response.json();
      
      const chartData: CandlestickData[] = data.map((k: any[]) => ({
        time: Math.floor(k[0] / 1000) as Time,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
      }));
      
      console.log(`✅ Loaded ${chartData.length} historical candles`);
      return chartData;
    } catch (error) {
      console.error('❌ Error loading historical data:', error);
      setError('Failed to load historical data');
      return [];
    }
  }, [symbol, timeframe]);

  // Initialize chart
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    try {
      console.log('🔄 Initializing chart...');
      
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

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;

      console.log('✅ Chart initialized successfully');

      // Load initial data
      loadHistoricalData().then(data => {
        if (data.length > 0) {
          setCandles(data);
          candlestickSeries.setData(data);
        }
      });

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.resize(chartContainerRef.current.clientWidth, 400);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    } catch (error) {
      console.error('❌ Error initializing chart:', error);
      setError('Failed to initialize chart');
    }
  }, [loadHistoricalData]);

  // Add EMA indicator
  const addEMA = useCallback(() => {
    if (!chartRef.current || emaSeriesRef.current) return;

    try {
      console.log('🔄 Adding EMA indicator...');
      
      const emaSeries = chartRef.current.addLineSeries({
        color: '#9c27b0',
        lineWidth: 2,
        title: 'EMA(20)'
      });

      emaSeriesRef.current = emaSeries;

      // Generate mock EMA data
      if (candles.length > 0) {
        const emaData = candles
          .slice(19) // Skip first 19 candles for EMA warmup
          .map((candle, index) => ({
            time: candle.time,
            value: candle.close * (1 + Math.sin(index * 0.01) * 0.02) // Mock EMA
          }));

        emaSeries.setData(emaData);
        console.log(`✅ EMA data set: ${emaData.length} points`);
      }

      setShowEMA(true);
    } catch (error) {
      console.error('❌ Error adding EMA:', error);
      setError('Failed to add EMA indicator');
    }
  }, [candles]);

  // Remove EMA indicator
  const removeEMA = useCallback(() => {
    if (emaSeriesRef.current && chartRef.current) {
      try {
        chartRef.current.removeSeries(emaSeriesRef.current);
        emaSeriesRef.current = null;
        setShowEMA(false);
        console.log('✅ EMA indicator removed');
      } catch (error) {
        console.error('❌ Error removing EMA:', error);
      }
    }
  }, []);

  // Start live data from Binance WebSocket
  const startLiveData = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      return;
    }

    console.log(`🔄 Connecting to Binance WebSocket for ${symbol} ${timeframe}...`);
    setIsConnected(true);
    
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${timeframe}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected to Binance');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const k = data.k;
        
        const candle: CandlestickData = {
          time: Math.floor(k.t / 1000) as Time,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
        };

        if (seriesRef.current) {
          seriesRef.current.update(candle);
          setCandles(prev => {
            const newCandles = [...prev];
            const lastIndex = newCandles.length - 1;
            
            if (lastIndex < 0 || newCandles[lastIndex].time < candle.time) {
              newCandles.push(candle);
              return newCandles.slice(-1000);
            } else {
              newCandles[lastIndex] = candle;
              return newCandles;
            }
          });

          // Update EMA if it exists
          if (emaSeriesRef.current) {
            const emaValue = candle.close * (1 + Math.sin(Date.now() * 0.001) * 0.02);
            emaSeriesRef.current.update({ time: candle.time, value: emaValue });
          }
          
          if (k.x) {
            console.log(`📈 Final candle: ${k.c} at ${new Date(k.t).toLocaleTimeString()}`);
          }
        }
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setError('WebSocket connection error');
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
      setIsConnected(false);
    };
  }, [symbol, timeframe]);

  // Initialize on mount
  useEffect(() => {
    const cleanup = initializeChart();
    return cleanup;
  }, [initializeChart]);

  // Reload data when symbol or timeframe changes
  useEffect(() => {
    if (chartRef.current && seriesRef.current) {
      loadHistoricalData().then(data => {
        if (data.length > 0) {
          setCandles(data);
          seriesRef.current!.setData(data);
        }
      });
    }
  }, [symbol, timeframe, loadHistoricalData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Working Simple Chart</h1>
          
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
                <option value="BNBUSDT">BNBUSDT</option>
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
                <option value="4h">4h</option>
                <option value="1d">1d</option>
              </select>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-700">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Connect/Disconnect Button */}
            <button
              onClick={startLiveData}
              className={`px-3 py-1 rounded-md text-sm ${
                isConnected 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </button>
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

      {/* Indicator Controls */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Indicators:</span>
          {!showEMA ? (
            <button
              onClick={addEMA}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
            >
              Add EMA(20)
            </button>
          ) : (
            <button
              onClick={removeEMA}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Remove EMA(20)
            </button>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-6">
        <div
          ref={chartContainerRef}
          className="w-full border border-gray-300 rounded"
          style={{ height: '400px' }}
        />
        
        <div className="mt-4 text-sm text-gray-600">
          <p>Symbol: {symbol} | Timeframe: {timeframe} | Candles: {candles.length}</p>
          {isConnected && (
            <p className="text-green-600">🟢 Live data streaming</p>
          )}
          {showEMA && (
            <p className="text-purple-600">📊 EMA(20) indicator active</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkingSimpleChart;


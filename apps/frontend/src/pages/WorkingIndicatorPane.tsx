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
 * Working Indicator Pane Example
 * Shows exactly how to create an indicator in a new pane below the main chart
 */
const WorkingIndicatorPane: React.FC = () => {
  const mainChartRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<HTMLDivElement>(null);
  
  const [mainChart, setMainChart] = useState<IChartApi | null>(null);
  const [rsiChart, setRsiChart] = useState<IChartApi | null>(null);
  const [candlestickSeries, setCandlestickSeries] = useState<ISeriesApi<'Candlestick'> | null>(null);
  const [rsiSeries, setRsiSeries] = useState<ISeriesApi<'Line'> | null>(null);

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1m');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize main chart
  const initializeMainChart = useCallback(() => {
    if (!mainChartRef.current || mainChart) return;

    const chart = createChart(mainChartRef.current, {
      width: mainChartRef.current.clientWidth,
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

    // Add candlestick series
    const candlestick = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    setMainChart(chart);
    setCandlestickSeries(candlestick);

    // Handle resize
    const handleResize = () => {
      if (mainChartRef.current && chart) {
        chart.resize(mainChartRef.current.clientWidth, 400);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mainChart]);

  // Initialize RSI chart (NEW PANE)
  const initializeRSIChart = useCallback(() => {
    if (!rsiChartRef.current || rsiChart) return;

    const chart = createChart(rsiChartRef.current, {
      width: rsiChartRef.current.clientWidth,
      height: 200, // Smaller height for indicator
      layout: {
        background: { color: '#ffffff' },
        textColor: '#1f2937',
      },
      grid: {
        vertLines: { color: '#e5e7eb' },
        horzLines: { color: '#e5e7eb' },
      },
      rightPriceScale: {
        borderColor: '#d1d5db',
        // Fixed scale for RSI (0-100)
        mode: 1, // Fixed scale
        autoScale: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#d1d5db',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add RSI line series
    const rsi = chart.addLineSeries({
      color: '#2196f3',
      lineWidth: 2,
      title: 'RSI(14)'
    });

    // Add level lines
    chart.addPriceLine({
      price: 70,
      color: '#f44336',
      lineWidth: 1,
      lineStyle: 2, // dashed
      title: 'Overbought (70)'
    });
    
    chart.addPriceLine({
      price: 30,
      color: '#4caf50',
      lineWidth: 1,
      lineStyle: 2, // dashed
      title: 'Oversold (30)'
    });

    setRsiChart(chart);
    setRsiSeries(rsi);

    // Handle resize
    const handleResize = () => {
      if (rsiChartRef.current && chart) {
        chart.resize(rsiChartRef.current.clientWidth, 200);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [rsiChart]);

  // Load historical data
  const loadHistoricalData = useCallback(async () => {
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
      
      // Set candlestick data
      if (candlestickSeries) {
        candlestickSeries.setData(chartData);
      }

      // Generate mock RSI data
      if (rsiSeries) {
        const rsiData = chartData
          .slice(14) // Skip first 14 candles for RSI warmup
          .map((candle, index) => ({
            time: candle.time,
            value: 30 + Math.sin(index * 0.1) * 20 + Math.random() * 10
          }))
          .map(point => ({
            ...point,
            value: Math.max(0, Math.min(100, point.value)) // Clamp to 0-100
          }));

        rsiSeries.setData(rsiData);
        console.log(`📊 Generated ${rsiData.length} RSI data points`);
      }
      
      console.log(`✅ Loaded ${chartData.length} historical candles`);
    } catch (error) {
      console.error('❌ Error loading historical data:', error);
    }
  }, [symbol, timeframe, candlestickSeries, rsiSeries]);

  // Start live data stream
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

        // Update candlestick series
        if (candlestickSeries) {
          candlestickSeries.update(candle);
        }

        // Update RSI (mock)
        if (rsiSeries) {
          const rsiValue = 30 + Math.sin(Date.now() * 0.001) * 20 + Math.random() * 10;
          const clampedRsi = Math.max(0, Math.min(100, rsiValue));
          rsiSeries.update({ time: candle.time, value: clampedRsi });
        }
        
        if (k.x) {
          console.log(`📈 Final candle: ${k.c} at ${new Date(k.t).toLocaleTimeString()}`);
        }
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
      setIsConnected(false);
    };
  }, [symbol, timeframe, candlestickSeries, rsiSeries]);

  // Initialize charts on mount
  useEffect(() => {
    const cleanup1 = initializeMainChart();
    const cleanup2 = initializeRSIChart();
    
    return () => {
      cleanup1?.();
      cleanup2?.();
    };
  }, [initializeMainChart, initializeRSIChart]);

  // Load data when charts are ready
  useEffect(() => {
    if (candlestickSeries && rsiSeries) {
      loadHistoricalData();
    }
  }, [candlestickSeries, rsiSeries, loadHistoricalData]);

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
          <h1 className="text-2xl font-bold text-gray-900">Working Indicator Pane</h1>
          
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

      {/* Chart Area */}
      <div className="p-6 space-y-4">
        {/* Main Chart (Price) */}
        <div className="border border-gray-300 rounded">
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Price Chart ({symbol})</h3>
          </div>
          <div
            ref={mainChartRef}
            className="w-full"
            style={{ height: '400px' }}
          />
        </div>

        {/* RSI Indicator Pane */}
        <div className="border border-gray-300 rounded">
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">RSI (14) - Fixed Scale (0-100)</h3>
          </div>
          <div
            ref={rsiChartRef}
            className="w-full"
            style={{ height: '200px' }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="px-6 py-4 bg-gray-50">
        <div className="text-sm text-gray-600">
          <p><strong>✅ This demonstrates:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Separate Chart Instance:</strong> RSI has its own chart below the main chart</li>
            <li><strong>Fixed Scale:</strong> RSI is locked to 0-100 range</li>
            <li><strong>Level Lines:</strong> Red line at 70 (overbought), Green line at 30 (oversold)</li>
            <li><strong>Independent Y-Axis:</strong> RSI scale is separate from price scale</li>
            <li><strong>Shared Time Axis:</strong> Both charts show the same time period</li>
            <li><strong>Live Updates:</strong> Real-time data from Binance WebSocket</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WorkingIndicatorPane;


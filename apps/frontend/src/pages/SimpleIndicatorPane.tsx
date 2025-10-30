import React, { useState, useEffect, useRef } from 'react';
import { 
  createChart, 
  CandlestickData, 
  Time, 
  IChartApi, 
  ISeriesApi
} from 'lightweight-charts';

/**
 * Simple Indicator Pane Test
 * Minimal implementation to test if the concept works
 */
const SimpleIndicatorPane: React.FC = () => {
  const mainChartRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<HTMLDivElement>(null);
  
  const [mainChart, setMainChart] = useState<IChartApi | null>(null);
  const [rsiChart, setRsiChart] = useState<IChartApi | null>(null);
  const [candlestickSeries, setCandlestickSeries] = useState<ISeriesApi<'Candlestick'> | null>(null);
  const [rsiSeries, setRsiSeries] = useState<ISeriesApi<'Line'> | null>(null);

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize main chart
  useEffect(() => {
    if (!mainChartRef.current || mainChart) return;

    try {
      console.log('🔄 Initializing main chart...');
      
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
      
      console.log('✅ Main chart initialized');
    } catch (error) {
      console.error('❌ Error initializing main chart:', error);
    }
  }, [mainChart]);

  // Initialize RSI chart
  useEffect(() => {
    if (!rsiChartRef.current || rsiChart) return;

    try {
      console.log('🔄 Initializing RSI chart...');
      
      const chart = createChart(rsiChartRef.current, {
        width: rsiChartRef.current.clientWidth,
        height: 200,
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
      
      console.log('✅ RSI chart initialized');
    } catch (error) {
      console.error('❌ Error initializing RSI chart:', error);
    }
  }, [rsiChart]);

  // Load historical data
  const loadHistoricalData = async () => {
    try {
      console.log(`🔄 Loading historical data for ${symbol}...`);
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=100`);
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
        console.log(`✅ Set ${chartData.length} candlestick data points`);
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
        console.log(`✅ Set ${rsiData.length} RSI data points`);
      }
      
    } catch (error) {
      console.error('❌ Error loading historical data:', error);
    }
  };

  // Load data when charts are ready
  useEffect(() => {
    if (candlestickSeries && rsiSeries) {
      loadHistoricalData();
    }
  }, [candlestickSeries, rsiSeries]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (mainChartRef.current && mainChart) {
        mainChart.resize(mainChartRef.current.clientWidth, 400);
      }
      if (rsiChartRef.current && rsiChart) {
        rsiChart.resize(rsiChartRef.current.clientWidth, 200);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mainChart, rsiChart]);

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
          <h1 className="text-2xl font-bold text-gray-900">Simple Indicator Pane Test</h1>
          
          <div className="flex items-center space-x-4">
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
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-700">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-6 space-y-4">
        {/* Main Chart */}
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

      {/* Debug Info */}
      <div className="px-6 py-4 bg-gray-50">
        <div className="text-sm text-gray-600">
          <p><strong>Debug Info:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Main Chart: {mainChart ? '✅ Initialized' : '❌ Not initialized'}</li>
            <li>RSI Chart: {rsiChart ? '✅ Initialized' : '❌ Not initialized'}</li>
            <li>Candlestick Series: {candlestickSeries ? '✅ Ready' : '❌ Not ready'}</li>
            <li>RSI Series: {rsiSeries ? '✅ Ready' : '❌ Not ready'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SimpleIndicatorPane;


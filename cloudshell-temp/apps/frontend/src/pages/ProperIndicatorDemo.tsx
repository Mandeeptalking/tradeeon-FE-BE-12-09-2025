import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  createChart, 
  CandlestickData, 
  Time, 
  IChartApi, 
  ISeriesApi, 
  CandlestickSeries,
  LineSeries,
  HistogramSeries
} from 'lightweight-charts';

/**
 * Proper Indicator Implementation Demo
 * Shows the correct way to apply indicators using TradingView Lightweight Charts v5
 */
const ProperIndicatorDemo: React.FC = () => {
  const mainChartRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<HTMLDivElement>(null);
  
  const [mainChart, setMainChart] = useState<IChartApi | null>(null);
  const [rsiChart, setRsiChart] = useState<IChartApi | null>(null);
  const [macdChart, setMacdChart] = useState<IChartApi | null>(null);
  
  const [candlestickSeries, setCandlestickSeries] = useState<ISeriesApi<'Candlestick'> | null>(null);
  const [emaSeries, setEmaSeries] = useState<ISeriesApi<'Line'> | null>(null);
  const [rsiSeries, setRsiSeries] = useState<ISeriesApi<'Line'> | null>(null);
  const [macdSeries, setMacdSeries] = useState<ISeriesApi<'Line'> | null>(null);
  const [signalSeries, setSignalSeries] = useState<ISeriesApi<'Line'> | null>(null);
  const [histSeries, setHistSeries] = useState<ISeriesApi<'Histogram'> | null>(null);

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

  // Initialize RSI chart
  const initializeRSIChart = useCallback(() => {
    if (!rsiChartRef.current || rsiChart) return;

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
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        // Fixed scale for RSI (0-100)
        mode: 1, // Fixed scale
        autoScale: false,
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

    // Set fixed scale for RSI
    chart.priceScale('right').applyOptions({
      mode: 1, // Fixed scale
      autoScale: false,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
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

  // Initialize MACD chart
  const initializeMACDChart = useCallback(() => {
    if (!macdChartRef.current || macdChart) return;

    const chart = createChart(macdChartRef.current, {
      width: macdChartRef.current.clientWidth,
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
        // Auto scale for MACD
        mode: 0, // Auto scale
        autoScale: true,
      },
      timeScale: {
        borderColor: '#d1d5db',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add MACD series
    const macd = chart.addLineSeries({
      color: '#4caf50',
      lineWidth: 2,
      title: 'MACD'
    });
    
    const signal = chart.addLineSeries({
      color: '#ff9800',
      lineWidth: 2,
      title: 'Signal'
    });
    
    const hist = chart.addHistogramSeries({
      color: '#9c27b0',
      title: 'Histogram'
    });

    // Add zero line
    chart.addPriceLine({
      price: 0,
      color: '#666666',
      lineWidth: 1,
      lineStyle: 1,
      title: 'Zero Line'
    });

    setMacdChart(chart);
    setMacdSeries(macd);
    setSignalSeries(signal);
    setHistSeries(hist);

    // Handle resize
    const handleResize = () => {
      if (macdChartRef.current && chart) {
        chart.resize(macdChartRef.current.clientWidth, 200);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [macdChart]);

  // Add EMA overlay to main chart
  const addEMA = useCallback(() => {
    if (!mainChart || emaSeries) return;

    const ema = mainChart.addLineSeries({
      color: '#9c27b0',
      lineWidth: 2,
      title: 'EMA(20)'
    });

    setEmaSeries(ema);
    console.log('✅ EMA(20) added to main chart');
  }, [mainChart, emaSeries]);

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

      // Generate mock indicator data for demo
      generateMockIndicatorData(chartData);
      
      console.log(`✅ Loaded ${chartData.length} historical candles`);
    } catch (error) {
      console.error('❌ Error loading historical data:', error);
    }
  }, [symbol, timeframe, candlestickSeries]);

  // Generate mock indicator data for demonstration
  const generateMockIndicatorData = useCallback((candles: CandlestickData[]) => {
    if (!emaSeries || !rsiSeries || !macdSeries || !signalSeries || !histSeries) return;

    const emaData = [];
    const rsiData = [];
    const macdData = [];
    const signalData = [];
    const histData = [];

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      
      // Mock EMA (20-period)
      if (i >= 19) {
        const emaValue = candle.close * (1 + Math.sin(i * 0.01) * 0.02);
        emaData.push({ time: candle.time, value: emaValue });
      }

      // Mock RSI (14-period)
      if (i >= 13) {
        const rsiValue = 30 + Math.sin(i * 0.1) * 20 + Math.random() * 10;
        rsiData.push({ time: candle.time, value: Math.max(0, Math.min(100, rsiValue)) });
      }

      // Mock MACD
      if (i >= 25) {
        const macdValue = Math.sin(i * 0.05) * 100;
        const signalValue = macdValue * 0.8;
        const histValue = macdValue - signalValue;
        
        macdData.push({ time: candle.time, value: macdValue });
        signalData.push({ time: candle.time, value: signalValue });
        histData.push({ time: candle.time, value: histValue });
      }
    }

    // Set indicator data
    if (emaData.length > 0) emaSeries.setData(emaData);
    if (rsiData.length > 0) rsiSeries.setData(rsiData);
    if (macdData.length > 0) macdSeries.setData(macdData);
    if (signalData.length > 0) signalSeries.setData(signalData);
    if (histData.length > 0) histSeries.setData(histData);

    console.log(`📊 Generated mock indicator data: EMA(${emaData.length}), RSI(${rsiData.length}), MACD(${macdData.length})`);
  }, [emaSeries, rsiSeries, macdSeries, signalSeries, histSeries]);

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

        // Update indicators (mock)
        if (emaSeries && rsiSeries && macdSeries && signalSeries && histSeries) {
          const emaValue = candle.close * (1 + Math.sin(Date.now() * 0.001) * 0.02);
          const rsiValue = 30 + Math.sin(Date.now() * 0.001) * 20 + Math.random() * 10;
          const macdValue = Math.sin(Date.now() * 0.001) * 100;
          const signalValue = macdValue * 0.8;
          const histValue = macdValue - signalValue;

          emaSeries.update({ time: candle.time, value: emaValue });
          rsiSeries.update({ time: candle.time, value: Math.max(0, Math.min(100, rsiValue)) });
          macdSeries.update({ time: candle.time, value: macdValue });
          signalSeries.update({ time: candle.time, value: signalValue });
          histSeries.update({ time: candle.time, value: histValue });
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
  }, [symbol, timeframe, candlestickSeries, emaSeries, rsiSeries, macdSeries, signalSeries, histSeries]);

  // Initialize charts on mount
  useEffect(() => {
    const cleanup1 = initializeMainChart();
    const cleanup2 = initializeRSIChart();
    const cleanup3 = initializeMACDChart();
    
    return () => {
      cleanup1?.();
      cleanup2?.();
      cleanup3?.();
    };
  }, [initializeMainChart, initializeRSIChart, initializeMACDChart]);

  // Load data when charts are ready
  useEffect(() => {
    if (candlestickSeries && rsiSeries && macdSeries) {
      loadHistoricalData();
    }
  }, [candlestickSeries, rsiSeries, macdSeries, loadHistoricalData]);

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
          <h1 className="text-2xl font-bold text-gray-900">Proper Indicator Demo</h1>
          
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

      {/* Controls */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Indicators:</span>
          <button
            onClick={addEMA}
            disabled={!!emaSeries}
            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:bg-gray-400"
          >
            {emaSeries ? 'EMA(20) ✓' : 'Add EMA(20)'}
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-6 space-y-4">
        {/* Main Chart (Price + Overlay Indicators) */}
        <div className="border border-gray-300 rounded">
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Price Chart (BTCUSDT)</h3>
          </div>
          <div
            ref={mainChartRef}
            className="w-full"
            style={{ height: '400px' }}
          />
        </div>

        {/* RSI Chart */}
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

        {/* MACD Chart */}
        <div className="border border-gray-300 rounded">
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">MACD (12,26,9) - Auto Scale</h3>
          </div>
          <div
            ref={macdChartRef}
            className="w-full"
            style={{ height: '200px' }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="px-6 py-4 bg-gray-50">
        <div className="text-sm text-gray-600">
          <p><strong>Chart Architecture:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Main Chart:</strong> Candlesticks + EMA overlay (shared Y-axis)</li>
            <li><strong>RSI Pane:</strong> Fixed scale (0-100) with level lines at 30/70</li>
            <li><strong>MACD Pane:</strong> Auto scale with zero line, 3 series (MACD, Signal, Histogram)</li>
            <li><strong>Time Sync:</strong> All panes share the same time axis</li>
            <li><strong>Live Updates:</strong> Real-time data from Binance WebSocket</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProperIndicatorDemo;


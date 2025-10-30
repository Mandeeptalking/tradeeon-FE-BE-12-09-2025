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
import { ComputeRunner } from '../engine/compute/computeRunner';
import { computeRegistry } from '../engine/compute/registry';
import { 
  createSMAAdapter, 
  createEMAAdapter, 
  createRSIWilderAdapter, 
  createMACDAdapter, 
  createBollingerBandsAdapter 
} from '../engine/compute/adapters';
import { SeriesState } from '../engine/state/seriesState';
import { IndicatorBus } from '../engine/bridge/indicatorBus';
import { IndicatorSpec, IndicatorInstanceMeta } from '../contracts/indicator';
import { Candle } from '../contracts/candle';

const SimpleChartStudio: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const rsiChartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1m');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const [useRealCompute, setUseRealCompute] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<IndicatorInstanceMeta[]>([]);
  const [computeMetrics, setComputeMetrics] = useState({
    activeIndicators: 0,
    computeStates: 0,
    lastUpdateTime: 0
  });

  // Create core instances
  const seriesState = new SeriesState(1000);
  const indicatorBus = new IndicatorBus(seriesState);
  const computeRunner = new ComputeRunner(computeRegistry, indicatorBus, seriesState);

  // Initialize compute registry
  useEffect(() => {
    if (useRealCompute) {
      // Register all adapters
      computeRegistry.register(createSMAAdapter());
      computeRegistry.register(createEMAAdapter());
      computeRegistry.register(createRSIWilderAdapter());
      computeRegistry.register(createMACDAdapter());
      computeRegistry.register(createBollingerBandsAdapter());
      
      console.log('📊 Real compute mode enabled - registered all adapters');
    }
  }, [useRealCompute]);

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

  // Create indicator series on chart
  const createIndicatorSeries = useCallback((indicatorName: string, indicatorId: string) => {
    if (!chartRef.current) {
      console.warn('Chart not ready, retrying in 100ms...');
      setTimeout(() => createIndicatorSeries(indicatorName, indicatorId), 100);
      return;
    }

    const chart = chartRef.current;
    
    switch (indicatorName.toLowerCase()) {
      case 'rsi':
        // Create RSI in separate pane
        createRSIPane(indicatorId);
        break;
      case 'macd':
        // Create MACD in separate pane
        createMACDPane(indicatorId);
        break;
      case 'ema':
      case 'sma':
        // Create overlay line series
        try {
          const lineSeries = chart.addLineSeries({
            color: indicatorName === 'ema' ? '#9c27b0' : '#3f51b5',
            lineWidth: 2,
            title: indicatorName.toUpperCase()
          });
          indicatorSeriesRef.current.set(`${indicatorId}_line`, lineSeries);
        } catch (error) {
          console.error(`Error creating ${indicatorName} series:`, error);
        }
        break;
      case 'bb':
        // Create Bollinger Bands (3 lines)
        try {
          const upperSeries = chart.addLineSeries({
            color: '#ff9800',
            lineWidth: 1,
            title: 'BB Upper'
          });
          const middleSeries = chart.addLineSeries({
            color: '#ff9800',
            lineWidth: 2,
            title: 'BB Middle'
          });
          const lowerSeries = chart.addLineSeries({
            color: '#ff9800',
            lineWidth: 1,
            title: 'BB Lower'
          });
          indicatorSeriesRef.current.set(`${indicatorId}_upper`, upperSeries);
          indicatorSeriesRef.current.set(`${indicatorId}_middle`, middleSeries);
          indicatorSeriesRef.current.set(`${indicatorId}_lower`, lowerSeries);
        } catch (error) {
          console.error('Error creating Bollinger Bands series:', error);
        }
        break;
    }
  }, []);

  // Create RSI pane
  const createRSIPane = useCallback((indicatorId: string) => {
    try {
      if (!chartContainerRef.current) return;

      // Create RSI chart container
      const rsiContainer = document.createElement('div');
      rsiContainer.id = `rsi-chart-${indicatorId}`;
      rsiContainer.style.height = '200px';
      rsiContainer.style.borderTop = '1px solid #e5e7eb';
      rsiContainer.style.marginTop = '10px';
      
      // Insert after main chart
      chartContainerRef.current.parentNode?.insertBefore(rsiContainer, chartContainerRef.current.nextSibling);

      // Create RSI chart
      const rsiChart = createChart(rsiContainer, {
        width: rsiContainer.clientWidth,
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
        },
        timeScale: {
          borderColor: '#d1d5db',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      // Create RSI line series
      const rsiSeries = rsiChart.addLineSeries({
        color: '#2196f3',
        lineWidth: 2,
        title: 'RSI'
      });

      // Add level lines
      rsiChart.addPriceLine({
        price: 70,
        color: '#f44336',
        lineWidth: 1,
        lineStyle: 2, // dashed
        title: 'Overbought'
      });
      rsiChart.addPriceLine({
        price: 30,
        color: '#4caf50',
        lineWidth: 1,
        lineStyle: 2, // dashed
        title: 'Oversold'
      });

      rsiChartRef.current = rsiChart;
      rsiSeriesRef.current = rsiSeries;
      indicatorSeriesRef.current.set(`${indicatorId}_rsi`, rsiSeries);
    } catch (error) {
      console.error('Error creating RSI pane:', error);
    }
  }, []);

  // Create MACD pane
  const createMACDPane = useCallback((indicatorId: string) => {
    try {
      if (!chartContainerRef.current) return;

      // Create MACD chart container
      const macdContainer = document.createElement('div');
      macdContainer.id = `macd-chart-${indicatorId}`;
      macdContainer.style.height = '200px';
      macdContainer.style.borderTop = '1px solid #e5e7eb';
      macdContainer.style.marginTop = '10px';
      
      // Insert after main chart
      chartContainerRef.current.parentNode?.insertBefore(macdContainer, chartContainerRef.current.nextSibling);

      // Create MACD chart
      const macdChart = createChart(macdContainer, {
        width: macdContainer.clientWidth,
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
        },
        timeScale: {
          borderColor: '#d1d5db',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      // Create MACD series
      const macdSeries = macdChart.addLineSeries({
        color: '#4caf50',
        lineWidth: 2,
        title: 'MACD'
      });
      const signalSeries = macdChart.addLineSeries({
        color: '#ff9800',
        lineWidth: 2,
        title: 'Signal'
      });
      const histSeries = macdChart.addHistogramSeries({
        color: '#9c27b0',
        title: 'Histogram'
      });

      // Add zero line
      macdChart.addPriceLine({
        price: 0,
        color: '#666666',
        lineWidth: 1,
        lineStyle: 1,
        title: 'Zero'
      });

      indicatorSeriesRef.current.set(`${indicatorId}_macd`, macdSeries);
      indicatorSeriesRef.current.set(`${indicatorId}_signal`, signalSeries);
      indicatorSeriesRef.current.set(`${indicatorId}_hist`, histSeries);
    } catch (error) {
      console.error('Error creating MACD pane:', error);
    }
  }, []);

  // Add indicator
  const addIndicator = useCallback((indicatorName: string, params: Record<string, any> = {}) => {
    try {
      const indicatorId = `${indicatorName.toLowerCase()}_${Date.now()}`;
      
      if (useRealCompute) {
        // Create indicator spec for real compute
        const indicatorSpec: IndicatorSpec = {
          id: indicatorId,
          name: indicatorName,
          inputs: getInputsForIndicator(indicatorName, params),
          timeframe,
          pane: indicatorName === 'EMA' || indicatorName === 'BB' ? 'price' : 'new'
        };

        // Add to compute runner
        computeRunner.addIndicator(indicatorSpec);

        // Create indicator instance meta
        const indicatorMeta: IndicatorInstanceMeta = {
          id: indicatorId,
          outputsMeta: getOutputsForIndicator(indicatorName),
          warmup: getWarmupForIndicator(indicatorName),
          defaultPane: indicatorName === 'EMA' || indicatorName === 'BB' ? 'price' : 'new'
        };

        // Add to active indicators
        setActiveIndicators(prev => [...prev, indicatorMeta]);

        // Create visual series
        createIndicatorSeries(indicatorName, indicatorId);

        // Compute batch data
        const candles = seriesState.getAllCandles();
        if (candles.length > 0) {
          computeRunner.computeBatch(candles);
          
          // Populate series with historical data
          setTimeout(() => {
            populateIndicatorSeries(indicatorId, indicatorName);
          }, 100);
        }

        console.log(`Added real indicator: ${indicatorName}`, params);
      } else {
        // Mock mode - create visual indicators for testing
        const indicatorId = `${indicatorName.toLowerCase()}_${Date.now()}`;
        
        // Create indicator instance meta
        const indicatorMeta: IndicatorInstanceMeta = {
          id: indicatorId,
          outputsMeta: getOutputsForIndicator(indicatorName),
          warmup: getWarmupForIndicator(indicatorName),
          defaultPane: indicatorName === 'EMA' || indicatorName === 'BB' ? 'price' : 'new'
        };

        // Add to active indicators
        setActiveIndicators(prev => [...prev, indicatorMeta]);

        // Create visual series (with error handling)
        try {
          createIndicatorSeries(indicatorName, indicatorId);
        } catch (error) {
          console.error('Error creating visual series:', error);
        }

        // Generate mock data
        generateMockIndicatorData(indicatorId, indicatorName);
        
        console.log(`✅ Added mock indicator: ${indicatorName}`, params);
        console.log(`📊 Active indicators: ${activeIndicators.length + 1}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add indicator');
    }
  }, [useRealCompute, timeframe, computeRunner, seriesState, createIndicatorSeries]);

  // Populate indicator series with historical data
  const populateIndicatorSeries = useCallback((indicatorId: string, indicatorName: string) => {
    const indicatorData = seriesState.getIndicatorData(indicatorId);
    if (!indicatorData || indicatorData.length === 0) return;

    console.log(`📊 Populating ${indicatorName} series with ${indicatorData.length} points`);

    switch (indicatorName.toLowerCase()) {
      case 'rsi':
        const rsiData = indicatorData
          .filter(point => point.values.rsi !== null)
          .map(point => ({ time: point.t, value: point.values.rsi! }));
        const rsiSeries = indicatorSeriesRef.current.get(`${indicatorId}_rsi`);
        if (rsiSeries && rsiData.length > 0) {
          rsiSeries.setData(rsiData);
        }
        break;
        
      case 'macd':
        const macdData = indicatorData
          .filter(point => point.values.macd !== null)
          .map(point => ({ time: point.t, value: point.values.macd! }));
        const signalData = indicatorData
          .filter(point => point.values.signal !== null)
          .map(point => ({ time: point.t, value: point.values.signal! }));
        const histData = indicatorData
          .filter(point => point.values.hist !== null)
          .map(point => ({ time: point.t, value: point.values.hist! }));
        
        const macdSeries = indicatorSeriesRef.current.get(`${indicatorId}_macd`);
        const signalSeries = indicatorSeriesRef.current.get(`${indicatorId}_signal`);
        const histSeries = indicatorSeriesRef.current.get(`${indicatorId}_hist`);
        
        if (macdSeries && macdData.length > 0) macdSeries.setData(macdData);
        if (signalSeries && signalData.length > 0) signalSeries.setData(signalData);
        if (histSeries && histData.length > 0) histSeries.setData(histData);
        break;
        
      case 'ema':
      case 'sma':
        const lineData = indicatorData
          .filter(point => point.values[indicatorName.toLowerCase()] !== null)
          .map(point => ({ time: point.t, value: point.values[indicatorName.toLowerCase()]! }));
        const lineSeries = indicatorSeriesRef.current.get(`${indicatorId}_line`);
        if (lineSeries && lineData.length > 0) {
          lineSeries.setData(lineData);
        }
        break;
        
      case 'bb':
        const upperData = indicatorData
          .filter(point => point.values.bb_upper !== null)
          .map(point => ({ time: point.t, value: point.values.bb_upper! }));
        const middleData = indicatorData
          .filter(point => point.values.bb_middle !== null)
          .map(point => ({ time: point.t, value: point.values.bb_middle! }));
        const lowerData = indicatorData
          .filter(point => point.values.bb_lower !== null)
          .map(point => ({ time: point.t, value: point.values.bb_lower! }));
        
        const upperSeries = indicatorSeriesRef.current.get(`${indicatorId}_upper`);
        const middleSeries = indicatorSeriesRef.current.get(`${indicatorId}_middle`);
        const lowerSeries = indicatorSeriesRef.current.get(`${indicatorId}_lower`);
        
        if (upperSeries && upperData.length > 0) upperSeries.setData(upperData);
        if (middleSeries && middleData.length > 0) middleSeries.setData(middleData);
        if (lowerSeries && lowerData.length > 0) lowerSeries.setData(lowerData);
        break;
    }
  }, [seriesState]);

  // Generate mock indicator data for testing
  const generateMockIndicatorData = useCallback((indicatorId: string, indicatorName: string) => {
    const candles = seriesState.getAllCandles();
    if (candles.length === 0) return;

    const mockData = candles.map((candle, index) => {
      const time = candle.time;
      let values: Record<string, number | null> = {};

      switch (indicatorName.toLowerCase()) {
        case 'rsi':
          // Generate mock RSI (30-70 range)
          values.rsi = 30 + Math.sin(index * 0.1) * 20 + Math.random() * 10;
          break;
        case 'macd':
          // Generate mock MACD
          values.macd = Math.sin(index * 0.05) * 100;
          values.signal = values.macd * 0.8;
          values.hist = values.macd - values.signal;
          break;
        case 'ema':
        case 'sma':
          // Generate mock moving average (slightly above/below close)
          const multiplier = indicatorName === 'ema' ? 1.02 : 1.01;
          values[indicatorName.toLowerCase()] = candle.close * multiplier;
          break;
        case 'bb':
          // Generate mock Bollinger Bands
          const base = candle.close;
          values.bb_middle = base;
          values.bb_upper = base * 1.02;
          values.bb_lower = base * 0.98;
          break;
      }

      return {
        t: time,
        values,
        status: 'final' as const
      };
    });

    // Add to series state
    seriesState.addIndicatorPoints(indicatorId, mockData);

    // Populate series
    setTimeout(() => {
      populateIndicatorSeries(indicatorId, indicatorName);
    }, 100);

    console.log(`📊 Generated mock data for ${indicatorName}: ${mockData.length} points`);
  }, [seriesState, populateIndicatorSeries]);

  // Get inputs for indicator
  const getInputsForIndicator = (indicatorName: string, params: Record<string, any> = {}): Record<string, number | string> => {
    switch (indicatorName.toLowerCase()) {
      case 'rsi':
        return {
          period: params.period || 14,
          source: params.source || 'close'
        };
      case 'macd':
        return {
          fast: params.fast || 12,
          slow: params.slow || 26,
          signal: params.signal || 9,
          source: params.source || 'close'
        };
      case 'ema':
        return {
          period: params.period || 20,
          source: params.source || 'close'
        };
      case 'sma':
        return {
          period: params.period || 20,
          source: params.source || 'close'
        };
      case 'bb':
        return {
          period: params.period || 20,
          k: params.k || 2,
          source: params.source || 'close'
        };
      default:
        return {};
    }
  };

  // Get outputs for indicator
  const getOutputsForIndicator = (indicatorName: string) => {
    switch (indicatorName.toLowerCase()) {
      case 'rsi':
        return [{ key: 'rsi', type: 'line', overlay: false, levels: [30, 50, 70] }];
      case 'macd':
        return [
          { key: 'macd', type: 'line', overlay: false, zeroLine: true },
          { key: 'signal', type: 'line', overlay: false, zeroLine: true },
          { key: 'hist', type: 'histogram', overlay: false, zeroLine: true }
        ];
      case 'ema':
        return [{ key: 'ema', type: 'line', overlay: true }];
      case 'sma':
        return [{ key: 'sma', type: 'line', overlay: true }];
      case 'bb':
        return [
          { key: 'bb_upper', type: 'line', overlay: true },
          { key: 'bb_middle', type: 'line', overlay: true },
          { key: 'bb_lower', type: 'line', overlay: true }
        ];
      default:
        return [];
    }
  };

  // Get warmup for indicator
  const getWarmupForIndicator = (indicatorName: string): number => {
    switch (indicatorName.toLowerCase()) {
      case 'rsi':
        return 14;
      case 'macd':
        return 26;
      case 'ema':
        return 20;
      case 'sma':
        return 20;
      case 'bb':
        return 20;
      default:
        return 0;
    }
  };

  // Initialize chart
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || chartRef.current) return;

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
  }, [loadHistoricalData]);

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
    
    // Connect to Binance WebSocket
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
            
            // If this is a new candle (different time), add it
            if (lastIndex < 0 || newCandles[lastIndex].time < candle.time) {
              newCandles.push(candle);
              return newCandles.slice(-1000); // Keep last 1000 candles
            } else {
              // Update the last candle
              newCandles[lastIndex] = candle;
              return newCandles;
            }
          });
          
          if (k.x) {
            console.log(`📈 Final candle: ${k.c} at ${new Date(k.t).toLocaleTimeString()}`);
          } else {
            console.log(`🔄 Live update: ${k.c} at ${new Date(k.t).toLocaleTimeString()}`);
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

  // Subscribe to indicator updates
  useEffect(() => {
    if (!useRealCompute) return;

    const unsubscribe = indicatorBus.subscribe((update) => {
      console.log('📊 Indicator update received:', update);
      
      // Update indicator series with new data
      update.points.forEach(point => {
        const time = point.t;
        
        // Find matching series for this indicator
        for (const [seriesKey, series] of indicatorSeriesRef.current) {
          if (seriesKey.includes(update.id)) {
            const outputKey = seriesKey.split('_').pop();
            const value = point.values[outputKey || 'rsi'];
            
            if (value !== null && value !== undefined) {
              series.update({ time, value });
            }
          }
        }
      });
    });

    return unsubscribe;
  }, [useRealCompute, indicatorBus]);

  // Update compute metrics
  useEffect(() => {
    if (useRealCompute) {
      const interval = setInterval(() => {
        const metrics = computeRunner.getComputeMetrics();
        setComputeMetrics(metrics);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [useRealCompute, computeRunner]);

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
          <h1 className="text-2xl font-bold text-gray-900">Simple Chart Studio</h1>
          
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

            {/* Compute Mode Toggle */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Compute:</label>
              <select
                value={useRealCompute ? 'real' : 'mock'}
                onChange={(e) => setUseRealCompute(e.target.value === 'real')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mock">Mock</option>
                <option value="real">Real</option>
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
          <button
            onClick={() => addIndicator('RSI', { period: 14, source: 'close' })}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            RSI(14)
          </button>
          <button
            onClick={() => addIndicator('MACD', { fast: 12, slow: 26, signal: 9, source: 'close' })}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            MACD(12,26,9)
          </button>
          <button
            onClick={() => addIndicator('EMA', { period: 20, source: 'close' })}
            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
          >
            EMA(20)
          </button>
          <button
            onClick={() => addIndicator('SMA', { period: 20, source: 'close' })}
            className="px-3 py-1 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600"
          >
            SMA(20)
          </button>
          <button
            onClick={() => addIndicator('BB', { period: 20, k: 2, source: 'close' })}
            className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
          >
            BB(20,2)
          </button>
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
          <p>Compute Mode: {useRealCompute ? 'Real' : 'Mock'}</p>
          {useRealCompute && (
            <p>Active Indicators: {activeIndicators.length} | Compute States: {computeMetrics.computeStates}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleChartStudio;
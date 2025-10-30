import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChartRoot } from '../renderer/ChartRoot';
import { SeriesState } from '../engine/state/seriesState';
import { IndicatorBus } from '../engine/bridge/indicatorBus';
import { MockLiveStreamClient } from '../engine/ingest/liveStreamClient';
import { MockHistoryClient } from '../engine/ingest/historyClient';
import { ComputeRunner } from '../engine/compute/computeRunner';
import { computeRegistry } from '../engine/compute/registry';
import { 
  createSMAAdapter, 
  createEMAAdapter, 
  createRSIWilderAdapter, 
  createMACDAdapter, 
  createBollingerBandsAdapter 
} from '../engine/compute/adapters';
import { 
  IndicatorInstanceMeta, 
  IndicatorPoint,
  IndicatorSpec 
} from '../contracts/indicator';
import { Candle } from '../contracts/candle';

/**
 * Chart Studio demo page
 */
const ChartStudio: React.FC = () => {
  // State
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1m');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<IndicatorInstanceMeta[]>([]);
  const [useRealCompute, setUseRealCompute] = useState(false);
  const [computeMetrics, setComputeMetrics] = useState({
    activeIndicators: 0,
    computeStates: 0,
    lastUpdateTime: 0
  });
  const wsRef = useRef<WebSocket | null>(null);

  // Create core instances
  const seriesState = new SeriesState(1000);
  const indicatorBus = new IndicatorBus(seriesState);
  const liveStreamClient = new MockLiveStreamClient();
  const historyClient = new MockHistoryClient();
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
  const loadHistoricalData = useCallback(async () => {
    try {
      setError(null);
      console.log(`🔄 Loading historical data for ${symbol} ${timeframe}...`);

      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=1000`);
      const data = await response.json();
      
      const historicalCandles: Candle[] = data.map((k: any[]) => ({
        t: Math.floor(k[0] / 1000),
        o: parseFloat(k[1]),
        h: parseFloat(k[2]),
        l: parseFloat(k[3]),
        c: parseFloat(k[4]),
        v: parseFloat(k[5]),
        f: true
      }));
      
      // Add to series state
      historicalCandles.forEach(candle => {
        seriesState.addCandle(candle);
      });

      console.log(`✅ Loaded ${historicalCandles.length} historical candles`);
    } catch (err) {
      console.error('❌ Error loading historical data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load historical data');
    }
  }, [symbol, timeframe, seriesState]);

  // Setup live data stream from Binance WebSocket
  const setupLiveStream = useCallback(() => {
    if (isConnected) {
      // Disconnect existing WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
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
        
        const candle: Candle = {
          t: Math.floor(k.t / 1000),
          o: parseFloat(k.o),
          h: parseFloat(k.h),
          l: parseFloat(k.l),
          c: parseFloat(k.c),
          v: parseFloat(k.v),
          f: k.x // x indicates if the kline is closed
        };

        // Add to series state
        seriesState.addCandle(candle);
        
        if (k.x) {
          console.log(`📈 Final candle: ${k.c} at ${new Date(k.t).toLocaleTimeString()}`);
        } else {
          console.log(`🔄 Live update: ${k.c} at ${new Date(k.t).toLocaleTimeString()}`);
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
  }, [symbol, timeframe, isConnected, seriesState]);

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

        // Compute batch data
        const candles = seriesState.getAllCandles();
        if (candles.length > 0) {
          computeRunner.computeBatch(candles);
        }

        console.log(`Added real indicator: ${indicatorName}`, params);
      } else {
        // Create indicator instance meta for mock mode
        const indicatorMeta: IndicatorInstanceMeta = {
          id: indicatorId,
          outputsMeta: getOutputsForIndicator(indicatorName),
          warmup: getWarmupForIndicator(indicatorName),
          defaultPane: indicatorName === 'EMA' || indicatorName === 'BB' ? 'price' : 'new'
        };

        // Add to active indicators
        setActiveIndicators(prev => [...prev, indicatorMeta]);

        // Generate mock indicator data
        generateMockIndicatorData(indicatorId, indicatorMeta);

        console.log(`Added mock indicator: ${indicatorName}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add indicator');
    }
  }, [seriesState, indicatorBus, useRealCompute, timeframe, computeRunner]);

  // Remove indicator
  const removeIndicator = useCallback((indicatorId: string) => {
    setActiveIndicators(prev => prev.filter(ind => ind.id !== indicatorId));

    // Remove from series state
    seriesState.removeIndicator(indicatorId);

    console.log(`Removed indicator: ${indicatorId}`);
  }, [seriesState]);

  // Generate mock indicator data
  const generateMockIndicatorData = (indicatorId: string, indicatorMeta: IndicatorInstanceMeta) => {
    const candles = seriesState.getAllCandles();
    if (candles.length === 0) return;

    const points: IndicatorPoint[] = [];
    
    for (let i = indicatorMeta.warmup; i < candles.length; i++) {
      const candle = candles[i];
      const values: Record<string, number | null> = {};

      // Generate mock values based on indicator type
      indicatorMeta.outputsMeta.forEach(output => {
        values[output.key] = generateMockValue(output.key, i, candles);
      });

      points.push({
        t: candle.t,
        values,
        status: 'final'
      });
    }

    // Add to series state
    seriesState.addIndicatorPoints(indicatorId, points);

    // Publish to indicator bus
    indicatorBus.publish({
      id: indicatorId,
      points
    });
  };

  // Generate mock value for output key
  const generateMockValue = (outputKey: string, index: number, candles: Candle[]): number => {
    const candle = candles[index];
    const basePrice = candle.c;

    switch (outputKey) {
      case 'rsi':
        return Math.max(0, Math.min(100, 50 + Math.sin(index * 0.1) * 30 + (Math.random() - 0.5) * 10));
      case 'macd':
        return (Math.random() - 0.5) * basePrice * 0.01;
      case 'signal':
        return (Math.random() - 0.5) * basePrice * 0.005;
      case 'hist':
        return (Math.random() - 0.5) * basePrice * 0.002;
      case 'ema':
      case 'sma':
        return basePrice * (0.98 + Math.random() * 0.04);
      case 'bb_upper':
        return basePrice * 1.02;
      case 'bb_middle':
        return basePrice;
      case 'bb_lower':
        return basePrice * 0.98;
      default:
        return basePrice;
    }
  };

  // Get outputs for indicator
  const getOutputsForIndicator = (indicatorName: string) => {
    switch (indicatorName.toLowerCase()) {
      case 'rsi':
        return [
          { key: 'rsi', type: 'line' as const, overlay: false, levels: [30, 50, 70] }
        ];
      case 'macd':
        return [
          { key: 'macd', type: 'line' as const, overlay: false },
          { key: 'signal', type: 'line' as const, overlay: false },
          { key: 'hist', type: 'histogram' as const, overlay: false, zeroLine: true }
        ];
      case 'ema':
        return [
          { key: 'ema', type: 'line' as const, overlay: true }
        ];
      case 'sma':
        return [
          { key: 'sma', type: 'line' as const, overlay: true }
        ];
      case 'bb':
        return [
          { key: 'bb_upper', type: 'line' as const, overlay: true },
          { key: 'bb_middle', type: 'line' as const, overlay: true },
          { key: 'bb_lower', type: 'line' as const, overlay: true }
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

  // Load data on mount
  useEffect(() => {
    loadHistoricalData();
  }, [loadHistoricalData]);

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
      liveStreamClient.disconnect();
    };
  }, [liveStreamClient]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Chart Studio</h1>
          
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

                    {/* Diagnostics Toggle */}
                    <button
                      onClick={() => setShowDiagnostics(!showDiagnostics)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
                    >
                      {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
                    </button>
          </div>
        </div>
      </div>

              {/* Controls */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Indicators:</span>
                    <button
                      onClick={() => addIndicator('RSI', { period: 14, source: 'close' })}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                    >
                      Add RSI(14)
                    </button>
                    <button
                      onClick={() => addIndicator('MACD', { fast: 12, slow: 26, signal: 9, source: 'close' })}
                      className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
                    >
                      Add MACD(12,26,9)
                    </button>
                    <button
                      onClick={() => addIndicator('EMA', { period: 20, source: 'close' })}
                      className="px-3 py-1 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600"
                    >
                      Add EMA(20)
                    </button>
                    <button
                      onClick={() => addIndicator('SMA', { period: 20, source: 'close' })}
                      className="px-3 py-1 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600"
                    >
                      Add SMA(20)
                    </button>
                    <button
                      onClick={() => addIndicator('BB', { period: 20, k: 2, source: 'close' })}
                      className="px-3 py-1 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600"
                    >
                      Add BB(20,2)
                    </button>
                  </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={setupLiveStream}
              className={`px-3 py-1 rounded-md text-sm ${
                isConnected 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </button>
            <button
              onClick={() => setActiveIndicators([])}
              className="px-3 py-1 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600"
            >
              Remove All
            </button>
          </div>
        </div>

        {/* Active Indicators */}
        {activeIndicators.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeIndicators.map((meta) => (
              <div
                key={meta.id}
                className="flex items-center space-x-2 bg-white px-3 py-1 rounded-md border border-gray-200"
              >
                <span className="text-sm text-gray-700">{meta.id}</span>
                <button
                  onClick={() => removeIndicator(meta.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
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
              <div className="flex-1 h-[600px]">
                <ChartRoot
                  symbol={symbol}
                  timeframe={timeframe}
                  seriesState={seriesState}
                  indicatorBus={indicatorBus}
                  showDiagnostics={showDiagnostics}
                  computeMetrics={computeMetrics}
                />
              </div>
    </div>
  );
};

export default ChartStudio;

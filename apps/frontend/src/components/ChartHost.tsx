import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts';
import { useChartStore } from '@/store/chartStore';
import { fetchKlines } from '@/lib/binance';
import { createReconnectWebSocket } from '@/lib/ws';
import { KlineMessage } from '@/types/market';

const ChartHost: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const wsCleanupRef = useRef<(() => void) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveUpdateCount, setLiveUpdateCount] = useState(0);

  const { symbol, interval, setConnectionState } = useChartStore();

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) {
      console.error('Chart container ref is null');
      return;
    }

    console.log('Initializing chart...');
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
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

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart) {
        chart.remove();
      }
    };
  }, []);

  // Load historical data and setup WebSocket
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    const loadDataAndSetupWS = async () => {
      try {
        console.log(`🔄 Loading LIVE chart data for ${symbol} ${interval}...`);
        setIsLoading(true);
        setError(null);

        // Clean up existing WebSocket
        if (wsCleanupRef.current) {
          wsCleanupRef.current();
          wsCleanupRef.current = null;
        }

        // Load historical data (more data for better context)
        const candles = await fetchKlines(symbol, interval, 2000);
        console.log(`📊 Fetched ${candles.length} historical candles`);
        const chartData: CandlestickData[] = candles.map(candle => ({
          time: candle.time as Time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));
        seriesRef.current!.setData(chartData);
        console.log(`✅ Historical data loaded successfully`);

        // Setup WebSocket for live updates with enhanced reconnection
        console.log(`🚀 Setting up WebSocket for ${symbol}@${interval}`);
                wsCleanupRef.current = createReconnectWebSocket(
                  symbol,
                  interval,
                  (message: KlineMessage) => {
                    console.log('📨 Chart received WebSocket message');
                    const k = message.k; // Fixed: should be message.k, not message.data.k
                    const candle: CandlestickData = {
                      time: Math.floor(k.t / 1000) as Time,
                      open: parseFloat(k.o),
                      high: parseFloat(k.h),
                      low: parseFloat(k.l),
                      close: parseFloat(k.c),
                    };

                    console.log('📊 Candle data:', candle);
                    setLiveUpdateCount(prev => prev + 1);
                    
                    try {
                      if (seriesRef.current) {
                        seriesRef.current.update(candle);
                        console.log('✅ Chart updated successfully');
                        
                        if (k.x) {
                          console.log(`📈 FINAL candle updated: ${k.c} at ${new Date(k.t).toLocaleTimeString()}`);
                        } else {
                          console.log(`🔄 LIVE candle update: ${k.c} at ${new Date(k.t).toLocaleTimeString()}`);
                        }
                      } else {
                        console.error('❌ Series ref is null');
                      }
                    } catch (error) {
                      console.error('❌ Error updating chart:', error);
                    }
                  },
          (state) => {
            console.log(`🔌 WebSocket state changed: ${state}`);
            setConnectionState(state);
          },
          20 // Increased max reconnection attempts
        );

        console.log(`🚀 Live data stream started for ${symbol}@${interval}`);

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load chart data:', err);
        setError(`Failed to load chart data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    loadDataAndSetupWS();

    return () => {
      if (wsCleanupRef.current) {
        wsCleanupRef.current();
        wsCleanupRef.current = null;
      }
    };
  }, [symbol, interval, setConnectionState]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠️</div>
          <div className="text-lg font-medium mb-2">Chart Error</div>
          <div className="text-sm text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-white">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="text-center text-gray-900">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-sm">Loading LIVE chart data...</div>
          </div>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full" style={{ minHeight: '400px' }} />
    </div>
  );
};

export default ChartHost;

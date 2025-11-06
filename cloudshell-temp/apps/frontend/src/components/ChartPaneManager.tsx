import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries, LineSeries, HistogramSeries, LineStyle, PriceLineOptions } from 'lightweight-charts';

export interface ChartPane {
  id: string;
  chart: IChartApi;
  container: HTMLDivElement;
  height: number;
  type: 'main' | 'indicator';
  indicatorType?: string;
  series: Map<string, ISeriesApi<any>>;
}

interface ChartPaneManagerProps {
  symbol: string;
  interval: string;
  onDataUpdate?: (data: CandlestickData[]) => void;
}

const ChartPaneManager: React.FC<ChartPaneManagerProps> = ({ symbol, interval, onDataUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panes, setPanes] = useState<Map<string, ChartPane>>(new Map());
  const [mainPane, setMainPane] = useState<ChartPane | null>(null);
  const [indicatorPanes, setIndicatorPanes] = useState<ChartPane[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [messageCount, setMessageCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Create main chart pane
  const createMainPane = useCallback(() => {
    if (!containerRef.current) return null;

    const container = document.createElement('div');
    container.className = 'chart-pane main-pane';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    container.style.background = '#ffffff';
    container.style.borderBottom = '1px solid #e5e7eb';
    
    containerRef.current.appendChild(container);

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
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

    const pane: ChartPane = {
      id: 'main',
      chart,
      container,
      height: container.clientHeight,
      type: 'main',
      series: new Map([['candlestick', candlestickSeries]]),
    };

    return pane;
  }, []);

  // Create indicator pane
  const createIndicatorPane = useCallback((indicatorType: string, height: number = 200) => {
    if (!containerRef.current) return null;

    const container = document.createElement('div');
    container.className = 'chart-pane indicator-pane';
    container.style.width = '100%';
    container.style.height = `${height}px`;
    container.style.position = 'relative';
    container.style.background = '#ffffff';
    container.style.borderBottom = '1px solid #e5e7eb';
    container.style.flexShrink = '0';
    
    containerRef.current.appendChild(container);

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
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
        autoScale: indicatorType === 'RSI' ? false : true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#d1d5db',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const pane: ChartPane = {
      id: `indicator-${indicatorType}-${Date.now()}`,
      chart,
      container,
      height,
      type: 'indicator',
      indicatorType,
      series: new Map(),
    };

    // Add indicator-specific series and level lines
    if (indicatorType === 'RSI') {
      const rsiSeries = chart.addSeries(LineSeries, {
        color: '#6a5acd',
        lineWidth: 2,
      });
      pane.series.set('rsi', rsiSeries);

      // Add RSI level lines
      const overboughtLine: PriceLineOptions = {
        price: 70,
        color: '#666666',
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: true,
        title: '70',
      };

      const oversoldLine: PriceLineOptions = {
        price: 30,
        color: '#666666',
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: true,
        title: '30',
      };

      chart.priceScale('right').createPriceLine(overboughtLine);
      chart.priceScale('right').createPriceLine(oversoldLine);
    }

    return pane;
  }, []);

  // Sync time scales across all panes
  const syncTimeScales = useCallback(() => {
    if (!mainPane) return;

    const mainTimeScale = mainPane.chart.timeScale();
    
    // Subscribe to main chart's time scale changes
    mainTimeScale.subscribeVisibleLogicalRangeChange((logicalRange) => {
      if (logicalRange) {
        panes.forEach((pane) => {
          if (pane.id !== 'main') {
            pane.chart.timeScale().setVisibleLogicalRange(logicalRange);
          }
        });
      }
    });

    // Initial sync
    const initialRange = mainTimeScale.getVisibleLogicalRange();
    if (initialRange) {
      panes.forEach((pane) => {
        if (pane.id !== 'main') {
          pane.chart.timeScale().setVisibleLogicalRange(initialRange);
        }
      });
    }
  }, [mainPane, panes]);

  // Add indicator pane
  const addIndicatorPane = useCallback((indicatorType: string) => {
    const newPane = createIndicatorPane(indicatorType);
    if (!newPane) return;

    setPanes(prev => {
      const newPanes = new Map(prev);
      newPanes.set(newPane.id, newPane);
      return newPanes;
    });

    setIndicatorPanes(prev => [...prev, newPane]);
    
    // Update main pane height to accommodate new indicator
    if (mainPane) {
      const newHeight = Math.max(300, mainPane.container.clientHeight - 200);
      mainPane.chart.applyOptions({ height: newHeight });
    }

    // Sync time scales
    setTimeout(() => syncTimeScales(), 100);
  }, [createIndicatorPane, mainPane, syncTimeScales]);

  // Remove indicator pane
  const removeIndicatorPane = useCallback((paneId: string) => {
    const pane = panes.get(paneId);
    if (!pane) return;

    // Remove from DOM
    pane.container.remove();
    
    setPanes(prev => {
      const newPanes = new Map(prev);
      newPanes.delete(paneId);
      return newPanes;
    });

    setIndicatorPanes(prev => prev.filter(p => p.id !== paneId));

    // Update main pane height
    if (mainPane) {
      const newHeight = mainPane.container.clientHeight + 200;
      mainPane.chart.applyOptions({ height: newHeight });
    }
  }, [panes, mainPane]);

  // Load historical data
  const loadHistoricalData = useCallback(async () => {
    if (!mainPane) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`);
      const data = await response.json();
      
      const chartData: CandlestickData[] = data.map((k: any[]) => ({
        time: Math.floor(k[0] / 1000) as Time,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
      }));

      const candlestickSeries = mainPane.series.get('candlestick');
      if (candlestickSeries) {
        candlestickSeries.setData(chartData);
        onDataUpdate?.(chartData);
      }

      console.log(`✅ Loaded ${chartData.length} historical candles`);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load chart data:', err);
      setError(`Failed to load chart data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [symbol, interval, mainPane, onDataUpdate]);

  // Setup WebSocket
  const setupWebSocket = useCallback(() => {
    if (!mainPane) return;

    setConnectionStatus('connecting');
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setConnectionStatus('connected');
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

        const candlestickSeries = mainPane.series.get('candlestick');
        if (candlestickSeries) {
          candlestickSeries.update(candle);
          setMessageCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setConnectionStatus('disconnected');
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionStatus('disconnected');
    };
  }, [symbol, interval, mainPane]);

  // Initialize main pane
  useEffect(() => {
    if (!containerRef.current) return;

    const pane = createMainPane();
    if (pane) {
      setMainPane(pane);
      setPanes(prev => new Map(prev.set('main', pane)));
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [createMainPane]);

  // Load data and setup WebSocket when main pane is ready
  useEffect(() => {
    if (!mainPane) return;

    loadHistoricalData();
    setupWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [mainPane, loadHistoricalData, setupWebSocket]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      panes.forEach((pane) => {
        pane.chart.applyOptions({
          width: pane.container.clientWidth,
          height: pane.container.clientHeight,
        });
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [panes]);

  // Sync time scales when panes change
  useEffect(() => {
    syncTimeScales();
  }, [syncTimeScales]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'text-red-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'LIVE';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center text-red-500">
          <p className="text-lg font-semibold">Error Loading Chart</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-gray-900">Chart Pane Manager</h1>
            <div className="text-sm text-gray-500">
              {symbol} {interval} | Panes: {panes.size}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            <div className="text-sm text-gray-500">
              Updates: {messageCount}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="flex-1 overflow-hidden flex flex-col" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="text-center text-gray-900">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-sm">Loading chart data...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartPaneManager;



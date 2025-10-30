import { useRef, useEffect, useCallback } from 'react';
import * as echarts from 'echarts';
import { fetchHistory, fetchOlder, mergeCandles, type HistoryCandle } from '../../lib/data/history';

interface StudioChartProps {
  symbol: string;
  interval: string;
  chartType: string;
  zoom: number;
  exchange: string;
}

interface ViewportRef {
  start: number; // timestamp in ms
  end: number;   // timestamp in ms
}

interface PanState {
  isPanning: boolean;
  startX: number;
  startTime: number;
  timeAtCursor: number;
  velocitySamples: Array<{ dt: number; dx: number; timestamp: number }>;
}

const StudioChart = ({ symbol, interval, chartType, zoom, exchange }: StudioChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const dataRef = useRef<HistoryCandle[]>([]);
  const viewportRef = useRef<ViewportRef>({ start: 0, end: 0 });
  const panStateRef = useRef<PanState>({
    isPanning: false,
    startX: 0,
    startTime: 0,
    timeAtCursor: 0,
    velocitySamples: []
  });
  const inertiaRef = useRef<number | null>(null);
  const lastFetchRef = useRef<number>(0);

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return;

    console.log('Initializing ECharts...');
    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;
    console.log('ECharts initialized:', chart);

    const option = {
      backgroundColor: '#111827',
      animation: false,
      grid: {
        left: 20,
        right: 80,
        top: 40,
        bottom: 40,
        containLabel: false,
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#374151' } },
        axisLabel: { color: '#d1d5db', fontSize: 10 },
        splitLine: { lineStyle: { color: '#374151' } },
      },
      yAxis: {
        type: 'value',
        position: 'right',
        scale: true,
        axisLine: { lineStyle: { color: '#374151' } },
        axisLabel: { color: '#d1d5db', fontSize: 10 },
        splitLine: { lineStyle: { color: '#374151' } },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          start: 70,
          end: 100,
        }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          lineStyle: { color: '#60a5fa' },
        },
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        textStyle: { color: '#ffffff' },
      },
      series: [{
        type: 'candlestick',
        name: symbol,
        data: [],
        itemStyle: {
          color: '#26a69a',
          color0: '#ef5350',
          borderColor: '#26a69a',
          borderColor0: '#ef5350',
        },
      }],
    };

    chart.setOption(option);
    console.log('Initial chart option set');

    // Setup pan handlers
    setupPanHandlers(chart);
    
    // Load initial data function
    const loadInitialData = async () => {
      try {
        console.log('Loading initial data for', symbol, interval);
        const candles = await fetchHistory({
          symbol,
          interval,
          to: Date.now(),
          limit: 300
        });

        console.log('Loaded candles:', candles.length, candles.slice(0, 3));
        dataRef.current = candles;
        
        if (candles.length > 0) {
          // Set initial viewport to show last 50 candles
          const lastCandles = candles.slice(-50);
          viewportRef.current = {
            start: lastCandles[0].t,
            end: lastCandles[lastCandles.length - 1].t
          };
          
          console.log('Viewport set:', viewportRef.current);
          
          // Update chart immediately
          updateChartData();
        }

        // Setup event listeners
        chart.on('dataZoom', handleDataZoom);

      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    // Load data after chart is ready
    setTimeout(() => {
      loadInitialData();
    }, 100);

    // Handle resize
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      if (inertiaRef.current) {
        cancelAnimationFrame(inertiaRef.current);
      }
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [symbol, interval]);

  // Setup pan handlers with momentum
  const setupPanHandlers = (chart: echarts.ECharts) => {
    const chartDom = chart.getDom();

    // Mouse/pointer events
    chartDom.addEventListener('mousedown', handlePanStart);
    chartDom.addEventListener('mousemove', handlePanMove);
    chartDom.addEventListener('mouseup', handlePanEnd);
    chartDom.addEventListener('mouseleave', handlePanEnd);

    // Touch events for mobile
    chartDom.addEventListener('touchstart', handlePanStart);
    chartDom.addEventListener('touchmove', handlePanMove);
    chartDom.addEventListener('touchend', handlePanEnd);

    // Double-click reset
    chartDom.addEventListener('dblclick', handleDoubleClick);

    // Wheel events for cursor-anchored zoom
    chartDom.addEventListener('wheel', handleWheel);
  };

  const handlePanStart = (e: MouseEvent | TouchEvent) => {
    if (!chartInstanceRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rect = chartInstanceRef.current.getDom().getBoundingClientRect();
    const x = clientX - rect.left;

    // Convert pixel to data coordinate
    const dataCoord = chartInstanceRef.current.convertFromPixel('grid', [x, 0]);
    if (!dataCoord) return;

    panStateRef.current = {
      isPanning: true,
      startX: clientX,
      startTime: Date.now(),
      timeAtCursor: dataCoord[0],
      velocitySamples: []
    };

    // Disable text selection during pan
    document.body.style.userSelect = 'none';
    chartInstanceRef.current.getDom().style.cursor = 'grabbing';

    e.preventDefault();
  };

  const handlePanMove = (e: MouseEvent | TouchEvent) => {
    if (!panStateRef.current.isPanning || !chartInstanceRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - panStateRef.current.startX;
    const currentTime = Date.now();

    // Calculate time delta based on pixel delta
    const gridWidth = chartInstanceRef.current.getWidth() - 100; // Account for margins
    const currentRange = viewportRef.current.end - viewportRef.current.start;
    const timeDelta = -(deltaX / gridWidth) * currentRange;

    // Update viewport
    const newStart = viewportRef.current.start + timeDelta;
    const newEnd = viewportRef.current.end + timeDelta;

    // Apply viewport change
    chartInstanceRef.current.dispatchAction({
      type: 'dataZoom',
      startValue: newStart,
      endValue: newEnd,
    });

    // Record velocity sample
    const dt = currentTime - panStateRef.current.startTime;
    if (dt > 0) {
      panStateRef.current.velocitySamples.push({
        dt: timeDelta,
        dx: deltaX,
        timestamp: currentTime
      });

      // Keep only recent samples (last 100ms)
      panStateRef.current.velocitySamples = panStateRef.current.velocitySamples.filter(
        sample => currentTime - sample.timestamp < 100
      );
    }

    // Update pan start for next delta
    panStateRef.current.startX = clientX;
    panStateRef.current.startTime = currentTime;

    // Check if we need to load older data
    checkAndLoadOlderData(newStart);

    e.preventDefault();
  };

  const handlePanEnd = () => {
    if (!panStateRef.current.isPanning) return;

    // Calculate velocity for inertia
    const samples = panStateRef.current.velocitySamples;
    let velocity = 0;

    if (samples.length > 1) {
      const totalDt = samples.reduce((sum, sample) => sum + sample.dt, 0);
      const totalTime = samples[samples.length - 1].timestamp - samples[0].timestamp;
      velocity = totalTime > 0 ? totalDt / totalTime : 0;
    }

    // Start inertia animation if velocity is significant
    if (Math.abs(velocity) > 0.1) {
      startInertiaAnimation(velocity);
    }

    // Reset pan state
    panStateRef.current.isPanning = false;
    document.body.style.userSelect = '';
    if (chartInstanceRef.current) {
      chartInstanceRef.current.getDom().style.cursor = 'grab';
    }
  };

  const startInertiaAnimation = (initialVelocity: number) => {
    let velocity = initialVelocity;
    const friction = 0.92;
    const threshold = 0.01;

    const animate = () => {
      if (Math.abs(velocity) < threshold) {
        inertiaRef.current = null;
        return;
      }

      // Apply velocity to viewport
      const newStart = viewportRef.current.start + velocity * 16; // 16ms frame time
      const newEnd = viewportRef.current.end + velocity * 16;

      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispatchAction({
          type: 'dataZoom',
          startValue: newStart,
          endValue: newEnd,
        });

        // Check for older data loading
        checkAndLoadOlderData(newStart);
      }

      // Apply friction
      velocity *= friction;

      // Continue animation
      inertiaRef.current = requestAnimationFrame(animate);
    };

    inertiaRef.current = requestAnimationFrame(animate);
  };

  const checkAndLoadOlderData = (viewStart: number) => {
    if (dataRef.current.length === 0) return;

    const oldestCandle = dataRef.current[0];
    const timeToOldest = viewStart - oldestCandle.t;
    const currentRange = viewportRef.current.end - viewportRef.current.start;
    const loadThreshold = currentRange * 2; // Load when within 2 screen widths

    // Throttle loading (max once per second)
    const now = Date.now();
    if (timeToOldest < loadThreshold && now - lastFetchRef.current > 1000) {
      lastFetchRef.current = now;
      loadOlderData();
    }
  };

  const loadOlderData = async () => {
    if (dataRef.current.length === 0) return;

    try {
      const oldestTs = dataRef.current[0].t;
      const olderCandles = await fetchOlder({
        symbol,
        interval,
        oldestTs,
        limit: 500
      });

      if (olderCandles.length > 0) {
        // Merge and dedupe
        const mergedData = mergeCandles(dataRef.current, olderCandles);
        dataRef.current = mergedData;

        // Update chart without shifting viewport
        updateChartData();
      }
    } catch (error) {
      console.error('Failed to load older data:', error);
    }
  };

  const handleDoubleClick = (e: MouseEvent) => {
    if (!chartInstanceRef.current) return;

    const rect = chartInstanceRef.current.getDom().getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Check if double-click is on Y-axis (right side)
    if (x > rect.width - 80) {
      // Reset Y-axis only
      chartInstanceRef.current.setOption({
        yAxis: {
          min: 'dataMin',
          max: 'dataMax'
        }
      }, { lazyUpdate: true });
    } else {
      // Full reset (X and Y)
      chartInstanceRef.current.dispatchAction({
        type: 'dataZoom',
        start: 0,
        end: 100
      });
      chartInstanceRef.current.setOption({
        yAxis: {
          min: 'dataMin',
          max: 'dataMax'
        }
      }, { lazyUpdate: true });
    }
  };

  const handleWheel = (e: WheelEvent) => {
    if (!chartInstanceRef.current) return;

    e.preventDefault();

    // Get cursor position in data coordinates
    const rect = chartInstanceRef.current.getDom().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const dataCoord = chartInstanceRef.current.convertFromPixel('grid', [x, 0]);
    if (!dataCoord) return;

    const anchorTime = dataCoord[0];
    const currentRange = viewportRef.current.end - viewportRef.current.start;
    
    // Calculate zoom factor
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const newRange = currentRange * zoomFactor;
    
    // Calculate new start/end around anchor point
    const anchorRatio = (anchorTime - viewportRef.current.start) / currentRange;
    const newStart = anchorTime - (newRange * anchorRatio);
    const newEnd = anchorTime + (newRange * (1 - anchorRatio));

    // Apply zoom
    chartInstanceRef.current.dispatchAction({
      type: 'dataZoom',
      startValue: newStart,
      endValue: newEnd,
    });
  };

  // Update chart data
  const updateChartData = useCallback(() => {
    if (!chartInstanceRef.current) {
      console.log('No chart instance');
      return;
    }
    
    if (dataRef.current.length === 0) {
      console.log('No data to display');
      return;
    }

    console.log('Updating chart with', dataRef.current.length, 'candles');
    
    const chartData = dataRef.current.map(candle => [
      candle.t,
      candle.o,
      candle.c,
      candle.l,
      candle.h,
    ]);
    
    console.log('Chart data sample:', chartData.slice(0, 3));

    // Update chart type based on selection
    let seriesConfig: any = {
      type: 'candlestick',
      data: chartData,
      itemStyle: {
        color: '#26a69a',
        color0: '#ef5350',
        borderColor: '#26a69a',
        borderColor0: '#ef5350',
      },
    };

    if (chartType === 'line') {
      seriesConfig = {
        type: 'line',
        data: dataRef.current.map(candle => [candle.t, candle.c]),
        lineStyle: { color: '#3b82f6', width: 2 },
        symbol: 'none',
      };
    } else if (chartType === 'area') {
      seriesConfig = {
        type: 'line',
        data: dataRef.current.map(candle => [candle.t, candle.c]),
        lineStyle: { color: '#3b82f6', width: 2 },
        areaStyle: { color: 'rgba(59, 130, 246, 0.3)' },
        symbol: 'none',
      };
    } else if (chartType === 'bars') {
      // Use candlestick but with thin lines for OHLC bars
      seriesConfig = {
        type: 'candlestick',
        data: chartData,
        itemStyle: {
          color: 'transparent',
          color0: 'transparent',
          borderColor: '#26a69a',
          borderColor0: '#ef5350',
          borderWidth: 1,
        },
      };
    }

    chartInstanceRef.current.setOption({
      title: {
        text: `${exchange} - ${symbol} - ${interval}`,
        left: 20,
        top: 10,
        textStyle: { color: '#ffffff', fontSize: 16 }
      },
      series: [seriesConfig]
    }, { 
      notMerge: true, 
      replaceMerge: ['series'],
      lazyUpdate: true 
    });

  }, [symbol, interval, chartType, exchange]);

  // Track viewport changes
  const handleDataZoom = useCallback((params: any) => {
    if (params.batch) {
      const dataZoomInfo = params.batch[0];
      if (dataZoomInfo && dataZoomInfo.startValue !== undefined && dataZoomInfo.endValue !== undefined) {
        viewportRef.current = {
          start: dataZoomInfo.startValue,
          end: dataZoomInfo.endValue
        };
      }
    }
  }, []);


  // Update chart when type or zoom changes
  useEffect(() => {
    updateChartData();
  }, [chartType, zoom, updateChartData]);

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: '100%',
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'center center',
        cursor: 'grab'
      }}
    />
  );
};

export default StudioChart;

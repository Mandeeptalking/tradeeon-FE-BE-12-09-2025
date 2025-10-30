import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { IndicatorEngine } from '../lib/indicator_engine';

/**
 * Professional Canvas Chart for Dashboard
 * Features: Symbol search, timeframe selection, 1000 candles, proper axes
 * Based on the working CandlestickChart component
 */

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const CanvasChart: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Canvas refs and state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 600 });
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [pan, setPan] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastPan, setLastPan] = useState(0);
  const [indicators, setIndicators] = useState<Array<{
    id: string;
    type: 'rsi' | 'macd' | 'volume' | 'sma' | 'ema';
    period: number;
    color: string;
    data: number[];
  }>>([]);
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);

  // Popular symbols for quick selection
  const popularSymbols = [
    'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT', 
    'SOLUSDT', 'DOTUSDT', 'LINKUSDT', 'LTCUSDT', 'AVAXUSDT'
  ];

  // Timeframe options
  const timeframes = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' },
  ];

  // Use indicator engine for calculations
  const indicatorEngine = useRef<IndicatorEngine | null>(null);
  
  // Initialize indicator engine when data changes
  useEffect(() => {
    if (candles.length > 0) {
      // Create a mock chart object for the engine
      const mockChart = {
        addSeries: () => ({ setData: () => {}, applyOptions: () => {} }),
        addPane: () => ({ setHeight: () => {} }),
        panes: () => [],
        removeSeries: () => {},
        removePane: () => {}
      };
      
      indicatorEngine.current = new IndicatorEngine({
        chart: mockChart as any,
        data: candles.map(c => ({
          time: c.timestamp / 1000,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        })),
        onIndicatorUpdate: () => {}
      });
    }
  }, [candles]);

  // Helper function to get indicator data from engine
  const getIndicatorData = (type: 'sma' | 'ema' | 'rsi', period: number): number[] => {
    if (!indicatorEngine.current) return [];
    
    // For now, return empty array - the engine will handle calculations
    // This is a placeholder - in a real implementation, you'd call the engine methods
    return [];
  };

  const calculateVolume = (candles: Candle[]): number[] => {
    return candles.map(c => c.volume);
  };

  // Add indicator function
  const addIndicator = (type: 'rsi' | 'macd' | 'volume' | 'sma' | 'ema', period: number = 14) => {
    if (candles.length === 0) return;

    let data: number[] = [];
    let color = '#26a69a';

    switch (type) {
      case 'sma':
        data = getIndicatorData('sma', period);
        color = '#ff6b6b';
        break;
      case 'ema':
        data = getIndicatorData('ema', period);
        color = '#4ecdc4';
        break;
      case 'rsi':
        data = getIndicatorData('rsi', period);
        color = '#45b7d1';
        break;
      case 'volume':
        data = calculateVolume(candles);
        color = '#96ceb4';
        break;
    }

    const newIndicator = {
      id: `${type}_${Date.now()}`,
      type,
      period,
      color,
      data
    };

    setIndicators(prev => [...prev, newIndicator]);
  };

  // Remove indicator function
  const removeIndicator = (id: string) => {
    setIndicators(prev => prev.filter(ind => ind.id !== id));
  };

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: Math.max(height, 400) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Load historical data from Binance (1000 candles)
  const loadHistoricalData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Loading data for ${symbol} with timeframe ${timeframe}`);
      
      const limit = 1000;
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw API response:', data.slice(0, 3));
      
      const formattedCandles: Candle[] = data.map((kline: any[]) => ({
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
      
      console.log('Formatted candles sample:', formattedCandles.slice(0, 3));
      setCandles(formattedCandles);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(`Failed to load data: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

  // Connect to WebSocket for live data
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${timeframe}`);
    
    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const kline = data.k;
      
      const newCandle: Candle = {
        timestamp: kline.t,
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v),
      };
      
      setCandles(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        
        if (lastIndex >= 0 && updated[lastIndex].timestamp === newCandle.timestamp) {
          updated[lastIndex] = newCandle;
        } else {
          updated.push(newCandle);
          if (updated.length > 1000) {
            updated.shift();
          }
        }
        
        return updated;
      });
    };
    
    ws.onerror = (err) => {
      setError(`WebSocket error: ${err}`);
      setIsConnected(false);
    };
    
    ws.onclose = () => {
      setIsConnected(false);
    };
    
    wsRef.current = ws;
  }, [symbol, timeframe]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Load data on mount and when symbol/timeframe changes
  useEffect(() => {
    loadHistoricalData();
  }, [loadHistoricalData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // Draw candlestick chart with multiple panes
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    
    // Only resize canvas if dimensions changed
    if (canvas.width !== width * window.devicePixelRatio || canvas.height !== height * window.devicePixelRatio) {
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate pane heights
    const totalPanes = 1 + indicators.length; // Main chart + indicator panes
    const paneHeight = height / totalPanes;
    const mainPaneHeight = paneHeight;
    const indicatorPaneHeight = paneHeight;

    // Draw main chart pane
    drawMainChart(ctx, width, mainPaneHeight, 0);
    
    // Draw indicator panes
    indicators.forEach((indicator, index) => {
      const paneY = mainPaneHeight + (index * indicatorPaneHeight);
      drawIndicatorPane(ctx, width, indicatorPaneHeight, paneY, indicator);
    });
  }, [candles, dimensions, hoveredCandle, crosshair, pan, zoom, indicators]);

  // Draw main chart pane
  const drawMainChart = (ctx: CanvasRenderingContext2D, width: number, height: number, yOffset: number) => {
    // Chart area - Y-axis on right side, X-axis at bottom
    const padding = { top: 20, right: 80, bottom: 80, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate price range
    const prices = candles.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.1;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, yOffset, width, height);

    // Draw grid like Lightweight Charts (simple clean grid)
    // Horizontal grid lines (price levels)
    ctx.strokeStyle = '#e5e7eb'; // Light gray like Lightweight Charts
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    for (let i = 0; i <= 5; i++) {
      const y = yOffset + padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical grid lines (time intervals)
    // Calculate visible candles based on zoom and pan (Lightweight Charts behavior)
    const baseCandleWidth = 8; // Base width per candle
    const zoomedCandleWidth = baseCandleWidth / zoom;
    const visibleCandles = Math.min(candles.length, Math.floor(chartWidth / zoomedCandleWidth));
    const panOffset = Math.floor(pan / zoomedCandleWidth);
    const startIndex = Math.max(0, candles.length - visibleCandles - panOffset);
    const endIndex = Math.min(candles.length, startIndex + visibleCandles);

    // Vertical grid lines (time intervals) - simple like Lightweight Charts
    ctx.strokeStyle = '#e5e7eb'; // Same light gray as horizontal lines
    ctx.lineWidth = 1;
    
    for (let i = startIndex; i < endIndex; i += 5) {
      const x = padding.left + ((i - startIndex) * chartWidth) / visibleCandles;
      ctx.beginPath();
      ctx.moveTo(x, yOffset + padding.top);
      ctx.lineTo(x, yOffset + height - padding.bottom);
      ctx.stroke();
    }

    // Draw candlesticks with zoom-aware spacing
    const candleWidth = Math.max(2, zoomedCandleWidth * 0.8);
    const candleSpacing = zoomedCandleWidth;

    for (let i = startIndex; i < endIndex; i++) {
      const candle = candles[i];
      const x = padding.left + (i - startIndex) * candleSpacing + candleSpacing / 2;

      // Calculate candle positions
      const openY = yOffset + padding.top + chartHeight - ((candle.open - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * chartHeight;
      const closeY = yOffset + padding.top + chartHeight - ((candle.close - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * chartHeight;
      const highY = yOffset + padding.top + chartHeight - ((candle.high - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * chartHeight;
      const lowY = yOffset + padding.top + chartHeight - ((candle.low - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * chartHeight;

      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#26a69a' : '#ef5350';

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      const bodyHeight = Math.abs(closeY - openY);
      const bodyY = Math.min(openY, closeY);

      if (isGreen) {
        ctx.fillStyle = '#26a69a';
        ctx.strokeStyle = '#26a69a';
      } else {
        ctx.fillStyle = '#ef5350';
        ctx.strokeStyle = '#ef5350';
      }

      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, Math.max(1, bodyHeight));
      ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, Math.max(1, bodyHeight));

      // Highlight hovered candle
      if (hoveredCandle === i) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - candleWidth / 2 - 2, bodyY - 2, candleWidth + 4, Math.max(1, bodyHeight) + 4);
      }
    }

    // Draw price labels on right side (Lightweight Charts style)
    ctx.fillStyle = '#131722'; // Darker text like Lightweight Charts
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (priceRange / 5) * i;
      const y = yOffset + padding.top + (chartHeight / 5) * i;
      
      // Format price with full amount
      let priceText;
      if (price >= 1) {
        priceText = `$${price.toFixed(2)}`;
      } else {
        priceText = `$${price.toFixed(4)}`;
      }
      
      ctx.fillText(priceText, width - padding.right + 10, y + 4);
    }

    // Draw time labels on bottom (X-axis)
    ctx.fillStyle = '#131722'; // Darker text like Lightweight Charts
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    
    // Show time labels for every 5th candle to avoid overcrowding
    for (let i = startIndex; i < endIndex; i += 5) {
      if (i < candles.length) {
        const x = padding.left + (i - startIndex) * candleSpacing + candleSpacing / 2;
        const time = new Date(candles[i].timestamp);
        const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ctx.fillText(timeString, x, yOffset + height - padding.bottom + 20);
      }
    }

    // Draw axis titles
    ctx.fillStyle = '#131722'; // Darker text like Lightweight Charts
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    
    // X-axis title (Time) - only on main chart
    if (yOffset === 0) {
      ctx.fillText('Time', width / 2, yOffset + height - 10);
    }
    
    // Y-axis title (Price) - only on main chart
    if (yOffset === 0) {
      ctx.save();
      ctx.translate(15, yOffset + height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Price (USDT)', 0, 0);
      ctx.restore();
    }

    // Draw crosshair
    if (crosshair) {
      ctx.strokeStyle = '#787b86'; // Lightweight Charts crosshair color
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(crosshair.x, yOffset + padding.top);
      ctx.lineTo(crosshair.x, yOffset + height - padding.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, crosshair.y);
      ctx.lineTo(width - padding.right, crosshair.y);
      ctx.stroke();

      ctx.setLineDash([]);
    }

  };

  // Draw indicator pane
  const drawIndicatorPane = (ctx: CanvasRenderingContext2D, width: number, height: number, yOffset: number, indicator: any) => {
    const padding = { top: 20, right: 80, bottom: 40, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, yOffset, width, height);

    // Draw border between panes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yOffset);
    ctx.lineTo(width, yOffset);
    ctx.stroke();

    // Calculate visible candles
    const baseCandleWidth = 8;
    const zoomedCandleWidth = baseCandleWidth / zoom;
    const visibleCandles = Math.min(candles.length, Math.floor(chartWidth / zoomedCandleWidth));
    const panOffset = Math.floor(pan / zoomedCandleWidth);
    const startIndex = Math.max(0, candles.length - visibleCandles - panOffset);
    const endIndex = Math.min(candles.length, startIndex + visibleCandles);

    // Calculate data range
    const visibleData = indicator.data.slice(startIndex, endIndex).filter(d => !isNaN(d));
    if (visibleData.length === 0) return;

    const minValue = Math.min(...visibleData);
    const maxValue = Math.max(...visibleData);
    const valueRange = maxValue - minValue;
    const valuePadding = valueRange * 0.1;

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 3; i++) {
      const y = yOffset + padding.top + (chartHeight / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = startIndex; i < endIndex; i += 5) {
      const x = padding.left + ((i - startIndex) * chartWidth) / visibleCandles;
      ctx.beginPath();
      ctx.moveTo(x, yOffset + padding.top);
      ctx.lineTo(x, yOffset + height - padding.bottom);
      ctx.stroke();
    }

    // Draw indicator line
    ctx.strokeStyle = indicator.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    let firstPoint = true;
    for (let i = startIndex; i < endIndex; i++) {
      if (i < indicator.data.length && !isNaN(indicator.data[i])) {
        const x = padding.left + ((i - startIndex) * chartWidth) / visibleCandles;
        const y = yOffset + padding.top + chartHeight - ((indicator.data[i] - minValue + valuePadding) / (valueRange + valuePadding * 2)) * chartHeight;
        
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // Draw Y-axis labels
    ctx.fillStyle = '#131722';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    
    for (let i = 0; i <= 3; i++) {
      const value = maxValue - (valueRange / 3) * i;
      const y = yOffset + padding.top + (chartHeight / 3) * i;
      
      let valueText;
      if (indicator.type === 'rsi') {
        valueText = value.toFixed(0);
      } else if (value >= 1000) {
        valueText = (value / 1000).toFixed(1) + 'K';
      } else {
        valueText = value.toFixed(2);
      }
      
      ctx.fillText(valueText, width - padding.right + 10, y + 4);
    }

    // Draw indicator title
    ctx.fillStyle = '#131722';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${indicator.type.toUpperCase()}(${indicator.period})`, padding.left + 10, yOffset + 20);
  };

  // Redraw chart when data or dimensions change
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Mouse event handlers with Lightweight Charts behavior
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCrosshair({ x, y });

    // Handle dragging for panning
    if (isDragging) {
      const deltaX = x - lastMouseX;
      const newPan = lastPan + deltaX;
      setPan(Math.max(0, newPan)); // Prevent panning to negative values
      return;
    }

    // Find hovered candle with zoom-aware calculation
    const padding = { top: 20, right: 80, bottom: 80, left: 20 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const baseCandleWidth = 8;
    const zoomedCandleWidth = baseCandleWidth / zoom;
    const visibleCandles = Math.min(candles.length, Math.floor(chartWidth / zoomedCandleWidth));
    const panOffset = Math.floor(pan / zoomedCandleWidth);
    const startIndex = Math.max(0, candles.length - visibleCandles - panOffset);
    const candleSpacing = zoomedCandleWidth;

    const candleIndex = Math.floor((x - padding.left) / candleSpacing) + startIndex;
    
    if (candleIndex >= startIndex && candleIndex < startIndex + visibleCandles && candleIndex < candles.length) {
      setHoveredCandle(candleIndex);
    } else {
      setHoveredCandle(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    setIsDragging(true);
    setLastMouseX(x);
    setLastPan(pan);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setCrosshair(null);
    setHoveredCandle(null);
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Get mouse position for zoom center
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // Calculate zoom factor (similar to Lightweight Charts)
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor));
    
    // Adjust pan to zoom towards mouse position
    const padding = { top: 20, right: 80, bottom: 80, left: 20 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const zoomCenter = (mouseX - padding.left) / chartWidth;
    const zoomRatio = newZoom / zoom;
    
    const newPan = pan + (mouseX - padding.left) * (1 - zoomRatio);
    
    setZoom(newZoom);
    setPan(Math.max(0, newPan));
  };

  // Filter symbols based on search query
  const filteredSymbols = popularSymbols.filter(sym => 
    sym.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Sleek Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-bold text-gray-900">Canvas Chart</h1>
              
              {/* Symbol Search */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search symbol..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>
                
                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {filteredSymbols.map((sym) => (
                      <button
                        key={sym}
                        onClick={() => {
                          setSymbol(sym);
                          setSearchQuery(sym);
                          setShowSearchResults(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span>{sym}</span>
                        {sym === symbol && <span className="text-blue-500">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeframe Selection */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Timeframe:</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {timeframes.map((tf) => (
                    <option key={tf.value} value={tf.value}>
                      {tf.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm text-gray-700">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={isConnected ? disconnectWebSocket : connectWebSocket}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isConnected
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </button>
                <button
                  onClick={loadHistoricalData}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => {
                    setZoom(1);
                    setPan(0);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center space-x-2"
                >
                  <span>Reset View</span>
                </button>
                <button
                  onClick={() => setShowIndicatorModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center space-x-2"
                >
                  <span>Add Indicator</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Chart Info Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{symbol}</h2>
            <p className="text-sm text-gray-500">
              {candles.length} candles • {timeframes.find(tf => tf.value === timeframe)?.label}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Last Price</p>
            <p className="text-xl font-bold text-gray-900">
              {candles.length > 0 ? (
                (() => {
                  const price = candles[candles.length - 1].close;
                  if (price >= 1) {
                    return '$' + price.toFixed(2);
                  } else {
                    return '$' + price.toFixed(4);
                  }
                })()
              ) : '$0.00'}
            </p>
            {candles.length > 0 && (
              <div className="text-xs text-gray-500">
                <p>Range: ${Math.min(...candles.map(c => c.low)).toFixed(2)} - ${Math.max(...candles.map(c => c.high)).toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Area - Directly below header */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="relative h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-gray-500">Loading chart data...</p>
              </div>
            </div>
          ) : candles.length > 0 ? (
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full cursor-crosshair"
                      style={{ height: '100%' }}
                      onMouseMove={handleMouseMove}
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseLeave}
                      onWheel={handleWheel}
                    />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500">No data available</p>
                <button 
                  onClick={loadHistoricalData}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Load Data
                </button>
              </div>
            </div>
          )}

          {/* Hover Info */}
          {hoveredCandle !== null && candles[hoveredCandle] && (
            <div className="absolute top-4 left-4 bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm z-10">
              <div className="text-white font-semibold mb-2">
                {new Date(candles[hoveredCandle].timestamp).toLocaleString()}
              </div>
              <div className="space-y-1 text-gray-300">
                <div>Open: <span className="text-white">${candles[hoveredCandle].open.toFixed(2)}</span></div>
                <div>High: <span className="text-green-400">${candles[hoveredCandle].high.toFixed(2)}</span></div>
                <div>Low: <span className="text-red-400">${candles[hoveredCandle].low.toFixed(2)}</span></div>
                <div>Close: <span className="text-white">${candles[hoveredCandle].close.toFixed(2)}</span></div>
                <div>Volume: <span className="text-blue-400">{candles[hoveredCandle].volume.toLocaleString()}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close search results */}
      {showSearchResults && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSearchResults(false)}
        />
      )}

      {/* Indicator Modal */}
      {showIndicatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Indicator</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Indicator Type</label>
                <select 
                  id="indicatorType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="rsi">RSI (Relative Strength Index)</option>
                  <option value="sma">SMA (Simple Moving Average)</option>
                  <option value="ema">EMA (Exponential Moving Average)</option>
                  <option value="volume">Volume</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                <input
                  type="number"
                  id="indicatorPeriod"
                  defaultValue={14}
                  min={1}
                  max={200}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowIndicatorModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const type = (document.getElementById('indicatorType') as HTMLSelectElement)?.value as 'rsi' | 'sma' | 'ema' | 'volume';
                  const period = parseInt((document.getElementById('indicatorPeriod') as HTMLInputElement)?.value || '14');
                  addIndicator(type, period);
                  setShowIndicatorModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Indicator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Indicators */}
      {indicators.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Active Indicators:</span>
            {indicators.map((indicator) => (
              <div key={indicator.id} className="flex items-center space-x-2 bg-gray-100 rounded-md px-3 py-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: indicator.color }}
                ></div>
                <span className="text-sm text-gray-700">
                  {indicator.type.toUpperCase()}({indicator.period})
                </span>
                <button
                  onClick={() => removeIndicator(indicator.id)}
                  className="text-gray-400 hover:text-red-500 text-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasChart;
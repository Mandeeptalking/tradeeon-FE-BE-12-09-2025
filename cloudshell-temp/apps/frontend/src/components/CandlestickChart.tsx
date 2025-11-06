import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Move, 
  Crosshair,
  Settings,
  Fullscreen,
  Download
} from 'lucide-react';

interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  symbol: string;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onSymbolChange: (symbol: string) => void;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  symbol,
  timeframe,
  onTimeframeChange,
  onSymbolChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  // const [zoom] = useState(1);
  const [pan] = useState(0);

  const symbols = [
    { value: 'BTCUSDT', label: 'BTC/USDT', name: 'Bitcoin' },
    { value: 'ETHUSDT', label: 'ETH/USDT', name: 'Ethereum' },
    { value: 'ADAUSDT', label: 'ADA/USDT', name: 'Cardano' },
    { value: 'SOLUSDT', label: 'SOL/USDT', name: 'Solana' },
    { value: 'BNBUSDT', label: 'BNB/USDT', name: 'Binance Coin' },
    { value: 'XRPUSDT', label: 'XRP/USDT', name: 'Ripple' },
    { value: 'DOTUSDT', label: 'DOT/USDT', name: 'Polkadot' },
    { value: 'LINKUSDT', label: 'LINK/USDT', name: 'Chainlink' },
  ];

  const timeframes = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' },
    { value: '1w', label: '1w' },
  ];

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width - 40, height: 400 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Draw candlestick chart
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

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

    // Chart area
    const padding = { top: 20, right: 20, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate price range
    const prices = data.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.1;

    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const visibleCandles = Math.min(data.length, Math.floor(chartWidth / 8));
    const startIndex = Math.max(0, data.length - visibleCandles + Math.floor(pan / 8));
    const endIndex = Math.min(data.length, startIndex + visibleCandles);

    for (let i = startIndex; i < endIndex; i++) {
      const x = padding.left + ((i - startIndex) * chartWidth) / visibleCandles;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    // Draw candlesticks
    const candleWidth = Math.max(2, chartWidth / visibleCandles * 0.8);
    const candleSpacing = chartWidth / visibleCandles;

    for (let i = startIndex; i < endIndex; i++) {
      const candle = data[i];
      const x = padding.left + (i - startIndex) * candleSpacing + candleSpacing / 2;

      // Calculate candle positions
      const openY = padding.top + chartHeight - ((candle.open - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * chartHeight;
      const closeY = padding.top + chartHeight - ((candle.close - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * chartHeight;
      const highY = padding.top + chartHeight - ((candle.high - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * chartHeight;
      const lowY = padding.top + chartHeight - ((candle.low - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * chartHeight;

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

    // Draw price labels
    ctx.fillStyle = '#888';
    ctx.font = '12px Inter';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (priceRange / 5) * i;
      const y = padding.top + (chartHeight / 5) * i;
      ctx.fillText(`$${price.toLocaleString()}`, padding.left - 10, y + 4);
    }

    // Draw crosshair
    if (crosshair) {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(crosshair.x, padding.top);
      ctx.lineTo(crosshair.x, height - padding.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, crosshair.y);
      ctx.lineTo(width - padding.right, crosshair.y);
      ctx.stroke();

      ctx.setLineDash([]);
    }

  }, [data, dimensions, hoveredCandle, crosshair, pan]);

  // Mouse event handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCrosshair({ x, y });

    // Find hovered candle
    const padding = { left: 80 };
    const chartWidth = dimensions.width - padding.left - 20;
    const visibleCandles = Math.min(data.length, Math.floor(chartWidth / 8));
    const candleSpacing = chartWidth / visibleCandles;
    const candleIndex = Math.floor((x - padding.left) / candleSpacing);
    
    if (candleIndex >= 0 && candleIndex < data.length) {
      setHoveredCandle(candleIndex);
    } else {
      setHoveredCandle(null);
    }
  };

  const handleMouseLeave = () => {
    setCrosshair(null);
    setHoveredCandle(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    // const delta = e.deltaY > 0 ? 0.9 : 1.1;
    // setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)));
  };

  // Redraw chart when data or dimensions change
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Force chart redraw when data changes
  const [chartKey, setChartKey] = useState(0);
  
  useEffect(() => {
    if (data.length > 0) {
      setChartKey(prev => prev + 1);
    }
  }, [data.length, data[data.length - 1]?.close]);

  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const priceChange = data.length > 1 ? currentPrice - data[data.length - 2].close : 0;
  const priceChangePercent = data.length > 1 ? (priceChange / data[data.length - 2].close) * 100 : 0;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          {/* Symbol and Price */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <select
                value={symbol}
                onChange={(e) => onSymbolChange(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm font-semibold"
              >
                {symbols.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-2xl font-bold text-white">
              ${currentPrice.toLocaleString()}
            </div>
            <div className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Timeframe Selector */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              {timeframes.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => onTimeframeChange(tf.value)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    timeframe === tf.value 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Chart Controls */}
            <div className="flex items-center space-x-1">
              <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <ZoomOut className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <Move className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <Crosshair className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <Settings className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <Fullscreen className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="relative">
        <canvas
          key={chartKey}
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ height: dimensions.height }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        />

        {/* Hover Info */}
        {hoveredCandle !== null && data[hoveredCandle] && (
          <div className="absolute top-4 left-4 bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm">
            <div className="text-white font-semibold mb-2">
              {new Date(data[hoveredCandle].timestamp).toLocaleString()}
            </div>
            <div className="space-y-1 text-gray-300">
              <div>Open: <span className="text-white">${data[hoveredCandle].open.toFixed(2)}</span></div>
              <div>High: <span className="text-green-400">${data[hoveredCandle].high.toFixed(2)}</span></div>
              <div>Low: <span className="text-red-400">${data[hoveredCandle].low.toFixed(2)}</span></div>
              <div>Close: <span className="text-white">${data[hoveredCandle].close.toFixed(2)}</span></div>
              <div>Volume: <span className="text-blue-400">{data[hoveredCandle].volume.toLocaleString()}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandlestickChart;

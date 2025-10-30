import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IndicatorEngine } from '../lib/indicator_engine';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  CandlestickController,
  CandlestickElement
);

/**
 * Canvas Chart with Lightweight Charts-like Candlesticks
 * Mimics the look and behavior of Lightweight Charts using chartjs-chart-financial
 */

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const CanvasChartWithIndicators: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1m');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [showEMA, setShowEMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Load historical data from Binance
  const loadHistoricalData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=100`
      );
      const data = await response.json();
      
      const formattedCandles: Candle[] = data.map((kline: any[]) => ({
        time: new Date(kline[0]).toLocaleTimeString(),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
      
      setCandles(formattedCandles);
    } catch (err) {
      setError(`Failed to load data: ${err}`);
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
        time: new Date(kline.t).toLocaleTimeString(),
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v),
      };
      
      setCandles(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        
        if (lastIndex >= 0 && updated[lastIndex].time === newCandle.time) {
          // Update existing candle
          updated[lastIndex] = newCandle;
        } else {
          // Add new candle
          updated.push(newCandle);
          if (updated.length > 100) {
            updated.shift(); // Keep only last 100 candles
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

  // Calculate EMA
  const calculateEMA = (prices: number[], period: number): number[] => {
    if (prices.length < period) return new Array(prices.length).fill(NaN);
    
    const multiplier = 2 / (period + 1);
    const ema = new Array(prices.length).fill(NaN);
    
    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema[period - 1] = sum / period;
    
    // Calculate EMA for remaining periods
    for (let i = period; i < prices.length; i++) {
      ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    
    return ema;
  };

  // Calculate RSI
  const calculateRSI = (prices: number[], period: number = 14): number[] => {
    if (prices.length < period + 1) return new Array(prices.length).fill(NaN);
    
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }
    
    const rsi = new Array(prices.length).fill(NaN);
    
    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      rsi[period] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[period] = 100 - (100 / (1 + rs));
    }
    
    // Calculate RSI for remaining periods
    for (let i = period + 1; i < prices.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i - 1]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i - 1]) / period;
      
      if (avgLoss === 0) {
        rsi[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi[i] = 100 - (100 / (1 + rs));
      }
    }
    
    return rsi;
  };

  // Calculate MACD
  const calculateMACD = (prices: number[]): { macd: number[], signal: number[], histogram: number[] } => {
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    
    const macd = ema12.map((val, i) => val - ema26[i]);
    const signal = calculateEMA(macd, 9);
    const histogram = macd.map((val, i) => val - signal[i]);
    
    return { macd, signal, histogram };
  };

  // Prepare candlestick chart data
  const prepareCandlestickData = (): ChartData<'candlestick'> => {
    const labels = candles.map(candle => candle.time);
    
    // Convert to financial chart format
    const candlestickData = candles.map(candle => ({
      x: candle.time,
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close,
    }));

    const datasets: any[] = [
      {
        label: 'Price',
        data: candlestickData,
        type: 'candlestick',
        yAxisID: 'y',
      }
    ];

    // Add EMA if enabled
    if (showEMA && candles.length > 0) {
      const closePrices = candles.map(candle => candle.close);
      const ema20 = calculateEMA(closePrices, 20);
      
      datasets.push({
        label: 'EMA(20)',
        data: ema20.map((value, index) => ({
          x: candles[index].time,
          y: value
        })),
        borderColor: '#9c27b0',
        backgroundColor: 'transparent',
        borderWidth: 2,
        yAxisID: 'y',
        type: 'line',
        tension: 0.1,
      });
    }

    return {
      labels,
      datasets,
    };
  };

  // Prepare RSI chart data
  const prepareRSIData = (): ChartData<'line'> => {
    const labels = candles.map(candle => candle.time);
    const closePrices = candles.map(candle => candle.close);
    const rsi = calculateRSI(closePrices, 14);

    return {
      labels,
      datasets: [
        {
          label: 'RSI',
          data: rsi,
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          tension: 0.1,
          yAxisID: 'y',
        },
        {
          label: 'Overbought (70)',
          data: new Array(rsi.length).fill(70),
          borderColor: '#f44336',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          yAxisID: 'y',
        },
        {
          label: 'Oversold (30)',
          data: new Array(rsi.length).fill(30),
          borderColor: '#4caf50',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          yAxisID: 'y',
        },
      ],
    };
  };

  // Prepare MACD chart data
  const prepareMACDData = (): ChartData<'line' | 'bar'> => {
    const labels = candles.map(candle => candle.time);
    const closePrices = candles.map(candle => candle.close);
    const { macd, signal, histogram } = calculateMACD(closePrices);

    return {
      labels,
      datasets: [
        {
          label: 'MACD',
          data: macd,
          borderColor: '#2196f3',
          backgroundColor: 'transparent',
          tension: 0.1,
          yAxisID: 'y',
        },
        {
          label: 'Signal',
          data: signal,
          borderColor: '#ff9800',
          backgroundColor: 'transparent',
          tension: 0.1,
          yAxisID: 'y',
        },
        {
          label: 'Histogram',
          data: histogram,
          backgroundColor: histogram.map(val => val >= 0 ? '#4caf50' : '#f44336'),
          borderColor: histogram.map(val => val >= 0 ? '#4caf50' : '#f44336'),
          yAxisID: 'y',
          type: 'bar',
        },
      ],
    };
  };

  // Chart options for candlestick
  const candlestickOptions: ChartOptions<'candlestick'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Price',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${symbol} - ${timeframe} (Candlestick)`,
      },
    },
  };

  // RSI chart options
  const rsiOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'RSI',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'RSI (14)',
      },
    },
  };

  // MACD chart options
  const macdOptions: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'MACD',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'MACD',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Canvas Chart with Lightweight Charts-like Candlesticks</h1>
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

              {/* Connection Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={isConnected ? disconnectWebSocket : connectWebSocket}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    isConnected
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </button>
                <button
                  onClick={loadHistoricalData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showEMA}
                onChange={(e) => setShowEMA(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">EMA(20)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showRSI}
                onChange={(e) => setShowRSI(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">RSI(14)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showMACD}
                onChange={(e) => setShowMACD(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">MACD</span>
            </label>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Chart Area */}
      <div className="p-6 space-y-6">
        {/* Main Candlestick Chart */}
        <div className="border border-gray-300 rounded p-4 bg-white">
          <div style={{ height: '500px' }}>
            <Bar data={prepareCandlestickData()} options={candlestickOptions} />
          </div>
        </div>

        {/* RSI Chart */}
        {showRSI && (
          <div className="border border-gray-300 rounded p-4 bg-white">
            <div style={{ height: '200px' }}>
              <Line data={prepareRSIData()} options={rsiOptions} />
            </div>
          </div>
        )}

        {/* MACD Chart */}
        {showMACD && (
          <div className="border border-gray-300 rounded p-4 bg-white">
            <div style={{ height: '200px' }}>
              <Bar data={prepareMACDData()} options={macdOptions} />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-6 py-4 bg-gray-50">
        <div className="text-sm text-gray-600">
          <p><strong>✅ Lightweight Charts-like Candlestick Chart!</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Real Candlesticks:</strong> Professional OHLC candlestick bars</li>
            <li><strong>Lightweight Charts Look:</strong> Mimics the exact appearance of Lightweight Charts</li>
            <li><strong>Bullish/Bearish Colors:</strong> Green for bullish, Red for bearish candles</li>
            <li><strong>Real Indicators:</strong> EMA, RSI, MACD calculated in JavaScript</li>
            <li><strong>Multiple Panes:</strong> Price chart + separate indicator panes</li>
            <li><strong>Live Updates:</strong> Real-time data from Binance WebSocket</li>
            <li><strong>Toggle Indicators:</strong> Check/uncheck to show/hide indicators</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CanvasChartWithIndicators;
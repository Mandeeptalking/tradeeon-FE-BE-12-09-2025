import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickData as LWCandlestickData, Time, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { 
  IndicatorEngine, 
  IndicatorSettings, 
  INDICATOR_TYPES 
} from '../lib/indicator_engine';
import { Button } from '../components/ui/button';
import { Plus, Bell, PlusCircle, Search, ChevronDown } from 'lucide-react';
import AlertBuilder from '../components/alerts/AlertBuilder';
import AlertList from '../components/alerts/AlertList';
import TriggerHistoryPanel from '../components/alerts/TriggerHistoryPanel';
import { useAlertMarkers } from '../hooks/useAlertMarkers';
import { logger } from '../utils/logger';
import { fetchSymbols, type SymbolInfo } from '../lib/binance';
import { INTERVALS, INTERVAL_LABELS } from '../lib/timeframes';

// Extend CandlestickData to include volume
interface CandlestickData extends LWCandlestickData {
  volume?: number;
}

const CleanCharts: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1m');
  const [chartData, setChartData] = useState<CandlestickData[]>([]);
  const [availableSymbols, setAvailableSymbols] = useState<SymbolInfo[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<SymbolInfo[]>([]);
  const [symbolSearchQuery, setSymbolSearchQuery] = useState('');
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [isIntervalDropdownOpen, setIsIntervalDropdownOpen] = useState(false);
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  const [useDateRange, setUseDateRange] = useState(false);
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAlertBuilder, setShowAlertBuilder] = useState(false);
  const [showAlertList, setShowAlertList] = useState(false);
  const [alertPrefill, setAlertPrefill] = useState<{indicator?: string; component?: string}>();
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorSettings | null>(null);
  const [newIndicator, setNewIndicator] = useState<Partial<IndicatorSettings>>({
    type: 'rsi',
    period: 14,
    emaLength: 9,
    color: '#7E57C2',
    emaColor: '#ff9500',
    paneIndex: 0,
    overboughtLevel: 70,
    oversoldLevel: 30,
    overboughtColor: '#787b86',
    oversoldColor: '#787b86',
    // MACD defaults
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    macdColor: '#2196f3',
    signalColor: '#f44336',
    histogramUpColor: '#4caf50',
    histogramDownColor: '#f44336',
    // CCI defaults
    cciPeriod: 20,
    cciOverboughtLevel: 100,
    cciOversoldLevel: -100,
    cciOverboughtColor: '#f44336',
    cciOversoldColor: '#4caf50',
    cciZeroColor: '#787b86',
    // MFI defaults
    mfiPeriod: 14,
    mfiOverboughtLevel: 80,
    mfiOversoldLevel: 20,
    mfiOverboughtColor: '#f44336',
    mfiOversoldColor: '#4caf50',
    mfiMiddleColor: '#787b86',
    // Donchian Width defaults
    donchianPeriod: 20,
    donchianWidthColor: '#2196f3',
    showMiddleLine: false,
    middleLineColor: '#787b86',
    // Chandelier Exit defaults
    chandelierPeriod: 22,
    atrMultiplier: 3.0,
    longExitColor: '#4caf50',
    shortExitColor: '#f44336',
    showLongExit: true,
    showShortExit: true,
    // Anchored VWAP defaults
    anchorType: 'first_bar',
    anchorIndex: 0,
    vwapColor: '#2962ff',
    showStdDev: false,
    stdDevMultiplier: 2.0,
    // Williams Vix Fix defaults
    vixFixPeriod: 22,
    vixFixBBPeriod: 20,
    vixFixBBStdDev: 2.0,
    vixFixColor: '#f44336',
    vixFixHighColor: '#ff5252',
    showVixFixBands: true,
    vixFixThreshold: 80,
    // QQE defaults
    qqeRsiPeriod: 14,
    qqeSF: 5,
    qqeWildersPeriod: 27,
    qqeFactor: 4.236,
    qqeLineColor: '#2196f3',
    qqeFastColor: '#4caf50',
    qqeSlowColor: '#f44336',
    showQqeLevels: true,
    // STC defaults
    stcFastPeriod: 23,
    stcSlowPeriod: 50,
    stcCyclePeriod: 10,
    stcD1Period: 3,
    stcD2Period: 3,
    stcColor: '#2196f3',
    stcUpperLevel: 75,
    stcLowerLevel: 25,
    showStcLevels: true,
    // Choppiness Index defaults
    choppinessPeriod: 14,
    choppinessColor: '#ff9800',
    choppinessUpperLevel: 61.8,
    choppinessLowerLevel: 38.2,
    showChoppinessLevels: true,
    // SuperTrend defaults
    supertrendPeriod: 10,
    supertrendMultiplier: 3.0,
    supertrendUpColor: '#4caf50',
    supertrendDownColor: '#f44336',
    showSupertrendSignals: true,
    supertrendBuyColor: '#4caf50',
    supertrendSellColor: '#f44336',
    // MA Ribbon Heatmap defaults
    maRibbonMaType: 'sma',
    maRibbonPeriods: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
    maRibbonUptrendColor: '#4caf50',
    maRibbonDowntrendColor: '#f44336',
    maRibbonNeutralColor: '#787b86',
    maRibbonOpacity: 0.3,
    showMaRibbonHeatmap: true,
    // Linear Regression defaults
    linregPeriod: 20,
    linregStdDevMultiplier: 2.0,
    linregBasisColor: '#2196f3',
    linregUpperBandColor: '#f44336',
    linregLowerBandColor: '#4caf50',
    showLinregBands: true,
    showLinregSlope: false,
    // Kalman Filter defaults
    kalmanProcessNoise: 0.01,
    kalmanMeasurementNoise: 0.1,
    kalmanInitialVariance: 1.0,
    kalmanSmoothingFactor: 0.1,
    showKalmanConfidence: false,
    kalmanConfidenceColor: '#787b86',
    // Range Filter defaults
    rangeFilterMethod: 'atr',
    rangeFilterPeriod: 14,
    rangeFilterMultiplier: 2.0,
    rangeFilterSmoothing: 3,
    rangeFilterUpperColor: '#4caf50',
    rangeFilterLowerColor: '#f44336',
    rangeFilterSignalColor: '#2196f3',
    showRangeFilterSignals: true,
    rangeFilterBuyColor: '#4caf50',
    rangeFilterSellColor: '#f44336',
    // HTF Trend Heat (MTF) defaults
    htfTimeframes: ['1h', '4h', '1d'],
    htfMaPeriod: 20,
    htfRsiPeriod: 14,
    htfMaType: 'ema',
    htfScoreColor: '#ff6b35',
    htfHeatmapColors: ['#ff4444', '#ffaa44', '#ffff44', '#aaff44', '#44ff44'],
    showHtfHeatmap: true,
    showHtfScore: true,
    htfScoreThreshold: 70,
    // Money Flow Pressure (MFP)-specific defaults
    mfpPeriod: 14,
    mfpColor: '#9c27b0',
    mfpOverboughtLevel: 80,
    mfpOversoldLevel: 20,
    mfpOverboughtColor: '#f44336',
    mfpOversoldColor: '#4caf50',
    mfpMiddleColor: '#787b86',
    // Volume-specific defaults
    volumeUpColor: '#4caf50',
    volumeDownColor: '#f44336',
    volumeShowMA: false,
    volumeMAPeriod: 20,
    volumeMAColor: '#2196f3',
    volumeMaType: 'sma'
  });
  
  const indicatorEngineRef = useRef<IndicatorEngine | null>(null);

  // Calculate appropriate price format based on price range
  const calculatePriceFormat = (prices: number[]): { type: 'price'; precision: number; minMove: number } => {
    if (prices.length === 0) {
      return { type: 'price', precision: 2, minMove: 0.01 };
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = (minPrice + maxPrice) / 2;

    // Determine precision and minMove based on price magnitude
    if (avgPrice >= 1000) {
      // Large prices: 2 decimal places
      return { type: 'price', precision: 2, minMove: 0.01 };
    } else if (avgPrice >= 1) {
      // Medium prices: 4 decimal places
      return { type: 'price', precision: 4, minMove: 0.0001 };
    } else if (avgPrice >= 0.01) {
      // Small prices: 6 decimal places
      return { type: 'price', precision: 6, minMove: 0.000001 };
    } else if (avgPrice >= 0.0001) {
      // Very small prices: 8 decimal places
      return { type: 'price', precision: 8, minMove: 0.00000001 };
    } else {
      // Extremely small prices (like 0.00005)
      // Calculate precision based on the first significant digit
      const absPrice = Math.abs(avgPrice);
      if (absPrice === 0) {
        return { type: 'price', precision: 8, minMove: 0.00000001 };
      }
      
      // Find the order of magnitude
      const orderOfMagnitude = Math.floor(Math.log10(absPrice));
      // Add 2 more decimal places for precision
      const precision = Math.abs(orderOfMagnitude) + 2;
      // minMove should be 10^-precision
      const minMove = Math.pow(10, -precision);
      
      // Cap precision at 12 to avoid issues
      return { 
        type: 'price', 
        precision: Math.min(precision, 12), 
        minMove: Math.max(minMove, Math.pow(10, -12))
      };
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: 'white' },
        textColor: '#131722',
      },
      grid: {
        vertLines: { color: '#e5e7eb' },
        horzLines: { color: '#e5e7eb' },
      },
      timeScale: {
        borderColor: '#e5e7eb',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
        // Will be updated dynamically based on price range
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      // Price format will be set after data is loaded
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Initialize indicator engine
    indicatorEngineRef.current = new IndicatorEngine({
      chart,
      data: chartData,
      onIndicatorUpdate: (id, updates) => {
        logger.debug('Indicator updated:', id, updates);
      }
    });

    // Load initial data
    loadHistoricalData();

    // Add resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Initial resize
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      indicatorEngineRef.current?.destroy();
      chartRef.current?.remove();
    };
  }, []);

  // Initialize with fallback symbols immediately
  useEffect(() => {
    const fallbackSymbols: SymbolInfo[] = [
      { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
      { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
      { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', status: 'TRADING' },
      { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', status: 'TRADING' },
      { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', status: 'TRADING' },
      { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT', status: 'TRADING' },
      { symbol: 'DOGEUSDT', baseAsset: 'DOGE', quoteAsset: 'USDT', status: 'TRADING' },
      { symbol: 'MATICUSDT', baseAsset: 'MATIC', quoteAsset: 'USDT', status: 'TRADING' },
      { symbol: 'DOTUSDT', baseAsset: 'DOT', quoteAsset: 'USDT', status: 'TRADING' },
      { symbol: 'LINKUSDT', baseAsset: 'LINK', quoteAsset: 'USDT', status: 'TRADING' },
    ];
    setAvailableSymbols(fallbackSymbols);
    setFilteredSymbols(fallbackSymbols);
  }, []);

  // Fetch all available symbols on mount
  useEffect(() => {
    const loadSymbols = async () => {
      setIsLoadingSymbols(true);
      try {
        console.log('Fetching symbols from Binance...');
        const symbols = await fetchSymbols();
        console.log(`Fetched ${symbols.length} symbols from Binance`);
        
        // Filter to only TRADING symbols and prefer USDT pairs
        const tradingSymbols = symbols
          .filter(s => s.status === 'TRADING')
          .sort((a, b) => {
            // Prioritize USDT pairs
            if (a.quoteAsset === 'USDT' && b.quoteAsset !== 'USDT') return -1;
            if (a.quoteAsset !== 'USDT' && b.quoteAsset === 'USDT') return 1;
            return a.symbol.localeCompare(b.symbol);
          });
        
        console.log(`Filtered to ${tradingSymbols.length} trading symbols`);
        setAvailableSymbols(tradingSymbols);
        setFilteredSymbols(tradingSymbols);
        logger.info(`Loaded ${tradingSymbols.length} trading pairs`);
      } catch (error) {
        console.error('Failed to load symbols:', error);
        logger.error('Failed to load symbols:', error);
        // Keep fallback symbols that were set initially
      } finally {
        setIsLoadingSymbols(false);
      }
    };
    loadSymbols();
  }, []);

  // Filter symbols based on search query
  useEffect(() => {
    if (!symbolSearchQuery.trim()) {
      setFilteredSymbols(availableSymbols);
    } else {
      const query = symbolSearchQuery.toLowerCase();
      const filtered = availableSymbols.filter(s =>
        s.symbol.toLowerCase().includes(query) ||
        s.baseAsset.toLowerCase().includes(query) ||
        s.quoteAsset.toLowerCase().includes(query)
      );
      setFilteredSymbols(filtered);
    }
  }, [symbolSearchQuery, availableSymbols]);

  // Update indicator engine when data changes
  useEffect(() => {
    if (indicatorEngineRef.current && chartData.length > 0) {
      indicatorEngineRef.current.updateData(chartData);
    }
  }, [chartData]);

  // Load data on mount
  useEffect(() => {
    loadHistoricalData();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Handle symbol/interval changes
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Only auto-load if not using date range
    if (!useDateRange) {
      loadHistoricalData();
    }
  }, [symbol, interval, useDateRange]);

  // Start WebSocket after data is loaded
  useEffect(() => {
    if (chartData.length > 0 && !wsRef.current) {
      startLiveData();
    }
  }, [chartData]);

  // Fetch historical data with date range
  const fetchHistoricalDataWithRange = async (
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number
  ): Promise<CandlestickData[]> => {
    const allData: CandlestickData[] = [];
    const limit = 1000; // Binance max per request
    let currentEndTime = endTime || Date.now();
    
    try {
      setIsLoadingHistorical(true);
      
      while (true) {
        const params = new URLSearchParams({
          symbol,
          interval,
          limit: limit.toString(),
        });
        
        if (currentEndTime) {
          params.append('endTime', currentEndTime.toString());
        }
        
        if (startTime) {
          params.append('startTime', startTime.toString());
        }
        
        // Fetch from Binance Public API
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?${params.toString()}`
        );
        
        if (!response.ok) {
          logger.error(`Binance API error: ${response.status} ${response.statusText}`);
          break;
        }
        
        const data = await response.json();
        if (data.length === 0) break;
        
        const formattedData = data.map((kline: any[]) => ({
          time: (kline[0] / 1000) as Time,
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5] || 0),
        }));
        
        allData.unshift(...formattedData); // Add to beginning (oldest first)
        
        // Check if we've reached the start time
        if (startTime && formattedData[0].time * 1000 <= startTime) {
          // Filter to only include data within range
          const filtered = allData.filter(c => 
            c.time * 1000 >= startTime && c.time * 1000 <= (endTime || Date.now())
          );
          return filtered;
        }
        
        // Update endTime for next batch (go back in time)
        currentEndTime = data[0][0] - 1;
        
        // Rate limiting - wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Filter final data if we have a start time
      if (startTime) {
        return allData.filter(c => 
          c.time * 1000 >= startTime && c.time * 1000 <= (endTime || Date.now())
        );
      }
      
      return allData;
    } catch (error) {
      logger.error('Failed to fetch historical data with range:', error);
      throw error;
    } finally {
      setIsLoadingHistorical(false);
    }
  };

  // Load historical data
  const loadHistoricalData = async () => {
    try {
      let formattedData: CandlestickData[];
      
      if (useDateRange && startDate && endDate) {
        // Use date range
        const startTime = new Date(startDate).getTime();
        const endTime = new Date(endDate).getTime();
        formattedData = await fetchHistoricalDataWithRange(symbol, interval, startTime, endTime);
      } else {
        // Use recent data (default behavior) - Data source: Binance Public API
        // API endpoint: https://api.binance.com/api/v3/klines
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch data from Binance API: ${response.statusText}`);
        }
        const data = await response.json();
        
        formattedData = data.map((kline: any[]) => ({
          time: (kline[0] / 1000) as Time,
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5] || 0),
        }));
      }

      setChartData(formattedData);
      
      // Calculate and apply appropriate price format based on price range
      if (formattedData.length > 0 && seriesRef.current && chartRef.current) {
        // Extract all prices (open, high, low, close) to determine range
        const allPrices = formattedData.flatMap(candle => [
          candle.open,
          candle.high,
          candle.low,
          candle.close
        ]);
        
        const priceFormat = calculatePriceFormat(allPrices);
        
        // Update candlestick series price format
        seriesRef.current.applyOptions({
          priceFormat: priceFormat
        });
        
        // Update right price scale format and ensure time scale is visible
        chartRef.current.applyOptions({
          rightPriceScale: {
            borderColor: '#e5e7eb',
            ...priceFormat
          },
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: '#e5e7eb',
          }
        });
        
        // Set the data
        seriesRef.current.setData(formattedData);
      } else if (seriesRef.current) {
        seriesRef.current.setData(formattedData);
        // Ensure time scale is visible even if chart options weren't updated
        if (chartRef.current) {
          chartRef.current.applyOptions({
            timeScale: {
              timeVisible: true,
              secondsVisible: false,
              borderColor: '#e5e7eb',
            }
          });
        }
      }
    } catch (err) {
      logger.error('Failed to load historical data:', err);
    }
  };

  // Start live data stream
  const startLiveData = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      return;
    }

    logger.debug(`🔄 Connecting to Binance WebSocket for ${symbol} ${interval}...`);
    
    // Connect to Binance WebSocket directly for live updates
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);
    wsRef.current = ws;

    ws.onopen = () => {
      logger.debug('✅ WebSocket connected to Binance');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const k = data.k;
        
        if (!k) return;
        
        const candle: CandlestickData = {
          time: Math.floor(k.t / 1000) as Time,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v || 0),
        };

        // Update candlestick series
        if (seriesRef.current) {
          seriesRef.current.update(candle);
        }

        // Update chart data state
        setChartData(prevData => {
          const newData = [...prevData];
          const existingIndex = newData.findIndex(d => d.time === candle.time);
          
          if (existingIndex >= 0) {
            // Update existing candle
            newData[existingIndex] = candle;
          } else {
            // Add new candle
            newData.push(candle);
            // Keep only last 1000 candles
            if (newData.length > 1000) {
              newData.shift();
            }
          }
          
          // Update indicators with the new data
          if (indicatorEngineRef.current) {
            indicatorEngineRef.current.updateData(newData);
          }
          
          return newData;
        });
        
        if (k.x) {
          logger.debug(`📈 Final candle: ${k.c} at ${new Date(k.t).toLocaleTimeString()}`);
        }
      } catch (error) {
        logger.error('❌ Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      logger.error('❌ WebSocket error:', error);
    };

    ws.onclose = (event) => {
      logger.debug(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
    };
  };

  // Add indicator using engine
  const addIndicator = () => {
    if (!indicatorEngineRef.current || !newIndicator.type || !newIndicator.period) return;
    
    const settings: IndicatorSettings = {
      id: `indicator_${Date.now()}`,
      type: newIndicator.type,
      period: newIndicator.period,
      emaLength: newIndicator.emaLength || 9,
      color: newIndicator.color || '#7E57C2',
      emaColor: newIndicator.emaColor || '#ff9500',
      visible: true,
      paneIndex: newIndicator.paneIndex || 1,
      overboughtLevel: newIndicator.overboughtLevel || 70,
      oversoldLevel: newIndicator.oversoldLevel || 30,
      overboughtColor: newIndicator.overboughtColor || '#787b86',
      oversoldColor: newIndicator.oversoldColor || '#787b86',
      // MACD-specific settings
      fastPeriod: newIndicator.fastPeriod || 12,
      slowPeriod: newIndicator.slowPeriod || 26,
      signalPeriod: newIndicator.signalPeriod || 9,
      macdColor: newIndicator.macdColor || '#2196f3',
      signalColor: newIndicator.signalColor || '#f44336',
      histogramUpColor: newIndicator.histogramUpColor || '#4caf50',
      histogramDownColor: newIndicator.histogramDownColor || '#f44336',
      // CCI-specific settings
      cciPeriod: newIndicator.cciPeriod || 20,
      cciOverboughtLevel: newIndicator.cciOverboughtLevel || 100,
      cciOversoldLevel: newIndicator.cciOversoldLevel || -100,
      cciOverboughtColor: newIndicator.cciOverboughtColor || '#f44336',
      cciOversoldColor: newIndicator.cciOversoldColor || '#4caf50',
      cciZeroColor: newIndicator.cciZeroColor || '#787b86',
      // MFI-specific settings
      mfiPeriod: newIndicator.mfiPeriod || 14,
      mfiOverboughtLevel: newIndicator.mfiOverboughtLevel || 80,
      mfiOversoldLevel: newIndicator.mfiOversoldLevel || 20,
      mfiOverboughtColor: newIndicator.mfiOverboughtColor || '#f44336',
      mfiOversoldColor: newIndicator.mfiOversoldColor || '#4caf50',
      mfiMiddleColor: newIndicator.mfiMiddleColor || '#787b86',
      // Donchian Width-specific settings
      donchianPeriod: newIndicator.donchianPeriod || 20,
      donchianWidthColor: newIndicator.donchianWidthColor || '#2196f3',
      showMiddleLine: newIndicator.showMiddleLine !== undefined ? newIndicator.showMiddleLine : false,
      middleLineColor: newIndicator.middleLineColor || '#787b86',
      // Chandelier Exit-specific settings
      chandelierPeriod: newIndicator.chandelierPeriod || 22,
      atrMultiplier: newIndicator.atrMultiplier || 3.0,
      longExitColor: newIndicator.longExitColor || '#4caf50',
      shortExitColor: newIndicator.shortExitColor || '#f44336',
      showLongExit: newIndicator.showLongExit !== undefined ? newIndicator.showLongExit : true,
      showShortExit: newIndicator.showShortExit !== undefined ? newIndicator.showShortExit : true,
      // Anchored VWAP-specific settings
      anchorType: newIndicator.anchorType || 'first_bar',
      anchorIndex: newIndicator.anchorIndex || 0,
      vwapColor: newIndicator.vwapColor || '#2962ff',
      showStdDev: newIndicator.showStdDev !== undefined ? newIndicator.showStdDev : false,
      stdDevMultiplier: newIndicator.stdDevMultiplier || 2.0,
      // Williams Vix Fix-specific settings
      vixFixPeriod: newIndicator.vixFixPeriod || 22,
      vixFixBBPeriod: newIndicator.vixFixBBPeriod || 20,
      vixFixBBStdDev: newIndicator.vixFixBBStdDev || 2.0,
      vixFixColor: newIndicator.vixFixColor || '#f44336',
      vixFixHighColor: newIndicator.vixFixHighColor || '#ff5252',
      showVixFixBands: newIndicator.showVixFixBands !== undefined ? newIndicator.showVixFixBands : true,
      vixFixThreshold: newIndicator.vixFixThreshold || 80,
      // QQE-specific settings
      qqeRsiPeriod: newIndicator.qqeRsiPeriod || 14,
      qqeSF: newIndicator.qqeSF || 5,
      qqeWildersPeriod: newIndicator.qqeWildersPeriod || 27,
      qqeFactor: newIndicator.qqeFactor || 4.236,
      qqeLineColor: newIndicator.qqeLineColor || '#2196f3',
      qqeFastColor: newIndicator.qqeFastColor || '#4caf50',
      qqeSlowColor: newIndicator.qqeSlowColor || '#f44336',
      showQqeLevels: newIndicator.showQqeLevels !== undefined ? newIndicator.showQqeLevels : true,
      // STC-specific settings
      stcFastPeriod: newIndicator.stcFastPeriod || 23,
      stcSlowPeriod: newIndicator.stcSlowPeriod || 50,
      stcCyclePeriod: newIndicator.stcCyclePeriod || 10,
      stcD1Period: newIndicator.stcD1Period || 3,
      stcD2Period: newIndicator.stcD2Period || 3,
      stcColor: newIndicator.stcColor || '#2196f3',
      stcUpperLevel: newIndicator.stcUpperLevel || 75,
      stcLowerLevel: newIndicator.stcLowerLevel || 25,
      showStcLevels: newIndicator.showStcLevels !== undefined ? newIndicator.showStcLevels : true,
      // Choppiness Index-specific settings
      choppinessPeriod: newIndicator.choppinessPeriod || 14,
      choppinessColor: newIndicator.choppinessColor || '#ff9800',
      choppinessUpperLevel: newIndicator.choppinessUpperLevel || 61.8,
      choppinessLowerLevel: newIndicator.choppinessLowerLevel || 38.2,
      showChoppinessLevels: newIndicator.showChoppinessLevels !== undefined ? newIndicator.showChoppinessLevels : true,
      // SuperTrend-specific settings
      supertrendPeriod: newIndicator.supertrendPeriod || 10,
      supertrendMultiplier: newIndicator.supertrendMultiplier || 3.0,
      supertrendUpColor: newIndicator.supertrendUpColor || '#4caf50',
      supertrendDownColor: newIndicator.supertrendDownColor || '#f44336',
      showSupertrendSignals: newIndicator.showSupertrendSignals !== undefined ? newIndicator.showSupertrendSignals : true,
      supertrendBuyColor: newIndicator.supertrendBuyColor || '#4caf50',
      supertrendSellColor: newIndicator.supertrendSellColor || '#f44336',
      // MA Ribbon Heatmap-specific settings
      maRibbonMaType: newIndicator.maRibbonMaType || 'sma',
      maRibbonPeriods: newIndicator.maRibbonPeriods || [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
      maRibbonUptrendColor: newIndicator.maRibbonUptrendColor || '#4caf50',
      maRibbonDowntrendColor: newIndicator.maRibbonDowntrendColor || '#f44336',
      maRibbonNeutralColor: newIndicator.maRibbonNeutralColor || '#787b86',
      maRibbonOpacity: newIndicator.maRibbonOpacity || 0.3,
      showMaRibbonHeatmap: newIndicator.showMaRibbonHeatmap !== undefined ? newIndicator.showMaRibbonHeatmap : true,
      // Linear Regression settings
      linregPeriod: newIndicator.linregPeriod || 20,
      linregStdDevMultiplier: newIndicator.linregStdDevMultiplier || 2.0,
      linregBasisColor: newIndicator.linregBasisColor || '#2196f3',
      linregUpperBandColor: newIndicator.linregUpperBandColor || '#f44336',
      linregLowerBandColor: newIndicator.linregLowerBandColor || '#4caf50',
      showLinregBands: newIndicator.showLinregBands !== undefined ? newIndicator.showLinregBands : true,
      showLinregSlope: newIndicator.showLinregSlope !== undefined ? newIndicator.showLinregSlope : false,
      // Kalman Filter settings
      kalmanProcessNoise: newIndicator.kalmanProcessNoise || 0.01,
      kalmanMeasurementNoise: newIndicator.kalmanMeasurementNoise || 0.1,
      kalmanInitialVariance: newIndicator.kalmanInitialVariance || 1.0,
      kalmanSmoothingFactor: newIndicator.kalmanSmoothingFactor || 0.1,
      showKalmanConfidence: newIndicator.showKalmanConfidence !== undefined ? newIndicator.showKalmanConfidence : false,
      kalmanConfidenceColor: newIndicator.kalmanConfidenceColor || '#787b86',
      // Range Filter settings
      rangeFilterMethod: newIndicator.rangeFilterMethod || 'atr',
      rangeFilterPeriod: newIndicator.rangeFilterPeriod || 14,
      rangeFilterMultiplier: newIndicator.rangeFilterMultiplier || 2.0,
      rangeFilterSmoothing: newIndicator.rangeFilterSmoothing || 3,
      rangeFilterUpperColor: newIndicator.rangeFilterUpperColor || '#4caf50',
      rangeFilterLowerColor: newIndicator.rangeFilterLowerColor || '#f44336',
      rangeFilterSignalColor: newIndicator.rangeFilterSignalColor || '#2196f3',
      showRangeFilterSignals: newIndicator.showRangeFilterSignals !== undefined ? newIndicator.showRangeFilterSignals : true,
      rangeFilterBuyColor: newIndicator.rangeFilterBuyColor || '#4caf50',
      rangeFilterSellColor: newIndicator.rangeFilterSellColor || '#f44336',
      // HTF Trend Heat (MTF) settings
      htfTimeframes: newIndicator.htfTimeframes || ['1h', '4h', '1d'],
      htfMaPeriod: newIndicator.htfMaPeriod || 20,
      htfRsiPeriod: newIndicator.htfRsiPeriod || 14,
      htfMaType: newIndicator.htfMaType || 'ema',
      htfScoreColor: newIndicator.htfScoreColor || '#ff6b35',
      htfHeatmapColors: newIndicator.htfHeatmapColors || ['#ff4444', '#ffaa44', '#ffff44', '#aaff44', '#44ff44'],
      showHtfHeatmap: newIndicator.showHtfHeatmap !== undefined ? newIndicator.showHtfHeatmap : true,
      showHtfScore: newIndicator.showHtfScore !== undefined ? newIndicator.showHtfScore : true,
      htfScoreThreshold: newIndicator.htfScoreThreshold || 70,
      // Money Flow Pressure (MFP)-specific settings
      mfpPeriod: newIndicator.mfpPeriod || 14,
      mfpColor: newIndicator.mfpColor || '#9c27b0',
      mfpOverboughtLevel: newIndicator.mfpOverboughtLevel || 80,
      mfpOversoldLevel: newIndicator.mfpOversoldLevel || 20,
      mfpOverboughtColor: newIndicator.mfpOverboughtColor || '#f44336',
      mfpOversoldColor: newIndicator.mfpOversoldColor || '#4caf50',
      mfpMiddleColor: newIndicator.mfpMiddleColor || '#787b86',
      // Volume-specific settings
      volumeUpColor: newIndicator.volumeUpColor || '#4caf50',
      volumeDownColor: newIndicator.volumeDownColor || '#f44336',
      volumeShowMA: newIndicator.volumeShowMA !== undefined ? newIndicator.volumeShowMA : false,
      volumeMAPeriod: newIndicator.volumeMAPeriod || 20,
      volumeMAColor: newIndicator.volumeMAColor || '#2196f3',
      volumeMaType: newIndicator.volumeMaType || 'sma'
    };
    
    try {
      logger.debug('=== ADDING INDICATOR WITH SETTINGS ===');
      logger.debug('Settings being passed:', settings);
      
      indicatorEngineRef.current.addIndicator(settings);
      setShowIndicatorModal(false);
                    setNewIndicator({
                      type: 'rsi',
                      period: 14,
                      emaLength: 9,
                      color: '#7E57C2',
                      emaColor: '#ff9500',
                      paneIndex: 0,
                      overboughtLevel: 70,
                      oversoldLevel: 30,
                      overboughtColor: '#787b86',
                      oversoldColor: '#787b86',
                      // MACD defaults
                      fastPeriod: 12,
                      slowPeriod: 26,
                      signalPeriod: 9,
                      macdColor: '#2196f3',
                      signalColor: '#f44336',
                      histogramUpColor: '#4caf50',
                      histogramDownColor: '#f44336',
                      // CCI defaults
                      cciPeriod: 20,
                      cciOverboughtLevel: 100,
                      cciOversoldLevel: -100,
                      cciOverboughtColor: '#f44336',
                      cciOversoldColor: '#4caf50',
                      cciZeroColor: '#787b86',
                      // MFI defaults
                      mfiPeriod: 14,
                      mfiOverboughtLevel: 80,
                      mfiOversoldLevel: 20,
                      mfiOverboughtColor: '#f44336',
                      mfiOversoldColor: '#4caf50',
                      mfiMiddleColor: '#787b86',
                      // Donchian Width defaults
                      donchianPeriod: 20,
                      donchianWidthColor: '#2196f3',
                      showMiddleLine: false,
                      middleLineColor: '#787b86',
                      // Chandelier Exit defaults
                      chandelierPeriod: 22,
                      atrMultiplier: 3.0,
                      longExitColor: '#4caf50',
                      shortExitColor: '#f44336',
                      showLongExit: true,
                      showShortExit: true,
                      // Anchored VWAP defaults
                      anchorType: 'first_bar',
                      anchorIndex: 0,
                      vwapColor: '#2962ff',
                      showStdDev: false,
                      stdDevMultiplier: 2.0,
                      // Williams Vix Fix defaults
                      vixFixPeriod: 22,
                      vixFixBBPeriod: 20,
                      vixFixBBStdDev: 2.0,
                      vixFixColor: '#f44336',
                      vixFixHighColor: '#ff5252',
                      showVixFixBands: true,
                      vixFixThreshold: 80,
                      // QQE defaults
                      qqeRsiPeriod: 14,
                      qqeSF: 5,
                      qqeWildersPeriod: 27,
                      qqeFactor: 4.236,
                      qqeLineColor: '#2196f3',
                      qqeFastColor: '#4caf50',
                      qqeSlowColor: '#f44336',
                      showQqeLevels: true,
                      // STC defaults
                      stcFastPeriod: 23,
                      stcSlowPeriod: 50,
                      stcCyclePeriod: 10,
                      stcD1Period: 3,
                      stcD2Period: 3,
                      stcColor: '#2196f3',
                      stcUpperLevel: 75,
                      stcLowerLevel: 25,
                      showStcLevels: true,
                      // Choppiness Index defaults
                      choppinessPeriod: 14,
                      choppinessColor: '#ff9800',
                      choppinessUpperLevel: 61.8,
                      choppinessLowerLevel: 38.2,
                      showChoppinessLevels: true,
                      // SuperTrend defaults
                      supertrendPeriod: 10,
                      supertrendMultiplier: 3.0,
                      supertrendUpColor: '#4caf50',
                      supertrendDownColor: '#f44336',
                      showSupertrendSignals: true,
                      supertrendBuyColor: '#4caf50',
                      supertrendSellColor: '#f44336',
                      // MA Ribbon Heatmap defaults
                      maRibbonMaType: 'sma',
                      maRibbonPeriods: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
                      maRibbonUptrendColor: '#4caf50',
                      maRibbonDowntrendColor: '#f44336',
                      maRibbonNeutralColor: '#787b86',
                      maRibbonOpacity: 0.3,
                      showMaRibbonHeatmap: true,
                      // Linear Regression defaults
                      linregPeriod: 20,
                      linregStdDevMultiplier: 2.0,
                      linregBasisColor: '#2196f3',
                      linregUpperBandColor: '#f44336',
                      linregLowerBandColor: '#4caf50',
                      showLinregBands: true,
                      showLinregSlope: false,
                      // Kalman Filter defaults
                      kalmanProcessNoise: 0.01,
                      kalmanMeasurementNoise: 0.1,
                      kalmanInitialVariance: 1.0,
                      kalmanSmoothingFactor: 0.1,
                      showKalmanConfidence: false,
                      kalmanConfidenceColor: '#787b86',
                      // Range Filter defaults
                      rangeFilterMethod: 'atr',
                      rangeFilterPeriod: 14,
                      rangeFilterMultiplier: 2.0,
                      rangeFilterSmoothing: 3,
                      rangeFilterUpperColor: '#4caf50',
                      rangeFilterLowerColor: '#f44336',
                      rangeFilterSignalColor: '#2196f3',
                      showRangeFilterSignals: true,
                      rangeFilterBuyColor: '#4caf50',
                      rangeFilterSellColor: '#f44336',
                      // HTF Trend Heat (MTF) defaults
                      htfTimeframes: ['1h', '4h', '1d'],
                      htfMaPeriod: 20,
                      htfRsiPeriod: 14,
                      htfMaType: 'ema',
                      htfScoreColor: '#ff6b35',
                      htfHeatmapColors: ['#ff4444', '#ffaa44', '#ffff44', '#aaff44', '#44ff44'],
                      showHtfHeatmap: true,
                      showHtfScore: true,
                      htfScoreThreshold: 70,
                      // Money Flow Pressure (MFP)-specific defaults
                      mfpPeriod: 14,
                      mfpColor: '#9c27b0',
                      mfpOverboughtLevel: 80,
                      mfpOversoldLevel: 20,
                      mfpOverboughtColor: '#f44336',
                      mfpOversoldColor: '#4caf50',
                      mfpMiddleColor: '#787b86',
                      // Volume-specific defaults
                      volumeUpColor: '#4caf50',
                      volumeDownColor: '#f44336',
                      volumeShowMA: false,
                      volumeMAPeriod: 20,
                      volumeMAColor: '#2196f3',
                      volumeMaType: 'sma'
                    });
    } catch (error) {
      logger.error('=== FAILED TO ADD INDICATOR ===');
      logger.error('Error object:', error);
      logger.error('Error message:', error instanceof Error ? error.message : String(error));
      logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      logger.error('Settings that were passed:', settings);
      alert(`Failed to add indicator: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Remove indicator using engine
  const removeIndicator = (id: string) => {
    if (!indicatorEngineRef.current) return;
    indicatorEngineRef.current.removeIndicator(id);
  };

  // Update indicator settings using engine
  const updateIndicatorSettings = (id: string, updates: Partial<IndicatorSettings>) => {
    if (!indicatorEngineRef.current) return;
    indicatorEngineRef.current.updateIndicator(id, updates);
  };

  // Toggle indicator visibility using engine
  const toggleIndicatorVisibility = (id: string) => {
    if (!indicatorEngineRef.current) return;
    indicatorEngineRef.current.toggleVisibility(id);
  };

  // Open settings modal
  const openSettings = (indicator: IndicatorSettings) => {
    logger.debug('=== OPENING SETTINGS ===');
    logger.debug('Selected indicator:', indicator);
    logger.debug('Indicator type:', indicator.type);
    logger.debug('Indicator color:', indicator.color);
    logger.debug('Indicator EMA color:', indicator.emaColor);
    
    setSelectedIndicator(indicator);
    setShowSettingsModal(true);
  };

  // Apply settings changes
  const applySettings = () => {
    if (!selectedIndicator || !indicatorEngineRef.current) return;
    
    const rsiColorElement = document.getElementById('settingsRsiColor') as HTMLInputElement;
    const rsiEmaColorElement = document.getElementById('settingsRsiEmaColor') as HTMLInputElement;
    const rsiLengthElement = document.getElementById('settingsRsiLength') as HTMLInputElement;
    const rsiEmaLengthElement = document.getElementById('settingsRsiEmaLength') as HTMLInputElement;
    const overboughtLevelElement = document.getElementById('settingsOverboughtLevel') as HTMLInputElement;
    const oversoldLevelElement = document.getElementById('settingsOversoldLevel') as HTMLInputElement;
    const overboughtColorElement = document.getElementById('settingsOverboughtColor') as HTMLInputElement;
    const oversoldColorElement = document.getElementById('settingsOversoldColor') as HTMLInputElement;
    
    logger.debug('=== APPLYING SETTINGS ===');
    logger.debug('RSI Color element:', rsiColorElement);
    logger.debug('RSI EMA Color element:', rsiEmaColorElement);
    logger.debug('RSI Color value:', rsiColorElement?.value);
    logger.debug('RSI EMA Color value:', rsiEmaColorElement?.value);
    
    if (rsiColorElement && rsiEmaColorElement && rsiLengthElement && rsiEmaLengthElement && 
        overboughtLevelElement && oversoldLevelElement && overboughtColorElement && oversoldColorElement) {
      const updates: Partial<IndicatorSettings> = {
        color: rsiColorElement.value,
        emaColor: rsiEmaColorElement.value,
        period: parseInt(rsiLengthElement.value),
        emaLength: parseInt(rsiEmaLengthElement.value),
        overboughtLevel: parseInt(overboughtLevelElement.value),
        oversoldLevel: parseInt(oversoldLevelElement.value),
        overboughtColor: overboughtColorElement.value,
        oversoldColor: oversoldColorElement.value
      };
      
        logger.debug('Settings updates:', updates);
      
      updateIndicatorSettings(selectedIndicator.id, updates);
      setShowSettingsModal(false);
      alert('Settings updated successfully!');
    } else {
        logger.error('Some form elements not found');
      alert('Error: Some form elements not found');
    }
  };

  // Get current indicators from engine
  const getCurrentIndicators = () => {
    return indicatorEngineRef.current?.getIndicators() || [];
  };

  // Handle opening alert builder with prefill data
  const handleCreateAlertFromIndicator = (indicatorType: string, component: string) => {
    setAlertPrefill({ indicator: indicatorType, component });
    setShowAlertBuilder(true);
  };

  // Use alert markers hook
  useAlertMarkers(symbol, interval);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside both dropdowns
      if (!target.closest('[data-dropdown="symbol"]') && !target.closest('[data-dropdown="interval"]')) {
        setIsSymbolDropdownOpen(false);
        setIsIntervalDropdownOpen(false);
      }
    };

    if (isSymbolDropdownOpen || isIntervalDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSymbolDropdownOpen, isIntervalDropdownOpen]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-gray-900">Clean Charts</h1>
            
            {/* Active Indicators Display */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Active Indicators:</span>
              <div className="flex items-center space-x-2">
                {getCurrentIndicators().length > 0 ? (
                  getCurrentIndicators().map((indicator) => (
                    <div key={indicator.settings.id} className="flex items-center space-x-1 px-2 py-1 bg-blue-50 rounded-md hover:bg-blue-100 cursor-pointer group">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: indicator.settings.color }}
                      />
                      <span className="text-xs font-medium text-gray-700">
                        {indicator.settings.type.toUpperCase()}({indicator.settings.period})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCreateAlertFromIndicator(indicator.settings.type.toUpperCase(), indicator.settings.type.toUpperCase())}
                        className="h-5 w-5 p-0 text-gray-500 hover:text-green-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <PlusCircle className="h-3 w-3" />
                      </Button>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openSettings(indicator.settings);
                          }}
                          className="p-0.5 hover:bg-blue-200 rounded text-xs"
                          title="Settings"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleIndicatorVisibility(indicator.settings.id);
                          }}
                          className="p-0.5 hover:bg-blue-200 rounded text-xs"
                          title={indicator.settings.visible ? "Hide" : "Show"}
                        >
                          {indicator.settings.visible ? "👁️" : "🙈"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeIndicator(indicator.settings.id);
                          }}
                          className="p-0.5 hover:bg-red-200 rounded text-xs"
                          title="Remove"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">None</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Symbol Selector with Search */}
            <div className="flex items-center space-x-2 relative">
              <label className="text-sm font-medium text-gray-700">Symbol:</label>
              <div className="relative" data-dropdown="symbol">
                <button
                  type="button"
                  onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px] text-left flex items-center justify-between"
                >
                  <span>{symbol}</span>
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isSymbolDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isSymbolDropdownOpen && (
                  <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 w-64 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search pairs..."
                          value={symbolSearchQuery}
                          onChange={(e) => setSymbolSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-80">
                      {isLoadingSymbols ? (
                        <div className="p-4 text-center text-sm text-gray-500">Loading symbols...</div>
                      ) : filteredSymbols.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">No symbols found</div>
                      ) : (
                        filteredSymbols.map((sym) => (
                          <button
                            key={sym.symbol}
                            type="button"
                            onClick={() => {
                              setSymbol(sym.symbol);
                              setIsSymbolDropdownOpen(false);
                              setSymbolSearchQuery('');
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                              symbol === sym.symbol ? 'bg-blue-100 font-medium' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{sym.symbol}</span>
                              <span className="text-xs text-gray-500">{sym.baseAsset}/{sym.quoteAsset}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    {filteredSymbols.length > 0 && (
                      <div className="p-2 border-t border-gray-200 text-xs text-gray-500 text-center">
                        {filteredSymbols.length} of {availableSymbols.length} pairs
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Interval Selector */}
            <div className="flex items-center space-x-2 relative">
              <label className="text-sm font-medium text-gray-700">Interval:</label>
              <div className="relative" data-dropdown="interval">
                <button
                  type="button"
                  onClick={() => setIsIntervalDropdownOpen(!isIntervalDropdownOpen)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[80px] text-left flex items-center justify-between"
                >
                  <span>{interval}</span>
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isIntervalDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isIntervalDropdownOpen && (
                  <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden">
                    {INTERVALS.map((int) => (
                      <button
                        key={int}
                        type="button"
                        onClick={() => {
                          setInterval(int);
                          setIsIntervalDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                          interval === int ? 'bg-blue-100 font-medium' : ''
                        }`}
                      >
                        {int} - {INTERVAL_LABELS[int]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Date Range Selector */}
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={useDateRange}
                  onChange={(e) => {
                    setUseDateRange(e.target.checked);
                    if (!e.target.checked) {
                      setStartDate('');
                      setEndDate('');
                      // Reload recent data when disabling date range
                      setTimeout(() => loadHistoricalData(), 100);
                    }
                  }}
                  className="rounded"
                />
                <span className="text-gray-700">Date Range</span>
              </label>
              {useDateRange && (
                <>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                    max={endDate || new Date().toISOString().split('T')[0]}
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <Button
                    onClick={loadHistoricalData}
                    disabled={isLoadingHistorical || !startDate || !endDate}
                    className="px-3 py-1 text-sm"
                    size="sm"
                  >
                    {isLoadingHistorical ? 'Loading...' : 'Load'}
                  </Button>
                  <span className="text-xs text-gray-500 ml-2" title="Data source: Binance Public API">
                    📊 Binance API
                  </span>
                </>
              )}
            </div>
            
            <Button
              onClick={() => setShowIndicatorModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Indicator
            </Button>
            
            <Button
              onClick={() => setShowAlertBuilder(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Alert
            </Button>
            
            <Button
              onClick={() => setShowAlertList(!showAlertList)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Alerts
            </Button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 flex">
        <div ref={chartContainerRef} className="flex-1" />
        <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
        {showAlertList ? (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-hidden p-4">
              <AlertList />
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 flex-1 flex items-center justify-center">
            Click "Alerts" to view your alerts
          </div>
        )}
        </div>
      </div>

      {/* Add Indicator Modal */}
      {showIndicatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <h3 className="text-lg font-semibold mb-3">Add Indicator</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newIndicator.type || 'rsi'}
                  onChange={(e) => setNewIndicator({ ...newIndicator, type: e.target.value as any })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {INDICATOR_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                <input
                  type="number"
                  value={newIndicator.period || 14}
                  onChange={(e) => setNewIndicator({ ...newIndicator, period: parseInt(e.target.value) })}
                  min={1}
                  max={200}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {newIndicator.type === 'rsi' && (
                <>
                  {/* Row 1: EMA Length */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">EMA Length</label>
                    <input
                      type="number"
                      value={newIndicator.emaLength || 9}
                      onChange={(e) => setNewIndicator({ ...newIndicator, emaLength: parseInt(e.target.value) })}
                      min={1}
                      max={50}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Row 2: RSI Color and EMA Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">RSI Color</label>
                    <input
                      type="color"
                      value={newIndicator.color || '#7E57C2'}
                      onChange={(e) => setNewIndicator({ ...newIndicator, color: e.target.value })}
                      className="w-full h-8 border border-gray-300 rounded"
                    />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">EMA Color</label>
                      <input
                        type="color"
                        value={newIndicator.emaColor || '#ff9500'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, emaColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  
                  {/* Row 3: Overbought and Oversold Levels */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Level</label>
                      <input
                        type="number"
                        value={newIndicator.overboughtLevel || 70}
                        onChange={(e) => setNewIndicator({ ...newIndicator, overboughtLevel: parseInt(e.target.value) })}
                        min={50}
                        max={100}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Level</label>
                      <input
                        type="number"
                        value={newIndicator.oversoldLevel || 30}
                        onChange={(e) => setNewIndicator({ ...newIndicator, oversoldLevel: parseInt(e.target.value) })}
                        min={0}
                        max={50}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 4: Overbought and Oversold Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Color</label>
                      <input
                        type="color"
                        value={newIndicator.overboughtColor || '#787b86'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, overboughtColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Color</label>
                      <input
                        type="color"
                        value={newIndicator.oversoldColor || '#787b86'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, oversoldColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'ema' && (
                <>
                  {/* EMA Color */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">EMA Line Color</label>
                    <input
                      type="color"
                      value={newIndicator.color || '#2196F3'}
                      onChange={(e) => setNewIndicator({ ...newIndicator, color: e.target.value })}
                      className="w-full h-8 border border-gray-300 rounded"
                    />
                  </div>
                </>
              )}

              {newIndicator.type === 'sma' && (
                <>
                  {/* SMA Color */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">SMA Line Color</label>
                    <input
                      type="color"
                      value={newIndicator.color || '#FF6D00'}
                      onChange={(e) => setNewIndicator({ ...newIndicator, color: e.target.value })}
                      className="w-full h-8 border border-gray-300 rounded"
                    />
                  </div>
                </>
              )}

              {newIndicator.type === 'macd' && (
                <>
                  {/* Row 1: Fast, Slow, Signal Periods */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Fast Period</label>
                      <input
                        type="number"
                        value={newIndicator.fastPeriod || 12}
                        onChange={(e) => setNewIndicator({ ...newIndicator, fastPeriod: parseInt(e.target.value) })}
                        min={1}
                        max={50}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Slow Period</label>
                      <input
                        type="number"
                        value={newIndicator.slowPeriod || 26}
                        onChange={(e) => setNewIndicator({ ...newIndicator, slowPeriod: parseInt(e.target.value) })}
                        min={1}
                        max={100}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Signal Period</label>
                      <input
                        type="number"
                        value={newIndicator.signalPeriod || 9}
                        onChange={(e) => setNewIndicator({ ...newIndicator, signalPeriod: parseInt(e.target.value) })}
                        min={1}
                        max={50}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 2: MACD Line and Signal Line Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">MACD Line Color</label>
                      <input
                        type="color"
                        value={newIndicator.macdColor || '#2196f3'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, macdColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Signal Line Color</label>
                      <input
                        type="color"
                        value={newIndicator.signalColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, signalColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  
                  {/* Row 3: Histogram Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Histogram Up Color</label>
                      <input
                        type="color"
                        value={newIndicator.histogramUpColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, histogramUpColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Histogram Down Color</label>
                      <input
                        type="color"
                        value={newIndicator.histogramDownColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, histogramDownColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'cci' && (
                <>
                  {/* Row 1: CCI Period */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">CCI Period</label>
                    <input
                      type="number"
                      value={newIndicator.cciPeriod || 20}
                      onChange={(e) => setNewIndicator({ ...newIndicator, cciPeriod: parseInt(e.target.value) })}
                      min={5}
                      max={100}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Row 2: CCI Color */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">CCI Color</label>
                    <input
                      type="color"
                      value={newIndicator.color || '#ff9500'}
                      onChange={(e) => setNewIndicator({ ...newIndicator, color: e.target.value })}
                      className="w-full h-8 border border-gray-300 rounded"
                    />
                  </div>
                  
                  {/* Row 3: Overbought and Oversold Levels */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Level</label>
                      <input
                        type="number"
                        value={newIndicator.cciOverboughtLevel || 100}
                        onChange={(e) => setNewIndicator({ ...newIndicator, cciOverboughtLevel: parseInt(e.target.value) })}
                        min={50}
                        max={200}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Level</label>
                      <input
                        type="number"
                        value={newIndicator.cciOversoldLevel || -100}
                        onChange={(e) => setNewIndicator({ ...newIndicator, cciOversoldLevel: parseInt(e.target.value) })}
                        min={-200}
                        max={-50}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 4: Level Colors */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Color</label>
                      <input
                        type="color"
                        value={newIndicator.cciOverboughtColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, cciOverboughtColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Color</label>
                      <input
                        type="color"
                        value={newIndicator.cciOversoldColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, cciOversoldColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Zero Line Color</label>
                      <input
                        type="color"
                        value={newIndicator.cciZeroColor || '#787b86'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, cciZeroColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'mfi' && (
                <>
                  {/* Row 1: MFI Period */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">MFI Period</label>
                    <input
                      type="number"
                      value={newIndicator.mfiPeriod || 14}
                      onChange={(e) => setNewIndicator({ ...newIndicator, mfiPeriod: parseInt(e.target.value) })}
                      min={5}
                      max={50}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Row 2: MFI Color */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">MFI Color</label>
                    <input
                      type="color"
                      value={newIndicator.color || '#9c27b0'}
                      onChange={(e) => setNewIndicator({ ...newIndicator, color: e.target.value })}
                      className="w-full h-8 border border-gray-300 rounded"
                    />
                  </div>
                  
                  {/* Row 3: Overbought and Oversold Levels */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Level</label>
                      <input
                        type="number"
                        value={newIndicator.mfiOverboughtLevel || 80}
                        onChange={(e) => setNewIndicator({ ...newIndicator, mfiOverboughtLevel: parseInt(e.target.value) })}
                        min={70}
                        max={100}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Level</label>
                      <input
                        type="number"
                        value={newIndicator.mfiOversoldLevel || 20}
                        onChange={(e) => setNewIndicator({ ...newIndicator, mfiOversoldLevel: parseInt(e.target.value) })}
                        min={0}
                        max={30}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 4: Level Colors */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Color</label>
                      <input
                        type="color"
                        value={newIndicator.mfiOverboughtColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, mfiOverboughtColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Color</label>
                      <input
                        type="color"
                        value={newIndicator.mfiOversoldColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, mfiOversoldColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Middle Line Color</label>
                      <input
                        type="color"
                        value={newIndicator.mfiMiddleColor || '#787b86'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, mfiMiddleColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'donchian_width' && (
                <>
                  {/* Row 1: Period */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                      <input
                        type="number"
                        value={newIndicator.donchianPeriod || 20}
                        onChange={(e) => setNewIndicator({ ...newIndicator, donchianPeriod: parseInt(e.target.value) })}
                        min={5}
                        max={100}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showMiddleLine !== undefined ? newIndicator.showMiddleLine : false}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showMiddleLine: e.target.checked })}
                          className="mr-2"
                        />
                        Show Middle Line
                      </label>
                    </div>
                  </div>
                  
                  {/* Row 2: Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Width Color</label>
                      <input
                        type="color"
                        value={newIndicator.donchianWidthColor || '#2196f3'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, donchianWidthColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Middle Line Color</label>
                      <input
                        type="color"
                        value={newIndicator.middleLineColor || '#787b86'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, middleLineColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'chandelier_exit' && (
                <>
                  {/* Row 1: Period and Multiplier */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                      <input
                        type="number"
                        value={newIndicator.chandelierPeriod || 22}
                        onChange={(e) => setNewIndicator({ ...newIndicator, chandelierPeriod: parseInt(e.target.value) })}
                        min={5}
                        max={100}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">ATR Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newIndicator.atrMultiplier || 3.0}
                        onChange={(e) => setNewIndicator({ ...newIndicator, atrMultiplier: parseFloat(e.target.value) })}
                        min={0.5}
                        max={10.0}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 2: Show Options */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showLongExit !== undefined ? newIndicator.showLongExit : true}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showLongExit: e.target.checked })}
                          className="mr-2"
                        />
                        Show Long Exit
                      </label>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showShortExit !== undefined ? newIndicator.showShortExit : true}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showShortExit: e.target.checked })}
                          className="mr-2"
                        />
                        Show Short Exit
                      </label>
                    </div>
                  </div>
                  
                  {/* Row 3: Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Long Exit Color</label>
                      <input
                        type="color"
                        value={newIndicator.longExitColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, longExitColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Short Exit Color</label>
                      <input
                        type="color"
                        value={newIndicator.shortExitColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, shortExitColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'anchored_vwap' && (
                <>
                  {/* Row 1: Anchor Index and Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Anchor Index</label>
                      <input
                        type="number"
                        value={newIndicator.anchorIndex || 0}
                        onChange={(e) => setNewIndicator({ ...newIndicator, anchorIndex: parseInt(e.target.value) })}
                        min={0}
                        max={1000}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">0 = Start from first bar</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">VWAP Color</label>
                      <input
                        type="color"
                        value={newIndicator.vwapColor || '#2962ff'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, vwapColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  
                  {/* Row 2: Show Std Dev and Multiplier */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showStdDev !== undefined ? newIndicator.showStdDev : false}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showStdDev: e.target.checked })}
                          className="mr-2"
                        />
                        Show Std Dev Bands
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Std Dev Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newIndicator.stdDevMultiplier || 2.0}
                        onChange={(e) => setNewIndicator({ ...newIndicator, stdDevMultiplier: parseFloat(e.target.value) })}
                        min={0.5}
                        max={5.0}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'williams_vix_fix' && (
                <>
                  {/* Row 1: VIX Fix Period and BB Period */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">VIX Fix Period</label>
                      <input
                        type="number"
                        value={newIndicator.vixFixPeriod || 22}
                        onChange={(e) => setNewIndicator({ ...newIndicator, vixFixPeriod: parseInt(e.target.value) })}
                        min={5}
                        max={100}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">BB Period</label>
                      <input
                        type="number"
                        value={newIndicator.vixFixBBPeriod || 20}
                        onChange={(e) => setNewIndicator({ ...newIndicator, vixFixBBPeriod: parseInt(e.target.value) })}
                        min={5}
                        max={100}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 2: BB Std Dev and Threshold */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">BB Std Dev</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newIndicator.vixFixBBStdDev || 2.0}
                        onChange={(e) => setNewIndicator({ ...newIndicator, vixFixBBStdDev: parseFloat(e.target.value) })}
                        min={0.5}
                        max={5.0}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Threshold Level</label>
                      <input
                        type="number"
                        value={newIndicator.vixFixThreshold || 80}
                        onChange={(e) => setNewIndicator({ ...newIndicator, vixFixThreshold: parseInt(e.target.value) })}
                        min={0}
                        max={100}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 3: Show Bands and VIX Fix Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showVixFixBands !== undefined ? newIndicator.showVixFixBands : true}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showVixFixBands: e.target.checked })}
                          className="mr-2"
                        />
                        Show BB Bands
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">VIX Fix Color</label>
                      <input
                        type="color"
                        value={newIndicator.vixFixColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, vixFixColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'qqe' && (
                <>
                  {/* Row 1: RSI Period and Smoothing Factor */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">RSI Period</label>
                      <input
                        type="number"
                        value={newIndicator.qqeRsiPeriod || 14}
                        onChange={(e) => setNewIndicator({ ...newIndicator, qqeRsiPeriod: parseInt(e.target.value) })}
                        min={5}
                        max={50}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Smoothing Factor (SF)</label>
                      <input
                        type="number"
                        value={newIndicator.qqeSF || 5}
                        onChange={(e) => setNewIndicator({ ...newIndicator, qqeSF: parseInt(e.target.value) })}
                        min={1}
                        max={20}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 2: Wilders Period and Factor */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Wilders Period</label>
                      <input
                        type="number"
                        value={newIndicator.qqeWildersPeriod || 27}
                        onChange={(e) => setNewIndicator({ ...newIndicator, qqeWildersPeriod: parseInt(e.target.value) })}
                        min={5}
                        max={100}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Factor</label>
                      <input
                        type="number"
                        step="0.001"
                        value={newIndicator.qqeFactor || 4.236}
                        onChange={(e) => setNewIndicator({ ...newIndicator, qqeFactor: parseFloat(e.target.value) })}
                        min={1}
                        max={10}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 3: Colors */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">QQE Line Color</label>
                      <input
                        type="color"
                        value={newIndicator.qqeLineColor || '#2196f3'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, qqeLineColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Fast Trail Color</label>
                      <input
                        type="color"
                        value={newIndicator.qqeFastColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, qqeFastColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Slow Trail Color</label>
                      <input
                        type="color"
                        value={newIndicator.qqeSlowColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, qqeSlowColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  
                  {/* Row 4: Show Levels */}
                  <div className="flex items-center">
                    <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newIndicator.showQqeLevels !== undefined ? newIndicator.showQqeLevels : true}
                        onChange={(e) => setNewIndicator({ ...newIndicator, showQqeLevels: e.target.checked })}
                        className="mr-2"
                      />
                      Show Overbought/Oversold Levels (70/50/30)
                    </label>
                  </div>
                </>
              )}

              {newIndicator.type === 'stc' && (
                <>
                  {/* Row 1: Fast Period and Slow Period */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Fast EMA Period</label>
                      <input
                        type="number"
                        value={newIndicator.stcFastPeriod || 23}
                        onChange={(e) => setNewIndicator({ ...newIndicator, stcFastPeriod: parseInt(e.target.value) })}
                        min={5}
                        max={100}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Slow EMA Period</label>
                      <input
                        type="number"
                        value={newIndicator.stcSlowPeriod || 50}
                        onChange={(e) => setNewIndicator({ ...newIndicator, stcSlowPeriod: parseInt(e.target.value) })}
                        min={10}
                        max={200}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 2: Cycle Period and Smoothing Periods */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cycle Period</label>
                      <input
                        type="number"
                        value={newIndicator.stcCyclePeriod || 10}
                        onChange={(e) => setNewIndicator({ ...newIndicator, stcCyclePeriod: parseInt(e.target.value) })}
                        min={3}
                        max={50}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">D1 Smooth</label>
                      <input
                        type="number"
                        value={newIndicator.stcD1Period || 3}
                        onChange={(e) => setNewIndicator({ ...newIndicator, stcD1Period: parseInt(e.target.value) })}
                        min={1}
                        max={20}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">D2 Smooth</label>
                      <input
                        type="number"
                        value={newIndicator.stcD2Period || 3}
                        onChange={(e) => setNewIndicator({ ...newIndicator, stcD2Period: parseInt(e.target.value) })}
                        min={1}
                        max={20}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 3: Levels */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Upper Level (Overbought)</label>
                      <input
                        type="number"
                        value={newIndicator.stcUpperLevel || 75}
                        onChange={(e) => setNewIndicator({ ...newIndicator, stcUpperLevel: parseInt(e.target.value) })}
                        min={50}
                        max={100}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Lower Level (Oversold)</label>
                      <input
                        type="number"
                        value={newIndicator.stcLowerLevel || 25}
                        onChange={(e) => setNewIndicator({ ...newIndicator, stcLowerLevel: parseInt(e.target.value) })}
                        min={0}
                        max={50}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 4: Color and Show Levels */}
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">STC Line Color</label>
                      <input
                        type="color"
                        value={newIndicator.stcColor || '#2196f3'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, stcColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center pb-1">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showStcLevels !== undefined ? newIndicator.showStcLevels : true}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showStcLevels: e.target.checked })}
                          className="mr-2"
                        />
                        Show Levels
                      </label>
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'choppiness' && (
                <>
                  {/* Row 1: Period */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                    <input
                      type="number"
                      value={newIndicator.choppinessPeriod || 14}
                      onChange={(e) => setNewIndicator({ ...newIndicator, choppinessPeriod: parseInt(e.target.value) })}
                      min={5}
                      max={100}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Row 2: Levels */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Upper Level (Ranging)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newIndicator.choppinessUpperLevel || 61.8}
                        onChange={(e) => setNewIndicator({ ...newIndicator, choppinessUpperLevel: parseFloat(e.target.value) })}
                        min={50}
                        max={100}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Lower Level (Trending)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newIndicator.choppinessLowerLevel || 38.2}
                        onChange={(e) => setNewIndicator({ ...newIndicator, choppinessLowerLevel: parseFloat(e.target.value) })}
                        min={0}
                        max={50}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 3: Color and Show Levels */}
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Line Color</label>
                      <input
                        type="color"
                        value={newIndicator.choppinessColor || '#ff9800'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, choppinessColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center pb-1">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showChoppinessLevels !== undefined ? newIndicator.showChoppinessLevels : true}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showChoppinessLevels: e.target.checked })}
                          className="mr-2"
                        />
                        Show Levels
                      </label>
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'supertrend' && (
                <>
                  {/* Row 1: Period and Multiplier */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">ATR Period</label>
                      <input
                        type="number"
                        value={newIndicator.supertrendPeriod || 10}
                        onChange={(e) => setNewIndicator({ ...newIndicator, supertrendPeriod: parseInt(e.target.value) })}
                        min={1}
                        max={50}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newIndicator.supertrendMultiplier || 3.0}
                        onChange={(e) => setNewIndicator({ ...newIndicator, supertrendMultiplier: parseFloat(e.target.value) })}
                        min={1.0}
                        max={10.0}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 2: Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Uptrend Color</label>
                      <input
                        type="color"
                        value={newIndicator.supertrendUpColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, supertrendUpColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Downtrend Color</label>
                      <input
                        type="color"
                        value={newIndicator.supertrendDownColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, supertrendDownColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  
                  {/* Row 3: Signal Colors and Show Signals */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Buy Signal Color</label>
                      <input
                        type="color"
                        value={newIndicator.supertrendBuyColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, supertrendBuyColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Sell Signal Color</label>
                      <input
                        type="color"
                        value={newIndicator.supertrendSellColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, supertrendSellColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center pb-1">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showSupertrendSignals !== undefined ? newIndicator.showSupertrendSignals : true}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showSupertrendSignals: e.target.checked })}
                          className="mr-2"
                        />
                        Show Signals
                      </label>
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'ma_ribbon_heatmap' && (
                <>
                  {/* Row 1: MA Type and Periods */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">MA Type</label>
                      <select
                        value={newIndicator.maRibbonMaType || 'sma'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, maRibbonMaType: e.target.value as 'sma' | 'ema' })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="sma">SMA (Simple)</option>
                        <option value="ema">EMA (Exponential)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Periods (comma-separated)</label>
                      <input
                        type="text"
                        value={newIndicator.maRibbonPeriods?.join(',') || '5,10,15,20,25,30,35,40,45,50'}
                        onChange={(e) => {
                          const periods = e.target.value.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
                          setNewIndicator({ ...newIndicator, maRibbonPeriods: periods });
                        }}
                        placeholder="5,10,15,20,25,30,35,40,45,50"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Row 2: Trend Colors */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Uptrend Color</label>
                      <input
                        type="color"
                        value={newIndicator.maRibbonUptrendColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, maRibbonUptrendColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Downtrend Color</label>
                      <input
                        type="color"
                        value={newIndicator.maRibbonDowntrendColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, maRibbonDowntrendColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Neutral Color</label>
                      <input
                        type="color"
                        value={newIndicator.maRibbonNeutralColor || '#787b86'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, maRibbonNeutralColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  
                  {/* Row 3: Opacity and Show Heatmap */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Opacity</label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={newIndicator.maRibbonOpacity || 0.3}
                        onChange={(e) => setNewIndicator({ ...newIndicator, maRibbonOpacity: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 text-center">
                        {(newIndicator.maRibbonOpacity || 0.3).toFixed(1)}
                      </div>
                    </div>
                    <div className="flex items-center pb-1">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showMaRibbonHeatmap !== undefined ? newIndicator.showMaRibbonHeatmap : true}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showMaRibbonHeatmap: e.target.checked })}
                          className="mr-2"
                        />
                        Show Heatmap
                      </label>
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'linreg' && (
                <>
                  <div className="text-xs text-gray-600 mb-3">
                    Linear Regression fits a trend line to price data using least squares method. 
                    Shows basis line and optional upper/lower bands based on standard deviation.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={newIndicator.linregPeriod || 20}
                        onChange={(e) => setNewIndicator({ ...newIndicator, linregPeriod: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Std Dev Multiplier</label>
                      <input
                        type="number"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={newIndicator.linregStdDevMultiplier || 2.0}
                        onChange={(e) => setNewIndicator({ ...newIndicator, linregStdDevMultiplier: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Basis Line Color</label>
                      <input
                        type="color"
                        value={newIndicator.linregBasisColor || '#2196f3'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, linregBasisColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Upper Band Color</label>
                      <input
                        type="color"
                        value={newIndicator.linregUpperBandColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, linregUpperBandColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Lower Band Color</label>
                      <input
                        type="color"
                        value={newIndicator.linregLowerBandColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, linregLowerBandColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center pb-1">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showLinregBands !== undefined ? newIndicator.showLinregBands : true}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showLinregBands: e.target.checked })}
                          className="mr-2"
                        />
                        Show Bands
                      </label>
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'kalman_filter' && (
                <>
                  <div className="text-xs text-gray-600 mb-3">
                    Kalman Filter MA uses state-space smoothing to provide adaptive trend estimation. 
                    More responsive than traditional MAs with built-in noise filtering.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Process Noise (Q)</label>
                      <input
                        type="number"
                        min="0.001"
                        max="1.0"
                        step="0.001"
                        value={newIndicator.kalmanProcessNoise || 0.01}
                        onChange={(e) => setNewIndicator({ ...newIndicator, kalmanProcessNoise: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Measurement Noise (R)</label>
                      <input
                        type="number"
                        min="0.001"
                        max="1.0"
                        step="0.001"
                        value={newIndicator.kalmanMeasurementNoise || 0.1}
                        onChange={(e) => setNewIndicator({ ...newIndicator, kalmanMeasurementNoise: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Initial Variance (P)</label>
                      <input
                        type="number"
                        min="0.1"
                        max="10.0"
                        step="0.1"
                        value={newIndicator.kalmanInitialVariance || 1.0}
                        onChange={(e) => setNewIndicator({ ...newIndicator, kalmanInitialVariance: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Smoothing Factor</label>
                      <input
                        type="number"
                        min="0.01"
                        max="1.0"
                        step="0.01"
                        value={newIndicator.kalmanSmoothingFactor || 0.1}
                        onChange={(e) => setNewIndicator({ ...newIndicator, kalmanSmoothingFactor: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">KFMA Color</label>
                      <input
                        type="color"
                        value={newIndicator.color || '#ff6b35'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, color: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Confidence Band Color</label>
                      <input
                        type="color"
                        value={newIndicator.kalmanConfidenceColor || '#787b86'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, kalmanConfidenceColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center pb-1">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showKalmanConfidence !== undefined ? newIndicator.showKalmanConfidence : false}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showKalmanConfidence: e.target.checked })}
                          className="mr-2"
                        />
                        Show Confidence Bands
                      </label>
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'range_filter' && (
                <>
                  <div className="text-xs text-gray-600 mb-3">
                    Range Filter uses adaptive range calculation to filter price noise and generate clear trading signals. 
                    Provides signal line, upper/lower bands, and buy/sell signals.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Range Method</label>
                      <select
                        value={newIndicator.rangeFilterMethod || 'atr'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, rangeFilterMethod: e.target.value as 'atr' | 'percentage' | 'stddev' })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      >
                        <option value="atr">ATR (Average True Range)</option>
                        <option value="percentage">Percentage</option>
                        <option value="stddev">Standard Deviation</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={newIndicator.rangeFilterPeriod || 14}
                        onChange={(e) => setNewIndicator({ ...newIndicator, rangeFilterPeriod: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Multiplier</label>
                      <input
                        type="number"
                        min="0.5"
                        max="5.0"
                        step="0.1"
                        value={newIndicator.rangeFilterMultiplier || 2.0}
                        onChange={(e) => setNewIndicator({ ...newIndicator, rangeFilterMultiplier: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Smoothing</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newIndicator.rangeFilterSmoothing || 3}
                        onChange={(e) => setNewIndicator({ ...newIndicator, rangeFilterSmoothing: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Signal Line Color</label>
                      <input
                        type="color"
                        value={newIndicator.rangeFilterSignalColor || '#2196f3'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, rangeFilterSignalColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Upper Band Color</label>
                      <input
                        type="color"
                        value={newIndicator.rangeFilterUpperColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, rangeFilterUpperColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Lower Band Color</label>
                      <input
                        type="color"
                        value={newIndicator.rangeFilterLowerColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, rangeFilterLowerColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Buy Signal Color</label>
                      <input
                        type="color"
                        value={newIndicator.rangeFilterBuyColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, rangeFilterBuyColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Sell Signal Color</label>
                      <input
                        type="color"
                        value={newIndicator.rangeFilterSellColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, rangeFilterSellColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center pb-1">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showRangeFilterSignals !== undefined ? newIndicator.showRangeFilterSignals : true}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showRangeFilterSignals: e.target.checked })}
                          className="mr-2"
                        />
                        Show Buy/Sell Signals
                      </label>
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'htf_trend_heat' && (
                <>
                  <div className="text-xs text-gray-600 mb-3">
                    HTF Trend Heat (MTF) analyzes MA and RSI alignment across multiple timeframes. 
                    Trend score and alignment lines appear in a separate pane below the chart, while trend signals overlay on the main chart.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Timeframes</label>
                      <select
                        value={Array.isArray(newIndicator.htfTimeframes) ? newIndicator.htfTimeframes.join(',') : '1h,4h,1d'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, htfTimeframes: e.target.value.split(',') })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      >
                        <option value="1h,4h,1d">1h, 4h, 1d</option>
                        <option value="15m,1h,4h">15m, 1h, 4h</option>
                        <option value="5m,15m,1h">5m, 15m, 1h</option>
                        <option value="1h,4h,1d,1w">1h, 4h, 1d, 1w</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">MA Period</label>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={newIndicator.htfMaPeriod || 20}
                        onChange={(e) => setNewIndicator({ ...newIndicator, htfMaPeriod: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">RSI Period</label>
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={newIndicator.htfRsiPeriod || 14}
                        onChange={(e) => setNewIndicator({ ...newIndicator, htfRsiPeriod: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">MA Type</label>
                      <select
                        value={newIndicator.htfMaType || 'ema'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, htfMaType: e.target.value as 'sma' | 'ema' })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      >
                        <option value="ema">EMA (Exponential)</option>
                        <option value="sma">SMA (Simple)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Score Color</label>
                      <input
                        type="color"
                        value={newIndicator.htfScoreColor || '#ff6b35'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, htfScoreColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Score Threshold</label>
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={newIndicator.htfScoreThreshold || 70}
                        onChange={(e) => setNewIndicator({ ...newIndicator, htfScoreThreshold: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center pb-1">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showHtfHeatmap !== undefined ? newIndicator.showHtfHeatmap : true}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showHtfHeatmap: e.target.checked })}
                          className="mr-2"
                        />
                        Show Heatmap
                      </label>
                    </div>
                    <div className="flex items-center pb-1">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.showHtfScore !== undefined ? newIndicator.showHtfScore : true}
                          onChange={(e) => setNewIndicator({ ...newIndicator, showHtfScore: e.target.checked })}
                          className="mr-2"
                        />
                        Show Score Lines
                      </label>
                    </div>
                  </div>
                </>
              )}

              {newIndicator.type === 'mfp' && (
                <>
                  <div className="text-xs text-gray-600 mb-3">
                    Money Flow Pressure (MFP) analyzes buying and selling pressure by combining price and volume data. 
                    Values above 80 indicate overbought conditions, below 20 indicate oversold conditions.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={newIndicator.mfpPeriod || 14}
                        onChange={(e) => setNewIndicator({ ...newIndicator, mfpPeriod: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">MFP Color</label>
                      <input
                        type="color"
                        value={newIndicator.mfpColor || '#9c27b0'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, mfpColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Level</label>
                      <input
                        type="number"
                        min="70"
                        max="95"
                        value={newIndicator.mfpOverboughtLevel || 80}
                        onChange={(e) => setNewIndicator({ ...newIndicator, mfpOverboughtLevel: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Level</label>
                      <input
                        type="number"
                        min="5"
                        max="30"
                        value={newIndicator.mfpOversoldLevel || 20}
                        onChange={(e) => setNewIndicator({ ...newIndicator, mfpOversoldLevel: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Color</label>
                      <input
                        type="color"
                        value={newIndicator.mfpOverboughtColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, mfpOverboughtColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Color</label>
                      <input
                        type="color"
                        value={newIndicator.mfpOversoldColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, mfpOversoldColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Volume Settings */}
              {newIndicator.type === 'volume' && (
                <>
                  <div className="text-xs text-gray-600 mb-3">
                    Volume indicator displays trading volume as histogram bars, colored based on price direction 
                    (green for up candles, red for down candles). Optionally includes a volume moving average.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Up Bar Color</label>
                      <input
                        type="color"
                        value={newIndicator.volumeUpColor || '#4caf50'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, volumeUpColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Down Bar Color</label>
                      <input
                        type="color"
                        value={newIndicator.volumeDownColor || '#f44336'}
                        onChange={(e) => setNewIndicator({ ...newIndicator, volumeDownColor: e.target.value })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIndicator.volumeShowMA || false}
                          onChange={(e) => setNewIndicator({ ...newIndicator, volumeShowMA: e.target.checked })}
                          className="mr-2"
                        />
                        Show Volume Moving Average
                      </label>
                    </div>
                    {newIndicator.volumeShowMA && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">MA Type</label>
                          <select
                            value={newIndicator.volumeMaType || 'sma'}
                            onChange={(e) => setNewIndicator({ ...newIndicator, volumeMaType: e.target.value as 'sma' | 'ema' })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          >
                            <option value="sma">SMA (Simple)</option>
                            <option value="ema">EMA (Exponential)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">MA Period</label>
                          <input
                            type="number"
                            min="5"
                            max="50"
                            value={newIndicator.volumeMAPeriod || 20}
                            onChange={(e) => setNewIndicator({ ...newIndicator, volumeMAPeriod: parseInt(e.target.value) })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">MA Color</label>
                          <input
                            type="color"
                            value={newIndicator.volumeMAColor || '#2196f3'}
                            onChange={(e) => setNewIndicator({ ...newIndicator, volumeMAColor: e.target.value })}
                            className="w-full h-8 border border-gray-300 rounded"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowIndicatorModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={addIndicator}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RSI Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'rsi' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">RSI Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: Period and EMA Length */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">RSI Period</label>
                  <input
                    type="number"
                    id="settingsRsiLength"
                    defaultValue={selectedIndicator.period}
                    min={2}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">EMA Length</label>
                  <input
                    type="number"
                    id="settingsRsiEmaLength"
                    defaultValue={selectedIndicator.emaLength || 9}
                    min={1}
                    max={50}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 2: RSI Color and EMA Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">RSI Color</label>
                  <input
                    type="color"
                    id="settingsRsiColor"
                    defaultValue={selectedIndicator.color}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">EMA Color</label>
                  <input
                    type="color"
                    id="settingsRsiEmaColor"
                    defaultValue={selectedIndicator.emaColor || '#ff9500'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 3: Overbought and Oversold Levels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Level</label>
                  <input
                    type="number"
                    id="settingsOverboughtLevel"
                    defaultValue={selectedIndicator.overboughtLevel || 70}
                    min={50}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Level</label>
                  <input
                    type="number"
                    id="settingsOversoldLevel"
                    defaultValue={selectedIndicator.oversoldLevel || 30}
                    min={0}
                    max={50}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 4: Overbought and Oversold Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Color</label>
                  <input
                    type="color"
                    id="settingsOverboughtColor"
                    defaultValue={selectedIndicator.overboughtColor || '#787b86'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Color</label>
                  <input
                    type="color"
                    id="settingsOversoldColor"
                    defaultValue={selectedIndicator.oversoldColor || '#787b86'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={applySettings}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMA Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'ema' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">EMA Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Period */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                <input
                  type="number"
                  id="settingsEmaPeriod"
                  defaultValue={selectedIndicator.period || 20}
                  min={1}
                  max={200}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Line Color</label>
                <input
                  type="color"
                  id="settingsEmaColor"
                  defaultValue={selectedIndicator.color || '#2196F3'}
                  className="w-full h-8 border border-gray-300 rounded"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const period = parseInt((document.getElementById('settingsEmaPeriod') as HTMLInputElement)?.value || '20');
                  const color = (document.getElementById('settingsEmaColor') as HTMLInputElement)?.value || '#2196F3';
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, {
                      period,
                      color
                    });
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMA Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'sma' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">SMA Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Period */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                <input
                  type="number"
                  id="settingsSmaPeriod"
                  defaultValue={selectedIndicator.period || 20}
                  min={1}
                  max={200}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Line Color</label>
                <input
                  type="color"
                  id="settingsSmaColor"
                  defaultValue={selectedIndicator.color || '#FF6D00'}
                  className="w-full h-8 border border-gray-300 rounded"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const period = parseInt((document.getElementById('settingsSmaPeriod') as HTMLInputElement)?.value || '20');
                  const color = (document.getElementById('settingsSmaColor') as HTMLInputElement)?.value || '#FF6D00';
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, {
                      period,
                      color
                    });
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MACD Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'macd' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">MACD Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: Fast Period and Slow Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fast Period</label>
                  <input
                    type="number"
                    id="settingsMacdFastPeriod"
                    defaultValue={selectedIndicator.fastPeriod || 12}
                    min={5}
                    max={50}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Slow Period</label>
                  <input
                    type="number"
                    id="settingsMacdSlowPeriod"
                    defaultValue={selectedIndicator.slowPeriod || 26}
                    min={10}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 2: Signal Period */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Signal Period</label>
                <input
                  type="number"
                  id="settingsMacdSignalPeriod"
                  defaultValue={selectedIndicator.signalPeriod || 9}
                  min={3}
                  max={30}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Row 3: MACD Line Color and Signal Line Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">MACD Line Color</label>
                  <input
                    type="color"
                    id="settingsMacdColor"
                    defaultValue={selectedIndicator.macdColor || '#2196f3'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Signal Line Color</label>
                  <input
                    type="color"
                    id="settingsMacdSignalColor"
                    defaultValue={selectedIndicator.signalColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 4: Histogram Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Histogram Up Color</label>
                  <input
                    type="color"
                    id="settingsMacdHistogramUpColor"
                    defaultValue={selectedIndicator.histogramUpColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Histogram Down Color</label>
                  <input
                    type="color"
                    id="settingsMacdHistogramDownColor"
                    defaultValue={selectedIndicator.histogramDownColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const fastPeriod = parseInt((document.getElementById('settingsMacdFastPeriod') as HTMLInputElement)?.value || '12');
                  const slowPeriod = parseInt((document.getElementById('settingsMacdSlowPeriod') as HTMLInputElement)?.value || '26');
                  const signalPeriod = parseInt((document.getElementById('settingsMacdSignalPeriod') as HTMLInputElement)?.value || '9');
                  const macdColor = (document.getElementById('settingsMacdColor') as HTMLInputElement)?.value || '#2196f3';
                  const signalColor = (document.getElementById('settingsMacdSignalColor') as HTMLInputElement)?.value || '#f44336';
                  const histogramUpColor = (document.getElementById('settingsMacdHistogramUpColor') as HTMLInputElement)?.value || '#4caf50';
                  const histogramDownColor = (document.getElementById('settingsMacdHistogramDownColor') as HTMLInputElement)?.value || '#f44336';
                  
                  console.log('=== APPLYING MACD SETTINGS ===');
                  console.log('Fast Period:', fastPeriod, 'Slow Period:', slowPeriod, 'Signal Period:', signalPeriod);
                  console.log('MACD Color:', macdColor, 'Signal Color:', signalColor);
                  console.log('Histogram Up:', histogramUpColor, 'Histogram Down:', histogramDownColor);
                  
                  // Update the indicator settings
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      fastPeriod,
                      slowPeriod,
                      signalPeriod,
                      macdColor,
                      signalColor,
                      histogramUpColor,
                      histogramDownColor
                    };
                    
                    logger.debug('Updated settings:', updates);
                    
                    // Use updateIndicator method to properly update the existing indicator
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CCI Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'cci' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">CCI Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: CCI Period */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">CCI Period</label>
                <input
                  type="number"
                  id="settingsCciPeriod"
                  defaultValue={selectedIndicator.cciPeriod || 20}
                  min={5}
                  max={100}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Row 2: CCI Color */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">CCI Line Color</label>
                <input
                  type="color"
                  id="settingsCciColor"
                  defaultValue={selectedIndicator.color || '#ff9500'}
                  className="w-full h-8 border border-gray-300 rounded"
                />
              </div>
              
              {/* Row 3: Overbought and Oversold Levels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Level</label>
                  <input
                    type="number"
                    id="settingsCciOverboughtLevel"
                    defaultValue={selectedIndicator.cciOverboughtLevel || 100}
                    min={50}
                    max={200}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Level</label>
                  <input
                    type="number"
                    id="settingsCciOversoldLevel"
                    defaultValue={selectedIndicator.cciOversoldLevel || -100}
                    min={-200}
                    max={-50}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 4: Level Colors */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Color</label>
                  <input
                    type="color"
                    id="settingsCciOverboughtColor"
                    defaultValue={selectedIndicator.cciOverboughtColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Color</label>
                  <input
                    type="color"
                    id="settingsCciOversoldColor"
                    defaultValue={selectedIndicator.cciOversoldColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Zero Line Color</label>
                  <input
                    type="color"
                    id="settingsCciZeroColor"
                    defaultValue={selectedIndicator.cciZeroColor || '#787b86'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const cciPeriod = parseInt((document.getElementById('settingsCciPeriod') as HTMLInputElement)?.value || '20');
                  const cciColor = (document.getElementById('settingsCciColor') as HTMLInputElement)?.value || '#ff9500';
                  const cciOverboughtLevel = parseInt((document.getElementById('settingsCciOverboughtLevel') as HTMLInputElement)?.value || '100');
                  const cciOversoldLevel = parseInt((document.getElementById('settingsCciOversoldLevel') as HTMLInputElement)?.value || '-100');
                  const cciOverboughtColor = (document.getElementById('settingsCciOverboughtColor') as HTMLInputElement)?.value || '#f44336';
                  const cciOversoldColor = (document.getElementById('settingsCciOversoldColor') as HTMLInputElement)?.value || '#4caf50';
                  const cciZeroColor = (document.getElementById('settingsCciZeroColor') as HTMLInputElement)?.value || '#787b86';
                  
                  console.log('=== APPLYING CCI SETTINGS ===');
                  console.log('CCI Period:', cciPeriod);
                  console.log('CCI Color:', cciColor);
                  console.log('Overbought Level:', cciOverboughtLevel, 'Oversold Level:', cciOversoldLevel);
                  console.log('Overbought Color:', cciOverboughtColor, 'Oversold Color:', cciOversoldColor, 'Zero Color:', cciZeroColor);
                  
                  // Update the indicator settings
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      cciPeriod,
                      color: cciColor,
                      cciOverboughtLevel,
                      cciOversoldLevel,
                      cciOverboughtColor,
                      cciOversoldColor,
                      cciZeroColor
                    };
                    
                    logger.debug('Updated settings:', updates);
                    
                    // Use updateIndicator method to properly update the existing indicator
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MFI Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'mfi' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">MFI Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: MFI Period */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">MFI Period</label>
                <input
                  type="number"
                  id="settingsMfiPeriod"
                  defaultValue={selectedIndicator.mfiPeriod || 14}
                  min={5}
                  max={50}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Row 2: MFI Color */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">MFI Line Color</label>
                <input
                  type="color"
                  id="settingsMfiColor"
                  defaultValue={selectedIndicator.color || '#9c27b0'}
                  className="w-full h-8 border border-gray-300 rounded"
                />
              </div>
              
              {/* Row 3: Overbought and Oversold Levels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Level</label>
                  <input
                    type="number"
                    id="settingsMfiOverboughtLevel"
                    defaultValue={selectedIndicator.mfiOverboughtLevel || 80}
                    min={70}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Level</label>
                  <input
                    type="number"
                    id="settingsMfiOversoldLevel"
                    defaultValue={selectedIndicator.mfiOversoldLevel || 20}
                    min={0}
                    max={30}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 4: Level Colors */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Color</label>
                  <input
                    type="color"
                    id="settingsMfiOverboughtColor"
                    defaultValue={selectedIndicator.mfiOverboughtColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Color</label>
                  <input
                    type="color"
                    id="settingsMfiOversoldColor"
                    defaultValue={selectedIndicator.mfiOversoldColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Middle Line Color</label>
                  <input
                    type="color"
                    id="settingsMfiMiddleColor"
                    defaultValue={selectedIndicator.mfiMiddleColor || '#787b86'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const mfiPeriod = parseInt((document.getElementById('settingsMfiPeriod') as HTMLInputElement)?.value || '14');
                  const mfiColor = (document.getElementById('settingsMfiColor') as HTMLInputElement)?.value || '#9c27b0';
                  const mfiOverboughtLevel = parseInt((document.getElementById('settingsMfiOverboughtLevel') as HTMLInputElement)?.value || '80');
                  const mfiOversoldLevel = parseInt((document.getElementById('settingsMfiOversoldLevel') as HTMLInputElement)?.value || '20');
                  const mfiOverboughtColor = (document.getElementById('settingsMfiOverboughtColor') as HTMLInputElement)?.value || '#f44336';
                  const mfiOversoldColor = (document.getElementById('settingsMfiOversoldColor') as HTMLInputElement)?.value || '#4caf50';
                  const mfiMiddleColor = (document.getElementById('settingsMfiMiddleColor') as HTMLInputElement)?.value || '#787b86';
                  
                  console.log('=== APPLYING MFI SETTINGS ===');
                  console.log('MFI Period:', mfiPeriod);
                  console.log('MFI Color:', mfiColor);
                  console.log('Overbought Level:', mfiOverboughtLevel, 'Oversold Level:', mfiOversoldLevel);
                  console.log('Overbought Color:', mfiOverboughtColor, 'Oversold Color:', mfiOversoldColor, 'Middle Color:', mfiMiddleColor);
                  
                  // Update the indicator settings
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      mfiPeriod,
                      color: mfiColor,
                      mfiOverboughtLevel,
                      mfiOversoldLevel,
                      mfiOverboughtColor,
                      mfiOversoldColor,
                      mfiMiddleColor
                    };
                    
                    logger.debug('Updated settings:', updates);
                    
                    // Use updateIndicator method to properly update the existing indicator
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Williams VIX Fix Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'williams_vix_fix' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Williams VIX Fix Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: VIX Fix Period and BB Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">VIX Fix Period</label>
                  <input
                    type="number"
                    id="settingsVixFixPeriod"
                    defaultValue={selectedIndicator.vixFixPeriod || 22}
                    min={5}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">BB Period</label>
                  <input
                    type="number"
                    id="settingsVixFixBBPeriod"
                    defaultValue={selectedIndicator.vixFixBBPeriod || 20}
                    min={5}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 2: BB Std Dev and Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">BB Std Dev</label>
                  <input
                    type="number"
                    step="0.1"
                    id="settingsVixFixBBStdDev"
                    defaultValue={selectedIndicator.vixFixBBStdDev || 2.0}
                    min={0.5}
                    max={5.0}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Threshold Level</label>
                  <input
                    type="number"
                    id="settingsVixFixThreshold"
                    defaultValue={selectedIndicator.vixFixThreshold || 80}
                    min={0}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 3: Show Bands and VIX Fix Color */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center">
                  <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      id="settingsShowVixFixBands"
                      defaultChecked={selectedIndicator.showVixFixBands !== undefined ? selectedIndicator.showVixFixBands : true}
                      className="mr-2"
                    />
                    Show BB Bands
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">VIX Fix Color</label>
                  <input
                    type="color"
                    id="settingsVixFixColor"
                    defaultValue={selectedIndicator.vixFixColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Info Section */}
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <h4 className="text-xs font-semibold text-red-900 mb-2">What is Williams VIX Fix?</h4>
                <p className="text-xs text-red-800 leading-relaxed">
                  Williams VIX Fix identifies potential market bottoms by detecting periods of heightened volatility. 
                  High values (above threshold) indicate increased fear and possible reversal opportunities.
                </p>
                <p className="text-xs text-red-800 leading-relaxed mt-2">
                  <strong>Formula:</strong> ((Highest Close - Current Low) / Highest Close) × 100
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const vixFixPeriod = parseInt((document.getElementById('settingsVixFixPeriod') as HTMLInputElement)?.value || '22');
                  const vixFixBBPeriod = parseInt((document.getElementById('settingsVixFixBBPeriod') as HTMLInputElement)?.value || '20');
                  const vixFixBBStdDev = parseFloat((document.getElementById('settingsVixFixBBStdDev') as HTMLInputElement)?.value || '2.0');
                  const vixFixThreshold = parseInt((document.getElementById('settingsVixFixThreshold') as HTMLInputElement)?.value || '80');
                  const showVixFixBands = (document.getElementById('settingsShowVixFixBands') as HTMLInputElement)?.checked || true;
                  const vixFixColor = (document.getElementById('settingsVixFixColor') as HTMLInputElement)?.value || '#f44336';
                  
                  console.log('=== APPLYING WILLIAMS VIX FIX SETTINGS ===');
                  console.log('VIX Fix Period:', vixFixPeriod);
                  console.log('BB Period:', vixFixBBPeriod);
                  console.log('BB Std Dev:', vixFixBBStdDev);
                  console.log('Threshold:', vixFixThreshold);
                  console.log('Show Bands:', showVixFixBands);
                  console.log('VIX Fix Color:', vixFixColor);
                  
                  // Update the indicator settings
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      vixFixPeriod,
                      vixFixBBPeriod,
                      vixFixBBStdDev,
                      vixFixThreshold,
                      showVixFixBands,
                      vixFixColor
                    };
                    
                    logger.debug('Updated settings:', updates);
                    
                    // Use updateIndicator method to properly update the existing indicator
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anchored VWAP Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'anchored_vwap' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Anchored VWAP Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: Anchor Index and VWAP Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Anchor Index</label>
                  <input
                    type="number"
                    id="settingsAnchorIndex"
                    defaultValue={selectedIndicator.anchorIndex || 0}
                    min={0}
                    max={1000}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = Start from first bar</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">VWAP Color</label>
                  <input
                    type="color"
                    id="settingsVwapColor"
                    defaultValue={selectedIndicator.vwapColor || '#2962ff'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 2: Show Std Dev and Multiplier */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center">
                  <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      id="settingsShowStdDev"
                      defaultChecked={selectedIndicator.showStdDev !== undefined ? selectedIndicator.showStdDev : false}
                      className="mr-2"
                    />
                    Show Std Dev Bands
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Std Dev Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    id="settingsStdDevMultiplier"
                    defaultValue={selectedIndicator.stdDevMultiplier || 2.0}
                    min={0.5}
                    max={5.0}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">What is Anchored VWAP?</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Anchored VWAP calculates the volume-weighted average price from a specific starting point (anchor). 
                  It helps identify fair value levels and acts as dynamic support/resistance.
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-2">
                  <strong>Standard Deviation Bands:</strong> Show zones of price deviation from the VWAP, useful for mean reversion trading.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const anchorIndex = parseInt((document.getElementById('settingsAnchorIndex') as HTMLInputElement)?.value || '0');
                  const vwapColor = (document.getElementById('settingsVwapColor') as HTMLInputElement)?.value || '#2962ff';
                  const showStdDev = (document.getElementById('settingsShowStdDev') as HTMLInputElement)?.checked || false;
                  const stdDevMultiplier = parseFloat((document.getElementById('settingsStdDevMultiplier') as HTMLInputElement)?.value || '2.0');
                  
                  console.log('=== APPLYING ANCHORED VWAP SETTINGS ===');
                  console.log('Anchor Index:', anchorIndex);
                  console.log('VWAP Color:', vwapColor);
                  console.log('Show Std Dev:', showStdDev);
                  console.log('Std Dev Multiplier:', stdDevMultiplier);
                  
                  // Update the indicator settings
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      anchorIndex,
                      vwapColor,
                      showStdDev,
                      stdDevMultiplier
                    };
                    
                    logger.debug('Updated settings:', updates);
                    
                    // Use updateIndicator method to properly update the existing indicator
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chandelier Exit Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'chandelier_exit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Chandelier Exit Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: Period and Multiplier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                  <input
                    type="number"
                    id="settingsChandelierPeriod"
                    defaultValue={selectedIndicator.chandelierPeriod || 22}
                    min={5}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ATR Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    id="settingsAtrMultiplier"
                    defaultValue={selectedIndicator.atrMultiplier || 3.0}
                    min={0.5}
                    max={10.0}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 2: Show Options */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center">
                  <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      id="settingsShowLongExit"
                      defaultChecked={selectedIndicator.showLongExit !== undefined ? selectedIndicator.showLongExit : true}
                      className="mr-2"
                    />
                    Show Long Exit
                  </label>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      id="settingsShowShortExit"
                      defaultChecked={selectedIndicator.showShortExit !== undefined ? selectedIndicator.showShortExit : true}
                      className="mr-2"
                    />
                    Show Short Exit
                  </label>
                </div>
              </div>
              
              {/* Row 3: Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Long Exit Color</label>
                  <input
                    type="color"
                    id="settingsLongExitColor"
                    defaultValue={selectedIndicator.longExitColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Short Exit Color</label>
                  <input
                    type="color"
                    id="settingsShortExitColor"
                    defaultValue={selectedIndicator.shortExitColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const chandelierPeriod = parseInt((document.getElementById('settingsChandelierPeriod') as HTMLInputElement)?.value || '22');
                  const atrMultiplier = parseFloat((document.getElementById('settingsAtrMultiplier') as HTMLInputElement)?.value || '3.0');
                  const showLongExit = (document.getElementById('settingsShowLongExit') as HTMLInputElement)?.checked || true;
                  const showShortExit = (document.getElementById('settingsShowShortExit') as HTMLInputElement)?.checked || true;
                  const longExitColor = (document.getElementById('settingsLongExitColor') as HTMLInputElement)?.value || '#4caf50';
                  const shortExitColor = (document.getElementById('settingsShortExitColor') as HTMLInputElement)?.value || '#f44336';
                  
                  console.log('=== APPLYING CHANDELIER EXIT SETTINGS ===');
                  console.log('Period:', chandelierPeriod);
                  console.log('ATR Multiplier:', atrMultiplier);
                  console.log('Show Long Exit:', showLongExit);
                  console.log('Show Short Exit:', showShortExit);
                  console.log('Long Exit Color:', longExitColor);
                  console.log('Short Exit Color:', shortExitColor);
                  
                  // Update the indicator settings
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      chandelierPeriod,
                      atrMultiplier,
                      showLongExit,
                      showShortExit,
                      longExitColor,
                      shortExitColor
                    };
                    
                    logger.debug('Updated settings:', updates);
                    
                    // Use updateIndicator method to properly update the existing indicator
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donchian Width Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'donchian_width' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Donchian Width Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: Period and Middle Line */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                  <input
                    type="number"
                    id="settingsDonchianPeriod"
                    defaultValue={selectedIndicator.donchianPeriod || 20}
                    min={5}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      id="settingsShowMiddleLine"
                      defaultChecked={selectedIndicator.showMiddleLine !== undefined ? selectedIndicator.showMiddleLine : false}
                      className="mr-2"
                    />
                    Show Middle Line
                  </label>
                </div>
              </div>
              
              {/* Row 2: Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Width Color</label>
                  <input
                    type="color"
                    id="settingsDonchianWidthColor"
                    defaultValue={selectedIndicator.donchianWidthColor || '#2196f3'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Middle Line Color</label>
                  <input
                    type="color"
                    id="settingsMiddleLineColor"
                    defaultValue={selectedIndicator.middleLineColor || '#787b86'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const donchianPeriod = parseInt((document.getElementById('settingsDonchianPeriod') as HTMLInputElement)?.value || '20');
                  const showMiddleLine = (document.getElementById('settingsShowMiddleLine') as HTMLInputElement)?.checked || false;
                  const donchianWidthColor = (document.getElementById('settingsDonchianWidthColor') as HTMLInputElement)?.value || '#2196f3';
                  const middleLineColor = (document.getElementById('settingsMiddleLineColor') as HTMLInputElement)?.value || '#787b86';
                  
                  console.log('=== APPLYING DONCHIAN WIDTH SETTINGS ===');
                  console.log('Period:', donchianPeriod);
                  console.log('Show Middle Line:', showMiddleLine);
                  console.log('Width Color:', donchianWidthColor);
                  console.log('Middle Line Color:', middleLineColor);
                  
                  // Update the indicator settings
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      donchianPeriod,
                      showMiddleLine,
                      donchianWidthColor,
                      middleLineColor
                    };
                    
                    logger.debug('Updated settings:', updates);
                    
                    // Use updateIndicator method to properly update the existing indicator
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Choppiness Index Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'choppiness' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Choppiness Index Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Period */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                <input
                  type="number"
                  id="settingsChoppinessPeriod"
                  defaultValue={selectedIndicator.choppinessPeriod || 14}
                  min={5}
                  max={100}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Levels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Upper Level (Ranging)</label>
                  <input
                    type="number"
                    step="0.1"
                    id="settingsChoppinessUpperLevel"
                    defaultValue={selectedIndicator.choppinessUpperLevel || 61.8}
                    min={50}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Lower Level (Trending)</label>
                  <input
                    type="number"
                    step="0.1"
                    id="settingsChoppinessLowerLevel"
                    defaultValue={selectedIndicator.choppinessLowerLevel || 38.2}
                    min={0}
                    max={50}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Line Color</label>
                <input
                  type="color"
                  id="settingsChoppinessColor"
                  defaultValue={selectedIndicator.choppinessColor || '#ff9800'}
                  className="w-full h-8 border border-gray-300 rounded"
                />
              </div>
              
              {/* Show Levels */}
              <div className="flex items-center">
                <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id="settingsShowChoppinessLevels"
                    defaultChecked={selectedIndicator.showChoppinessLevels !== undefined ? selectedIndicator.showChoppinessLevels : true}
                    className="mr-2"
                  />
                  Show Threshold Levels
                </label>
              </div>
              
              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">What is Choppiness Index?</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  The Choppiness Index (CI) measures market direction vs sideways movement. It oscillates between 0-100, 
                  where lower values indicate trending markets and higher values indicate ranging/choppy markets.
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-2">
                  <strong>Formula:</strong> 100 × log10(Σ ATR / (High-Low)) / log10(period)
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-1">
                  <strong>Signals:</strong> Below 38.2 = Trending, Above 61.8 = Ranging
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const choppinessPeriod = parseInt((document.getElementById('settingsChoppinessPeriod') as HTMLInputElement)?.value || '14');
                  const choppinessUpperLevel = parseFloat((document.getElementById('settingsChoppinessUpperLevel') as HTMLInputElement)?.value || '61.8');
                  const choppinessLowerLevel = parseFloat((document.getElementById('settingsChoppinessLowerLevel') as HTMLInputElement)?.value || '38.2');
                  const choppinessColor = (document.getElementById('settingsChoppinessColor') as HTMLInputElement)?.value || '#ff9800';
                  const showChoppinessLevels = (document.getElementById('settingsShowChoppinessLevels') as HTMLInputElement)?.checked || true;
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      choppinessPeriod,
                      choppinessUpperLevel,
                      choppinessLowerLevel,
                      choppinessColor,
                      showChoppinessLevels
                    };
                    
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SuperTrend Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'supertrend' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">SuperTrend Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: Period and Multiplier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ATR Period</label>
                  <input
                    type="number"
                    id="settingsSupertrendPeriod"
                    defaultValue={selectedIndicator.supertrendPeriod || 10}
                    min={1}
                    max={50}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    id="settingsSupertrendMultiplier"
                    defaultValue={selectedIndicator.supertrendMultiplier || 3.0}
                    min={1.0}
                    max={10.0}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 2: Trend Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Uptrend Color</label>
                  <input
                    type="color"
                    id="settingsSupertrendUpColor"
                    defaultValue={selectedIndicator.supertrendUpColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Downtrend Color</label>
                  <input
                    type="color"
                    id="settingsSupertrendDownColor"
                    defaultValue={selectedIndicator.supertrendDownColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 3: Signal Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Buy Signal Color</label>
                  <input
                    type="color"
                    id="settingsSupertrendBuyColor"
                    defaultValue={selectedIndicator.supertrendBuyColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sell Signal Color</label>
                  <input
                    type="color"
                    id="settingsSupertrendSellColor"
                    defaultValue={selectedIndicator.supertrendSellColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Show Signals */}
              <div className="flex items-center">
                <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id="settingsShowSupertrendSignals"
                    defaultChecked={selectedIndicator.showSupertrendSignals !== undefined ? selectedIndicator.showSupertrendSignals : true}
                    className="mr-2"
                  />
                  Show Buy/Sell Signals
                </label>
              </div>
              
              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">What is SuperTrend?</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  SuperTrend is a trend-following indicator that uses ATR (Average True Range) to determine market direction. 
                  It provides clear buy and sell signals based on price position relative to calculated bands.
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-2">
                  <strong>Formula:</strong> Upper Band = (High + Low) / 2 + (Multiplier × ATR)<br/>
                  Lower Band = (High + Low) / 2 - (Multiplier × ATR)
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-1">
                  <strong>Signals:</strong> Green line = Uptrend, Red line = Downtrend. Trend changes generate buy/sell signals.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const supertrendPeriod = parseInt((document.getElementById('settingsSupertrendPeriod') as HTMLInputElement)?.value || '10');
                  const supertrendMultiplier = parseFloat((document.getElementById('settingsSupertrendMultiplier') as HTMLInputElement)?.value || '3.0');
                  const supertrendUpColor = (document.getElementById('settingsSupertrendUpColor') as HTMLInputElement)?.value || '#4caf50';
                  const supertrendDownColor = (document.getElementById('settingsSupertrendDownColor') as HTMLInputElement)?.value || '#f44336';
                  const supertrendBuyColor = (document.getElementById('settingsSupertrendBuyColor') as HTMLInputElement)?.value || '#4caf50';
                  const supertrendSellColor = (document.getElementById('settingsSupertrendSellColor') as HTMLInputElement)?.value || '#f44336';
                  const showSupertrendSignals = (document.getElementById('settingsShowSupertrendSignals') as HTMLInputElement)?.checked || true;
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      supertrendPeriod,
                      supertrendMultiplier,
                      supertrendUpColor,
                      supertrendDownColor,
                      supertrendBuyColor,
                      supertrendSellColor,
                      showSupertrendSignals
                    };
                    
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MA Ribbon Heatmap Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'ma_ribbon_heatmap' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">MA Ribbon Heatmap Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: MA Type and Periods */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">MA Type</label>
                  <select
                    id="settingsMaRibbonMaType"
                    defaultValue={selectedIndicator.maRibbonMaType || 'sma'}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="sma">SMA (Simple)</option>
                    <option value="ema">EMA (Exponential)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Periods (comma-separated)</label>
                  <input
                    type="text"
                    id="settingsMaRibbonPeriods"
                    defaultValue={selectedIndicator.maRibbonPeriods?.join(',') || '5,10,15,20,25,30,35,40,45,50'}
                    placeholder="5,10,15,20,25,30,35,40,45,50"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 2: Trend Colors */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Uptrend Color</label>
                  <input
                    type="color"
                    id="settingsMaRibbonUptrendColor"
                    defaultValue={selectedIndicator.maRibbonUptrendColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Downtrend Color</label>
                  <input
                    type="color"
                    id="settingsMaRibbonDowntrendColor"
                    defaultValue={selectedIndicator.maRibbonDowntrendColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Neutral Color</label>
                  <input
                    type="color"
                    id="settingsMaRibbonNeutralColor"
                    defaultValue={selectedIndicator.maRibbonNeutralColor || '#787b86'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 3: Opacity and Show Heatmap */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Opacity</label>
                  <input
                    type="range"
                    id="settingsMaRibbonOpacity"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    defaultValue={selectedIndicator.maRibbonOpacity || 0.3}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 text-center">
                    {(selectedIndicator.maRibbonOpacity || 0.3).toFixed(1)}
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      id="settingsShowMaRibbonHeatmap"
                      defaultChecked={selectedIndicator.showMaRibbonHeatmap !== undefined ? selectedIndicator.showMaRibbonHeatmap : true}
                      className="mr-2"
                    />
                    Show Heatmap
                  </label>
                </div>
              </div>
              
              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">What is MA Ribbon Heatmap?</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  MA Ribbon Heatmap displays multiple moving averages simultaneously, creating a ribbon-like visualization. 
                  The spacing between MAs indicates trend strength, while colors show trend direction.
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-2">
                  <strong>Features:</strong> Multiple MA periods (5-50), SMA/EMA options, color-coded trends, heatmap intensity
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-1">
                  <strong>Signals:</strong> Green = Uptrend, Red = Downtrend, Gray = Neutral. Wider spacing = Stronger trend.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const maRibbonMaType = (document.getElementById('settingsMaRibbonMaType') as HTMLSelectElement)?.value as 'sma' | 'ema' || 'sma';
                  const maRibbonPeriodsText = (document.getElementById('settingsMaRibbonPeriods') as HTMLInputElement)?.value || '5,10,15,20,25,30,35,40,45,50';
                  const maRibbonPeriods = maRibbonPeriodsText.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
                  const maRibbonUptrendColor = (document.getElementById('settingsMaRibbonUptrendColor') as HTMLInputElement)?.value || '#4caf50';
                  const maRibbonDowntrendColor = (document.getElementById('settingsMaRibbonDowntrendColor') as HTMLInputElement)?.value || '#f44336';
                  const maRibbonNeutralColor = (document.getElementById('settingsMaRibbonNeutralColor') as HTMLInputElement)?.value || '#787b86';
                  const maRibbonOpacity = parseFloat((document.getElementById('settingsMaRibbonOpacity') as HTMLInputElement)?.value || '0.3');
                  const showMaRibbonHeatmap = (document.getElementById('settingsShowMaRibbonHeatmap') as HTMLInputElement)?.checked || true;
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      maRibbonMaType,
                      maRibbonPeriods,
                      maRibbonUptrendColor,
                      maRibbonDowntrendColor,
                      maRibbonNeutralColor,
                      maRibbonOpacity,
                      showMaRibbonHeatmap
                    };
                    
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Linear Regression Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'linreg' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Linear Regression Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: Period and Std Dev Multiplier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                  <input
                    type="number"
                    id="settingsLinregPeriod"
                    min="5"
                    max="100"
                    defaultValue={selectedIndicator.linregPeriod || 20}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Std Dev Multiplier</label>
                  <input
                    type="number"
                    id="settingsLinregStdDevMultiplier"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    defaultValue={selectedIndicator.linregStdDevMultiplier || 2.0}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 2: Colors */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Basis Line Color</label>
                  <input
                    type="color"
                    id="settingsLinregBasisColor"
                    defaultValue={selectedIndicator.linregBasisColor || '#2196f3'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Upper Band Color</label>
                  <input
                    type="color"
                    id="settingsLinregUpperBandColor"
                    defaultValue={selectedIndicator.linregUpperBandColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Lower Band Color</label>
                  <input
                    type="color"
                    id="settingsLinregLowerBandColor"
                    defaultValue={selectedIndicator.linregLowerBandColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 3: Show Options */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center">
                  <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      id="settingsShowLinregBands"
                      defaultChecked={selectedIndicator.showLinregBands !== undefined ? selectedIndicator.showLinregBands : true}
                      className="mr-2"
                    />
                    Show Bands
                  </label>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      id="settingsShowLinregSlope"
                      defaultChecked={selectedIndicator.showLinregSlope !== undefined ? selectedIndicator.showLinregSlope : false}
                      className="mr-2"
                    />
                    Show Slope Info
                  </label>
                </div>
              </div>
              
              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">What is Linear Regression?</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Linear Regression fits a trend line to price data using the least squares method. 
                  It provides a dynamic trend line that adjusts as new data becomes available.
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-2">
                  <strong>Features:</strong> Basis line (regression line), upper/lower bands (standard deviation), slope calculation
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-1">
                  <strong>Signals:</strong> Price above basis = uptrend, price below basis = downtrend. Bands indicate overbought/oversold.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const linregPeriod = parseInt((document.getElementById('settingsLinregPeriod') as HTMLInputElement)?.value || '20');
                  const linregStdDevMultiplier = parseFloat((document.getElementById('settingsLinregStdDevMultiplier') as HTMLInputElement)?.value || '2.0');
                  const linregBasisColor = (document.getElementById('settingsLinregBasisColor') as HTMLInputElement)?.value || '#2196f3';
                  const linregUpperBandColor = (document.getElementById('settingsLinregUpperBandColor') as HTMLInputElement)?.value || '#f44336';
                  const linregLowerBandColor = (document.getElementById('settingsLinregLowerBandColor') as HTMLInputElement)?.value || '#4caf50';
                  const showLinregBands = (document.getElementById('settingsShowLinregBands') as HTMLInputElement)?.checked || true;
                  const showLinregSlope = (document.getElementById('settingsShowLinregSlope') as HTMLInputElement)?.checked || false;
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      linregPeriod,
                      linregStdDevMultiplier,
                      linregBasisColor,
                      linregUpperBandColor,
                      linregLowerBandColor,
                      showLinregBands,
                      showLinregSlope
                    };
                    
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kalman Filter Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'kalman_filter' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Kalman Filter Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: Process and Measurement Noise */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Process Noise (Q)</label>
                  <input
                    type="number"
                    id="settingsKalmanProcessNoise"
                    min="0.001"
                    max="1.0"
                    step="0.001"
                    defaultValue={selectedIndicator.kalmanProcessNoise || 0.01}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Measurement Noise (R)</label>
                  <input
                    type="number"
                    id="settingsKalmanMeasurementNoise"
                    min="0.001"
                    max="1.0"
                    step="0.001"
                    defaultValue={selectedIndicator.kalmanMeasurementNoise || 0.1}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 2: Initial Variance and Smoothing Factor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Initial Variance (P)</label>
                  <input
                    type="number"
                    id="settingsKalmanInitialVariance"
                    min="0.1"
                    max="10.0"
                    step="0.1"
                    defaultValue={selectedIndicator.kalmanInitialVariance || 1.0}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Smoothing Factor</label>
                  <input
                    type="number"
                    id="settingsKalmanSmoothingFactor"
                    min="0.01"
                    max="1.0"
                    step="0.01"
                    defaultValue={selectedIndicator.kalmanSmoothingFactor || 0.1}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 3: Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">KFMA Color</label>
                  <input
                    type="color"
                    id="settingsKalmanColor"
                    defaultValue={selectedIndicator.color || '#ff6b35'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confidence Band Color</label>
                  <input
                    type="color"
                    id="settingsKalmanConfidenceColor"
                    defaultValue={selectedIndicator.kalmanConfidenceColor || '#787b86'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 4: Show Options */}
              <div className="flex items-center">
                <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id="settingsShowKalmanConfidence"
                    defaultChecked={selectedIndicator.showKalmanConfidence !== undefined ? selectedIndicator.showKalmanConfidence : false}
                    className="mr-2"
                  />
                  Show Confidence Bands
                </label>
              </div>
              
              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">What is Kalman Filter MA?</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Kalman Filter MA uses state-space smoothing to provide adaptive trend estimation. 
                  It's more responsive than traditional MAs with built-in noise filtering.
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-2">
                  <strong>Features:</strong> Process noise (Q), measurement noise (R), confidence bands, adaptive smoothing
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-1">
                  <strong>Signals:</strong> Smoother trend line than traditional MAs, confidence bands show uncertainty range.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const kalmanProcessNoise = parseFloat((document.getElementById('settingsKalmanProcessNoise') as HTMLInputElement)?.value || '0.01');
                  const kalmanMeasurementNoise = parseFloat((document.getElementById('settingsKalmanMeasurementNoise') as HTMLInputElement)?.value || '0.1');
                  const kalmanInitialVariance = parseFloat((document.getElementById('settingsKalmanInitialVariance') as HTMLInputElement)?.value || '1.0');
                  const kalmanSmoothingFactor = parseFloat((document.getElementById('settingsKalmanSmoothingFactor') as HTMLInputElement)?.value || '0.1');
                  const kalmanColor = (document.getElementById('settingsKalmanColor') as HTMLInputElement)?.value || '#ff6b35';
                  const kalmanConfidenceColor = (document.getElementById('settingsKalmanConfidenceColor') as HTMLInputElement)?.value || '#787b86';
                  const showKalmanConfidence = (document.getElementById('settingsShowKalmanConfidence') as HTMLInputElement)?.checked || false;
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      kalmanProcessNoise,
                      kalmanMeasurementNoise,
                      kalmanInitialVariance,
                      kalmanSmoothingFactor,
                      color: kalmanColor,
                      kalmanConfidenceColor,
                      showKalmanConfidence
                    };
                    
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Range Filter Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'range_filter' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Range Filter Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: Method and Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Range Method</label>
                  <select
                    id="settingsRangeFilterMethod"
                    defaultValue={selectedIndicator.rangeFilterMethod || 'atr'}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="atr">ATR (Average True Range)</option>
                    <option value="percentage">Percentage</option>
                    <option value="stddev">Standard Deviation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                  <input
                    type="number"
                    id="settingsRangeFilterPeriod"
                    min="5"
                    max="50"
                    defaultValue={selectedIndicator.rangeFilterPeriod || 14}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 2: Multiplier and Smoothing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Multiplier</label>
                  <input
                    type="number"
                    id="settingsRangeFilterMultiplier"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    defaultValue={selectedIndicator.rangeFilterMultiplier || 2.0}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Smoothing</label>
                  <input
                    type="number"
                    id="settingsRangeFilterSmoothing"
                    min="1"
                    max="10"
                    defaultValue={selectedIndicator.rangeFilterSmoothing || 3}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 3: Colors */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Signal Line Color</label>
                  <input
                    type="color"
                    id="settingsRangeFilterSignalColor"
                    defaultValue={selectedIndicator.rangeFilterSignalColor || '#2196f3'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Upper Band Color</label>
                  <input
                    type="color"
                    id="settingsRangeFilterUpperColor"
                    defaultValue={selectedIndicator.rangeFilterUpperColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Lower Band Color</label>
                  <input
                    type="color"
                    id="settingsRangeFilterLowerColor"
                    defaultValue={selectedIndicator.rangeFilterLowerColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 4: Signal Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Buy Signal Color</label>
                  <input
                    type="color"
                    id="settingsRangeFilterBuyColor"
                    defaultValue={selectedIndicator.rangeFilterBuyColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sell Signal Color</label>
                  <input
                    type="color"
                    id="settingsRangeFilterSellColor"
                    defaultValue={selectedIndicator.rangeFilterSellColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 5: Show Options */}
              <div className="flex items-center">
                <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id="settingsShowRangeFilterSignals"
                    defaultChecked={selectedIndicator.showRangeFilterSignals !== undefined ? selectedIndicator.showRangeFilterSignals : true}
                    className="mr-2"
                  />
                  Show Buy/Sell Signals
                </label>
              </div>
              
              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">What is Range Filter?</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Range Filter uses adaptive range calculation to filter price noise and generate clear trading signals. 
                  It provides a signal line with upper/lower bands and buy/sell signals.
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-2">
                  <strong>Features:</strong> Signal line, upper/lower bands, buy/sell signals, adaptive range calculation
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-1">
                  <strong>Signals:</strong> Buy when price crosses above upper band, sell when price crosses below lower band.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const rangeFilterMethod = (document.getElementById('settingsRangeFilterMethod') as HTMLSelectElement)?.value as 'atr' | 'percentage' | 'stddev' || 'atr';
                  const rangeFilterPeriod = parseInt((document.getElementById('settingsRangeFilterPeriod') as HTMLInputElement)?.value || '14');
                  const rangeFilterMultiplier = parseFloat((document.getElementById('settingsRangeFilterMultiplier') as HTMLInputElement)?.value || '2.0');
                  const rangeFilterSmoothing = parseInt((document.getElementById('settingsRangeFilterSmoothing') as HTMLInputElement)?.value || '3');
                  const rangeFilterSignalColor = (document.getElementById('settingsRangeFilterSignalColor') as HTMLInputElement)?.value || '#2196f3';
                  const rangeFilterUpperColor = (document.getElementById('settingsRangeFilterUpperColor') as HTMLInputElement)?.value || '#4caf50';
                  const rangeFilterLowerColor = (document.getElementById('settingsRangeFilterLowerColor') as HTMLInputElement)?.value || '#f44336';
                  const rangeFilterBuyColor = (document.getElementById('settingsRangeFilterBuyColor') as HTMLInputElement)?.value || '#4caf50';
                  const rangeFilterSellColor = (document.getElementById('settingsRangeFilterSellColor') as HTMLInputElement)?.value || '#f44336';
                  const showRangeFilterSignals = (document.getElementById('settingsShowRangeFilterSignals') as HTMLInputElement)?.checked || true;
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      rangeFilterMethod,
                      rangeFilterPeriod,
                      rangeFilterMultiplier,
                      rangeFilterSmoothing,
                      rangeFilterSignalColor,
                      rangeFilterUpperColor,
                      rangeFilterLowerColor,
                      rangeFilterBuyColor,
                      rangeFilterSellColor,
                      showRangeFilterSignals
                    };
                    
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HTF Trend Heat (MTF) Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'htf_trend_heat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">HTF Trend Heat (MTF) Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: Timeframes and MA Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Timeframes</label>
                  <select
                    id="settingsHtfTimeframes"
                    defaultValue={Array.isArray(selectedIndicator.htfTimeframes) ? selectedIndicator.htfTimeframes.join(',') : '1h,4h,1d'}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="1h,4h,1d">1h, 4h, 1d</option>
                    <option value="15m,1h,4h">15m, 1h, 4h</option>
                    <option value="5m,15m,1h">5m, 15m, 1h</option>
                    <option value="1h,4h,1d,1w">1h, 4h, 1d, 1w</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">MA Period</label>
                  <input
                    type="number"
                    id="settingsHtfMaPeriod"
                    min="5"
                    max="100"
                    defaultValue={selectedIndicator.htfMaPeriod || 20}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 2: RSI Period and MA Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">RSI Period</label>
                  <input
                    type="number"
                    id="settingsHtfRsiPeriod"
                    min="5"
                    max="50"
                    defaultValue={selectedIndicator.htfRsiPeriod || 14}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">MA Type</label>
                  <select
                    id="settingsHtfMaType"
                    defaultValue={selectedIndicator.htfMaType || 'ema'}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ema">EMA (Exponential)</option>
                    <option value="sma">SMA (Simple)</option>
                  </select>
                </div>
              </div>
              
              {/* Row 3: Score Threshold and Score Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Score Threshold</label>
                  <input
                    type="number"
                    id="settingsHtfScoreThreshold"
                    min="50"
                    max="100"
                    defaultValue={selectedIndicator.htfScoreThreshold || 70}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Score Color</label>
                  <input
                    type="color"
                    id="settingsHtfScoreColor"
                    defaultValue={selectedIndicator.htfScoreColor || '#ff6b35'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 4: Show Options */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center">
                  <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      id="settingsShowHtfHeatmap"
                      defaultChecked={selectedIndicator.showHtfHeatmap !== undefined ? selectedIndicator.showHtfHeatmap : true}
                      className="mr-2"
                    />
                    Show Heatmap
                  </label>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      id="settingsShowHtfScore"
                      defaultChecked={selectedIndicator.showHtfScore !== undefined ? selectedIndicator.showHtfScore : true}
                      className="mr-2"
                    />
                    Show Score Lines
                  </label>
                </div>
              </div>
              
              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">What is HTF Trend Heat (MTF)?</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  HTF Trend Heat analyzes MA and RSI alignment across multiple timeframes to generate a composite trend score. 
                  Trend score and alignment lines appear in a separate pane below the chart, while trend signals overlay on the main chart.
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-2">
                  <strong>Features:</strong> Multi-timeframe analysis, trend score, MA alignment, RSI alignment, heatmap visualization
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-1">
                  <strong>Signals:</strong> High trend score (&gt;70) indicates strong trend alignment across timeframes.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const htfTimeframes = (document.getElementById('settingsHtfTimeframes') as HTMLSelectElement)?.value.split(',') || ['1h', '4h', '1d'];
                  const htfMaPeriod = parseInt((document.getElementById('settingsHtfMaPeriod') as HTMLInputElement)?.value || '20');
                  const htfRsiPeriod = parseInt((document.getElementById('settingsHtfRsiPeriod') as HTMLInputElement)?.value || '14');
                  const htfMaType = (document.getElementById('settingsHtfMaType') as HTMLSelectElement)?.value as 'sma' | 'ema' || 'ema';
                  const htfScoreThreshold = parseInt((document.getElementById('settingsHtfScoreThreshold') as HTMLInputElement)?.value || '70');
                  const htfScoreColor = (document.getElementById('settingsHtfScoreColor') as HTMLInputElement)?.value || '#ff6b35';
                  const showHtfHeatmap = (document.getElementById('settingsShowHtfHeatmap') as HTMLInputElement)?.checked || true;
                  const showHtfScore = (document.getElementById('settingsShowHtfScore') as HTMLInputElement)?.checked || true;
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      htfTimeframes,
                      htfMaPeriod,
                      htfRsiPeriod,
                      htfMaType,
                      htfScoreThreshold,
                      htfScoreColor,
                      showHtfHeatmap,
                      showHtfScore
                    };
                    
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Money Flow Pressure (MFP) Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'mfp' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Money Flow Pressure (MFP) Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="text-xs text-gray-600 mb-3">
                Money Flow Pressure analyzes buying and selling pressure by combining price and volume data. 
                Values above 80 indicate overbought conditions, below 20 indicate oversold conditions.
              </div>
              
              {/* Row 1: Period and MFP Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                  <input
                    type="number"
                    id="settingsMfpPeriod"
                    min="5"
                    max="50"
                    defaultValue={selectedIndicator.mfpPeriod || 14}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">MFP Color</label>
                  <input
                    type="color"
                    id="settingsMfpColor"
                    defaultValue={selectedIndicator.mfpColor || '#9c27b0'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 2: Overbought and Oversold Levels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Level</label>
                  <input
                    type="number"
                    id="settingsMfpOverboughtLevel"
                    min="70"
                    max="95"
                    defaultValue={selectedIndicator.mfpOverboughtLevel || 80}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Level</label>
                  <input
                    type="number"
                    id="settingsMfpOversoldLevel"
                    min="5"
                    max="30"
                    defaultValue={selectedIndicator.mfpOversoldLevel || 20}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 3: Overbought and Oversold Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Overbought Color</label>
                  <input
                    type="color"
                    id="settingsMfpOverboughtColor"
                    defaultValue={selectedIndicator.mfpOverboughtColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Oversold Color</label>
                  <input
                    type="color"
                    id="settingsMfpOversoldColor"
                    defaultValue={selectedIndicator.mfpOversoldColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const mfpPeriod = parseInt((document.getElementById('settingsMfpPeriod') as HTMLInputElement)?.value || '14');
                  const mfpColor = (document.getElementById('settingsMfpColor') as HTMLInputElement)?.value || '#9c27b0';
                  const mfpOverboughtLevel = parseInt((document.getElementById('settingsMfpOverboughtLevel') as HTMLInputElement)?.value || '80');
                  const mfpOversoldLevel = parseInt((document.getElementById('settingsMfpOversoldLevel') as HTMLInputElement)?.value || '20');
                  const mfpOverboughtColor = (document.getElementById('settingsMfpOverboughtColor') as HTMLInputElement)?.value || '#f44336';
                  const mfpOversoldColor = (document.getElementById('settingsMfpOversoldColor') as HTMLInputElement)?.value || '#4caf50';
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      mfpPeriod,
                      mfpColor,
                      mfpOverboughtLevel,
                      mfpOversoldLevel,
                      mfpOverboughtColor,
                      mfpOversoldColor
                    };
                    
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Relative Volume (RVOL) Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'rvol' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Relative Volume (RVOL) Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="text-xs text-gray-600 mb-3">
                Relative Volume compares current volume to average volume over N periods. 
                Values above 2.0 indicate high volume activity, below 0.5 indicate low volume.
              </div>
              
              {/* Row 1: Period and RVOL Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                  <input
                    type="number"
                    id="settingsRvolPeriod"
                    min="5"
                    max="50"
                    defaultValue={selectedIndicator.rvolPeriod || 14}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">RVOL Color</label>
                  <input
                    type="color"
                    id="settingsRvolColor"
                    defaultValue={selectedIndicator.rvolColor || '#2196f3'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 1.5: Volume Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Volume Color</label>
                  <input
                    type="color"
                    id="settingsRvolVolumeColor"
                    defaultValue={selectedIndicator.rvolVolumeColor || '#787b86'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div></div>
              </div>
              
              {/* Row 2: High and Low Thresholds */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">High Threshold</label>
                  <input
                    type="number"
                    id="settingsRvolHighThreshold"
                    min="1.5"
                    max="5.0"
                    step="0.1"
                    defaultValue={selectedIndicator.rvolHighThreshold || 2.0}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Low Threshold</label>
                  <input
                    type="number"
                    id="settingsRvolLowThreshold"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    defaultValue={selectedIndicator.rvolLowThreshold || 0.5}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 3: High and Low Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">High Color</label>
                  <input
                    type="color"
                    id="settingsRvolHighColor"
                    defaultValue={selectedIndicator.rvolHighColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Low Color</label>
                  <input
                    type="color"
                    id="settingsRvolLowColor"
                    defaultValue={selectedIndicator.rvolLowColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const rvolPeriod = parseInt((document.getElementById('settingsRvolPeriod') as HTMLInputElement)?.value || '14');
                  const rvolColor = (document.getElementById('settingsRvolColor') as HTMLInputElement)?.value || '#2196f3';
                  const rvolVolumeColor = (document.getElementById('settingsRvolVolumeColor') as HTMLInputElement)?.value || '#787b86';
                  const rvolHighThreshold = parseFloat((document.getElementById('settingsRvolHighThreshold') as HTMLInputElement)?.value || '2.0');
                  const rvolLowThreshold = parseFloat((document.getElementById('settingsRvolLowThreshold') as HTMLInputElement)?.value || '0.5');
                  const rvolHighColor = (document.getElementById('settingsRvolHighColor') as HTMLInputElement)?.value || '#f44336';
                  const rvolLowColor = (document.getElementById('settingsRvolLowColor') as HTMLInputElement)?.value || '#4caf50';
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      rvolPeriod,
                      rvolColor,
                      rvolVolumeColor,
                      rvolHighThreshold,
                      rvolLowThreshold,
                      rvolHighColor,
                      rvolLowColor
                    };
                    
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Volume Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'volume' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Volume Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="text-xs text-gray-600 mb-3">
                Customize the appearance of volume bars and optional moving average overlay.
              </div>
              
              {/* Row 1: Up and Down Bar Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Up Bar Color</label>
                  <input
                    type="color"
                    id="settingsVolumeUpColor"
                    defaultValue={selectedIndicator.volumeUpColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Down Bar Color</label>
                  <input
                    type="color"
                    id="settingsVolumeDownColor"
                    defaultValue={selectedIndicator.volumeDownColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 2: Show MA Checkbox */}
              <div className="flex items-center">
                <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id="settingsVolumeShowMA"
                    defaultChecked={selectedIndicator.volumeShowMA || false}
                    className="mr-2"
                  />
                  Show Volume Moving Average
                </label>
              </div>
              
              {/* Row 3: MA Type, Period and Color */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">MA Type</label>
                  <select
                    id="settingsVolumeMaType"
                    defaultValue={selectedIndicator.volumeMaType || 'sma'}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="sma">SMA</option>
                    <option value="ema">EMA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">MA Period</label>
                  <input
                    type="number"
                    id="settingsVolumeMAPeriod"
                    min="5"
                    max="50"
                    defaultValue={selectedIndicator.volumeMAPeriod || 20}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">MA Color</label>
                  <input
                    type="color"
                    id="settingsVolumeMAColor"
                    defaultValue={selectedIndicator.volumeMAColor || '#2196f3'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const volumeUpColor = (document.getElementById('settingsVolumeUpColor') as HTMLInputElement)?.value || '#4caf50';
                  const volumeDownColor = (document.getElementById('settingsVolumeDownColor') as HTMLInputElement)?.value || '#f44336';
                  const volumeShowMA = (document.getElementById('settingsVolumeShowMA') as HTMLInputElement)?.checked || false;
                  const volumeMaType = (document.getElementById('settingsVolumeMaType') as HTMLSelectElement)?.value || 'sma';
                  const volumeMAPeriod = parseInt((document.getElementById('settingsVolumeMAPeriod') as HTMLInputElement)?.value || '20');
                  const volumeMAColor = (document.getElementById('settingsVolumeMAColor') as HTMLInputElement)?.value || '#2196f3';
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      volumeUpColor,
                      volumeDownColor,
                      volumeShowMA,
                      volumeMaType,
                      volumeMAPeriod,
                      volumeMAColor
                    };
                    
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STC Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'stc' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">STC Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: Fast and Slow Periods */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fast EMA Period</label>
                  <input
                    type="number"
                    id="settingsStcFastPeriod"
                    defaultValue={selectedIndicator.stcFastPeriod || 23}
                    min={5}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Slow EMA Period</label>
                  <input
                    type="number"
                    id="settingsStcSlowPeriod"
                    defaultValue={selectedIndicator.stcSlowPeriod || 50}
                    min={10}
                    max={200}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 2: Cycle and Smoothing */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cycle Period</label>
                  <input
                    type="number"
                    id="settingsStcCyclePeriod"
                    defaultValue={selectedIndicator.stcCyclePeriod || 10}
                    min={3}
                    max={50}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">D1 Smooth</label>
                  <input
                    type="number"
                    id="settingsStcD1Period"
                    defaultValue={selectedIndicator.stcD1Period || 3}
                    min={1}
                    max={20}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">D2 Smooth</label>
                  <input
                    type="number"
                    id="settingsStcD2Period"
                    defaultValue={selectedIndicator.stcD2Period || 3}
                    min={1}
                    max={20}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 3: Levels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Upper Level</label>
                  <input
                    type="number"
                    id="settingsStcUpperLevel"
                    defaultValue={selectedIndicator.stcUpperLevel || 75}
                    min={50}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Lower Level</label>
                  <input
                    type="number"
                    id="settingsStcLowerLevel"
                    defaultValue={selectedIndicator.stcLowerLevel || 25}
                    min={0}
                    max={50}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 4: Color */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">STC Line Color</label>
                <input
                  type="color"
                  id="settingsStcColor"
                  defaultValue={selectedIndicator.stcColor || '#2196f3'}
                  className="w-full h-8 border border-gray-300 rounded"
                />
              </div>
              
              {/* Row 5: Show Levels */}
              <div className="flex items-center">
                <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id="settingsShowStcLevels"
                    defaultChecked={selectedIndicator.showStcLevels !== undefined ? selectedIndicator.showStcLevels : true}
                    className="mr-2"
                  />
                  Show Overbought/Oversold Levels
                </label>
              </div>
              
              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">What is STC?</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Schaff Trend Cycle (STC) combines MACD and Stochastic Oscillator to identify trends and reversals 
                  earlier than traditional indicators. It oscillates between 0-100.
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-2">
                  <strong>Formula:</strong> Double-smoothed stochastic of MACD line
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-1">
                  <strong>Signals:</strong> Above 75 = Overbought, Below 25 = Oversold
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const stcFastPeriod = parseInt((document.getElementById('settingsStcFastPeriod') as HTMLInputElement)?.value || '23');
                  const stcSlowPeriod = parseInt((document.getElementById('settingsStcSlowPeriod') as HTMLInputElement)?.value || '50');
                  const stcCyclePeriod = parseInt((document.getElementById('settingsStcCyclePeriod') as HTMLInputElement)?.value || '10');
                  const stcD1Period = parseInt((document.getElementById('settingsStcD1Period') as HTMLInputElement)?.value || '3');
                  const stcD2Period = parseInt((document.getElementById('settingsStcD2Period') as HTMLInputElement)?.value || '3');
                  const stcUpperLevel = parseInt((document.getElementById('settingsStcUpperLevel') as HTMLInputElement)?.value || '75');
                  const stcLowerLevel = parseInt((document.getElementById('settingsStcLowerLevel') as HTMLInputElement)?.value || '25');
                  const stcColor = (document.getElementById('settingsStcColor') as HTMLInputElement)?.value || '#2196f3';
                  const showStcLevels = (document.getElementById('settingsShowStcLevels') as HTMLInputElement)?.checked || true;
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      stcFastPeriod,
                      stcSlowPeriod,
                      stcCyclePeriod,
                      stcD1Period,
                      stcD2Period,
                      stcUpperLevel,
                      stcLowerLevel,
                      stcColor,
                      showStcLevels
                    };
                    
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QQE Settings Modal */}
      {showSettingsModal && selectedIndicator && selectedIndicator.type === 'qqe' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-4 w-96 max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">QQE Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Row 1: RSI Period and Smoothing Factor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">RSI Period</label>
                  <input
                    type="number"
                    id="settingsQqeRsiPeriod"
                    defaultValue={selectedIndicator.qqeRsiPeriod || 14}
                    min={5}
                    max={50}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Smoothing Factor (SF)</label>
                  <input
                    type="number"
                    id="settingsQqeSF"
                    defaultValue={selectedIndicator.qqeSF || 5}
                    min={1}
                    max={20}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 2: Wilders Period and Factor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Wilders Period</label>
                  <input
                    type="number"
                    id="settingsQqeWildersPeriod"
                    defaultValue={selectedIndicator.qqeWildersPeriod || 27}
                    min={5}
                    max={100}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Factor</label>
                  <input
                    type="number"
                    step="0.001"
                    id="settingsQqeFactor"
                    defaultValue={selectedIndicator.qqeFactor || 4.236}
                    min={1}
                    max={10}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Row 3: Colors */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">QQE Line Color</label>
                  <input
                    type="color"
                    id="settingsQqeLineColor"
                    defaultValue={selectedIndicator.qqeLineColor || '#2196f3'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fast Trail Color</label>
                  <input
                    type="color"
                    id="settingsQqeFastColor"
                    defaultValue={selectedIndicator.qqeFastColor || '#4caf50'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Slow Trail Color</label>
                  <input
                    type="color"
                    id="settingsQqeSlowColor"
                    defaultValue={selectedIndicator.qqeSlowColor || '#f44336'}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Row 4: Show Levels */}
              <div className="flex items-center">
                <label className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id="settingsShowQqeLevels"
                    defaultChecked={selectedIndicator.showQqeLevels !== undefined ? selectedIndicator.showQqeLevels : true}
                    className="mr-2"
                  />
                  Show Overbought/Oversold Levels (70/50/30)
                </label>
              </div>
              
              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">What is QQE?</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  QQE (Quantitative Qualitative Estimation) is an enhanced RSI indicator that applies smoothing 
                  and volatility-based trailing stops. It provides clearer signals and reduces market noise.
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-2">
                  <strong>Formula:</strong> Smoothed RSI + ATR-based trailing stops
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-1">
                  <strong>Signals:</strong> Buy when QQE crosses above fast trail, Sell when below slow trail
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const qqeRsiPeriod = parseInt((document.getElementById('settingsQqeRsiPeriod') as HTMLInputElement)?.value || '14');
                  const qqeSF = parseInt((document.getElementById('settingsQqeSF') as HTMLInputElement)?.value || '5');
                  const qqeWildersPeriod = parseInt((document.getElementById('settingsQqeWildersPeriod') as HTMLInputElement)?.value || '27');
                  const qqeFactor = parseFloat((document.getElementById('settingsQqeFactor') as HTMLInputElement)?.value || '4.236');
                  const qqeLineColor = (document.getElementById('settingsQqeLineColor') as HTMLInputElement)?.value || '#2196f3';
                  const qqeFastColor = (document.getElementById('settingsQqeFastColor') as HTMLInputElement)?.value || '#4caf50';
                  const qqeSlowColor = (document.getElementById('settingsQqeSlowColor') as HTMLInputElement)?.value || '#f44336';
                  const showQqeLevels = (document.getElementById('settingsShowQqeLevels') as HTMLInputElement)?.checked || true;
                  
                  if (selectedIndicator && indicatorEngineRef.current) {
                    const updates = {
                      qqeRsiPeriod,
                      qqeSF,
                      qqeWildersPeriod,
                      qqeFactor,
                      qqeLineColor,
                      qqeFastColor,
                      qqeSlowColor,
                      showQqeLevels
                    };
                    
                    indicatorEngineRef.current.updateIndicator(selectedIndicator.id, updates);
                    setShowSettingsModal(false);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Builder Modal */}
      <AlertBuilder
        open={showAlertBuilder}
        onOpenChange={setShowAlertBuilder}
        defaultSymbol={symbol}
        defaultTimeframe={interval}
        prefillIndicator={alertPrefill?.indicator}
        prefillComponent={alertPrefill?.component}
      />

    </div>
  );
};

export default CleanCharts;

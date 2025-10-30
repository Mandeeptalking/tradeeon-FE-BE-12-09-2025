import { ISeriesApi, LineSeries, HistogramSeries, IChartApi } from 'lightweight-charts';

// ============================================================================
// INDICATOR ENGINE - Centralized indicator management and calculations
// ============================================================================

export interface IndicatorSettings {
  id: string;
  type: 'rsi' | 'sma' | 'ema' | 'macd' | 'cci' | 'mfi' | 'donchian_width' | 'chandelier_exit' | 'anchored_vwap' | 'williams_vix_fix' | 'qqe' | 'stc' | 'choppiness' | 'supertrend' | 'ma_ribbon_heatmap' | 'linreg' | 'kalman_filter' | 'range_filter' | 'htf_trend_heat' | 'mfp' | 'volume';
  period: number;
  emaLength?: number; // For RSI EMA
  color: string;
  emaColor?: string; // For RSI EMA
  visible: boolean;
  paneIndex: number;
  // RSI-specific settings
  overboughtLevel?: number; // Default 70
  oversoldLevel?: number; // Default 30
  overboughtColor?: string; // Default #787b86
  oversoldColor?: string; // Default #787b86
  // MACD-specific settings
  fastPeriod?: number; // Default 12
  slowPeriod?: number; // Default 26
  signalPeriod?: number; // Default 9
  macdColor?: string; // Default #2196f3 (blue)
  signalColor?: string; // Default #f44336 (red)
  histogramUpColor?: string; // Default #4caf50 (green)
  histogramDownColor?: string; // Default #f44336 (red)
  // CCI-specific settings
  cciPeriod?: number; // Default 20
  cciOverboughtLevel?: number; // Default 100
  cciOversoldLevel?: number; // Default -100
  cciOverboughtColor?: string; // Default #f44336 (red)
  cciOversoldColor?: string; // Default #4caf50 (green)
  cciZeroColor?: string; // Default #787b86 (gray)
  // MFI-specific settings
  mfiPeriod?: number; // Default 14
  mfiOverboughtLevel?: number; // Default 80
  mfiOversoldLevel?: number; // Default 20
  mfiOverboughtColor?: string; // Default #f44336 (red)
  mfiOversoldColor?: string; // Default #4caf50 (green)
  mfiMiddleColor?: string; // Default #787b86 (gray)
  // Donchian Width-specific settings
  donchianPeriod?: number; // Default 20
  donchianWidthColor?: string; // Default #2196f3 (blue)
  showMiddleLine?: boolean; // Default false
  middleLineColor?: string; // Default #787b86 (gray)
  // Chandelier Exit-specific settings
  chandelierPeriod?: number; // Default 22
  atrMultiplier?: number; // Default 3.0
  longExitColor?: string; // Default #4caf50 (green)
  shortExitColor?: string; // Default #f44336 (red)
  showLongExit?: boolean; // Default true
  showShortExit?: boolean; // Default true
  // Anchored VWAP-specific settings
  anchorType?: 'first_bar' | 'custom_index'; // Default 'first_bar'
  anchorIndex?: number; // Custom anchor index (default 0)
  vwapColor?: string; // Default #2962ff (blue)
  showStdDev?: boolean; // Show standard deviation bands (default false)
  stdDevMultiplier?: number; // Standard deviation multiplier (default 2.0)
  // Williams Vix Fix-specific settings
  vixFixPeriod?: number; // Lookback period (default 22)
  vixFixBBPeriod?: number; // Bollinger Bands period (default 20)
  vixFixBBStdDev?: number; // Bollinger Bands std dev (default 2.0)
  vixFixColor?: string; // VIX Fix line color (default #f44336 red)
  vixFixHighColor?: string; // High volatility color (default #ff5252)
  showVixFixBands?: boolean; // Show Bollinger Bands (default true)
  vixFixThreshold?: number; // Alert threshold level (default 80)
  // QQE-specific settings
  qqeRsiPeriod?: number; // RSI period (default 14)
  qqeSF?: number; // Smoothing Factor for RSI (default 5)
  qqeWildersPeriod?: number; // Wilders Period for ATR (default 27)
  qqeFactor?: number; // QQE multiplier factor (default 4.236)
  qqeLineColor?: string; // QQE line color (default #2196f3 blue)
  qqeFastColor?: string; // Fast trailing line color (default #4caf50 green)
  qqeSlowColor?: string; // Slow trailing line color (default #f44336 red)
  showQqeLevels?: boolean; // Show overbought/oversold levels (default true)
  // STC (Schaff Trend Cycle)-specific settings
  stcFastPeriod?: number; // Fast EMA period (default 23)
  stcSlowPeriod?: number; // Slow EMA period (default 50)
  stcCyclePeriod?: number; // Cycle/Stochastic period (default 10)
  stcD1Period?: number; // First smoothing period (default 3)
  stcD2Period?: number; // Second smoothing period (default 3)
  stcColor?: string; // STC line color (default #2196f3 blue)
  stcUpperLevel?: number; // Overbought level (default 75)
  stcLowerLevel?: number; // Oversold level (default 25)
  showStcLevels?: boolean; // Show overbought/oversold levels (default true)
  // Choppiness Index-specific settings
  choppinessPeriod?: number; // Lookback period (default 14)
  choppinessColor?: string; // CI line color (default #ff9800 orange)
  choppinessUpperLevel?: number; // Ranging threshold (default 61.8)
  choppinessLowerLevel?: number; // Trending threshold (default 38.2)
  showChoppinessLevels?: boolean; // Show threshold levels (default true)
  // SuperTrend-specific settings
  supertrendPeriod?: number; // ATR period (default 10)
  supertrendMultiplier?: number; // ATR multiplier (default 3.0)
  supertrendUpColor?: string; // Uptrend color (default #4caf50 green)
  supertrendDownColor?: string; // Downtrend color (default #f44336 red)
  showSupertrendSignals?: boolean; // Show buy/sell signals (default true)
  supertrendBuyColor?: string; // Buy signal color (default #4caf50 green)
  supertrendSellColor?: string; // Sell signal color (default #f44336 red)
  // MA Ribbon Heatmap-specific settings
  maRibbonMaType?: 'sma' | 'ema'; // MA type (default 'sma')
  maRibbonPeriods?: number[]; // MA periods array (default [5,10,15,20,25,30,35,40,45,50])
  maRibbonUptrendColor?: string; // Uptrend color (default #4caf50 green)
  maRibbonDowntrendColor?: string; // Downtrend color (default #f44336 red)
  maRibbonNeutralColor?: string; // Neutral color (default #787b86 gray)
  maRibbonOpacity?: number; // Ribbon opacity (default 0.3)
  showMaRibbonHeatmap?: boolean; // Show heatmap intensity (default true)
  // Linear Regression-specific settings
  linregPeriod?: number; // Regression period (default 20)
  linregStdDevMultiplier?: number; // Standard deviation multiplier for bands (default 2.0)
  linregBasisColor?: string; // Basis line color (default #2196f3 blue)
  linregUpperBandColor?: string; // Upper band color (default #f44336 red)
  linregLowerBandColor?: string; // Lower band color (default #4caf50 green)
  showLinregBands?: boolean; // Show upper/lower bands (default true)
  showLinregSlope?: boolean; // Show slope information (default false)
  // Kalman Filter-specific settings
  kalmanProcessNoise?: number; // Process noise covariance Q (default 0.01)
  kalmanMeasurementNoise?: number; // Measurement noise covariance R (default 0.1)
  kalmanInitialVariance?: number; // Initial state variance P (default 1.0)
  kalmanSmoothingFactor?: number; // Smoothing factor (default 0.1)
  showKalmanConfidence?: boolean; // Show confidence bands (default false)
  kalmanConfidenceColor?: string; // Confidence band color (default #787b86 gray)
  // Range Filter-specific settings
  rangeFilterMethod?: 'atr' | 'percentage' | 'stddev'; // Range calculation method (default 'atr')
  rangeFilterPeriod?: number; // Range calculation period (default 14)
  rangeFilterMultiplier?: number; // Range multiplier (default 2.0)
  rangeFilterSmoothing?: number; // Smoothing period (default 3)
  rangeFilterUpperColor?: string; // Upper band color (default #4caf50 green)
  rangeFilterLowerColor?: string; // Lower band color (default #f44336 red)
  rangeFilterSignalColor?: string; // Signal line color (default #2196f3 blue)
  showRangeFilterSignals?: boolean; // Show buy/sell signals (default true)
  rangeFilterBuyColor?: string; // Buy signal color (default #4caf50 green)
  rangeFilterSellColor?: string; // Sell signal color (default #f44336 red)
  // HTF Trend Heat (MTF)-specific settings
  htfTimeframes?: string[]; // Timeframes to analyze (default ['1h', '4h', '1d'])
  htfMaPeriod?: number; // MA period for all timeframes (default 20)
  htfRsiPeriod?: number; // RSI period for all timeframes (default 14)
  htfMaType?: 'sma' | 'ema'; // MA type (default 'ema')
  htfScoreColor?: string; // Score line color (default #ff6b35 orange)
  htfHeatmapColors?: string[]; // Heatmap colors for different score ranges (default ['#ff4444', '#ffaa44', '#ffff44', '#aaff44', '#44ff44'])
  showHtfHeatmap?: boolean; // Show heatmap visualization (default true)
  showHtfScore?: boolean; // Show trend score line (default true)
  htfScoreThreshold?: number; // Score threshold for signals (default 70)
  // Money Flow Pressure (MFP)-specific settings
  mfpPeriod?: number; // Period for MFP calculation (default 14)
  mfpColor?: string; // MFP line color (default #9c27b0 purple)
  mfpOverboughtLevel?: number; // Overbought level (default 80)
  mfpOversoldLevel?: number; // Oversold level (default 20)
  mfpOverboughtColor?: string; // Overbought line color (default #f44336 red)
  mfpOversoldColor?: string; // Oversold line color (default #4caf50 green)
  mfpMiddleColor?: string; // Middle line color (default #787b86 gray)
  // Volume-specific settings
  volumeUpColor?: string; // Volume color for up bars (default #26a69a teal/green)
  volumeDownColor?: string; // Volume color for down bars (default #ef5350 red)
  volumeShowMA?: boolean; // Show volume moving average (default false)
  volumeMAPeriod?: number; // Volume MA period (default 20)
  volumeMAColor?: string; // Volume MA color (default #2196f3 blue)
  volumeMaType?: 'sma' | 'ema'; // Volume MA type (default 'sma')
}

export interface IndicatorInstance {
  settings: IndicatorSettings;
  series: ISeriesApi<'Line'> | null;
  emaSeries?: ISeriesApi<'Line'> | null; // For RSI EMA
  signalSeries?: ISeriesApi<'Line'> | null; // For MACD Signal Line
  histogramSeries?: ISeriesApi<'Histogram'> | null; // For MACD Histogram
  data: any[];
}

export interface IndicatorEngineConfig {
  chart: IChartApi;
  data: any[];
  onIndicatorUpdate?: (id: string, updates: Partial<IndicatorSettings>) => void;
}

// ============================================================================
// INDICATOR ENGINE CLASS
// ============================================================================

export class IndicatorEngine {
  private chart: IChartApi;
  private data: any[];
  private indicators: Map<string, IndicatorInstance> = new Map();
  private onIndicatorUpdate?: (id: string, updates: Partial<IndicatorSettings>) => void;

  constructor(config: IndicatorEngineConfig) {
    this.chart = config.chart;
    this.data = config.data;
    this.onIndicatorUpdate = config.onIndicatorUpdate;
  }

  // ============================================================================
  // INDICATOR CALCULATIONS
  // ============================================================================

  /**
   * Calculate RSI using Wilder's RMA method
   */
  private calculateRSI(data: number[], period: number): number[] {
    const result: number[] = [];
    let avgGain = 0;
    let avgLoss = 0;
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        result.push(NaN);
        continue;
      }
      
      const change = data[i] - data[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      
      if (i < period) {
        avgGain = (avgGain * (i - 1) + gain) / i;
        avgLoss = (avgLoss * (i - 1) + loss) / i;
        result.push(NaN);
      } else if (i === period) {
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push(rsi);
      } else {
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push(rsi);
      }
    }
    
    return result;
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  private calculateEMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        result.push(data[i]);
      } else {
        const ema = (data[i] * multiplier) + (result[i - 1] * (1 - multiplier));
        result.push(ema);
      }
    }
    
    return result;
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  private calculateSMA(data: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    
    return result;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {
    macdLine: number[];
    signalLine: number[];
    histogram: number[];
  } {
    // Calculate fast and slow EMAs
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    
    // Calculate MACD line (fast EMA - slow EMA)
    const macdLine = fastEMA.map((fast, index) => {
      const slow = slowEMA[index];
      return !isNaN(fast) && !isNaN(slow) ? fast - slow : NaN;
    });
    
    // Calculate signal line (EMA of MACD line)
    const signalLine = this.calculateEMA(macdLine.filter(val => !isNaN(val)), signalPeriod);
    
    // Map signal line back to original indices
    const signalLineMapped = macdLine.map((macd, index) => {
      if (isNaN(macd)) return NaN;
      const validMacdIndex = macdLine.slice(0, index + 1).filter(val => !isNaN(val)).length - 1;
      return validMacdIndex >= 0 && validMacdIndex < signalLine.length ? signalLine[validMacdIndex] : NaN;
    });
    
    // Calculate histogram (MACD line - signal line)
    const histogram = macdLine.map((macd, index) => {
      const signal = signalLineMapped[index];
      return !isNaN(macd) && !isNaN(signal) ? macd - signal : NaN;
    });
    
    return {
      macdLine,
      signalLine: signalLineMapped,
      histogram
    };
  }

  /**
   * Calculate CCI (Commodity Channel Index)
   */
  private calculateCCI(data: { high: number; low: number; close: number }[], period: number = 20): number[] {
    const result: number[] = [];
    
    // Calculate typical prices
    const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      
      // Get the window of typical prices for this period
      const window = typicalPrices.slice(i - period + 1, i + 1);
      
      // Calculate SMA of typical prices
      const sma = window.reduce((sum, tp) => sum + tp, 0) / period;
      
      // Calculate mean deviation
      const meanDeviation = window.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
      
      // Calculate CCI
      const currentTypicalPrice = typicalPrices[i];
      const cci = meanDeviation === 0 ? 0 : (currentTypicalPrice - sma) / (0.015 * meanDeviation);
      
      result.push(cci);
    }
    
    return result;
  }

  /**
   * Calculate MFI (Money Flow Index)
   */
  private calculateMFI(data: { high: number; low: number; close: number; volume: number }[], period: number = 14): number[] {
    const result: number[] = [];
    
    // Calculate typical prices
    const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push(NaN);
        continue;
      }
      
      let positiveMoneyFlow = 0;
      let negativeMoneyFlow = 0;
      
      // Calculate money flows over the period
      for (let j = i - period + 1; j <= i; j++) {
        if (j === 0) continue; // Skip first period (no previous TP to compare)
        
        const currentTP = typicalPrices[j];
        const previousTP = typicalPrices[j - 1];
        const rawMoneyFlow = currentTP * data[j].volume;
        
        if (currentTP > previousTP) {
          positiveMoneyFlow += rawMoneyFlow;
        } else if (currentTP < previousTP) {
          negativeMoneyFlow += rawMoneyFlow;
        }
        // If currentTP === previousTP, no money flow is added
      }
      
      // Calculate MFI
      let mfi: number;
      if (negativeMoneyFlow === 0) {
        mfi = 100; // All positive money flow
      } else {
        const moneyFlowRatio = positiveMoneyFlow / negativeMoneyFlow;
        mfi = 100 - (100 / (1 + moneyFlowRatio));
      }
      
      result.push(mfi);
    }
    
    return result;
  }

  /**
   * Calculate Average True Range (ATR)
   */
  private calculateATR(data: { high: number; low: number; close: number }[], period: number = 20): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        result.push(data[i].high - data[i].low);
        continue;
      }
      
      const tr1 = data[i].high - data[i].low;
      const tr2 = Math.abs(data[i].high - data[i - 1].close);
      const tr3 = Math.abs(data[i].low - data[i - 1].close);
      
      const trueRange = Math.max(tr1, tr2, tr3);
      
      if (i < period) {
        result.push(trueRange);
      } else {
        // Calculate ATR using Wilder's smoothing (RMA)
        const atrValues = result.slice(i - period + 1, i + 1);
        const atr = atrValues.reduce((sum, tr) => sum + tr, 0) / period;
        result.push(atr);
      }
    }
    
    return result;
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(data: number[], period: number = 20, stdDev: number = 2.0): { upper: number[]; middle: number[]; lower: number[] } {
    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        middle.push(NaN);
        lower.push(NaN);
        continue;
      }
      
      const window = data.slice(i - period + 1, i + 1);
      const sma = window.reduce((sum, value) => sum + value, 0) / period;
      
      const variance = window.reduce((sum, value) => sum + Math.pow(value - sma, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      middle.push(sma);
      upper.push(sma + (stdDev * standardDeviation));
      lower.push(sma - (stdDev * standardDeviation));
    }
    
    return { upper, middle, lower };
  }

  /**
   * Calculate Keltner Channels
   */
  private calculateKeltnerChannels(data: { high: number; low: number; close: number }[], period: number = 20, atrMultiplier: number = 1.5): { upper: number[]; middle: number[]; lower: number[] } {
    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];
    
    // Calculate EMA for middle line
    const emaValues = this.calculateEMA(data.map(d => d.close), period);
    
    // Calculate ATR
    const atrValues = this.calculateATR(data, period);
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        middle.push(NaN);
        lower.push(NaN);
        continue;
      }
      
      const ema = emaValues[i];
      const atr = atrValues[i];
      
      middle.push(ema);
      upper.push(ema + (atrMultiplier * atr));
      lower.push(ema - (atrMultiplier * atr));
    }
    
    return { upper, middle, lower };
  }

  /**
   * Calculate Donchian Width indicator
   * Returns Donchian Width values and optionally middle line
   */
  private calculateDonchianWidth(
    data: { high: number; low: number; close: number }[], 
    period: number = 20
  ): { width: number[]; upperBand: number[]; lowerBand: number[]; middleLine: number[] } {
    const width: number[] = [];
    const upperBand: number[] = [];
    const lowerBand: number[] = [];
    const middleLine: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        // Not enough data for calculation
        width.push(NaN);
        upperBand.push(NaN);
        lowerBand.push(NaN);
        middleLine.push(NaN);
        continue;
      }
      
      // Calculate highest high and lowest low over the period
      let highestHigh = data[i].high;
      let lowestLow = data[i].low;
      
      for (let j = i - period + 1; j <= i; j++) {
        highestHigh = Math.max(highestHigh, data[j].high);
        lowestLow = Math.min(lowestLow, data[j].low);
      }
      
      // Calculate Donchian Width
      const widthValue = highestHigh - lowestLow;
      const middleValue = (highestHigh + lowestLow) / 2;
      
      width.push(widthValue);
      upperBand.push(highestHigh);
      lowerBand.push(lowestLow);
      middleLine.push(middleValue);
    }
    
    return { width, upperBand, lowerBand, middleLine };
  }

  /**
   * Calculate Chandelier Exit indicator
   * Returns long exit (below price) and short exit (above price) levels
   */
  private calculateChandelierExit(
    data: { high: number; low: number; close: number }[], 
    period: number = 22,
    atrMultiplier: number = 3.0
  ): { longExit: number[]; shortExit: number[] } {
    const longExit: number[] = [];
    const shortExit: number[] = [];
    
    // Calculate ATR
    const atrValues = this.calculateATR(data, period);
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        // Not enough data for calculation
        longExit.push(NaN);
        shortExit.push(NaN);
        continue;
      }
      
      // Calculate highest high and lowest low over the period
      let highestHigh = data[i].high;
      let lowestLow = data[i].low;
      
      for (let j = i - period + 1; j <= i; j++) {
        highestHigh = Math.max(highestHigh, data[j].high);
        lowestLow = Math.min(lowestLow, data[j].low);
      }
      
      const atr = atrValues[i];
      
      // Calculate Chandelier Exit values
      // Long Exit (trailing stop for long positions) = Highest High - (ATR × Multiplier)
      const longExitValue = highestHigh - (atr * atrMultiplier);
      
      // Short Exit (trailing stop for short positions) = Lowest Low + (ATR × Multiplier)
      const shortExitValue = lowestLow + (atr * atrMultiplier);
      
      longExit.push(longExitValue);
      shortExit.push(shortExitValue);
    }
    
    return { longExit, shortExit };
  }

  /**
   * Calculate Anchored VWAP indicator
   * Returns VWAP values starting from the anchor point
   */
  private calculateAnchoredVWAP(
    data: { high: number; low: number; close: number; volume: number }[], 
    anchorIndex: number = 0
  ): { vwap: number[]; stdDev: number[] } {
    const vwap: number[] = [];
    const stdDev: number[] = [];
    
    let cumulativePV = 0; // Cumulative Price × Volume
    let cumulativeVolume = 0; // Cumulative Volume
    let cumulativePV2 = 0; // Cumulative (Price^2 × Volume) for std dev
    
    for (let i = 0; i < data.length; i++) {
      if (i < anchorIndex) {
        // Before anchor point
        vwap.push(NaN);
        stdDev.push(NaN);
        continue;
      }
      
      // Calculate typical price
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      const volume = data[i].volume;
      
      // Update cumulative values
      cumulativePV += typicalPrice * volume;
      cumulativeVolume += volume;
      cumulativePV2 += (typicalPrice * typicalPrice) * volume;
      
      // Calculate VWAP
      const vwapValue = cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : typicalPrice;
      vwap.push(vwapValue);
      
      // Calculate standard deviation
      // Variance = (Σ(P² × V) / ΣV) - VWAP²
      const variance = cumulativeVolume > 0
        ? (cumulativePV2 / cumulativeVolume) - (vwapValue * vwapValue)
        : 0;
      const stdDevValue = Math.sqrt(Math.max(0, variance));
      stdDev.push(stdDevValue);
    }
    
    return { vwap, stdDev };
  }

  /**
   * Calculate Williams Vix Fix indicator
   * Returns VIX Fix values and Bollinger Bands
   */
  private calculateWilliamsVixFix(
    data: { high: number; low: number; close: number }[], 
    period: number = 22,
    bbPeriod: number = 20,
    bbStdDev: number = 2.0
  ): { vixFix: number[]; upperBand: number[]; lowerBand: number[]; middleBand: number[] } {
    const vixFix: number[] = [];
    const upperBand: number[] = [];
    const lowerBand: number[] = [];
    const middleBand: number[] = [];
    
    // Calculate VIX Fix
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        vixFix.push(NaN);
        continue;
      }
      
      // Find highest close over the lookback period
      let highestClose = data[i].close;
      for (let j = i - period + 1; j <= i; j++) {
        highestClose = Math.max(highestClose, data[j].close);
      }
      
      // Calculate VIX Fix
      // VIX Fix = ((Highest Close over N periods - Current Low) / Highest Close over N periods) × 100
      const vixFixValue = highestClose > 0
        ? ((highestClose - data[i].low) / highestClose) * 100
        : 0;
      
      vixFix.push(vixFixValue);
    }
    
    // Calculate Bollinger Bands on VIX Fix
    for (let i = 0; i < vixFix.length; i++) {
      if (i < bbPeriod - 1 || isNaN(vixFix[i])) {
        upperBand.push(NaN);
        lowerBand.push(NaN);
        middleBand.push(NaN);
        continue;
      }
      
      // Calculate SMA of VIX Fix
      let sum = 0;
      let count = 0;
      for (let j = i - bbPeriod + 1; j <= i; j++) {
        if (!isNaN(vixFix[j])) {
          sum += vixFix[j];
          count++;
        }
      }
      const sma = count > 0 ? sum / count : NaN;
      
      // Calculate standard deviation
      let variance = 0;
      for (let j = i - bbPeriod + 1; j <= i; j++) {
        if (!isNaN(vixFix[j])) {
          variance += Math.pow(vixFix[j] - sma, 2);
        }
      }
      const stdDev = count > 0 ? Math.sqrt(variance / count) : NaN;
      
      middleBand.push(sma);
      upperBand.push(sma + (stdDev * bbStdDev));
      lowerBand.push(sma - (stdDev * bbStdDev));
    }
    
    return { vixFix, upperBand, lowerBand, middleBand };
  }

  /**
   * Calculate QQE (Quantitative Qualitative Estimation) indicator
   * QQE = Enhanced RSI with smoothing and volatility-based trailing stops
   */
  private calculateQQE(
    data: { high: number; low: number; close: number }[], 
    rsiPeriod: number = 14,
    sf: number = 5,
    wildersPeriod: number = 27,
    factor: number = 4.236
  ): { qqe: number[]; fastTrail: number[]; slowTrail: number[] } {
    console.log('=== QQE CALCULATION START ===');
    console.log('RSI Period:', rsiPeriod, 'SF:', sf, 'Wilders Period:', wildersPeriod, 'Factor:', factor);
    
    const closePrices = data.map(d => d.close);
    
    // Step 1: Calculate standard RSI
    const rsi = this.calculateRSI(closePrices, rsiPeriod);
    console.log('Step 1: RSI calculated, length:', rsi.length);
    
    // Step 2: Apply Wilder's smoothing to RSI (this is the QQE line)
    const qqeLine: number[] = [];
    for (let i = 0; i < rsi.length; i++) {
      if (i === 0 || isNaN(rsi[i])) {
        qqeLine.push(rsi[i]);
      } else if (isNaN(qqeLine[i - 1])) {
        qqeLine.push(rsi[i]);
      } else {
        // Wilder's smoothing: EMA with alpha = 1/sf
        const smoothed = qqeLine[i - 1] + (rsi[i] - qqeLine[i - 1]) / sf;
        qqeLine.push(smoothed);
      }
    }
    console.log('Step 2: QQE Line (smoothed RSI) calculated');
    
    // Step 3: Calculate ATR of RSI changes (absolute changes in smoothed RSI)
    const rsiChanges: number[] = [];
    for (let i = 0; i < qqeLine.length; i++) {
      if (i === 0 || isNaN(qqeLine[i]) || isNaN(qqeLine[i - 1])) {
        rsiChanges.push(NaN);
      } else {
        rsiChanges.push(Math.abs(qqeLine[i] - qqeLine[i - 1]));
      }
    }
    
    // Step 4: Apply Wilder's smoothing to RSI changes (this is like ATR)
    const atr: number[] = [];
    for (let i = 0; i < rsiChanges.length; i++) {
      if (i < wildersPeriod || isNaN(rsiChanges[i])) {
        atr.push(NaN);
      } else if (i === wildersPeriod) {
        // Initial ATR: simple average of first wildersPeriod changes
        let sum = 0;
        let count = 0;
        for (let j = i - wildersPeriod + 1; j <= i; j++) {
          if (!isNaN(rsiChanges[j])) {
            sum += rsiChanges[j];
            count++;
          }
        }
        atr.push(count > 0 ? sum / count : NaN);
      } else {
        // Wilder's smoothing: Previous ATR + (Current Change - Previous ATR) / wildersPeriod
        const smoothedAtr = atr[i - 1] + (rsiChanges[i] - atr[i - 1]) / wildersPeriod;
        atr.push(smoothedAtr);
      }
    }
    console.log('Step 3-4: ATR of RSI changes calculated');
    
    // Step 5: Calculate trailing stop lines
    const dar = atr.map(a => !isNaN(a) ? a * factor : NaN); // Dynamic ATR Range
    const fastTrail: number[] = [];
    const slowTrail: number[] = [];
    
    for (let i = 0; i < qqeLine.length; i++) {
      if (isNaN(qqeLine[i]) || isNaN(dar[i])) {
        fastTrail.push(NaN);
        slowTrail.push(NaN);
        continue;
      }
      
      // Fast trailing stop (long)
      const longStop = qqeLine[i] - dar[i];
      if (i === 0 || isNaN(fastTrail[i - 1])) {
        fastTrail.push(longStop);
      } else {
        // Trail up but never down
        fastTrail.push(Math.max(longStop, fastTrail[i - 1]));
      }
      
      // Slow trailing stop (short)
      const shortStop = qqeLine[i] + dar[i];
      if (i === 0 || isNaN(slowTrail[i - 1])) {
        slowTrail.push(shortStop);
      } else {
        // Trail down but never up
        slowTrail.push(Math.min(shortStop, slowTrail[i - 1]));
      }
    }
    console.log('Step 5: Trailing stops calculated');
    console.log('=== QQE CALCULATION COMPLETE ===');
    
    return { qqe: qqeLine, fastTrail, slowTrail };
  }

  /**
   * Calculate STC (Schaff Trend Cycle) indicator
   * STC = Double smoothed stochastic of MACD
   */
  private calculateSTC(
    data: number[], 
    fastPeriod: number = 23,
    slowPeriod: number = 50,
    cyclePeriod: number = 10,
    d1Period: number = 3,
    d2Period: number = 3
  ): number[] {
    console.log('=== STC CALCULATION START ===');
    console.log('Fast Period:', fastPeriod, 'Slow Period:', slowPeriod, 'Cycle Period:', cyclePeriod);
    console.log('D1 Period:', d1Period, 'D2 Period:', d2Period);
    
    // Step 1: Calculate MACD (Fast EMA - Slow EMA)
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    const macd: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (!isNaN(fastEMA[i]) && !isNaN(slowEMA[i])) {
        macd.push(fastEMA[i] - slowEMA[i]);
      } else {
        macd.push(NaN);
      }
    }
    console.log('Step 1: MACD calculated');
    
    // Step 2: Apply first stochastic smoothing to MACD
    const stoch1: number[] = [];
    
    for (let i = 0; i < macd.length; i++) {
      if (i < cyclePeriod - 1 || isNaN(macd[i])) {
        stoch1.push(NaN);
        continue;
      }
      
      // Find min and max MACD over cycle period
      let minMacd = macd[i];
      let maxMacd = macd[i];
      
      for (let j = i - cyclePeriod + 1; j <= i; j++) {
        if (!isNaN(macd[j])) {
          minMacd = Math.min(minMacd, macd[j]);
          maxMacd = Math.max(maxMacd, macd[j]);
        }
      }
      
      // Calculate %K-like value
      const range = maxMacd - minMacd;
      if (range > 0) {
        const rawStoch = ((macd[i] - minMacd) / range) * 100;
        stoch1.push(rawStoch);
      } else {
        stoch1.push(50); // Default to midpoint if no range
      }
    }
    console.log('Step 2: First stochastic calculated');
    
    // Step 3: Apply EMA smoothing to first stochastic (this is %K1)
    const k1: number[] = [];
    const alpha = 2 / (d1Period + 1);
    
    for (let i = 0; i < stoch1.length; i++) {
      if (isNaN(stoch1[i])) {
        k1.push(NaN);
      } else if (i === 0 || isNaN(k1[i - 1])) {
        k1.push(stoch1[i]);
      } else {
        k1.push(k1[i - 1] + alpha * (stoch1[i] - k1[i - 1]));
      }
    }
    console.log('Step 3: First smoothing (K1) calculated');
    
    // Step 4: Apply second stochastic to K1
    const stoch2: number[] = [];
    
    for (let i = 0; i < k1.length; i++) {
      if (i < cyclePeriod - 1 || isNaN(k1[i])) {
        stoch2.push(NaN);
        continue;
      }
      
      // Find min and max K1 over cycle period
      let minK1 = k1[i];
      let maxK1 = k1[i];
      
      for (let j = i - cyclePeriod + 1; j <= i; j++) {
        if (!isNaN(k1[j])) {
          minK1 = Math.min(minK1, k1[j]);
          maxK1 = Math.max(maxK1, k1[j]);
        }
      }
      
      // Calculate second %K-like value
      const range = maxK1 - minK1;
      if (range > 0) {
        const rawStoch = ((k1[i] - minK1) / range) * 100;
        stoch2.push(rawStoch);
      } else {
        stoch2.push(50);
      }
    }
    console.log('Step 4: Second stochastic calculated');
    
    // Step 5: Apply EMA smoothing to second stochastic (this is the final STC)
    const stc: number[] = [];
    const alpha2 = 2 / (d2Period + 1);
    
    for (let i = 0; i < stoch2.length; i++) {
      if (isNaN(stoch2[i])) {
        stc.push(NaN);
      } else if (i === 0 || isNaN(stc[i - 1])) {
        stc.push(stoch2[i]);
      } else {
        stc.push(stc[i - 1] + alpha2 * (stoch2[i] - stc[i - 1]));
      }
    }
    console.log('Step 5: Final STC calculated');
    console.log('=== STC CALCULATION COMPLETE ===');
    
    return stc;
  }

  /**
   * Calculate Choppiness Index
   * CI = 100 * log10(sum(ATR(i)) / (MaxHigh - MinLow)) / log10(period)
   * Values: 0-100, where lower values indicate trending and higher values indicate ranging
   */
  private calculateChoppinessIndex(
    data: { high: number; low: number; close: number }[], 
    period: number = 14
  ): number[] {
    console.log('=== CHOPPINESS INDEX CALCULATION START ===');
    console.log('Period:', period);
    
    const choppiness: number[] = [];
    
    // Step 1: Calculate True Range for each bar
    const trueRange: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        trueRange.push(data[i].high - data[i].low);
      } else {
        const tr1 = data[i].high - data[i].low;
        const tr2 = Math.abs(data[i].high - data[i - 1].close);
        const tr3 = Math.abs(data[i].low - data[i - 1].close);
        trueRange.push(Math.max(tr1, tr2, tr3));
      }
    }
    console.log('Step 1: True Range calculated');
    
    // Step 2: Calculate Choppiness Index for each bar
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        choppiness.push(NaN);
        continue;
      }
      
      // Sum of True Range over period
      let sumTR = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumTR += trueRange[j];
      }
      
      // Find highest high and lowest low over period
      let maxHigh = data[i - period + 1].high;
      let minLow = data[i - period + 1].low;
      
      for (let j = i - period + 1; j <= i; j++) {
        maxHigh = Math.max(maxHigh, data[j].high);
        minLow = Math.min(minLow, data[j].low);
      }
      
      const priceRange = maxHigh - minLow;
      
      // Calculate Choppiness Index
      if (priceRange > 0) {
        const ci = 100 * (Math.log10(sumTR / priceRange) / Math.log10(period));
        choppiness.push(ci);
      } else {
        choppiness.push(50); // Default to middle if no price range
      }
    }
    
    console.log('Step 2: Choppiness Index calculated');
    console.log('=== CHOPPINESS INDEX CALCULATION COMPLETE ===');
    
    return choppiness;
  }

  /**
   * Calculate SuperTrend Indicator
   * SuperTrend = ATR-based trend following indicator
   * Upper Band = (High + Low) / 2 + (Multiplier × ATR)
   * Lower Band = (High + Low) / 2 - (Multiplier × ATR)
   * Trend switches when price crosses previous SuperTrend value
   */
  private calculateSuperTrend(
    data: { high: number; low: number; close: number }[], 
    period: number = 10,
    multiplier: number = 3.0
  ): { supertrend: number[]; trend: ('up' | 'down')[]; signals: ('buy' | 'sell' | null)[] } {
    console.log('=== SUPERTREND CALCULATION START ===');
    console.log('Period:', period, 'Multiplier:', multiplier);
    
    const supertrend: number[] = [];
    const trend: ('up' | 'down')[] = [];
    const signals: ('buy' | 'sell' | null)[] = [];
    
    // Step 1: Calculate ATR
    const atr = this.calculateATR(data, period);
    console.log('Step 1: ATR calculated');
    
    // Step 2: Calculate SuperTrend values
    let previousSupertrend = 0;
    let currentTrend: 'up' | 'down' = 'up';
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        supertrend.push(NaN);
        trend.push('up');
        signals.push(null);
        continue;
      }
      
      const currentATR = atr[i];
      const hl2 = (data[i].high + data[i].low) / 2;
      const upperBand = hl2 + (multiplier * currentATR);
      const lowerBand = hl2 - (multiplier * currentATR);
      
      let newSupertrend = 0;
      let newTrend: 'up' | 'down' = currentTrend;
      let signal: 'buy' | 'sell' | null = null;
      
      if (currentTrend === 'up') {
        // In uptrend
        if (data[i].close <= upperBand) {
          // Price below upper band - switch to downtrend
          newTrend = 'down';
          newSupertrend = lowerBand;
          signal = 'sell';
        } else {
          // Price above upper band - continue uptrend
          newTrend = 'up';
          newSupertrend = upperBand;
        }
      } else {
        // In downtrend
        if (data[i].close >= lowerBand) {
          // Price above lower band - switch to uptrend
          newTrend = 'up';
          newSupertrend = upperBand;
          signal = 'buy';
        } else {
          // Price below lower band - continue downtrend
          newTrend = 'down';
          newSupertrend = lowerBand;
        }
      }
      
      // Check for trend change
      if (newTrend !== currentTrend) {
        signal = newTrend === 'up' ? 'buy' : 'sell';
      }
      
      supertrend.push(newSupertrend);
      trend.push(newTrend);
      signals.push(signal);
      
      previousSupertrend = newSupertrend;
      currentTrend = newTrend;
    }
    
    console.log('Step 2: SuperTrend calculated');
    console.log('=== SUPERTREND CALCULATION COMPLETE ===');
    
    return { supertrend, trend, signals };
  }

  /**
   * Calculate MA Ribbon Heatmap
   * Creates multiple moving averages and determines trend direction/strength
   * Returns ribbon data with color intensity based on MA spacing
   */
  private calculateMARibbonHeatmap(
    data: { high: number; low: number; close: number }[], 
    maType: 'sma' | 'ema' = 'sma',
    periods: number[] = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
  ): { ribbonData: { time: any; value: number; color: string; intensity: number }[]; trend: ('up' | 'down' | 'neutral')[] } {
    console.log('=== MA RIBBON HEATMAP CALCULATION START ===');
    console.log('MA Type:', maType);
    console.log('Periods:', periods);
    
    const ribbonData: { time: any; value: number; color: string; intensity: number }[] = [];
    const trend: ('up' | 'down' | 'neutral')[] = [];
    
    // Calculate all moving averages
    const maValues: number[][] = [];
    for (const period of periods) {
      let maValuesForPeriod: number[];
      if (maType === 'sma') {
        maValuesForPeriod = this.calculateSMA(data.map(d => d.close), period);
      } else {
        maValuesForPeriod = this.calculateEMA(data.map(d => d.close), period);
      }
      maValues.push(maValuesForPeriod);
    }
    
    console.log('Step 1: All MAs calculated');
    
    // Calculate ribbon data for each time point
    for (let i = 0; i < data.length; i++) {
      if (i < Math.max(...periods)) {
      ribbonData.push({
        time: this.data[i].time,
        value: this.data[i].close,
        color: '#787b86', // Neutral gray
        intensity: 0
      });
        trend.push('neutral');
        continue;
      }
      
      // Get current MA values
      const currentMAs = maValues.map(ma => ma[i]);
      const currentPrice = data[i].close;
      
      // Calculate trend direction based on MA alignment
      let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
      let trendStrength = 0;
      
      // Check if MAs are aligned (all increasing or decreasing)
      let upCount = 0;
      let downCount = 0;
      
      for (let j = 1; j < currentMAs.length; j++) {
        if (currentMAs[j] > currentMAs[j - 1]) {
          upCount++;
        } else if (currentMAs[j] < currentMAs[j - 1]) {
          downCount++;
        }
      }
      
      // Determine trend direction
      if (upCount > downCount && currentPrice > currentMAs[0]) {
        trendDirection = 'up';
        trendStrength = upCount / (currentMAs.length - 1);
      } else if (downCount > upCount && currentPrice < currentMAs[0]) {
        trendDirection = 'down';
        trendStrength = downCount / (currentMAs.length - 1);
      }
      
      // Calculate color intensity based on MA spacing
      const maSpread = Math.max(...currentMAs) - Math.min(...currentMAs);
      const priceRange = Math.max(...data.slice(Math.max(0, i - 20), i + 1).map(d => d.high)) - 
                        Math.min(...data.slice(Math.max(0, i - 20), i + 1).map(d => d.low));
      const intensity = priceRange > 0 ? Math.min(maSpread / priceRange, 1) : 0;
      
      // Determine color
      let color = '#787b86'; // Default neutral
      if (trendDirection === 'up') {
        color = '#4caf50'; // Green
      } else if (trendDirection === 'down') {
        color = '#f44336'; // Red
      }
      
      ribbonData.push({
        time: this.data[i].time,
        value: currentPrice,
        color,
        intensity: intensity * trendStrength
      });
      
      trend.push(trendDirection);
    }
    
    console.log('Step 2: MA Ribbon Heatmap calculated');
    console.log('=== MA RIBBON HEATMAP CALCULATION COMPLETE ===');
    
    return { ribbonData, trend };
  }

  /**
   * Calculate Linear Regression (LinReg) Indicator
   * Uses least squares method to fit a line: y = mx + b
   * Returns slope, intercept, basis line, and upper/lower bands
   */
  private calculateLinearRegression(
    data: { high: number; low: number; close: number }[], 
    period: number = 20,
    stdDevMultiplier: number = 2.0
  ): { 
    basis: number[]; 
    upperBand: number[]; 
    lowerBand: number[]; 
    slope: number[]; 
    intercept: number[] 
  } {
    console.log('=== LINEAR REGRESSION CALCULATION START ===');
    console.log('Period:', period);
    console.log('Standard Deviation Multiplier:', stdDevMultiplier);
    
    const basis: number[] = [];
    const upperBand: number[] = [];
    const lowerBand: number[] = [];
    const slope: number[] = [];
    const intercept: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        basis.push(NaN);
        upperBand.push(NaN);
        lowerBand.push(NaN);
        slope.push(NaN);
        intercept.push(NaN);
        continue;
      }
      
      // Get the data window for regression
      const windowData = data.slice(i - period + 1, i + 1);
      const prices = windowData.map(d => d.close);
      
      // Calculate linear regression using least squares method
      const n = period;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      
      for (let j = 0; j < n; j++) {
        const x = j; // Time index (0, 1, 2, ..., n-1)
        const y = prices[j];
        
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      }
      
      // Calculate slope (m) and intercept (b) for y = mx + b
      const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const b = (sumY - m * sumX) / n;
      
      // The basis line value is the regression line value at the last point (x = n-1)
      const basisValue = m * (n - 1) + b;
      basis.push(basisValue);
      
      // Calculate standard deviation of residuals
      let sumSquaredResiduals = 0;
      for (let j = 0; j < n; j++) {
        const x = j;
        const y = prices[j];
        const predictedY = m * x + b;
        const residual = y - predictedY;
        sumSquaredResiduals += residual * residual;
      }
      const stdDev = Math.sqrt(sumSquaredResiduals / n);
      
      // Calculate bands
      const bandOffset = stdDev * stdDevMultiplier;
      upperBand.push(basisValue + bandOffset);
      lowerBand.push(basisValue - bandOffset);
      
      // Store slope and intercept
      slope.push(m);
      intercept.push(b);
    }
    
    console.log('Step 1: Linear Regression calculated');
    console.log('Step 2: Upper and Lower bands calculated');
    console.log('=== LINEAR REGRESSION CALCULATION COMPLETE ===');
    
    return { basis, upperBand, lowerBand, slope, intercept };
  }

  /**
   * Calculate Kalman Filter Moving Average (KFMA)
   * Uses state-space smoothing with process and measurement noise
   * Returns smoothed values and optional confidence bands
   */
  private calculateKalmanFilter(
    data: { high: number; low: number; close: number }[], 
    processNoise: number = 0.01,
    measurementNoise: number = 0.1,
    initialVariance: number = 1.0,
    smoothingFactor: number = 0.1
  ): { 
    smoothed: number[]; 
    confidenceUpper: number[]; 
    confidenceLower: number[]; 
    variance: number[] 
  } {
    console.log('=== KALMAN FILTER CALCULATION START ===');
    console.log('Process Noise (Q):', processNoise);
    console.log('Measurement Noise (R):', measurementNoise);
    console.log('Initial Variance (P):', initialVariance);
    console.log('Smoothing Factor:', smoothingFactor);
    
    const smoothed: number[] = [];
    const confidenceUpper: number[] = [];
    const confidenceLower: number[] = [];
    const variance: number[] = [];
    
    // Initialize Kalman Filter state
    let state = data[0]?.close || 0; // Initial state estimate
    let P = initialVariance; // Initial error covariance
    
    // Kalman Filter parameters
    const F = 1; // State transition matrix (identity for 1D)
    const H = 1; // Observation matrix (identity for 1D)
    const Q = processNoise; // Process noise covariance
    const R = measurementNoise; // Measurement noise covariance
    
    for (let i = 0; i < data.length; i++) {
      const measurement = data[i].close;
      
      // Prediction Step
      const predictedState = F * state;
      const predictedP = F * P * F + Q;
      
      // Update Step
      const y = measurement - H * predictedState; // Innovation (residual)
      const S = H * predictedP * H + R; // Innovation covariance
      const K = predictedP * H / S; // Kalman gain
      
      // Update state estimate
      state = predictedState + K * y;
      P = (1 - K * H) * predictedP;
      
      // Apply smoothing factor for additional smoothing
      if (i > 0) {
        state = state * smoothingFactor + smoothed[i - 1] * (1 - smoothingFactor);
      }
      
      smoothed.push(state);
      variance.push(P);
      
      // Calculate confidence bands (±2 standard deviations)
      const stdDev = Math.sqrt(P);
      confidenceUpper.push(state + 2 * stdDev);
      confidenceLower.push(state - 2 * stdDev);
    }
    
    console.log('Step 1: Kalman Filter state estimation completed');
    console.log('Step 2: Confidence bands calculated');
    console.log('=== KALMAN FILTER CALCULATION COMPLETE ===');
    
    return { smoothed, confidenceUpper, confidenceLower, variance };
  }

  /**
   * Calculate Range Filter (Composite) Indicator
   * Uses adaptive range calculation to filter price noise and generate signals
   * Returns signal line, upper/lower bands, and buy/sell signals
   */
  private calculateRangeFilter(
    data: { high: number; low: number; close: number }[], 
    method: 'atr' | 'percentage' | 'stddev' = 'atr',
    period: number = 14,
    multiplier: number = 2.0,
    smoothing: number = 3
  ): { 
    signal: number[]; 
    upperBand: number[]; 
    lowerBand: number[]; 
    buySignals: number[]; 
    sellSignals: number[] 
  } {
    console.log('=== RANGE FILTER CALCULATION START ===');
    console.log('Method:', method);
    console.log('Period:', period);
    console.log('Multiplier:', multiplier);
    console.log('Smoothing:', smoothing);
    
    const signal: number[] = [];
    const upperBand: number[] = [];
    const lowerBand: number[] = [];
    const buySignals: number[] = [];
    const sellSignals: number[] = [];
    
    // Calculate adaptive range based on method
    let adaptiveRange: number[] = [];
    
    if (method === 'atr') {
      adaptiveRange = this.calculateATR(data, period);
    } else if (method === 'percentage') {
      // Percentage-based range (percentage of price)
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          adaptiveRange.push(NaN);
          continue;
        }
        
        const windowData = data.slice(i - period + 1, i + 1);
        const prices = windowData.map(d => d.close);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const priceRange = avgPrice * (multiplier / 100); // Convert multiplier to percentage
        adaptiveRange.push(priceRange);
      }
    } else if (method === 'stddev') {
      // Standard deviation-based range
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          adaptiveRange.push(NaN);
          continue;
        }
        
        const windowData = data.slice(i - period + 1, i + 1);
        const prices = windowData.map(d => d.close);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);
        adaptiveRange.push(stdDev * multiplier);
      }
    }
    
    // Calculate signal line (smoothed price)
    const smoothedPrices = this.calculateSMA(data.map(d => d.close), smoothing);
    
    for (let i = 0; i < data.length; i++) {
      if (i < Math.max(period, smoothing) - 1) {
        signal.push(NaN);
        upperBand.push(NaN);
        lowerBand.push(NaN);
        buySignals.push(NaN);
        sellSignals.push(NaN);
        continue;
      }
      
      const currentPrice = data[i].close;
      const currentSignal = smoothedPrices[i];
      const currentRange = adaptiveRange[i];
      
      if (isNaN(currentSignal) || isNaN(currentRange)) {
        signal.push(NaN);
        upperBand.push(NaN);
        lowerBand.push(NaN);
        buySignals.push(NaN);
        sellSignals.push(NaN);
        continue;
      }
      
      // Calculate bands
      const upper = currentSignal + currentRange;
      const lower = currentSignal - currentRange;
      
      signal.push(currentSignal);
      upperBand.push(upper);
      lowerBand.push(lower);
      
      // Generate signals
      if (i > 0) {
        const prevPrice = data[i - 1].close;
        const prevUpper = upperBand[i - 1];
        const prevLower = lowerBand[i - 1];
        
        // Buy signal: price crosses above upper band
        if (prevPrice <= prevUpper && currentPrice > upper) {
          buySignals.push(currentPrice);
        } else {
          buySignals.push(NaN);
        }
        
        // Sell signal: price crosses below lower band
        if (prevPrice >= prevLower && currentPrice < lower) {
          sellSignals.push(currentPrice);
        } else {
          sellSignals.push(NaN);
        }
      } else {
        buySignals.push(NaN);
        sellSignals.push(NaN);
      }
    }
    
    console.log('Step 1: Adaptive range calculated using', method);
    console.log('Step 2: Signal line and bands calculated');
    console.log('Step 3: Buy/sell signals generated');
    console.log('=== RANGE FILTER CALCULATION COMPLETE ===');
    
    return { signal, upperBand, lowerBand, buySignals, sellSignals };
  }

  /**
   * Calculate HTF Trend Heat (MTF) Indicator
   * Analyzes MA and RSI alignment across multiple timeframes to generate trend score
   * Returns trend score, MA alignment, RSI alignment, and heatmap data
   */
  private calculateHTFTrendHeat(
    data: { high: number; low: number; close: number }[], 
    timeframes: string[] = ['1h', '4h', '1d'],
    maPeriod: number = 20,
    rsiPeriod: number = 14,
    maType: 'sma' | 'ema' = 'ema'
  ): { 
    trendScore: number[]; 
    maAlignment: number[]; 
    rsiAlignment: number[]; 
    heatmapData: { timeframe: string; score: number; color: string }[][];
    signals: number[] 
  } {
    console.log('=== HTF TREND HEAT (MTF) CALCULATION START ===');
    console.log('Timeframes:', timeframes);
    console.log('MA Period:', maPeriod);
    console.log('RSI Period:', rsiPeriod);
    console.log('MA Type:', maType);
    
    const trendScore: number[] = [];
    const maAlignment: number[] = [];
    const rsiAlignment: number[] = [];
    const heatmapData: { timeframe: string; score: number; color: string }[][] = [];
    const signals: number[] = [];
    
    // For this implementation, we'll simulate multi-timeframe analysis
    // In a real implementation, you would fetch data from different timeframes
    // For now, we'll use the current timeframe data and simulate different periods
    
    // Calculate MA for current timeframe
    const ma = maType === 'ema' 
      ? this.calculateEMA(data.map(d => d.close), maPeriod)
      : this.calculateSMA(data.map(d => d.close), maPeriod);
    
    // Calculate RSI for current timeframe
    const rsi = this.calculateRSI(data.map(d => d.close), rsiPeriod);
    
    // Simulate different timeframe data by using different periods
    const timeframeMultipliers = [1, 2, 4]; // Simulate 1h, 4h, 1d
    const timeframeData = timeframeMultipliers.map(multiplier => {
      const period = Math.max(maPeriod, rsiPeriod) * multiplier;
      const tfMa = maType === 'ema' 
        ? this.calculateEMA(data.map(d => d.close), period)
        : this.calculateSMA(data.map(d => d.close), period);
      const tfRsi = this.calculateRSI(data.map(d => d.close), period);
      return { ma: tfMa, rsi: tfRsi };
    });
    
    for (let i = 0; i < data.length; i++) {
      if (i < Math.max(maPeriod, rsiPeriod) - 1) {
        trendScore.push(NaN);
        maAlignment.push(NaN);
        rsiAlignment.push(NaN);
        heatmapData.push([]);
        signals.push(NaN);
        continue;
      }
      
      const currentPrice = data[i].close;
      const currentRsi = rsi[i];
      
      if (isNaN(currentRsi)) {
        trendScore.push(NaN);
        maAlignment.push(NaN);
        rsiAlignment.push(NaN);
        heatmapData.push([]);
        signals.push(NaN);
        continue;
      }
      
      // Calculate MA alignment across timeframes
      let maScore = 0;
      let maCount = 0;
      const maScores: number[] = [];
      
      for (let tf = 0; tf < timeframeData.length; tf++) {
        const tfMa = timeframeData[tf].ma[i];
        if (!isNaN(tfMa)) {
          const isAbove = currentPrice > tfMa ? 1 : -1;
          maScores.push(isAbove);
          maScore += isAbove;
          maCount++;
        }
      }
      
      // Calculate RSI alignment across timeframes
      let rsiScore = 0;
      let rsiCount = 0;
      const rsiScores: number[] = [];
      
      for (let tf = 0; tf < timeframeData.length; tf++) {
        const tfRsi = timeframeData[tf].rsi[i];
        if (!isNaN(tfRsi)) {
          let rsiValue = 0;
          if (tfRsi > 70) rsiValue = 1; // Overbought
          else if (tfRsi < 30) rsiValue = -1; // Oversold
          else rsiValue = 0; // Neutral
          
          rsiScores.push(rsiValue);
          rsiScore += rsiValue;
          rsiCount++;
        }
      }
      
      // Calculate alignment scores (0-100)
      const maAlignmentScore = maCount > 0 ? ((maScore / maCount + 1) / 2) * 100 : 50;
      const rsiAlignmentScore = rsiCount > 0 ? ((rsiScore / rsiCount + 1) / 2) * 100 : 50;
      
      // Calculate overall trend score (weighted average)
      const trendScoreValue = (maAlignmentScore * 0.6 + rsiAlignmentScore * 0.4);
      
      trendScore.push(trendScoreValue);
      maAlignment.push(maAlignmentScore);
      rsiAlignment.push(rsiAlignmentScore);
      
      // Generate heatmap data
      const heatmapRow: { timeframe: string; score: number; color: string }[] = [];
      for (let tf = 0; tf < timeframes.length; tf++) {
        const tfScore = tf < maScores.length ? maScores[tf] : 0;
        const normalizedScore = ((tfScore + 1) / 2) * 100;
        
        let color = '#ff4444'; // Red
        if (normalizedScore > 80) color = '#44ff44'; // Green
        else if (normalizedScore > 60) color = '#aaff44'; // Light Green
        else if (normalizedScore > 40) color = '#ffff44'; // Yellow
        else if (normalizedScore > 20) color = '#ffaa44'; // Orange
        
        heatmapRow.push({
          timeframe: timeframes[tf],
          score: normalizedScore,
          color: color
        });
      }
      heatmapData.push(heatmapRow);
      
      // Generate signals (when trend score is above threshold)
      if (trendScoreValue > 70) {
        signals.push(currentPrice);
      } else {
        signals.push(NaN);
      }
    }
    
    console.log('Step 1: Multi-timeframe MA and RSI calculated');
    console.log('Step 2: Alignment scores computed');
    console.log('Step 3: Trend score and heatmap generated');
    console.log('=== HTF TREND HEAT (MTF) CALCULATION COMPLETE ===');
    
    return { trendScore, maAlignment, rsiAlignment, heatmapData, signals };
  }

  /**
   * Calculate Money Flow Pressure (MFP) Indicator
   * Analyzes buying and selling pressure by combining price and volume data
   * Returns MFP values oscillating between 0-100
   */
  private calculateMoneyFlowPressure(
    data: { high: number; low: number; close: number; volume: number }[],
    period: number = 14
  ): number[] {
    console.log('=== MONEY FLOW PRESSURE (MFP) CALCULATION START ===');
    console.log('Period:', period);
    console.log('Data length:', data.length);
    
    const mfp: number[] = [];
    
    if (data.length < period + 1) {
      console.log('Insufficient data for MFP calculation');
      return new Array(data.length).fill(50); // Return neutral values
    }
    
    // Calculate Typical Price and Raw Money Flow
    const typicalPrices: number[] = [];
    const rawMoneyFlows: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const tp = (data[i].high + data[i].low + data[i].close) / 3;
      typicalPrices.push(tp);
      rawMoneyFlows.push(tp * data[i].volume);
    }
    
    console.log('Step 1: Typical prices and raw money flows calculated');
    
    // Calculate Positive and Negative Money Flows
    const positiveMoneyFlows: number[] = [];
    const negativeMoneyFlows: number[] = [];
    
    for (let i = 1; i < rawMoneyFlows.length; i++) {
      if (typicalPrices[i] > typicalPrices[i - 1]) {
        positiveMoneyFlows.push(rawMoneyFlows[i]);
        negativeMoneyFlows.push(0);
      } else if (typicalPrices[i] < typicalPrices[i - 1]) {
        positiveMoneyFlows.push(0);
        negativeMoneyFlows.push(rawMoneyFlows[i]);
      } else {
        positiveMoneyFlows.push(0);
        negativeMoneyFlows.push(0);
      }
    }
    
    console.log('Step 2: Positive and negative money flows calculated');
    
    // Calculate MFP using rolling sums
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        mfp.push(50); // Neutral value for warmup period
        continue;
      }
      
      // Calculate rolling sums for the period
      let positiveSum = 0;
      let negativeSum = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        if (j > 0) { // Skip first element as we start from index 1
          positiveSum += positiveMoneyFlows[j - 1];
          negativeSum += negativeMoneyFlows[j - 1];
        }
      }
      
      // Calculate Money Flow Ratio and MFP
      if (negativeSum === 0) {
        mfp.push(100); // Maximum positive pressure
      } else {
        const moneyFlowRatio = positiveSum / negativeSum;
        const mfpValue = 100 - (100 / (1 + moneyFlowRatio));
        mfp.push(mfpValue);
      }
    }
    
    console.log('Step 3: MFP values calculated');
    console.log('MFP range:', Math.min(...mfp), 'to', Math.max(...mfp));
    console.log('=== MONEY FLOW PRESSURE (MFP) CALCULATION COMPLETE ===');
    
    return mfp;
  }



  // ============================================================================
  // INDICATOR MANAGEMENT
  // ============================================================================

  /**
   * Add a new indicator
   */
  addIndicator(settings: IndicatorSettings): string {
    const id = settings.id || `indicator_${Date.now()}`;
    
    console.log('=== ADDING INDICATOR TO ENGINE ===');
    console.log('ID:', id);
    console.log('Type:', settings.type);
    console.log('All settings:', settings);
    
    try {
      console.log('Creating indicator instance...');
      const instance = this.createIndicatorInstance(id, settings);
      console.log('Instance created successfully:', instance);
      
      this.indicators.set(id, instance);
      console.log('Indicator stored in map, total indicators:', this.indicators.size);
      
      console.log('✅ Indicator added successfully:', id);
      return id;
    } catch (error) {
      console.error('❌ FAILED TO ADD INDICATOR IN ENGINE');
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Failed settings:', settings);
      throw error;
    }
  }

  /**
   * Remove an indicator
   */
  removeIndicator(id: string): void {
    const instance = this.indicators.get(id);
    if (!instance) return;

    console.log('=== REMOVING INDICATOR ===');
    console.log('ID:', id);

    try {
      // Remove series from chart
      if (instance.series) {
        this.chart.removeSeries(instance.series);
      }
      if (instance.emaSeries) {
        this.chart.removeSeries(instance.emaSeries);
      }
      if (instance.signalSeries) {
        this.chart.removeSeries(instance.signalSeries);
      }
      if (instance.histogramSeries) {
        this.chart.removeSeries(instance.histogramSeries);
      }

      // For RSI, MACD, CCI, MFI, and TTM Squeeze indicators, we need to remove the pane
      if (instance.settings.type === 'rsi' || instance.settings.type === 'macd' || instance.settings.type === 'cci' || instance.settings.type === 'mfi') {
        // Find and remove the pane that contains the indicator series
        const panes = this.chart.panes();
        // The last pane should be the indicator pane (since we add it last)
        if (panes.length > 1) {
          const indicatorPane = panes[panes.length - 1];
          this.chart.removePane(indicatorPane);
          console.log(`${instance.settings.type.toUpperCase()} pane removed`);
        }
      }

      // Remove from map
      this.indicators.delete(id);
      
      console.log('Indicator removed successfully:', id);
    } catch (error) {
      console.error('Failed to remove indicator:', error);
    }
  }

  /**
   * Update indicator settings
   */
  updateIndicator(id: string, updates: Partial<IndicatorSettings>): void {
    const instance = this.indicators.get(id);
    if (!instance) return;

    console.log('=== UPDATING INDICATOR ===');
    console.log('ID:', id, 'Updates:', updates);

    try {
      // Update settings
      const newSettings = { ...instance.settings, ...updates };
      instance.settings = newSettings;

      // Recreate indicator with new settings
      this.removeIndicator(id);
      const newInstance = this.createIndicatorInstance(id, newSettings);
      this.indicators.set(id, newInstance);

      // Notify parent component
      this.onIndicatorUpdate?.(id, updates);
      
      console.log('Indicator updated successfully:', id);
    } catch (error) {
      console.error('Failed to update indicator:', error);
    }
  }

  /**
   * Toggle indicator visibility
   */
  toggleVisibility(id: string): void {
    const instance = this.indicators.get(id);
    if (!instance) return;

    const newVisible = !instance.settings.visible;
    instance.settings.visible = newVisible;

    // Update series visibility
    if (instance.series) {
      instance.series.applyOptions({ visible: newVisible });
    }
    if (instance.emaSeries) {
      instance.emaSeries.applyOptions({ visible: newVisible });
    }
    if (instance.signalSeries) {
      instance.signalSeries.applyOptions({ visible: newVisible });
    }
    if (instance.histogramSeries) {
      instance.histogramSeries.applyOptions({ visible: newVisible });
    }

    console.log('Indicator visibility toggled:', id, 'Visible:', newVisible);
  }

  /**
   * Get all indicators
   */
  getIndicators(): IndicatorInstance[] {
    return Array.from(this.indicators.values());
  }

  /**
   * Get indicator by ID
   */
  getIndicator(id: string): IndicatorInstance | undefined {
    return this.indicators.get(id);
  }

  // ============================================================================
  // INDICATOR CREATION
  // ============================================================================

  /**
   * Create indicator instance based on type
   */
  private createIndicatorInstance(id: string, settings: IndicatorSettings): IndicatorInstance {
    switch (settings.type) {
      case 'rsi':
        return this.createRSIIndicator(id, settings);
      case 'sma':
        return this.createSMAIndicator(id, settings);
      case 'ema':
        return this.createEMAIndicator(id, settings);
      case 'macd':
        return this.createMACDIndicator(id, settings);
      case 'cci':
        return this.createCCIIndicator(id, settings);
      case 'mfi':
        return this.createMFIIndicator(id, settings);
      case 'donchian_width':
        return this.createDonchianWidthIndicator(id, settings);
      case 'chandelier_exit':
        return this.createChandelierExitIndicator(id, settings);
      case 'anchored_vwap':
        return this.createAnchoredVWAPIndicator(id, settings);
      case 'williams_vix_fix':
        return this.createWilliamsVixFixIndicator(id, settings);
      case 'qqe':
        return this.createQQEIndicator(id, settings);
      case 'stc':
        return this.createSTCIndicator(id, settings);
      case 'choppiness':
        return this.createChoppinessIndexIndicator(id, settings);
      case 'supertrend':
        return this.createSuperTrendIndicator(id, settings);
      case 'ma_ribbon_heatmap':
        return this.createMARibbonHeatmapIndicator(id, settings);
      case 'linreg':
        return this.createLinearRegressionIndicator(id, settings);
      case 'kalman_filter':
        return this.createKalmanFilterIndicator(id, settings);
      case 'range_filter':
        return this.createRangeFilterIndicator(id, settings);
      case 'htf_trend_heat':
        return this.createHTFTrendHeatIndicator(id, settings);
      case 'mfp':
        return this.createMFPIndicator(id, settings);
      case 'volume':
        return this.createVolumeIndicator(id, settings);
      default:
        throw new Error(`Unsupported indicator type: ${settings.type}`);
    }
  }

  /**
   * Create RSI indicator with EMA
   */
  private createRSIIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const closePrices = this.data.map(d => d.close);
    const rsiValues = this.calculateRSI(closePrices, settings.period);
    const emaLength = settings.emaLength || 9;
    
    // Filter out NaN values from RSI before calculating EMA
    const validRsiValues = rsiValues.filter(val => !isNaN(val));
    const validRsiIndices = rsiValues.map((val, index) => !isNaN(val) ? index : -1).filter(i => i !== -1);
    
    console.log('=== CREATING RSI INDICATOR ===');
    console.log('RSI Values:', rsiValues.slice(0, 10));
    console.log('Valid RSI Values:', validRsiValues.slice(0, 10));
    console.log('EMA Length:', emaLength);
    console.log('RSI Values length:', rsiValues.length);
    console.log('Valid RSI Values length:', validRsiValues.length);

    // Calculate EMA on valid RSI values
    const emaValues = this.calculateEMA(validRsiValues, emaLength);
    console.log('EMA Values:', emaValues.slice(0, 10));

    // Create RSI series data
    const rsiData = this.data.map((d, index) => ({
      time: d.time,
      value: !isNaN(rsiValues[index]) ? rsiValues[index] : null,
    })).filter(d => d.value !== null);

    // Create EMA series data - map back to original time indices
    const emaData = validRsiIndices.map((originalIndex, emaIndex) => ({
      time: this.data[originalIndex].time,
      value: emaValues[emaIndex],
    }));

    console.log('RSI Data points:', rsiData.length);
    console.log('EMA Data points:', emaData.length);
    console.log('RSI Data sample:', rsiData.slice(0, 5));
    console.log('EMA Data sample:', emaData.slice(0, 5));

    // Create a new pane for RSI indicator
    const pane = this.chart.addPane();
    // Don't set a fixed height - let it use available space

    // Get pane index
    const panes = this.chart.panes();
    const paneIndex = panes.indexOf(pane);
    console.log('Created pane, index:', paneIndex);

    // Create RSI series in the new pane
    const rsiSeries = this.chart.addSeries(LineSeries, {
      color: settings.color,
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 0,
        minMove: 1,
      },
    }, paneIndex);

    // Create EMA series in the same pane
    const emaSeries = this.chart.addSeries(LineSeries, {
      color: settings.emaColor || '#ff9500',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 0,
        minMove: 1,
      },
    }, paneIndex);

    // Set data
    rsiSeries.setData(rsiData);
    emaSeries.setData(emaData);

    // Add overbought/oversold horizontal lines
    const overboughtLevel = settings.overboughtLevel || 70;
    const oversoldLevel = settings.oversoldLevel || 30;
    const overboughtColor = settings.overboughtColor || '#787b86';
    const oversoldColor = settings.oversoldColor || '#787b86';

    const overboughtLine = rsiSeries.createPriceLine({
      price: overboughtLevel,
      color: overboughtColor,
      lineWidth: 1,
      lineStyle: 0, // Solid
      axisLabelVisible: false,
      title: 'Overbought',
    });

    const oversoldLine = rsiSeries.createPriceLine({
      price: oversoldLevel,
      color: oversoldColor,
      lineWidth: 1,
      lineStyle: 0, // Solid
      axisLabelVisible: false,
      title: 'Oversold',
    });

    const middleLine = rsiSeries.createPriceLine({
      price: 50,
      color: '#787b86',
      lineWidth: 1,
      lineStyle: 0, // Solid
      axisLabelVisible: false,
      title: 'Middle',
    });

    console.log('RSI series created and data set');
    console.log('EMA series created and data set');
    console.log('Overbought/Oversold lines added');
    console.log('Overbought level:', overboughtLevel, 'color:', overboughtColor);
    console.log('Oversold level:', oversoldLevel, 'color:', oversoldColor);

    return {
      settings,
      series: rsiSeries,
      emaSeries: emaSeries,
      data: rsiData
    };
  }

  /**
   * Create SMA indicator (overlay on main chart)
   */
  private createSMAIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const closePrices = this.data.map(d => d.close);
    const smaValues = this.calculateSMA(closePrices, settings.period);

    const smaData = this.data.map((d, index) => ({
      time: d.time,
      value: !isNaN(smaValues[index]) ? smaValues[index] : null,
    })).filter(d => d.value !== null);

    // Add SMA series to main chart (pane 0) as overlay
    const series = this.chart.addSeries(LineSeries, {
      color: settings.color,
      lineWidth: 2,
      title: `SMA(${settings.period})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, 0); // Always use pane 0 for overlay

    series.setData(smaData);

    return {
      settings,
      series,
      data: smaData
    };
  }

  /**
   * Create EMA indicator (overlay on main chart)
   */
  private createEMAIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const closePrices = this.data.map(d => d.close);
    const emaValues = this.calculateEMA(closePrices, settings.period);

    const emaData = this.data.map((d, index) => ({
      time: d.time,
      value: !isNaN(emaValues[index]) ? emaValues[index] : null,
    })).filter(d => d.value !== null);

    // Add EMA series to main chart (pane 0) as overlay
    const series = this.chart.addSeries(LineSeries, {
      color: settings.color,
      lineWidth: 2,
      title: `EMA(${settings.period})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, 0); // Always use pane 0 for overlay

    series.setData(emaData);

    return {
      settings,
      series,
      data: emaData
    };
  }

  /**
   * Create MACD indicator with MACD line, Signal line, and Histogram
   */
  private createMACDIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const closePrices = this.data.map(d => d.close);
    const fastPeriod = settings.fastPeriod || 12;
    const slowPeriod = settings.slowPeriod || 26;
    const signalPeriod = settings.signalPeriod || 9;
    
    console.log('=== CREATING MACD INDICATOR ===');
    console.log('Fast Period:', fastPeriod, 'Slow Period:', slowPeriod, 'Signal Period:', signalPeriod);
    
    // Calculate MACD components
    const macdData = this.calculateMACD(closePrices, fastPeriod, slowPeriod, signalPeriod);
    
    console.log('MACD Line sample:', macdData.macdLine.slice(0, 10));
    console.log('Signal Line sample:', macdData.signalLine.slice(0, 10));
    console.log('Histogram sample:', macdData.histogram.slice(0, 10));

    // Create a new pane for MACD indicator
    const pane = this.chart.addPane();
    // Don't set a fixed height - let it use available space

    // Get pane index
    const panes = this.chart.panes();
    const paneIndex = panes.indexOf(pane);
    console.log('Created MACD pane, index:', paneIndex);

    // Create MACD line series
    const macdLineData = this.data.map((d, index) => ({
      time: d.time,
      value: !isNaN(macdData.macdLine[index]) ? macdData.macdLine[index] : null,
    })).filter(d => d.value !== null);

    const macdSeries = this.chart.addSeries(LineSeries, {
      color: settings.macdColor || '#2196f3', // Blue
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    }, paneIndex);

    // Create Signal line series
    const signalLineData = this.data.map((d, index) => ({
      time: d.time,
      value: !isNaN(macdData.signalLine[index]) ? macdData.signalLine[index] : null,
    })).filter(d => d.value !== null);

    const signalSeries = this.chart.addSeries(LineSeries, {
      color: settings.signalColor || '#f44336', // Red
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    }, paneIndex);

    // Create Histogram series
    const histogramData = this.data.map((d, index) => ({
      time: d.time,
      value: !isNaN(macdData.histogram[index]) ? macdData.histogram[index] : null,
      color: macdData.histogram[index] >= 0 
        ? (settings.histogramUpColor || '#4caf50') // Green for positive
        : (settings.histogramDownColor || '#f44336') // Red for negative
    })).filter(d => d.value !== null);

    const histogramSeries = this.chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    }, paneIndex);

    // Set data for all series
    macdSeries.setData(macdLineData);
    signalSeries.setData(signalLineData);
    histogramSeries.setData(histogramData);

    // Add zero line
    const zeroLine = macdSeries.createPriceLine({
      price: 0,
      color: '#787b86',
      lineWidth: 1,
      lineStyle: 1, // Solid
      axisLabelVisible: true,
      title: 'Zero Line',
    });

    console.log('MACD series created and data set');
    console.log('MACD Line data points:', macdLineData.length);
    console.log('Signal Line data points:', signalLineData.length);
    console.log('Histogram data points:', histogramData.length);

    return {
      settings,
      series: macdSeries,
      signalSeries,
      histogramSeries,
      data: macdLineData
    };
  }

  /**
   * Create CCI indicator with overbought/oversold levels
   */
  private createCCIIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const cciPeriod = settings.cciPeriod || 20;
    const overboughtLevel = settings.cciOverboughtLevel || 100;
    const oversoldLevel = settings.cciOversoldLevel || -100;
    
    console.log('=== CREATING CCI INDICATOR ===');
    console.log('CCI Period:', cciPeriod, 'Overbought:', overboughtLevel, 'Oversold:', oversoldLevel);
    
    // Prepare data for CCI calculation
    const ohlcData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close
    }));
    
    // Calculate CCI
    const cciValues = this.calculateCCI(ohlcData, cciPeriod);
    
    console.log('CCI Values sample:', cciValues.slice(0, 10));

    // Create a new pane for CCI indicator
    const pane = this.chart.addPane();
    // Don't set a fixed height - let it use available space

    // Get pane index
    const panes = this.chart.panes();
    const paneIndex = panes.indexOf(pane);
    console.log('Created CCI pane, index:', paneIndex);

    // Create CCI series data
    const cciData = this.data.map((d, index) => ({
      time: d.time,
      value: !isNaN(cciValues[index]) ? cciValues[index] : null,
    })).filter(d => d.value !== null);

    const cciSeries = this.chart.addSeries(LineSeries, {
      color: settings.color || '#ff9500', // Orange
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, paneIndex);

    // Set data for CCI series
    cciSeries.setData(cciData);

    // Add overbought line (+100)
    const overboughtLine = cciSeries.createPriceLine({
      price: overboughtLevel,
      color: settings.cciOverboughtColor || '#f44336', // Red
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: `Overbought (${overboughtLevel})`,
    });

    // Add oversold line (-100)
    const oversoldLine = cciSeries.createPriceLine({
      price: oversoldLevel,
      color: settings.cciOversoldColor || '#4caf50', // Green
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: `Oversold (${oversoldLevel})`,
    });

    // Add zero line
    const zeroLine = cciSeries.createPriceLine({
      price: 0,
      color: settings.cciZeroColor || '#787b86', // Gray
      lineWidth: 1,
      lineStyle: 0, // Solid
      axisLabelVisible: true,
      title: 'Zero Line',
    });

    console.log('CCI series created and data set');
    console.log('CCI data points:', cciData.length);

    return {
      settings,
      series: cciSeries,
      data: cciData
    };
  }

  /**
   * Create MFI indicator with overbought/oversold levels
   */
  private createMFIIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const mfiPeriod = settings.mfiPeriod || 14;
    const overboughtLevel = settings.mfiOverboughtLevel || 80;
    const oversoldLevel = settings.mfiOversoldLevel || 20;
    
    console.log('=== CREATING MFI INDICATOR ===');
    console.log('MFI Period:', mfiPeriod, 'Overbought:', overboughtLevel, 'Oversold:', oversoldLevel);
    
    // Prepare data for MFI calculation (need volume data)
    const ohlcvData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume || 1000 // Default volume if not available
    }));
    
    // Calculate MFI
    const mfiValues = this.calculateMFI(ohlcvData, mfiPeriod);
    
    console.log('MFI Values sample:', mfiValues.slice(0, 10));

    // Create a new pane for MFI indicator
    const pane = this.chart.addPane();
    // Don't set a fixed height - let it use available space

    // Get pane index
    const panes = this.chart.panes();
    const paneIndex = panes.indexOf(pane);
    console.log('Created MFI pane, index:', paneIndex);

    // Create MFI series data
    const mfiData = this.data.map((d, index) => ({
      time: d.time,
      value: !isNaN(mfiValues[index]) ? mfiValues[index] : null,
    })).filter(d => d.value !== null);

    const mfiSeries = this.chart.addSeries(LineSeries, {
      color: settings.color || '#9c27b0', // Purple
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, paneIndex);

    // Set data for MFI series
    mfiSeries.setData(mfiData);

    // Add overbought line (80)
    const overboughtLine = mfiSeries.createPriceLine({
      price: overboughtLevel,
      color: settings.mfiOverboughtColor || '#f44336', // Red
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: `Overbought (${overboughtLevel})`,
    });

    // Add oversold line (20)
    const oversoldLine = mfiSeries.createPriceLine({
      price: oversoldLevel,
      color: settings.mfiOversoldColor || '#4caf50', // Green
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: `Oversold (${oversoldLevel})`,
    });

    // Add middle line (50)
    const middleLine = mfiSeries.createPriceLine({
      price: 50,
      color: settings.mfiMiddleColor || '#787b86', // Gray
      lineWidth: 1,
      lineStyle: 0, // Solid
      axisLabelVisible: true,
      title: 'Middle Line',
    });

    console.log('MFI series created and data set');
    console.log('MFI data points:', mfiData.length);

    return {
      settings,
      series: mfiSeries,
      data: mfiData
    };
  }

  /**
   * Create Donchian Width indicator
   */
  private createDonchianWidthIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const donchianPeriod = settings.donchianPeriod || 20;
    const showMiddleLine = settings.showMiddleLine !== undefined ? settings.showMiddleLine : false;
    
    console.log('=== CREATING DONCHIAN WIDTH INDICATOR ===');
    console.log('Period:', donchianPeriod);
    console.log('Show Middle Line:', showMiddleLine);
    
    // Prepare data for Donchian Width calculation
    const ohlcData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close
    }));
    
    // Calculate Donchian Width
    const dw = this.calculateDonchianWidth(ohlcData, donchianPeriod);
    
    // Create Donchian Channel data (upper and lower bands)
    const upperBandData: { time: any; value: number }[] = [];
    const lowerBandData: { time: any; value: number }[] = [];
    const middleLineData: { time: any; value: number }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      if (!isNaN(dw.upperBand[i])) {
        upperBandData.push({
          time: this.data[i].time,
          value: dw.upperBand[i]
        });
        
        lowerBandData.push({
          time: this.data[i].time,
          value: dw.lowerBand[i]
        });
        
        if (showMiddleLine) {
          middleLineData.push({
            time: this.data[i].time,
            value: dw.middleLine[i]
          });
        }
      }
    }
    
    // Add Donchian Upper Band to the main chart (pane 0)
    const upperBandSeries = this.chart.addSeries(LineSeries, {
      color: settings.donchianWidthColor || '#2196f3', // Blue
      lineWidth: 2,
      title: `Donchian Upper (${donchianPeriod})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, 0);
    
    upperBandSeries.setData(upperBandData);
    
    // Add Donchian Lower Band to the main chart (pane 0)
    const lowerBandSeries = this.chart.addSeries(LineSeries, {
      color: settings.donchianWidthColor || '#2196f3', // Blue
      lineWidth: 2,
      title: `Donchian Lower (${donchianPeriod})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, 0);
    
    lowerBandSeries.setData(lowerBandData);
    
    // Add middle line if enabled
    let middleLineSeries: ISeriesApi<'Line'> | null = null;
    if (showMiddleLine && middleLineData.length > 0) {
      middleLineSeries = this.chart.addSeries(LineSeries, {
        color: settings.middleLineColor || '#787b86', // Gray
        lineWidth: 1,
        title: `Donchian Middle (${donchianPeriod})`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, 0);
      
      middleLineSeries.setData(middleLineData);
    }
    
    console.log('✅ Donchian Channel indicator created successfully');
    return {
      settings,
      series: upperBandSeries,
      data: upperBandData,
      emaSeries: lowerBandSeries as any // Store lower band series for removal
    };
  }

  /**
   * Create Chandelier Exit indicator
   */
  private createChandelierExitIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const chandelierPeriod = settings.chandelierPeriod || 22;
    const atrMultiplier = settings.atrMultiplier || 3.0;
    const showLongExit = settings.showLongExit !== undefined ? settings.showLongExit : true;
    const showShortExit = settings.showShortExit !== undefined ? settings.showShortExit : true;
    
    console.log('=== CREATING CHANDELIER EXIT INDICATOR ===');
    console.log('Period:', chandelierPeriod);
    console.log('ATR Multiplier:', atrMultiplier);
    console.log('Show Long Exit:', showLongExit);
    console.log('Show Short Exit:', showShortExit);
    
    // Prepare data for Chandelier Exit calculation
    const ohlcData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close
    }));
    
    // Calculate Chandelier Exit
    const ce = this.calculateChandelierExit(ohlcData, chandelierPeriod, atrMultiplier);
    
    // Create Chandelier Exit data
    const longExitData: { time: any; value: number }[] = [];
    const shortExitData: { time: any; value: number }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      if (!isNaN(ce.longExit[i])) {
        if (showLongExit) {
          longExitData.push({
            time: this.data[i].time,
            value: ce.longExit[i]
          });
        }
        
        if (showShortExit) {
          shortExitData.push({
            time: this.data[i].time,
            value: ce.shortExit[i]
          });
        }
      }
    }
    
    // Add Long Exit series to the main chart (pane 0) if enabled
    let longExitSeries: ISeriesApi<'Line'> | null = null;
    if (showLongExit && longExitData.length > 0) {
      longExitSeries = this.chart.addSeries(LineSeries, {
        color: settings.longExitColor || '#4caf50', // Green
        lineWidth: 2,
        title: `Chandelier Long Exit (${chandelierPeriod}, ${atrMultiplier})`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, 0);
      
      longExitSeries.setData(longExitData);
      console.log('Long Exit series added');
    }
    
    // Add Short Exit series to the main chart (pane 0) if enabled
    let shortExitSeries: ISeriesApi<'Line'> | null = null;
    if (showShortExit && shortExitData.length > 0) {
      shortExitSeries = this.chart.addSeries(LineSeries, {
        color: settings.shortExitColor || '#f44336', // Red
        lineWidth: 2,
        title: `Chandelier Short Exit (${chandelierPeriod}, ${atrMultiplier})`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, 0);
      
      shortExitSeries.setData(shortExitData);
      console.log('Short Exit series added');
    }
    
    console.log('✅ Chandelier Exit indicator created successfully');
    return {
      settings,
      series: longExitSeries || shortExitSeries,
      data: longExitData.length > 0 ? longExitData : shortExitData,
      emaSeries: shortExitSeries as any // Store short exit series for removal
    };
  }

  /**
   * Create Anchored VWAP indicator
   */
  private createAnchoredVWAPIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const anchorType = settings.anchorType || 'first_bar';
    const anchorIndex = settings.anchorIndex || 0;
    const showStdDev = settings.showStdDev !== undefined ? settings.showStdDev : false;
    const stdDevMultiplier = settings.stdDevMultiplier || 2.0;
    
    console.log('=== CREATING ANCHORED VWAP INDICATOR ===');
    console.log('Anchor Type:', anchorType);
    console.log('Anchor Index:', anchorIndex);
    console.log('Show Std Dev Bands:', showStdDev);
    console.log('Std Dev Multiplier:', stdDevMultiplier);
    
    // Prepare data for Anchored VWAP calculation
    const ohlcvData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume || 0
    }));
    
    // Calculate Anchored VWAP
    const avwap = this.calculateAnchoredVWAP(ohlcvData, anchorIndex);
    
    // Create Anchored VWAP data
    const vwapData: { time: any; value: number }[] = [];
    const upperBandData: { time: any; value: number }[] = [];
    const lowerBandData: { time: any; value: number }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      if (!isNaN(avwap.vwap[i])) {
        vwapData.push({
          time: this.data[i].time,
          value: avwap.vwap[i]
        });
        
        if (showStdDev) {
          const stdDev = avwap.stdDev[i];
          upperBandData.push({
            time: this.data[i].time,
            value: avwap.vwap[i] + (stdDev * stdDevMultiplier)
          });
          lowerBandData.push({
            time: this.data[i].time,
            value: avwap.vwap[i] - (stdDev * stdDevMultiplier)
          });
        }
      }
    }
    
    // Add Anchored VWAP series to the main chart (pane 0)
    const vwapSeries = this.chart.addSeries(LineSeries, {
      color: settings.vwapColor || '#2962ff', // Blue
      lineWidth: 2,
      title: `Anchored VWAP (${anchorIndex})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, 0);
    
    vwapSeries.setData(vwapData);
    console.log('VWAP series added');
    
    // Add standard deviation bands if enabled
    let upperBandSeries: ISeriesApi<'Line'> | null = null;
    let lowerBandSeries: ISeriesApi<'Line'> | null = null;
    
    if (showStdDev && upperBandData.length > 0) {
      upperBandSeries = this.chart.addSeries(LineSeries, {
        color: settings.vwapColor || '#2962ff', // Same color as VWAP
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `VWAP Upper Band (${stdDevMultiplier}σ)`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, 0);
      
      upperBandSeries.setData(upperBandData);
      console.log('Upper band series added');
      
      lowerBandSeries = this.chart.addSeries(LineSeries, {
        color: settings.vwapColor || '#2962ff', // Same color as VWAP
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `VWAP Lower Band (${stdDevMultiplier}σ)`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, 0);
      
      lowerBandSeries.setData(lowerBandData);
      console.log('Lower band series added');
    }
    
    console.log('✅ Anchored VWAP indicator created successfully');
    return {
      settings,
      series: vwapSeries,
      data: vwapData,
      emaSeries: upperBandSeries as any // Store upper band for removal
    };
  }

  /**
   * Create Williams Vix Fix indicator
   */
  private createWilliamsVixFixIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const vixFixPeriod = settings.vixFixPeriod || 22;
    const bbPeriod = settings.vixFixBBPeriod || 20;
    const bbStdDev = settings.vixFixBBStdDev || 2.0;
    const showBands = settings.showVixFixBands !== undefined ? settings.showVixFixBands : true;
    const threshold = settings.vixFixThreshold || 80;
    
    console.log('=== CREATING WILLIAMS VIX FIX INDICATOR ===');
    console.log('VIX Fix Period:', vixFixPeriod);
    console.log('BB Period:', bbPeriod);
    console.log('BB Std Dev:', bbStdDev);
    console.log('Show Bands:', showBands);
    console.log('Threshold:', threshold);
    
    // Prepare data for Williams Vix Fix calculation
    const ohlcData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close
    }));
    
    // Calculate Williams Vix Fix
    const wvf = this.calculateWilliamsVixFix(ohlcData, vixFixPeriod, bbPeriod, bbStdDev);
    
    // Create Williams Vix Fix data
    const vixFixData: { time: any; value: number }[] = [];
    const upperBandData: { time: any; value: number }[] = [];
    const middleBandData: { time: any; value: number }[] = [];
    const lowerBandData: { time: any; value: number }[] = [];
    const thresholdData: { time: any; value: number }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      if (!isNaN(wvf.vixFix[i])) {
        vixFixData.push({
          time: this.data[i].time,
          value: wvf.vixFix[i]
        });
        
        // Add threshold line
        thresholdData.push({
          time: this.data[i].time,
          value: threshold
        });
        
        if (showBands && !isNaN(wvf.upperBand[i])) {
          upperBandData.push({
            time: this.data[i].time,
            value: wvf.upperBand[i]
          });
          middleBandData.push({
            time: this.data[i].time,
            value: wvf.middleBand[i]
          });
          lowerBandData.push({
            time: this.data[i].time,
            value: wvf.lowerBand[i]
          });
        }
      }
    }
    
    // Create a new pane for Williams Vix Fix
    const pane = this.chart.addPane();
    pane.setHeight(150);
    
    // Get the pane index for addSeries
    const panes = this.chart.panes();
    const paneIndex = panes.indexOf(pane);
    
    // Add Williams Vix Fix series to the new pane
    const vixFixSeries = this.chart.addSeries(LineSeries, {
      color: settings.vixFixColor || '#f44336', // Red
      lineWidth: 2,
      title: `Williams VIX Fix (${vixFixPeriod})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, paneIndex);
    
    vixFixSeries.setData(vixFixData);
    console.log('VIX Fix series added');
    
    // Add threshold line
    const thresholdSeries = this.chart.addSeries(LineSeries, {
      color: '#787b86', // Gray
      lineWidth: 1,
      lineStyle: 2, // Dashed
      title: `Threshold (${threshold})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, paneIndex);
    
    thresholdSeries.setData(thresholdData);
    console.log('Threshold line added');
    
    // Add Bollinger Bands if enabled
    let upperBandSeries: ISeriesApi<'Line'> | null = null;
    let middleBandSeries: ISeriesApi<'Line'> | null = null;
    let lowerBandSeries: ISeriesApi<'Line'> | null = null;
    
    if (showBands && upperBandData.length > 0) {
      upperBandSeries = this.chart.addSeries(LineSeries, {
        color: '#2196f3', // Blue
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `VIX Fix Upper BB (${bbStdDev}σ)`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, paneIndex);
      
      upperBandSeries.setData(upperBandData);
      console.log('Upper band series added');
      
      middleBandSeries = this.chart.addSeries(LineSeries, {
        color: '#787b86', // Gray
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `VIX Fix Middle BB`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, paneIndex);
      
      middleBandSeries.setData(middleBandData);
      console.log('Middle band series added');
      
      lowerBandSeries = this.chart.addSeries(LineSeries, {
        color: '#2196f3', // Blue
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `VIX Fix Lower BB (${bbStdDev}σ)`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, paneIndex);
      
      lowerBandSeries.setData(lowerBandData);
      console.log('Lower band series added');
    }
    
    console.log('✅ Williams VIX Fix indicator created successfully');
    return {
      settings,
      series: vixFixSeries,
      data: vixFixData,
      emaSeries: upperBandSeries as any // Store upper band for removal
    };
  }

  /**
   * Create QQE indicator
   */
  private createQQEIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const rsiPeriod = settings.qqeRsiPeriod || 14;
    const sf = settings.qqeSF || 5;
    const wildersPeriod = settings.qqeWildersPeriod || 27;
    const factor = settings.qqeFactor || 4.236;
    const showLevels = settings.showQqeLevels !== undefined ? settings.showQqeLevels : true;
    
    console.log('=== CREATING QQE INDICATOR ===');
    console.log('RSI Period:', rsiPeriod);
    console.log('Smoothing Factor (SF):', sf);
    console.log('Wilders Period:', wildersPeriod);
    console.log('Factor:', factor);
    console.log('Show Levels:', showLevels);
    
    // Prepare data for QQE calculation
    const ohlcData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close
    }));
    
    // Calculate QQE
    const qqeData = this.calculateQQE(ohlcData, rsiPeriod, sf, wildersPeriod, factor);
    
    // Create QQE series data
    const qqeLineData: { time: any; value: number }[] = [];
    const fastTrailData: { time: any; value: number }[] = [];
    const slowTrailData: { time: any; value: number }[] = [];
    const overboughtData: { time: any; value: number }[] = [];
    const oversoldData: { time: any; value: number }[] = [];
    const middleData: { time: any; value: number }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      if (!isNaN(qqeData.qqe[i])) {
        qqeLineData.push({
          time: this.data[i].time,
          value: qqeData.qqe[i]
        });
        
        if (!isNaN(qqeData.fastTrail[i])) {
          fastTrailData.push({
            time: this.data[i].time,
            value: qqeData.fastTrail[i]
          });
        }
        
        if (!isNaN(qqeData.slowTrail[i])) {
          slowTrailData.push({
            time: this.data[i].time,
            value: qqeData.slowTrail[i]
          });
        }
        
        // Add level lines
        overboughtData.push({
          time: this.data[i].time,
          value: 70
        });
        oversoldData.push({
          time: this.data[i].time,
          value: 30
        });
        middleData.push({
          time: this.data[i].time,
          value: 50
        });
      }
    }
    
    console.log('QQE Line data points:', qqeLineData.length);
    console.log('Fast Trail data points:', fastTrailData.length);
    console.log('Slow Trail data points:', slowTrailData.length);
    
    // Create a new pane for QQE indicator
    const pane = this.chart.addPane();
    
    // Get the pane index for addSeries
    const panes = this.chart.panes();
    const paneIndex = panes.indexOf(pane);
    
    // Add QQE line series to the new pane
    const qqeSeries = this.chart.addSeries(LineSeries, {
      color: settings.qqeLineColor || '#2196f3', // Blue
      lineWidth: 2,
      title: `QQE(${rsiPeriod},${sf},${wildersPeriod})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, paneIndex);
    
    qqeSeries.setData(qqeLineData);
    console.log('QQE line series added');
    
    // Add Fast Trailing Stop series
    const fastTrailSeries = this.chart.addSeries(LineSeries, {
      color: settings.qqeFastColor || '#4caf50', // Green
      lineWidth: 1,
      lineStyle: 2, // Dashed
      title: 'Fast Trail',
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, paneIndex);
    
    fastTrailSeries.setData(fastTrailData);
    console.log('Fast trail series added');
    
    // Add Slow Trailing Stop series
    const slowTrailSeries = this.chart.addSeries(LineSeries, {
      color: settings.qqeSlowColor || '#f44336', // Red
      lineWidth: 1,
      lineStyle: 2, // Dashed
      title: 'Slow Trail',
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, paneIndex);
    
    slowTrailSeries.setData(slowTrailData);
    console.log('Slow trail series added');
    
    // Add level lines if enabled
    if (showLevels) {
      const overboughtSeries = this.chart.addSeries(LineSeries, {
        color: '#787b86', // Gray
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: '70',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, paneIndex);
      
      overboughtSeries.setData(overboughtData);
      
      const oversoldSeries = this.chart.addSeries(LineSeries, {
        color: '#787b86', // Gray
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: '30',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, paneIndex);
      
      oversoldSeries.setData(oversoldData);
      
      const middleSeries = this.chart.addSeries(LineSeries, {
        color: '#787b86', // Gray
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: '50',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, paneIndex);
      
      middleSeries.setData(middleData);
      console.log('Level lines added');
    }
    
    console.log('✅ QQE indicator created successfully');
    return {
      settings,
      series: qqeSeries,
      data: qqeLineData,
      emaSeries: fastTrailSeries as any // Store fast trail for removal
    };
  }

  /**
   * Create STC (Schaff Trend Cycle) indicator
   */
  private createSTCIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const fastPeriod = settings.stcFastPeriod || 23;
    const slowPeriod = settings.stcSlowPeriod || 50;
    const cyclePeriod = settings.stcCyclePeriod || 10;
    const d1Period = settings.stcD1Period || 3;
    const d2Period = settings.stcD2Period || 3;
    const upperLevel = settings.stcUpperLevel || 75;
    const lowerLevel = settings.stcLowerLevel || 25;
    const showLevels = settings.showStcLevels !== undefined ? settings.showStcLevels : true;
    
    console.log('=== CREATING STC INDICATOR ===');
    console.log('Fast Period:', fastPeriod);
    console.log('Slow Period:', slowPeriod);
    console.log('Cycle Period:', cyclePeriod);
    console.log('D1 Period:', d1Period);
    console.log('D2 Period:', d2Period);
    console.log('Upper Level:', upperLevel);
    console.log('Lower Level:', lowerLevel);
    console.log('Show Levels:', showLevels);
    
    // Prepare data for STC calculation (close prices)
    const closePrices = this.data.map(d => d.close);
    
    // Calculate STC
    const stcValues = this.calculateSTC(closePrices, fastPeriod, slowPeriod, cyclePeriod, d1Period, d2Period);
    
    // Create STC series data
    const stcData: { time: any; value: number }[] = [];
    const upperLevelData: { time: any; value: number }[] = [];
    const lowerLevelData: { time: any; value: number }[] = [];
    const middleLevelData: { time: any; value: number }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      if (!isNaN(stcValues[i])) {
        stcData.push({
          time: this.data[i].time,
          value: stcValues[i]
        });
        
        // Add level lines
        upperLevelData.push({
          time: this.data[i].time,
          value: upperLevel
        });
        lowerLevelData.push({
          time: this.data[i].time,
          value: lowerLevel
        });
        middleLevelData.push({
          time: this.data[i].time,
          value: 50
        });
      }
    }
    
    console.log('STC data points:', stcData.length);
    
    // Create a new pane for STC indicator
    const pane = this.chart.addPane();
    
    // Get the pane index for addSeries
    const panes = this.chart.panes();
    const paneIndex = panes.indexOf(pane);
    
    // Add STC line series to the new pane
    const stcSeries = this.chart.addSeries(LineSeries, {
      color: settings.stcColor || '#2196f3', // Blue
      lineWidth: 2,
      title: `STC(${fastPeriod},${slowPeriod},${cyclePeriod})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, paneIndex);
    
    stcSeries.setData(stcData);
    console.log('STC line series added');
    
    // Add level lines if enabled
    if (showLevels) {
      const upperLevelSeries = this.chart.addSeries(LineSeries, {
        color: '#f44336', // Red
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `${upperLevel}`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, paneIndex);
      
      upperLevelSeries.setData(upperLevelData);
      
      const lowerLevelSeries = this.chart.addSeries(LineSeries, {
        color: '#4caf50', // Green
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `${lowerLevel}`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, paneIndex);
      
      lowerLevelSeries.setData(lowerLevelData);
      
      const middleLevelSeries = this.chart.addSeries(LineSeries, {
        color: '#787b86', // Gray
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: '50',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, paneIndex);
      
      middleLevelSeries.setData(middleLevelData);
      console.log('Level lines added');
    }
    
    console.log('✅ STC indicator created successfully');
    return {
      settings,
      series: stcSeries,
      data: stcData
    };
  }

  /**
   * Create Choppiness Index indicator
   */
  private createChoppinessIndexIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const period = settings.choppinessPeriod || 14;
    const upperLevel = settings.choppinessUpperLevel || 61.8;
    const lowerLevel = settings.choppinessLowerLevel || 38.2;
    const showLevels = settings.showChoppinessLevels !== undefined ? settings.showChoppinessLevels : true;
    
    console.log('=== CREATING CHOPPINESS INDEX INDICATOR ===');
    console.log('Period:', period);
    console.log('Upper Level (Ranging):', upperLevel);
    console.log('Lower Level (Trending):', lowerLevel);
    console.log('Show Levels:', showLevels);
    
    // Prepare data for Choppiness Index calculation
    const ohlcData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close
    }));
    
    // Calculate Choppiness Index
    const ciValues = this.calculateChoppinessIndex(ohlcData, period);
    
    // Create Choppiness Index series data
    const ciData: { time: any; value: number }[] = [];
    const upperLevelData: { time: any; value: number }[] = [];
    const lowerLevelData: { time: any; value: number }[] = [];
    const middleLevelData: { time: any; value: number }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      if (!isNaN(ciValues[i])) {
        ciData.push({
          time: this.data[i].time,
          value: ciValues[i]
        });
        
        // Add level lines
        upperLevelData.push({
          time: this.data[i].time,
          value: upperLevel
        });
        lowerLevelData.push({
          time: this.data[i].time,
          value: lowerLevel
        });
        middleLevelData.push({
          time: this.data[i].time,
          value: 50
        });
      }
    }
    
    console.log('Choppiness Index data points:', ciData.length);
    
    // Create a new pane for Choppiness Index indicator
    const pane = this.chart.addPane();
    
    // Get the pane index for addSeries
    const panes = this.chart.panes();
    const paneIndex = panes.indexOf(pane);
    
    // Add Choppiness Index line series to the new pane
    const ciSeries = this.chart.addSeries(LineSeries, {
      color: settings.choppinessColor || '#ff9800', // Orange
      lineWidth: 2,
      title: `Choppiness(${period})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, paneIndex);
    
    ciSeries.setData(ciData);
    console.log('Choppiness Index line series added');
    
    // Add level lines if enabled
    if (showLevels) {
      const upperLevelSeries = this.chart.addSeries(LineSeries, {
        color: '#f44336', // Red (ranging)
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `${upperLevel.toFixed(1)}`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, paneIndex);
      
      upperLevelSeries.setData(upperLevelData);
      
      const lowerLevelSeries = this.chart.addSeries(LineSeries, {
        color: '#4caf50', // Green (trending)
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `${lowerLevel.toFixed(1)}`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, paneIndex);
      
      lowerLevelSeries.setData(lowerLevelData);
      
      const middleLevelSeries = this.chart.addSeries(LineSeries, {
        color: '#787b86', // Gray
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: '50',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, paneIndex);
      
      middleLevelSeries.setData(middleLevelData);
      console.log('Level lines added');
    }
    
    console.log('✅ Choppiness Index indicator created successfully');
    return {
      settings,
      series: ciSeries,
      data: ciData
    };
  }

  /**
   * Create SuperTrend indicator
   */
  private createSuperTrendIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const period = settings.supertrendPeriod || 10;
    const multiplier = settings.supertrendMultiplier || 3.0;
    const upColor = settings.supertrendUpColor || '#4caf50'; // Green
    const downColor = settings.supertrendDownColor || '#f44336'; // Red
    const showSignals = settings.showSupertrendSignals !== undefined ? settings.showSupertrendSignals : true;
    const buyColor = settings.supertrendBuyColor || '#4caf50'; // Green
    const sellColor = settings.supertrendSellColor || '#f44336'; // Red
    
    console.log('=== CREATING SUPERTREND INDICATOR ===');
    console.log('Period:', period);
    console.log('Multiplier:', multiplier);
    console.log('Up Color:', upColor);
    console.log('Down Color:', downColor);
    console.log('Show Signals:', showSignals);
    
    // Prepare data for SuperTrend calculation
    const ohlcData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close
    }));
    
    // Calculate SuperTrend
    const { supertrend, trend, signals } = this.calculateSuperTrend(ohlcData, period, multiplier);
    
    // Create SuperTrend series data (uptrend and downtrend separately for color changes)
    const uptrendData: { time: any; value: number }[] = [];
    const downtrendData: { time: any; value: number }[] = [];
    const buySignalData: { time: any; value: number }[] = [];
    const sellSignalData: { time: any; value: number }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      if (!isNaN(supertrend[i])) {
        const time = this.data[i].time;
        const value = supertrend[i];
        
        if (trend[i] === 'up') {
          uptrendData.push({ time, value });
        } else {
          downtrendData.push({ time, value });
        }
        
        // Add signal markers
        if (showSignals && signals[i]) {
          if (signals[i] === 'buy') {
            buySignalData.push({ time, value });
          } else if (signals[i] === 'sell') {
            sellSignalData.push({ time, value });
          }
        }
      }
    }
    
    console.log('SuperTrend data points - Uptrend:', uptrendData.length, 'Downtrend:', downtrendData.length);
    console.log('Signal points - Buy:', buySignalData.length, 'Sell:', sellSignalData.length);
    
    // Create SuperTrend series on main chart (overlay)
    const uptrendSeries = this.chart.addSeries(LineSeries, {
      color: upColor,
      lineWidth: 2,
      title: `SuperTrend(${period},${multiplier})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, 0); // Main pane
    
    const downtrendSeries = this.chart.addSeries(LineSeries, {
      color: downColor,
      lineWidth: 2,
      title: `SuperTrend(${period},${multiplier})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, 0); // Main pane
    
    uptrendSeries.setData(uptrendData);
    downtrendSeries.setData(downtrendData);
    console.log('SuperTrend line series added');
    
    // Add signal markers if enabled
    if (showSignals) {
      if (buySignalData.length > 0) {
        const buySignalSeries = this.chart.addSeries(LineSeries, {
          color: buyColor,
          lineWidth: 0,
          pointSize: 4,
          title: 'Buy Signal',
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        }, 0); // Main pane
        
        buySignalSeries.setData(buySignalData);
        console.log('Buy signal series added');
      }
      
      if (sellSignalData.length > 0) {
        const sellSignalSeries = this.chart.addSeries(LineSeries, {
          color: sellColor,
          lineWidth: 0,
          pointSize: 4,
          title: 'Sell Signal',
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        }, 0); // Main pane
        
        sellSignalSeries.setData(sellSignalData);
        console.log('Sell signal series added');
      }
    }
    
    console.log('✅ SuperTrend indicator created successfully');
    return {
      settings,
      series: uptrendSeries, // Primary series for management
      data: [...uptrendData, ...downtrendData] // Combined data
    };
  }

  /**
   * Create MA Ribbon Heatmap indicator
   */
  private createMARibbonHeatmapIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const maType = settings.maRibbonMaType || 'sma';
    const periods = settings.maRibbonPeriods || [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
    const uptrendColor = settings.maRibbonUptrendColor || '#4caf50';
    const downtrendColor = settings.maRibbonDowntrendColor || '#f44336';
    const neutralColor = settings.maRibbonNeutralColor || '#787b86';
    const opacity = settings.maRibbonOpacity || 0.3;
    const showHeatmap = settings.showMaRibbonHeatmap !== undefined ? settings.showMaRibbonHeatmap : true;
    
    console.log('=== CREATING MA RIBBON HEATMAP INDICATOR ===');
    console.log('MA Type:', maType);
    console.log('Periods:', periods);
    console.log('Uptrend Color:', uptrendColor);
    console.log('Downtrend Color:', downtrendColor);
    console.log('Neutral Color:', neutralColor);
    console.log('Opacity:', opacity);
    console.log('Show Heatmap:', showHeatmap);
    
    // Prepare data for MA Ribbon calculation
    const ohlcData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close
    }));
    
    // Calculate MA Ribbon Heatmap
    const { ribbonData, trend } = this.calculateMARibbonHeatmap(ohlcData, maType, periods);
    
    // Create individual MA series for the ribbon
    const maSeries: ISeriesApi<'Line'>[] = [];
    
    // Calculate individual MAs
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      let maValues: number[];
      
      if (maType === 'sma') {
        maValues = this.calculateSMA(ohlcData.map(d => d.close), period);
      } else {
        maValues = this.calculateEMA(ohlcData.map(d => d.close), period);
      }
      
      // Create MA data
      const maData: { time: any; value: number }[] = [];
      for (let j = 0; j < this.data.length; j++) {
        if (!isNaN(maValues[j])) {
          maData.push({
            time: this.data[j].time,
            value: maValues[j]
          });
        }
      }
      
      // Create MA series with appropriate color based on trend
      const seriesColor = i === 0 ? uptrendColor : neutralColor; // First MA uses trend color
      const maSeriesInstance = this.chart.addSeries(LineSeries, {
        color: seriesColor,
        lineWidth: 1,
        title: `${maType.toUpperCase()}(${period})`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, 0); // Main pane
      
      maSeriesInstance.setData(maData);
      maSeries.push(maSeriesInstance);
    }
    
    console.log('MA Ribbon series created:', maSeries.length);
    
    // Create heatmap background if enabled
    if (showHeatmap) {
      // Group ribbon data by trend direction for heatmap visualization
      const uptrendData: { time: any; value: number }[] = [];
      const downtrendData: { time: any; value: number }[] = [];
      const neutralData: { time: any; value: number }[] = [];
      
      for (let i = 0; i < ribbonData.length; i++) {
        const dataPoint = ribbonData[i];
        if (trend[i] === 'up') {
          uptrendData.push({ time: dataPoint.time, value: dataPoint.value });
        } else if (trend[i] === 'down') {
          downtrendData.push({ time: dataPoint.time, value: dataPoint.value });
        } else {
          neutralData.push({ time: dataPoint.time, value: dataPoint.value });
        }
      }
      
      // Create heatmap series (using area series for background effect)
      if (uptrendData.length > 0) {
        const uptrendHeatmapSeries = this.chart.addSeries(LineSeries, {
          color: uptrendColor,
          lineWidth: 0,
          title: 'Uptrend Heatmap',
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        }, 0);
        uptrendHeatmapSeries.setData(uptrendData);
      }
      
      if (downtrendData.length > 0) {
        const downtrendHeatmapSeries = this.chart.addSeries(LineSeries, {
          color: downtrendColor,
          lineWidth: 0,
          title: 'Downtrend Heatmap',
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        }, 0);
        downtrendHeatmapSeries.setData(downtrendData);
      }
    }
    
    console.log('✅ MA Ribbon Heatmap indicator created successfully');
    return {
      settings,
      series: maSeries[0], // Primary series for management (first MA)
      data: ribbonData.map(d => ({ time: d.time, value: d.value })) // Simplified data
    };
  }

  /**
   * Create Linear Regression (LinReg) indicator
   */
  private createLinearRegressionIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const period = settings.linregPeriod || 20;
    const stdDevMultiplier = settings.linregStdDevMultiplier || 2.0;
    const basisColor = settings.linregBasisColor || '#2196f3'; // Blue
    const upperBandColor = settings.linregUpperBandColor || '#f44336'; // Red
    const lowerBandColor = settings.linregLowerBandColor || '#4caf50'; // Green
    const showBands = settings.showLinregBands !== undefined ? settings.showLinregBands : true;
    const showSlope = settings.showLinregSlope !== undefined ? settings.showLinregSlope : false;
    
    console.log('=== CREATING LINEAR REGRESSION INDICATOR ===');
    console.log('Period:', period);
    console.log('Standard Deviation Multiplier:', stdDevMultiplier);
    console.log('Basis Color:', basisColor);
    console.log('Upper Band Color:', upperBandColor);
    console.log('Lower Band Color:', lowerBandColor);
    console.log('Show Bands:', showBands);
    console.log('Show Slope:', showSlope);
    
    // Prepare data for Linear Regression calculation
    const ohlcData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close
    }));
    
    // Calculate Linear Regression
    const { basis, upperBand, lowerBand, slope, intercept } = this.calculateLinearRegression(ohlcData, period, stdDevMultiplier);
    
    // Create basis line data
    const basisData: { time: any; value: number }[] = [];
    const upperBandData: { time: any; value: number }[] = [];
    const lowerBandData: { time: any; value: number }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      if (!isNaN(basis[i])) {
        basisData.push({
          time: this.data[i].time,
          value: basis[i]
        });
        
        if (showBands) {
          upperBandData.push({
            time: this.data[i].time,
            value: upperBand[i]
          });
          
          lowerBandData.push({
            time: this.data[i].time,
            value: lowerBand[i]
          });
        }
      }
    }
    
    console.log('Linear Regression data points - Basis:', basisData.length, 'Upper Band:', upperBandData.length, 'Lower Band:', lowerBandData.length);
    
    // Create basis line series on main chart (overlay)
    const basisSeries = this.chart.addSeries(LineSeries, {
      color: basisColor,
      lineWidth: 2,
      title: `LinReg(${period})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, 0); // Main pane
    
    basisSeries.setData(basisData);
    console.log('Linear Regression basis line series added');
    
    // Add upper and lower bands if enabled
    if (showBands) {
      const upperBandSeries = this.chart.addSeries(LineSeries, {
        color: upperBandColor,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `LinReg Upper(${period})`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, 0); // Main pane
      
      upperBandSeries.setData(upperBandData);
      
      const lowerBandSeries = this.chart.addSeries(LineSeries, {
        color: lowerBandColor,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `LinReg Lower(${period})`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, 0); // Main pane
      
      lowerBandSeries.setData(lowerBandData);
      console.log('Linear Regression bands added');
    }
    
    console.log('✅ Linear Regression indicator created successfully');
    return {
      settings,
      series: basisSeries, // Primary series for management
      data: basisData // Basis line data
    };
  }

  /**
   * Create Kalman Filter Moving Average (KFMA) indicator
   */
  private createKalmanFilterIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const processNoise = settings.kalmanProcessNoise || 0.01;
    const measurementNoise = settings.kalmanMeasurementNoise || 0.1;
    const initialVariance = settings.kalmanInitialVariance || 1.0;
    const smoothingFactor = settings.kalmanSmoothingFactor || 0.1;
    const showConfidence = settings.showKalmanConfidence !== undefined ? settings.showKalmanConfidence : false;
    const confidenceColor = settings.kalmanConfidenceColor || '#787b86'; // Gray
    
    console.log('=== CREATING KALMAN FILTER INDICATOR ===');
    console.log('Process Noise (Q):', processNoise);
    console.log('Measurement Noise (R):', measurementNoise);
    console.log('Initial Variance (P):', initialVariance);
    console.log('Smoothing Factor:', smoothingFactor);
    console.log('Show Confidence:', showConfidence);
    console.log('Confidence Color:', confidenceColor);
    
    // Prepare data for Kalman Filter calculation
    const ohlcData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close
    }));
    
    // Calculate Kalman Filter
    const { smoothed, confidenceUpper, confidenceLower, variance } = this.calculateKalmanFilter(
      ohlcData, 
      processNoise, 
      measurementNoise, 
      initialVariance, 
      smoothingFactor
    );
    
    // Create smoothed line data
    const smoothedData: { time: any; value: number }[] = [];
    const confidenceUpperData: { time: any; value: number }[] = [];
    const confidenceLowerData: { time: any; value: number }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      smoothedData.push({
        time: this.data[i].time,
        value: smoothed[i]
      });
      
      if (showConfidence) {
        confidenceUpperData.push({
          time: this.data[i].time,
          value: confidenceUpper[i]
        });
        
        confidenceLowerData.push({
          time: this.data[i].time,
          value: confidenceLower[i]
        });
      }
    }
    
    console.log('Kalman Filter data points - Smoothed:', smoothedData.length, 'Confidence Upper:', confidenceUpperData.length, 'Confidence Lower:', confidenceLowerData.length);
    
    // Create main Kalman Filter series on main chart (overlay)
    const kalmanSeries = this.chart.addSeries(LineSeries, {
      color: settings.color || '#ff6b35', // Orange by default
      lineWidth: 2,
      title: `KFMA(Q:${processNoise},R:${measurementNoise})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, 0); // Main pane
    
    kalmanSeries.setData(smoothedData);
    console.log('Kalman Filter main series added');
    
    // Add confidence bands if enabled
    if (showConfidence) {
      const upperConfidenceSeries = this.chart.addSeries(LineSeries, {
        color: confidenceColor,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `KFMA Upper`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, 0); // Main pane
      
      upperConfidenceSeries.setData(confidenceUpperData);
      
      const lowerConfidenceSeries = this.chart.addSeries(LineSeries, {
        color: confidenceColor,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `KFMA Lower`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, 0); // Main pane
      
      lowerConfidenceSeries.setData(confidenceLowerData);
      console.log('Kalman Filter confidence bands added');
    }
    
    console.log('✅ Kalman Filter indicator created successfully');
    return {
      settings,
      series: kalmanSeries, // Primary series for management
      data: smoothedData // Smoothed data
    };
  }

  /**
   * Create Range Filter (Composite) indicator
   */
  private createRangeFilterIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const method = settings.rangeFilterMethod || 'atr';
    const period = settings.rangeFilterPeriod || 14;
    const multiplier = settings.rangeFilterMultiplier || 2.0;
    const smoothing = settings.rangeFilterSmoothing || 3;
    const upperColor = settings.rangeFilterUpperColor || '#4caf50'; // Green
    const lowerColor = settings.rangeFilterLowerColor || '#f44336'; // Red
    const signalColor = settings.rangeFilterSignalColor || '#2196f3'; // Blue
    const showSignals = settings.showRangeFilterSignals !== undefined ? settings.showRangeFilterSignals : true;
    const buyColor = settings.rangeFilterBuyColor || '#4caf50'; // Green
    const sellColor = settings.rangeFilterSellColor || '#f44336'; // Red
    
    console.log('=== CREATING RANGE FILTER INDICATOR ===');
    console.log('Method:', method);
    console.log('Period:', period);
    console.log('Multiplier:', multiplier);
    console.log('Smoothing:', smoothing);
    console.log('Upper Color:', upperColor);
    console.log('Lower Color:', lowerColor);
    console.log('Signal Color:', signalColor);
    console.log('Show Signals:', showSignals);
    console.log('Buy Color:', buyColor);
    console.log('Sell Color:', sellColor);
    
    // Prepare data for Range Filter calculation
    const ohlcData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close
    }));
    
    // Calculate Range Filter
    const { signal, upperBand, lowerBand, buySignals, sellSignals } = this.calculateRangeFilter(
      ohlcData, 
      method, 
      period, 
      multiplier, 
      smoothing
    );
    
    // Create data arrays
    const signalData: { time: any; value: number }[] = [];
    const upperBandData: { time: any; value: number }[] = [];
    const lowerBandData: { time: any; value: number }[] = [];
    const buySignalData: { time: any; value: number }[] = [];
    const sellSignalData: { time: any; value: number }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      if (!isNaN(signal[i])) {
        signalData.push({
          time: this.data[i].time,
          value: signal[i]
        });
        
        upperBandData.push({
          time: this.data[i].time,
          value: upperBand[i]
        });
        
        lowerBandData.push({
          time: this.data[i].time,
          value: lowerBand[i]
        });
        
        if (showSignals) {
          if (!isNaN(buySignals[i])) {
            buySignalData.push({
              time: this.data[i].time,
              value: buySignals[i]
            });
          }
          
          if (!isNaN(sellSignals[i])) {
            sellSignalData.push({
              time: this.data[i].time,
              value: sellSignals[i]
            });
          }
        }
      }
    }
    
    console.log('Range Filter data points - Signal:', signalData.length, 'Upper Band:', upperBandData.length, 'Lower Band:', lowerBandData.length, 'Buy Signals:', buySignalData.length, 'Sell Signals:', sellSignalData.length);
    
    // Create main signal line series on main chart (overlay)
    const signalSeries = this.chart.addSeries(LineSeries, {
      color: signalColor,
      lineWidth: 2,
      title: `RangeFilter(${method.toUpperCase()}:${period})`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, 0); // Main pane
    
    signalSeries.setData(signalData);
    console.log('Range Filter signal line series added');
    
    // Add upper and lower bands
    const upperBandSeries = this.chart.addSeries(LineSeries, {
      color: upperColor,
      lineWidth: 1,
      lineStyle: 2, // Dashed
      title: `RangeFilter Upper`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, 0); // Main pane
    
    upperBandSeries.setData(upperBandData);
    
    const lowerBandSeries = this.chart.addSeries(LineSeries, {
      color: lowerColor,
      lineWidth: 1,
      lineStyle: 2, // Dashed
      title: `RangeFilter Lower`,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }, 0); // Main pane
    
    lowerBandSeries.setData(lowerBandData);
    console.log('Range Filter bands added');
    
    // Add buy/sell signals if enabled
    if (showSignals) {
      if (buySignalData.length > 0) {
        const buySignalSeries = this.chart.addSeries(LineSeries, {
          color: buyColor,
          lineWidth: 0,
          pointSize: 6,
          title: `RangeFilter Buy`,
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        }, 0); // Main pane
        
        buySignalSeries.setData(buySignalData);
      }
      
      if (sellSignalData.length > 0) {
        const sellSignalSeries = this.chart.addSeries(LineSeries, {
          color: sellColor,
          lineWidth: 0,
          pointSize: 6,
          title: `RangeFilter Sell`,
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        }, 0); // Main pane
        
        sellSignalSeries.setData(sellSignalData);
      }
      console.log('Range Filter signals added');
    }
    
    console.log('✅ Range Filter indicator created successfully');
    return {
      settings,
      series: signalSeries, // Primary series for management
      data: signalData // Signal line data
    };
  }

  /**
   * Create HTF Trend Heat (MTF) indicator
   */
  private createHTFTrendHeatIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const timeframes = settings.htfTimeframes || ['1h', '4h', '1d'];
    const maPeriod = settings.htfMaPeriod || 20;
    const rsiPeriod = settings.htfRsiPeriod || 14;
    const maType = settings.htfMaType || 'ema';
    const scoreColor = settings.htfScoreColor || '#ff6b35'; // Orange
    const heatmapColors = settings.htfHeatmapColors || ['#ff4444', '#ffaa44', '#ffff44', '#aaff44', '#44ff44'];
    const showHeatmap = settings.showHtfHeatmap !== undefined ? settings.showHtfHeatmap : true;
    const showScore = settings.showHtfScore !== undefined ? settings.showHtfScore : true;
    const scoreThreshold = settings.htfScoreThreshold || 70;
    
    console.log('=== CREATING HTF TREND HEAT (MTF) INDICATOR ===');
    console.log('Timeframes:', timeframes);
    console.log('MA Period:', maPeriod);
    console.log('RSI Period:', rsiPeriod);
    console.log('MA Type:', maType);
    console.log('Score Color:', scoreColor);
    console.log('Heatmap Colors:', heatmapColors);
    console.log('Show Heatmap:', showHeatmap);
    console.log('Show Score:', showScore);
    console.log('Score Threshold:', scoreThreshold);
    
    // Prepare data for HTF Trend Heat calculation
    const ohlcData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close
    }));
    
    // Calculate HTF Trend Heat
    const { trendScore, maAlignment, rsiAlignment, heatmapData, signals } = this.calculateHTFTrendHeat(
      ohlcData, 
      timeframes, 
      maPeriod, 
      rsiPeriod, 
      maType
    );
    
    // Create data arrays
    const trendScoreData: { time: any; value: number }[] = [];
    const maAlignmentData: { time: any; value: number }[] = [];
    const rsiAlignmentData: { time: any; value: number }[] = [];
    const signalData: { time: any; value: number }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      if (!isNaN(trendScore[i])) {
        trendScoreData.push({
          time: this.data[i].time,
          value: trendScore[i]
        });
        
        maAlignmentData.push({
          time: this.data[i].time,
          value: maAlignment[i]
        });
        
        rsiAlignmentData.push({
          time: this.data[i].time,
          value: rsiAlignment[i]
        });
        
        if (!isNaN(signals[i])) {
          signalData.push({
            time: this.data[i].time,
            value: signals[i]
          });
        }
      }
    }
    
    console.log('HTF Trend Heat data points - Trend Score:', trendScoreData.length, 'MA Alignment:', maAlignmentData.length, 'RSI Alignment:', rsiAlignmentData.length, 'Signals:', signalData.length);
    
    // Create a new pane for HTF Trend Heat analysis
    const pane = this.chart.addPane();
    pane.setHeight(150); // Set height for the indicator pane
    
    // Hide time scale on main chart and show only on indicator pane
    const mainTimeScale = this.chart.timeScale();
    mainTimeScale.applyOptions({
      visible: false,
    });
    
    // Create main trend score series in the new pane
    const trendScoreSeries = this.chart.addSeries(LineSeries, {
      color: scoreColor,
      lineWidth: 2,
      title: `HTFTrendHeat(${timeframes.join(',')})`,
      priceFormat: {
        type: 'price',
        precision: 1,
        minMove: 0.1,
      },
    }, this.chart.panes().indexOf(pane)); // Use pane index
    
    trendScoreSeries.setData(trendScoreData);
    console.log('HTF Trend Heat score series added to new pane');
    
    // Add MA alignment line if enabled
    if (showScore) {
      const maAlignmentSeries = this.chart.addSeries(LineSeries, {
        color: '#4caf50', // Green
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `HTF MA Alignment`,
        priceFormat: {
          type: 'price',
          precision: 1,
          minMove: 0.1,
        },
      }, this.chart.panes().indexOf(pane)); // Use pane index
      
      maAlignmentSeries.setData(maAlignmentData);
      
      const rsiAlignmentSeries = this.chart.addSeries(LineSeries, {
        color: '#2196f3', // Blue
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: `HTF RSI Alignment`,
        priceFormat: {
          type: 'price',
          precision: 1,
          minMove: 0.1,
        },
      }, this.chart.panes().indexOf(pane)); // Use pane index
      
      rsiAlignmentSeries.setData(rsiAlignmentData);
      console.log('HTF Trend Heat alignment lines added to new pane');
    }
    
    // Add trend signals on main chart (overlay)
    if (signalData.length > 0) {
      const signalSeries = this.chart.addSeries(LineSeries, {
        color: scoreColor,
        lineWidth: 0,
        pointSize: 8,
        title: `HTF Trend Signals`,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      }, 0); // Main pane
      
      signalSeries.setData(signalData);
      console.log('HTF Trend Heat signals added to main chart');
    }
    
    console.log('✅ HTF Trend Heat (MTF) indicator created successfully');
    return {
      settings,
      series: trendScoreSeries, // Primary series for management
      data: trendScoreData // Trend score data
    };
  }

  /**
   * Create Money Flow Pressure (MFP) indicator
   */
  private createMFPIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const period = settings.mfpPeriod || 14;
    const mfpColor = settings.mfpColor || '#9c27b0'; // Purple
    const overboughtLevel = settings.mfpOverboughtLevel || 80;
    const oversoldLevel = settings.mfpOversoldLevel || 20;
    const overboughtColor = settings.mfpOverboughtColor || '#f44336'; // Red
    const oversoldColor = settings.mfpOversoldColor || '#4caf50'; // Green
    const middleColor = settings.mfpMiddleColor || '#787b86'; // Gray
    
    console.log('=== CREATING MONEY FLOW PRESSURE (MFP) INDICATOR ===');
    console.log('Period:', period);
    console.log('MFP Color:', mfpColor);
    console.log('Overbought Level:', overboughtLevel);
    console.log('Oversold Level:', oversoldLevel);
    
    // Prepare OHLCV data for calculation
    const ohlcvData = this.data.map(d => ({
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume || 1000 // Default volume if not available
    }));
    
    // Calculate MFP values
    const mfpValues = this.calculateMoneyFlowPressure(ohlcvData, period);
    
    // Create data points for the series
    const mfpData = this.data.map((d, i) => ({
      time: d.time as any,
      value: mfpValues[i] || 50
    }));
    
    console.log('MFP data points created:', mfpData.length);
    console.log('MFP range:', Math.min(...mfpValues), 'to', Math.max(...mfpValues));
    
    // Create a new pane for MFP (oscillator)
    const pane = this.chart.addPane();
    pane.setHeight(150); // Set height for the indicator pane
    
    // Hide time scale on main chart
    const mainTimeScale = this.chart.timeScale();
    mainTimeScale.applyOptions({
      visible: false,
    });
    
    // Create MFP series in the new pane
    const mfpSeries = this.chart.addSeries(LineSeries, {
      color: mfpColor,
      lineWidth: 2,
      title: `MFP(${period})`,
      priceFormat: {
        type: 'price',
        precision: 1,
        minMove: 0.1,
      },
    }, this.chart.panes().indexOf(pane)); // Use pane index
    
    mfpSeries.setData(mfpData);
    console.log('MFP series added to new pane');
    
    // Add horizontal reference lines for overbought/oversold levels using the series
    const overboughtLine = mfpSeries.createPriceLine({
      price: overboughtLevel,
      color: overboughtColor,
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: `Overbought (${overboughtLevel})`,
    });
    
    const oversoldLine = mfpSeries.createPriceLine({
      price: oversoldLevel,
      color: oversoldColor,
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: `Oversold (${oversoldLevel})`,
    });
    
    const middleLine = mfpSeries.createPriceLine({
      price: 50,
      color: middleColor,
      lineWidth: 1,
      lineStyle: 1, // Solid
      axisLabelVisible: true,
      title: 'Neutral (50)',
    });
    
    console.log('MFP reference lines added');
    
    console.log('✅ Money Flow Pressure (MFP) indicator created successfully');
    return {
      settings,
      series: mfpSeries, // Primary series for management
      data: mfpData // MFP data
    };
  }

  /**
   * Create Volume indicator
   */
  private createVolumeIndicator(id: string, settings: IndicatorSettings): IndicatorInstance {
    const upColor = settings.volumeUpColor || '#26a69a'; // Teal/Green
    const downColor = settings.volumeDownColor || '#ef5350'; // Red
    const showMA = settings.volumeShowMA !== undefined ? settings.volumeShowMA : false;
    const maPeriod = settings.volumeMAPeriod || 20;
    const maColor = settings.volumeMAColor || '#2196f3'; // Blue
    const maType = settings.volumeMaType || 'sma';
    
    console.log('=== CREATING VOLUME INDICATOR ===');
    console.log('Up Color:', upColor);
    console.log('Down Color:', downColor);
    console.log('Show MA:', showMA);
    console.log('MA Period:', maPeriod);
    console.log('MA Type:', maType);
    console.log('MA Color:', maColor);
    
    // Create volume bars data with colors based on price direction
    const volumeData: { time: any; value: number; color: string }[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      const currentCandle = this.data[i];
      // Use actual volume if available, otherwise generate realistic volume based on price movement
      let volume = currentCandle.volume || 0;
      
      // If no volume data, generate realistic volume based on price movement
      if (volume === 0) {
        const priceRange = currentCandle.high - currentCandle.low;
        const avgPrice = (currentCandle.high + currentCandle.low + currentCandle.open + currentCandle.close) / 4;
        // Generate volume proportional to price movement
        volume = Math.floor((priceRange / avgPrice) * 1000000 + Math.random() * 500000);
      }
      
      // Determine color based on whether it's an up or down candle
      const isUpCandle = currentCandle.close >= currentCandle.open;
      const barColor = isUpCandle ? upColor : downColor;
      
      volumeData.push({
        time: currentCandle.time as any,
        value: volume,
        color: barColor
      });
    }
    
    console.log('Volume data points created:', volumeData.length);
    console.log('Volume range:', Math.min(...volumeData.map(v => v.value)), 'to', Math.max(...volumeData.map(v => v.value)));
    console.log('Sample volume data:', volumeData.slice(0, 5));
    
    // Debug: Check if we have valid volume data
    const validVolumeData = volumeData.filter(d => d.value > 0);
    console.log('Valid volume data points:', validVolumeData.length);
    if (validVolumeData.length === 0) {
      console.warn('No valid volume data found! All volume values are 0 or missing.');
    }
    
    // Create volume histogram series as overlay on main chart (pane 0)
    const volumeSeries = this.chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
        precision: 0,
        minMove: 1,
      },
      priceScaleId: 'volume', // Separate price scale for volume
      scaleMargins: {
        top: 0.8, // Leave 80% space for price, 20% for volume
        bottom: 0,
      },
    }, 0); // Main pane
    
    volumeSeries.setData(volumeData);
    console.log('Volume histogram added to main chart');
    
    // Configure the volume price scale
    const volumePriceScale = this.chart.priceScale('volume');
    if (volumePriceScale) {
      volumePriceScale.applyOptions({
        scaleMargins: {
          top: 0.8, // Leave 80% space for price, 20% for volume
          bottom: 0,
        },
        entireTextOnly: true,
        borderVisible: true,
        borderColor: '#e5e7eb',
        textColor: '#6b7280',
        tickMarkFormatter: (price: number) => {
          if (price >= 1000000) {
            return (price / 1000000).toFixed(1) + 'M';
          } else if (price >= 1000) {
            return (price / 1000).toFixed(1) + 'K';
          }
          return price.toFixed(0);
        },
      });
    }
    
    // Configure the main price scale to leave space for volume
    const mainPriceScale = this.chart.priceScale('right');
    if (mainPriceScale) {
      mainPriceScale.applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.2, // Leave 20% space at bottom for volume
        },
      });
    }
    
    // Add volume MA if enabled
    if (showMA) {
      // Calculate MA of volume using the same volume values we created
      const volumeValues = volumeData.map(d => d.value);
      let volumeMA: number[] = [];
      
      if (maType === 'sma') {
        // Calculate SMA of volume
        for (let i = 0; i < volumeValues.length; i++) {
          if (i < maPeriod - 1) {
            volumeMA.push(NaN);
          } else {
            let sum = 0;
            for (let j = 0; j < maPeriod; j++) {
              sum += volumeValues[i - j];
            }
            volumeMA.push(sum / maPeriod);
          }
        }
      } else if (maType === 'ema') {
        // Calculate EMA of volume
        const multiplier = 2 / (maPeriod + 1);
        volumeMA = new Array(volumeValues.length).fill(NaN);
        
        // Initialize first EMA value
        if (volumeValues.length > 0) {
          volumeMA[0] = volumeValues[0];
        }
        
        // Calculate EMA for remaining values
        for (let i = 1; i < volumeValues.length; i++) {
          if (!isNaN(volumeMA[i - 1])) {
            volumeMA[i] = (volumeValues[i] * multiplier) + (volumeMA[i - 1] * (1 - multiplier));
          }
        }
      }
      
      // Create MA series data
      const volumeMAData = this.data.map((d, i) => ({
        time: d.time as any,
        value: volumeMA[i] || 0
      })).filter(d => !isNaN(d.value) && d.value > 0);
      
      // Create volume MA series as overlay on main chart
      const volumeMASeries = this.chart.addSeries(LineSeries, {
        color: maColor,
        lineWidth: 2,
        title: `Volume ${maType.toUpperCase()}(${maPeriod})`,
        priceFormat: {
          type: 'volume',
          precision: 0,
          minMove: 1,
        },
        priceScaleId: 'volume', // Same price scale as volume bars
        scaleMargins: {
          top: 0.8, // Leave 80% space for price, 20% for volume
          bottom: 0,
        },
      }, 0); // Main pane
      
      volumeMASeries.setData(volumeMAData);
      console.log(`Volume ${maType.toUpperCase()} added to main chart`);
    }
    
    console.log('✅ Volume indicator created successfully');
    return {
      settings,
      series: volumeSeries, // Primary series for management
      data: volumeData // Volume data
    };
  }



  // ============================================================================
  // DATA UPDATES
  // ============================================================================

  /**
   * Update chart data and recalculate all indicators
   */
  updateData(newData: any[]): void {
    this.data = newData;
    
    console.log('=== UPDATING DATA ===');
    console.log('New data length:', newData.length);
    
    // Recreate all indicators with new data
    const indicatorsToRecreate = Array.from(this.indicators.entries());
    
    indicatorsToRecreate.forEach(([id, instance]) => {
      try {
        this.removeIndicator(id);
        this.addIndicator(instance.settings);
      } catch (error) {
        console.error('Failed to recreate indicator:', id, error);
      }
    });
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Clean up all indicators
   */
  destroy(): void {
    console.log('=== DESTROYING INDICATOR ENGINE ===');
    
    this.indicators.forEach((instance, id) => {
      this.removeIndicator(id);
    });
    
    this.indicators.clear();
  }
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_INDICATOR_SETTINGS: Partial<IndicatorSettings> = {
  period: 14,
  emaLength: 9,
  color: '#7E57C2',
  emaColor: '#ff9500',
  visible: true,
  paneIndex: 1,
  overboughtLevel: 70,
  oversoldLevel: 30,
  overboughtColor: '#787b86',
  oversoldColor: '#787b86',
  // MACD-specific defaults
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
  macdColor: '#2196f3', // Blue
  signalColor: '#f44336', // Red
  histogramUpColor: '#4caf50', // Green
  histogramDownColor: '#f44336', // Red
  // CCI-specific defaults
  cciPeriod: 20,
  cciOverboughtLevel: 100,
  cciOversoldLevel: -100,
  cciOverboughtColor: '#f44336', // Red
  cciOversoldColor: '#4caf50', // Green
  cciZeroColor: '#787b86', // Gray
  // MFI-specific defaults
  mfiPeriod: 14,
  mfiOverboughtLevel: 80,
  mfiOversoldLevel: 20,
  mfiOverboughtColor: '#f44336', // Red
  mfiOversoldColor: '#4caf50', // Green
  mfiMiddleColor: '#787b86', // Gray
  // Donchian Width-specific defaults
  donchianPeriod: 20,
  donchianWidthColor: '#2196f3', // Blue
  showMiddleLine: false,
  middleLineColor: '#787b86', // Gray
  // Chandelier Exit-specific defaults
  chandelierPeriod: 22,
  atrMultiplier: 3.0,
  longExitColor: '#4caf50', // Green
  shortExitColor: '#f44336', // Red
  showLongExit: true,
  showShortExit: true,
  // Anchored VWAP-specific defaults
  anchorType: 'first_bar',
  anchorIndex: 0,
  vwapColor: '#2962ff', // Blue
  showStdDev: false,
  stdDevMultiplier: 2.0,
  // Williams Vix Fix-specific defaults
  vixFixPeriod: 22,
  vixFixBBPeriod: 20,
  vixFixBBStdDev: 2.0,
  vixFixColor: '#f44336', // Red
  vixFixHighColor: '#ff5252', // Bright red
  showVixFixBands: true,
  vixFixThreshold: 80,
  // QQE-specific defaults
  qqeRsiPeriod: 14,
  qqeSF: 5,
  qqeWildersPeriod: 27,
  qqeFactor: 4.236,
  qqeLineColor: '#2196f3', // Blue
  qqeFastColor: '#4caf50', // Green
  qqeSlowColor: '#f44336', // Red
  showQqeLevels: true,
  // STC-specific defaults
  stcFastPeriod: 23,
  stcSlowPeriod: 50,
  stcCyclePeriod: 10,
  stcD1Period: 3,
  stcD2Period: 3,
  stcColor: '#2196f3', // Blue
  stcUpperLevel: 75,
  stcLowerLevel: 25,
  showStcLevels: true,
  // Choppiness Index-specific defaults
  choppinessPeriod: 14,
  choppinessColor: '#ff9800', // Orange
  choppinessUpperLevel: 61.8,
  choppinessLowerLevel: 38.2,
  showChoppinessLevels: true,
  // SuperTrend-specific defaults
  supertrendPeriod: 10,
  supertrendMultiplier: 3.0,
  supertrendUpColor: '#4caf50', // Green
  supertrendDownColor: '#f44336', // Red
  showSupertrendSignals: true,
  supertrendBuyColor: '#4caf50', // Green
  supertrendSellColor: '#f44336', // Red
  // MA Ribbon Heatmap-specific defaults
  maRibbonMaType: 'sma',
  maRibbonPeriods: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
  maRibbonUptrendColor: '#4caf50', // Green
  maRibbonDowntrendColor: '#f44336', // Red
  maRibbonNeutralColor: '#787b86', // Gray
  maRibbonOpacity: 0.3,
  showMaRibbonHeatmap: true,
  // Linear Regression-specific defaults
  linregPeriod: 20,
  linregStdDevMultiplier: 2.0,
  linregBasisColor: '#2196f3', // Blue
  linregUpperBandColor: '#f44336', // Red
  linregLowerBandColor: '#4caf50', // Green
  showLinregBands: true,
  showLinregSlope: false,
  // Kalman Filter-specific defaults
  kalmanProcessNoise: 0.01,
  kalmanMeasurementNoise: 0.1,
  kalmanInitialVariance: 1.0,
  kalmanSmoothingFactor: 0.1,
  showKalmanConfidence: false,
  kalmanConfidenceColor: '#787b86', // Gray
  // Range Filter-specific defaults
  rangeFilterMethod: 'atr',
  rangeFilterPeriod: 14,
  rangeFilterMultiplier: 2.0,
  rangeFilterSmoothing: 3,
  rangeFilterUpperColor: '#4caf50', // Green
  rangeFilterLowerColor: '#f44336', // Red
  rangeFilterSignalColor: '#2196f3', // Blue
  showRangeFilterSignals: true,
  rangeFilterBuyColor: '#4caf50', // Green
  rangeFilterSellColor: '#f44336', // Red
  // HTF Trend Heat (MTF)-specific defaults
  htfTimeframes: ['1h', '4h', '1d'],
  htfMaPeriod: 20,
  htfRsiPeriod: 14,
  htfMaType: 'ema',
  htfScoreColor: '#ff6b35', // Orange
  htfHeatmapColors: ['#ff4444', '#ffaa44', '#ffff44', '#aaff44', '#44ff44'],
  showHtfHeatmap: true,
  showHtfScore: true,
  htfScoreThreshold: 70,
  // Money Flow Pressure (MFP)-specific defaults
  mfpPeriod: 14,
  mfpColor: '#9c27b0', // Purple
  mfpOverboughtLevel: 80,
  mfpOversoldLevel: 20,
  mfpOverboughtColor: '#f44336', // Red
  mfpOversoldColor: '#4caf50', // Green
  mfpMiddleColor: '#787b86', // Gray
  // Volume-specific defaults
  volumeUpColor: '#4caf50', // Green (less saturated)
  volumeDownColor: '#f44336', // Red (less saturated)
  volumeShowMA: false,
  volumeMAPeriod: 20,
  volumeMAColor: '#2196f3', // Blue
  volumeMaType: 'sma' // Simple Moving Average
};

export const INDICATOR_TYPES = [
  { value: 'rsi', label: 'RSI (Relative Strength Index)' },
  { value: 'sma', label: 'SMA (Simple Moving Average)' },
  { value: 'ema', label: 'EMA (Exponential Moving Average)' },
  { value: 'macd', label: 'MACD (Moving Average Convergence Divergence)' },
  { value: 'cci', label: 'CCI (Commodity Channel Index)' },
  { value: 'mfi', label: 'MFI (Money Flow Index)' },
  { value: 'donchian_width', label: 'Donchian Channel' },
  { value: 'chandelier_exit', label: 'Chandelier Exit' },
  { value: 'anchored_vwap', label: 'Anchored VWAP' },
  { value: 'williams_vix_fix', label: 'Williams VIX Fix' },
  { value: 'qqe', label: 'QQE (Quantitative Qualitative Estimation)' },
  { value: 'stc', label: 'STC (Schaff Trend Cycle)' },
  { value: 'choppiness', label: 'Choppiness Index' },
  { value: 'supertrend', label: 'SuperTrend' },
  { value: 'ma_ribbon_heatmap', label: 'MA Ribbon Heatmap' },
  { value: 'linreg', label: 'Linear Regression (LinReg)' },
  { value: 'kalman_filter', label: 'Kalman Filter MA (KFMA)' },
  { value: 'range_filter', label: 'Range Filter (Composite)' },
  { value: 'htf_trend_heat', label: 'HTF Trend Heat (MTF)' },
  { value: 'mfp', label: 'Money Flow Pressure (MFP)' },
  { value: 'volume', label: 'Volume' }
] as const;

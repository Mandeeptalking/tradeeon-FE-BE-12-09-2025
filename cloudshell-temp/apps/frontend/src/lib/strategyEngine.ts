/**
 * Strategy Execution Engine
 * Handles the evaluation and execution of trading strategies
 */

import { Candle } from '../canvas/CanvasCandleChart';

// Types (matching the StrategyBuilder)
export interface Indicator {
  id: string;
  name: string;
  description: string;
  parameters: IndicatorParameter[];
  outputs: string[];
}

export interface IndicatorParameter {
  name: string;
  type: 'number' | 'select';
  defaultValue: any;
  options?: string[];
  min?: number;
  max?: number;
}

export interface Condition {
  id: string;
  type: 'indicator' | 'price_action' | 'volume';
  operator: 'greater_than' | 'less_than' | 'equals' | 'crosses_above' | 'crosses_below' | 'between';
  value: any;
  indicator?: string;
  parameter?: string;
  timeframe: string;
}

export interface Action {
  id: string;
  type: 'buy' | 'sell' | 'close_position';
  amount: number;
  amount_type: 'percentage' | 'fixed' | 'risk_based';
  order_type: 'market' | 'limit' | 'stop';
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  symbol: string;
  timeframe: string;
  conditions: Condition[];
  entry_actions: Action[];
  exit_actions: Action[];
  risk_management: {
    stop_loss: number;
    take_profit: number;
    max_position_size: number;
    max_daily_trades: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  strategy_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  pnl?: number;
  status: 'open' | 'closed' | 'cancelled';
}

export interface BacktestResult {
  strategy: Strategy;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  max_drawdown: number;
  sharpe_ratio: number;
  trades: Trade[];
  equity_curve: { timestamp: number; equity: number }[];
}

/**
 * Technical Indicators Calculator
 */
export class IndicatorCalculator {
  
  // RSI Calculation
  static calculateRSI(prices: number[], period: number = 14): number[] {
    if (prices.length < period + 1) return [];
    
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }
    
    const rsi: number[] = [];
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < gains.length; i++) {
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
      
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    }
    
    return rsi;
  }
  
  // EMA Calculation
  static calculateEMA(prices: number[], period: number): number[] {
    if (prices.length === 0) return [];
    
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    const sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(sma);
    
    for (let i = period; i < prices.length; i++) {
      const currentEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(currentEMA);
    }
    
    return ema;
  }
  
  // MACD Calculation
  static calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    // Align arrays
    const startIndex = Math.max(fastPeriod, slowPeriod) - 1;
    const macdLine = [];
    
    for (let i = 0; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      const fast = fastEMA[i];
      const slow = slowEMA[i];
      macdLine.push(fast - slow);
    }
    
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram = [];
    
    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      histogram.push(macdLine[i] - signalLine[i]);
    }
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  }
  
  // Bollinger Bands
  static calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
    if (prices.length < period) return { upper: [], middle: [], lower: [] };
    
    const sma = [];
    const upper = [];
    const lower = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      
      sma.push(mean);
      upper.push(mean + (stdDev * std));
      lower.push(mean - (stdDev * std));
    }
    
    return {
      upper: upper,
      middle: sma,
      lower: lower
    };
  }
  
  // Stochastic Oscillator
  static calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number = 14, dPeriod: number = 3) {
    if (highs.length < kPeriod) return { k: [], d: [] };
    
    const k: number[] = [];
    
    for (let i = kPeriod - 1; i < closes.length; i++) {
      const highSlice = highs.slice(i - kPeriod + 1, i + 1);
      const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
      const close = closes[i];
      
      const highestHigh = Math.max(...highSlice);
      const lowestLow = Math.min(...lowSlice);
      
      const kValue = ((close - lowestLow) / (highestHigh - lowestLow)) * 100;
      k.push(kValue);
    }
    
    const d = this.calculateEMA(k, dPeriod);
    
    return { k, d };
  }
  
  // ATR (Average True Range)
  static calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14) {
    if (highs.length < period + 1) return [];
    
    const trueRanges: number[] = [];
    
    for (let i = 1; i < highs.length; i++) {
      const high = highs[i];
      const low = lows[i];
      const prevClose = closes[i - 1];
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    // Calculate ATR as EMA of true ranges
    return this.calculateEMA(trueRanges, period);
  }
}

/**
 * Strategy Evaluator
 */
export class StrategyEvaluator {
  
  static evaluateConditions(candles: Candle[], conditions: Condition[]): boolean {
    if (candles.length < 50) return false; // Need enough data
    
    const prices = candles.map(c => c.c);
    const highs = candles.map(c => c.h);
    const lows = candles.map(c => c.l);
    const volumes = candles.map(c => c.v || 0);
    
    for (const condition of conditions) {
      if (!this.evaluateCondition(candles, prices, highs, lows, volumes, condition)) {
        return false;
      }
    }
    
    return true;
  }
  
  private static evaluateCondition(
    candles: Candle[],
    prices: number[],
    highs: number[],
    lows: number[],
    volumes: number[],
    condition: Condition
  ): boolean {
    
    switch (condition.type) {
      case 'indicator':
        return this.evaluateIndicatorCondition(candles, prices, highs, lows, volumes, condition);
      case 'price_action':
        return this.evaluatePriceActionCondition(prices, condition);
      case 'volume':
        return this.evaluateVolumeCondition(volumes, condition);
      default:
        return false;
    }
  }
  
  private static evaluateIndicatorCondition(
    candles: Candle[],
    prices: number[],
    highs: number[],
    lows: number[],
    volumes: number[],
    condition: Condition
  ): boolean {
    
    const currentPrice = prices[prices.length - 1];
    const targetValue = condition.value;
    
    switch (condition.indicator) {
      case 'rsi':
        const rsi = IndicatorCalculator.calculateRSI(prices, 14);
        if (rsi.length === 0) return false;
        const currentRSI = rsi[rsi.length - 1];
        return this.compareValues(currentRSI, condition.operator, targetValue);
        
      case 'ema':
        const ema = IndicatorCalculator.calculateEMA(prices, 20);
        if (ema.length === 0) return false;
        const currentEMA = ema[ema.length - 1];
        return this.compareValues(currentPrice, condition.operator, currentEMA);
        
      case 'macd':
        const macdData = IndicatorCalculator.calculateMACD(prices);
        if (macdData.macd.length === 0 || macdData.histogram.length === 0) return false;
        
        const currentMACD = macdData.macd[macdData.macd.length - 1];
        const currentHistogram = macdData.histogram[macdData.histogram.length - 1];
        const currentSignal = macdData.signal[macdData.signal.length - 1];
        
        switch (condition.parameter) {
          case 'macd':
            return this.compareValues(currentMACD, condition.operator, targetValue);
          case 'signal':
            return this.compareValues(currentSignal, condition.operator, targetValue);
          case 'histogram':
            return this.compareValues(currentHistogram, condition.operator, targetValue);
          default:
            return false;
        }
        
      case 'bollinger_bands':
        const bb = IndicatorCalculator.calculateBollingerBands(prices);
        if (bb.upper.length === 0) return false;
        
        const currentUpper = bb.upper[bb.upper.length - 1];
        const currentMiddle = bb.middle[bb.middle.length - 1];
        const currentLower = bb.lower[bb.lower.length - 1];
        
        switch (condition.parameter) {
          case 'upper_band':
            return this.compareValues(currentPrice, condition.operator, currentUpper);
          case 'lower_band':
            return this.compareValues(currentPrice, condition.operator, currentLower);
          default:
            return false;
        }
        
      case 'stochastic':
        const stoch = IndicatorCalculator.calculateStochastic(highs, lows, prices);
        if (stoch.k.length === 0) return false;
        
        const currentK = stoch.k[stoch.k.length - 1];
        const currentD = stoch.d[stoch.d.length - 1];
        
        switch (condition.parameter) {
          case 'k_percent':
            return this.compareValues(currentK, condition.operator, targetValue);
          case 'd_percent':
            return this.compareValues(currentD, condition.operator, targetValue);
          default:
            return false;
        }
        
      case 'atr':
        const atr = IndicatorCalculator.calculateATR(highs, lows, prices);
        if (atr.length === 0) return false;
        
        const currentATR = atr[atr.length - 1];
        return this.compareValues(currentATR, condition.operator, targetValue);
        
      default:
        return false;
    }
  }
  
  private static evaluatePriceActionCondition(prices: number[], condition: Condition): boolean {
    const currentPrice = prices[prices.length - 1];
    const targetValue = condition.value;
    
    switch (condition.operator) {
      case 'greater_than':
        return currentPrice > targetValue;
      case 'less_than':
        return currentPrice < targetValue;
      case 'equals':
        return Math.abs(currentPrice - targetValue) < 0.01;
      case 'crosses_above':
        // Check if price crossed above target in last few candles
        const recentPrices = prices.slice(-5);
        return recentPrices[recentPrices.length - 1] > targetValue && 
               recentPrices[0] <= targetValue;
      case 'crosses_below':
        // Check if price crossed below target in last few candles
        const recentPricesBelow = prices.slice(-5);
        return recentPricesBelow[recentPricesBelow.length - 1] < targetValue && 
               recentPricesBelow[0] >= targetValue;
      default:
        return false;
    }
  }
  
  private static evaluateVolumeCondition(volumes: number[], condition: Condition): boolean {
    if (volumes.length === 0) return false;
    
    const currentVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length);
    
    switch (condition.operator) {
      case 'greater_than':
        return currentVolume > condition.value;
      case 'less_than':
        return currentVolume < condition.value;
      case 'crosses_above':
        return currentVolume > avgVolume * 1.5; // Volume spike
      case 'crosses_below':
        return currentVolume < avgVolume * 0.5; // Volume drop
      default:
        return false;
    }
  }
  
  private static compareValues(value1: number, operator: string, value2: number): boolean {
    switch (operator) {
      case 'greater_than':
        return value1 > value2;
      case 'less_than':
        return value1 < value2;
      case 'equals':
        return Math.abs(value1 - value2) < 0.01;
      case 'between':
        // For between, value2 should be an array [min, max]
        if (Array.isArray(value2) && value2.length === 2) {
          return value1 >= value2[0] && value1 <= value2[1];
        }
        return false;
      default:
        return false;
    }
  }
}

/**
 * Strategy Backtester
 */
export class StrategyBacktester {
  
  static backtest(strategy: Strategy, historicalData: Candle[]): BacktestResult {
    const trades: Trade[] = [];
    const equityCurve: { timestamp: number; equity: number }[] = [];
    
    let currentEquity = 10000; // Starting with $10,000
    let position = 0; // Current position size
    let positionPrice = 0; // Entry price
    let maxEquity = currentEquity;
    let maxDrawdown = 0;
    
    // Calculate returns for Sharpe ratio
    const returns: number[] = [];
    
    for (let i = 50; i < historicalData.length; i++) {
      const currentCandles = historicalData.slice(0, i + 1);
      const currentCandle = historicalData[i];
      
      // Check if conditions are met for entry
      if (position === 0 && StrategyEvaluator.evaluateConditions(currentCandles, strategy.conditions)) {
        // Execute entry actions
        for (const action of strategy.entry_actions) {
          if (action.type === 'buy') {
            const tradeAmount = this.calculateTradeAmount(action, currentEquity);
            const tradePrice = currentCandle.c;
            
            position = tradeAmount / tradePrice;
            positionPrice = tradePrice;
            currentEquity -= tradeAmount;
            
            trades.push({
              id: `trade_${trades.length + 1}`,
              strategy_id: strategy.id,
              symbol: strategy.symbol,
              side: 'buy',
              amount: tradeAmount,
              price: tradePrice,
              timestamp: currentCandle.t,
              status: 'open'
            });
            
            break; // Only execute first action for simplicity
          }
        }
      }
      
      // Check exit conditions (stop loss, take profit)
      if (position > 0) {
        const currentPrice = currentCandle.c;
        const pnl = (currentPrice - positionPrice) * position;
        const pnlPercent = (pnl / (positionPrice * position)) * 100;
        
        // Check stop loss
        if (pnlPercent <= -strategy.risk_management.stop_loss) {
          // Close position at stop loss
          const closeAmount = position * currentPrice;
          currentEquity += closeAmount;
          
          const lastTrade = trades[trades.length - 1];
          lastTrade.status = 'closed';
          lastTrade.pnl = -strategy.risk_management.stop_loss * (positionPrice * position) / 100;
          
          position = 0;
          positionPrice = 0;
        }
        // Check take profit
        else if (pnlPercent >= strategy.risk_management.take_profit) {
          // Close position at take profit
          const closeAmount = position * currentPrice;
          currentEquity += closeAmount;
          
          const lastTrade = trades[trades.length - 1];
          lastTrade.status = 'closed';
          lastTrade.pnl = strategy.risk_management.take_profit * (positionPrice * position) / 100;
          
          position = 0;
          positionPrice = 0;
        }
      }
      
      // Update equity curve
      const currentTotalEquity = position > 0 ? 
        currentEquity + (position * currentCandle.c) : 
        currentEquity;
      
      equityCurve.push({
        timestamp: currentCandle.t,
        equity: currentTotalEquity
      });
      
      // Calculate returns for Sharpe ratio
      if (equityCurve.length > 1) {
        const prevEquity = equityCurve[equityCurve.length - 2].equity;
        const return_ = (currentTotalEquity - prevEquity) / prevEquity;
        returns.push(return_);
      }
      
      // Update max drawdown
      if (currentTotalEquity > maxEquity) {
        maxEquity = currentTotalEquity;
      }
      
      const drawdown = (maxEquity - currentTotalEquity) / maxEquity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    // Calculate final metrics
    const closedTrades = trades.filter(t => t.status === 'closed');
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.pnl || 0) <= 0);
    
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    
    // Calculate Sharpe ratio (simplified)
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const returnStdDev = returns.length > 1 ? 
      Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)) : 0;
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
    
    return {
      strategy,
      total_trades: closedTrades.length,
      winning_trades: winningTrades.length,
      losing_trades: losingTrades.length,
      win_rate: winRate,
      total_pnl: totalPnl,
      max_drawdown: maxDrawdown * 100,
      sharpe_ratio: sharpeRatio,
      trades: trades,
      equity_curve: equityCurve
    };
  }
  
  private static calculateTradeAmount(action: Action, currentEquity: number): number {
//

    switch (action.amount_type) {
      case 'fixed':
        return Math.min(action.amount, currentEquity);
      case 'percentage':
        return currentEquity * (action.amount / 100);
      case 'risk_based':
        // Risk-based calculation (simplified)
        return Math.min(currentEquity * 0.1, action.amount); // Max 10% risk
      default:
        return Math.min(action.amount, currentEquity);
    }
  }
}

/**
 * Strategy Manager
 */
export class StrategyManager {
  private strategies: Map<string, Strategy> = new Map();
  
  addStrategy(strategy: Strategy): void {
    this.strategies.set(strategy.id, strategy);
  }
  
  removeStrategy(strategyId: string): void {
    this.strategies.delete(strategyId);
  }
  
  getStrategy(strategyId: string): Strategy | undefined {
    return this.strategies.get(strategyId);
  }
  
  getAllStrategies(): Strategy[] {
    return Array.from(this.strategies.values());
  }
  
  updateStrategy(strategyId: string, updates: Partial<Strategy>): void {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      const updatedStrategy = { ...strategy, ...updates };
      this.strategies.set(strategyId, updatedStrategy);
    }
  }
}




import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Target,
  Plus,
  X,
  Sparkles,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export interface EntryCondition {
  id: string;
  name: string;
  enabled: boolean;
  indicator: string; // All indicators from clean charts
  component?: string; // Component of the indicator (e.g., 'rsi_line', 'macd_line', 'histogram')
  operator: string; // Operator specific to indicator/component
  value?: number;
  lowerBound?: number;
  upperBound?: number;
  period?: number; // For RSI, EMA, SMA, CCI, MFI, etc.
  fastPeriod?: number; // For MACD
  slowPeriod?: number; // For MACD
  signalPeriod?: number; // For MACD
  stdDeviation?: number; // For Bollinger Bands (default: 2)
  comparisonPeriod?: number; // For MA crossovers (e.g., EMA 20 vs EMA 100)
  comparisonMaType?: 'EMA' | 'SMA' | 'WMA' | 'TEMA' | 'HULL'; // Type of MA to compare against
  overboughtLevel?: number; // Custom overbought level for RSI (default: 70)
  oversoldLevel?: number; // Custom oversold level for RSI (default: 30)
  timeframe: string;
  logicGate?: 'AND' | 'OR';
  // Additional parameters for specific indicators
  maType?: 'EMA' | 'SMA' | 'WMA' | 'TEMA' | 'KAMA' | 'MAMA' | 'VWMA' | 'Hull'; // For MA types
  source?: 'close' | 'open' | 'high' | 'low' | 'hlc3' | 'ohlc4'; // Price source
}

export interface EntryConditionsData {
  entryType: 'immediate' | 'conditional'; // How to enter trades
  orderType?: 'market' | 'limit'; // Order type for immediate entry
  limitPrice?: number; // Limit price when orderType is 'limit' (for single pair)
  limitPrices?: { [pair: string]: number }; // Limit prices per pair (for 2-5 pairs)
  limitPricePercent?: number; // Percentage offset from current price (for 6+ pairs, e.g., -2 means 2% below)
  enabled: boolean; // For conditional entry
  conditions: EntryCondition[];
  logicGate: 'AND' | 'OR'; // Logic gate between conditions
}

export interface EntryConditionsProps {
  conditions: EntryConditionsData;
  onChange: (conditions: EntryConditionsData) => void;
  className?: string;
  showTitle?: boolean;
  selectedPairs?: string[]; // Trading pairs from bot configuration
  expandedConditionId?: string | null; // Controlled expanded state from parent
  onExpandedChange?: (id: string | null) => void; // Callback when expanded state changes
}

// Predefined entry condition templates
const PREDEFINED_CONDITIONS: Omit<EntryCondition, 'id'>[] = [
  {
    name: 'RSI Crosses Below Oversold',
    enabled: true,
    indicator: 'RSI',
    component: 'rsi_line',
    operator: 'crosses_below_oversold',
    period: 14,
    oversoldLevel: 30,
    timeframe: '1h',
  },
  {
    name: 'RSI Crosses Above Overbought',
    enabled: true,
    indicator: 'RSI',
    component: 'rsi_line',
    operator: 'crosses_above_overbought',
    period: 14,
    overboughtLevel: 70,
    timeframe: '1h',
  },
  {
    name: 'RSI Below Oversold Level',
    enabled: true,
    indicator: 'RSI',
    component: 'rsi_line',
    operator: 'less_than_oversold',
    period: 14,
    oversoldLevel: 30,
    timeframe: '4h',
  },
  {
    name: 'RSI Above Overbought Level',
    enabled: true,
    indicator: 'RSI',
    component: 'rsi_line',
    operator: 'greater_than_overbought',
    period: 14,
    overboughtLevel: 70,
    timeframe: '4h',
  },
  {
    name: 'MACD Bullish Crossover',
    enabled: true,
    indicator: 'MACD',
    component: 'histogram',
    operator: 'crosses_above_zero',
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    timeframe: '4h',
  },
  {
    name: 'MACD Bearish Crossover',
    enabled: true,
    indicator: 'MACD',
    component: 'histogram',
    operator: 'crosses_below_zero',
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    timeframe: '4h',
  },
  {
    name: 'Price Crosses Above EMA 20',
    enabled: true,
    indicator: 'EMA',
    component: 'line',
    operator: 'crosses_above',
    period: 20,
    timeframe: '1h',
  },
  {
    name: 'Price Crosses Below EMA 20',
    enabled: true,
    indicator: 'EMA',
    component: 'line',
    operator: 'crosses_below',
    period: 20,
    timeframe: '1h',
  },
  {
    name: 'Price 2% Above EMA 20',
    enabled: true,
    indicator: 'EMA',
    component: 'line',
    operator: 'price_percent_above',
    value: 2,
    period: 20,
    timeframe: '1h',
  },
  {
    name: 'Price 3% Below SMA 50',
    enabled: true,
    indicator: 'SMA',
    component: 'line',
    operator: 'price_percent_below',
    value: 3,
    period: 50,
    timeframe: '4h',
  },
  {
    name: 'Price Crosses Above Bollinger Lower Band',
    enabled: true,
    indicator: 'BOLLINGER_BANDS',
    component: 'lower_band',
    operator: 'crosses_above',
    period: 20,
    stdDeviation: 2,
    timeframe: '1h',
  },
  {
    name: 'Price 5% Above VWAP',
    enabled: true,
    indicator: 'VWAP',
    component: 'vwap_line',
    operator: 'price_percent_above',
    value: 5,
    timeframe: '1h',
  },
  {
    name: 'MACD Line Crosses Signal',
    enabled: true,
    indicator: 'MACD',
    component: 'macd_line',
    operator: 'crosses_above',
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    timeframe: '4h',
  },
  {
    name: 'MACD Line Crosses Above Zero',
    enabled: true,
    indicator: 'MACD',
    component: 'macd_line',
    operator: 'crosses_above_zero',
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    timeframe: '4h',
  },
  {
    name: 'MACD Histogram Below -10',
    enabled: true,
    indicator: 'MACD',
    component: 'histogram',
    operator: 'less_than',
    value: -10,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    timeframe: '1h',
  },
  {
    name: 'MACD Histogram Crosses Below Zero',
    enabled: true,
    indicator: 'MACD',
    component: 'histogram',
    operator: 'crosses_below_zero',
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    timeframe: '4h',
  },
  {
    name: 'Stochastic %K Crosses Above %D',
    enabled: true,
    indicator: 'STOCHASTIC',
    component: 'k_percent',
    operator: 'crosses_above',
    period: 14,
    timeframe: '1h',
  },
  {
    name: 'Stochastic %K Below 20',
    enabled: true,
    indicator: 'STOCHASTIC',
    component: 'k_percent',
    operator: 'less_than',
    value: 20,
    period: 14,
    timeframe: '1h',
  },
  {
    name: 'ADX Above 25',
    enabled: true,
    indicator: 'ADX',
    component: 'adx_line',
    operator: 'greater_than',
    value: 25,
    period: 14,
    timeframe: '4h',
  },
  {
    name: '+DI Crosses Above -DI',
    enabled: true,
    indicator: 'ADX',
    component: 'plus_di',
    operator: 'crosses_above',
    period: 14,
    timeframe: '4h',
  },
  {
    name: 'CCI Crosses Above +100',
    enabled: true,
    indicator: 'CCI',
    component: 'cci_line',
    operator: 'crosses_above_overbought',
    period: 20,
    timeframe: '1h',
  },
  {
    name: 'OBV Crosses Above Zero',
    enabled: true,
    indicator: 'OBV',
    component: 'obv_line',
    operator: 'crosses_above_zero',
    timeframe: '1h',
  },
  {
    name: 'EMA 20 Crosses Above EMA 100',
    enabled: true,
    indicator: 'EMA',
    component: 'line',
    operator: 'crosses_above_ma',
    period: 20,
    comparisonMaType: 'EMA',
    comparisonPeriod: 100,
    timeframe: '4h',
  },
  {
    name: 'SMA 50 Crosses Below SMA 200',
    enabled: true,
    indicator: 'SMA',
    component: 'line',
    operator: 'crosses_below_ma',
    period: 50,
    comparisonMaType: 'SMA',
    comparisonPeriod: 200,
    timeframe: '1d',
  },
];

// Available indicators from clean charts
const INDICATORS = [
  // Momentum Oscillators
  { value: 'RSI', label: 'RSI (Relative Strength Index)', category: 'Momentum', icon: BarChart3 },
  { value: 'MACD', label: 'MACD (Moving Average Convergence Divergence)', category: 'Momentum', icon: TrendingUp },
  { value: 'STOCHASTIC', label: 'Stochastic Oscillator', category: 'Momentum', icon: BarChart3 },
  { value: 'WILLIAMS_R', label: 'Williams %R', category: 'Momentum', icon: BarChart3 },
  { value: 'CCI', label: 'CCI (Commodity Channel Index)', category: 'Momentum', icon: BarChart3 },
  { value: 'MFI', label: 'MFI (Money Flow Index)', category: 'Momentum', icon: BarChart3 },
  { value: 'ADX', label: 'ADX (Average Directional Index)', category: 'Momentum', icon: TrendingUp },
  
  // Trend Indicators
  { value: 'EMA', label: 'EMA (Exponential Moving Average)', category: 'Trend', icon: TrendingUp },
  { value: 'SMA', label: 'SMA (Simple Moving Average)', category: 'Trend', icon: TrendingUp },
  { value: 'WMA', label: 'WMA (Weighted Moving Average)', category: 'Trend', icon: TrendingUp },
  { value: 'TEMA', label: 'TEMA (Triple Exponential Moving Average)', category: 'Trend', icon: TrendingUp },
  { value: 'HULL', label: 'Hull Moving Average', category: 'Trend', icon: TrendingUp },
  
  // Volatility Indicators
  { value: 'BOLLINGER_BANDS', label: 'Bollinger Bands', category: 'Volatility', icon: BarChart3 },
  { value: 'ATR', label: 'ATR (Average True Range)', category: 'Volatility', icon: BarChart3 },
  { value: 'KELTNER_CHANNELS', label: 'Keltner Channels', category: 'Volatility', icon: BarChart3 },
  
  // Volume Indicators
  { value: 'OBV', label: 'OBV (On-Balance Volume)', category: 'Volume', icon: BarChart3 },
  { value: 'VWAP', label: 'VWAP (Volume Weighted Average Price)', category: 'Volume', icon: BarChart3 },
  
  // Price Action
  { value: 'Price', label: 'Price Action', category: 'Price', icon: Zap },
];

// Indicator components - what parts of each indicator can be used in conditions
const INDICATOR_COMPONENTS: Record<string, Array<{ value: string; label: string; description: string }>> = {
  RSI: [
    { value: 'rsi_line', label: 'RSI Line', description: 'RSI value (0-100)' },
  ],
  MACD: [
    { value: 'macd_line', label: 'MACD Line', description: 'MACD Line (12-period EMA - 26-period EMA)' },
    { value: 'signal_line', label: 'Signal Line', description: 'Signal Line (9-period EMA of MACD Line)' },
    { value: 'histogram', label: 'Histogram', description: 'MACD Histogram (MACD Line - Signal Line)' },
  ],
  STOCHASTIC: [
    { value: 'k_percent', label: '%K Line', description: 'Stochastic %K line' },
    { value: 'd_percent', label: '%D Line', description: 'Stochastic %D line (SMA of %K)' },
    { value: 'overbought', label: 'Overbought', description: 'Above 80' },
    { value: 'oversold', label: 'Oversold', description: 'Below 20' },
  ],
  WILLIAMS_R: [
    { value: 'williams_line', label: 'Williams %R', description: 'Williams %R value (-100 to 0)' },
    { value: 'overbought', label: 'Overbought', description: 'Above -20' },
    { value: 'oversold', label: 'Oversold', description: 'Below -80' },
  ],
  CCI: [
    { value: 'cci_line', label: 'CCI Line', description: 'Commodity Channel Index' },
    { value: 'overbought', label: 'Overbought', description: 'Above +100' },
    { value: 'oversold', label: 'Oversold', description: 'Below -100' },
  ],
  MFI: [
    { value: 'mfi_line', label: 'MFI Line', description: 'Money Flow Index (0-100)' },
    { value: 'overbought', label: 'Overbought', description: 'Above 80' },
    { value: 'oversold', label: 'Oversold', description: 'Below 20' },
  ],
  ADX: [
    { value: 'adx_line', label: 'ADX Line', description: 'Average Directional Index (trend strength)' },
    { value: 'plus_di', label: '+DI', description: 'Positive Directional Indicator' },
    { value: 'minus_di', label: '-DI', description: 'Negative Directional Indicator' },
  ],
  EMA: [
    { value: 'line', label: 'EMA Line', description: 'Exponential Moving Average' },
  ],
  SMA: [
    { value: 'line', label: 'SMA Line', description: 'Simple Moving Average' },
  ],
  WMA: [
    { value: 'line', label: 'WMA Line', description: 'Weighted Moving Average' },
  ],
  TEMA: [
    { value: 'line', label: 'TEMA Line', description: 'Triple Exponential Moving Average' },
  ],
  HULL: [
    { value: 'line', label: 'Hull MA Line', description: 'Hull Moving Average' },
  ],
  BOLLINGER_BANDS: [
    { value: 'upper_band', label: 'Upper Band', description: 'Upper Bollinger Band' },
    { value: 'middle_band', label: 'Middle Band', description: 'Middle Bollinger Band (SMA)' },
    { value: 'lower_band', label: 'Lower Band', description: 'Lower Bollinger Band' },
    { value: 'bandwidth', label: 'Bandwidth', description: 'Bandwidth ((Upper - Lower) / Middle)' },
  ],
  ATR: [
    { value: 'atr_line', label: 'ATR Line', description: 'Average True Range value' },
  ],
  KELTNER_CHANNELS: [
    { value: 'upper_channel', label: 'Upper Channel', description: 'Upper Keltner Channel' },
    { value: 'middle_channel', label: 'Middle Channel', description: 'Middle Keltner Channel (EMA)' },
    { value: 'lower_channel', label: 'Lower Channel', description: 'Lower Keltner Channel' },
  ],
  OBV: [
    { value: 'obv_line', label: 'OBV Line', description: 'On-Balance Volume' },
  ],
  VWAP: [
    { value: 'vwap_line', label: 'VWAP Line', description: 'Volume Weighted Average Price' },
  ],
  Price: [
    { value: 'close', label: 'Close Price', description: 'Closing price' },
    { value: 'open', label: 'Open Price', description: 'Opening price' },
    { value: 'high', label: 'High Price', description: 'High price' },
    { value: 'low', label: 'Low Price', description: 'Low price' },
  ],
};

// Operators by indicator component - each component has specific operators
const COMPONENT_OPERATORS: Record<string, Array<{ value: string; label: string }>> = {
  // RSI
  'rsi_line': [
    { value: 'crosses_above_overbought', label: 'Crosses Above Overbought Level' },
    { value: 'crosses_below_overbought', label: 'Crosses Below Overbought Level' },
    { value: 'crosses_above_oversold', label: 'Crosses Above Oversold Level' },
    { value: 'crosses_below_oversold', label: 'Crosses Below Oversold Level' },
    { value: 'greater_than_overbought', label: 'Greater Than Overbought Level' },
    { value: 'less_than_overbought', label: 'Less Than Overbought Level' },
    { value: 'greater_than_oversold', label: 'Greater Than Oversold Level' },
    { value: 'less_than_oversold', label: 'Less Than Oversold Level' },
  ],
  
  // MACD
  'macd_line': [
    // Crossovers with Signal Line
    { value: 'crosses_above', label: 'Crosses Above Signal Line' },
    { value: 'crosses_below', label: 'Crosses Below Signal Line' },
    // Crossovers with Zero
    { value: 'crosses_above_zero', label: 'Crosses Above Zero' },
    { value: 'crosses_below_zero', label: 'Crosses Below Zero' },
    // Comparisons with Zero
    { value: 'greater_than_zero', label: 'Greater Than Zero' },
    { value: 'less_than_zero', label: 'Less Than Zero' },
    // Comparisons with Signal Line
    { value: 'greater_than_signal', label: 'Greater Than Signal Line' },
    { value: 'less_than_signal', label: 'Less Than Signal Line' },
    // Comparisons with Custom Value
    { value: 'greater_than', label: 'Greater Than Value' },
    { value: 'less_than', label: 'Less Than Value' },
    { value: 'equals', label: 'Equals Value' },
  ],
  'signal_line': [
    // Crossovers with MACD Line
    { value: 'crosses_above', label: 'Crosses Above MACD Line' },
    { value: 'crosses_below', label: 'Crosses Below MACD Line' },
    // Crossovers with Zero
    { value: 'crosses_above_zero', label: 'Crosses Above Zero' },
    { value: 'crosses_below_zero', label: 'Crosses Below Zero' },
    // Comparisons with Zero
    { value: 'greater_than_zero', label: 'Greater Than Zero' },
    { value: 'less_than_zero', label: 'Less Than Zero' },
    // Comparisons with MACD Line
    { value: 'greater_than_macd', label: 'Greater Than MACD Line' },
    { value: 'less_than_macd', label: 'Less Than MACD Line' },
    // Comparisons with Custom Value
    { value: 'greater_than', label: 'Greater Than Value' },
    { value: 'less_than', label: 'Less Than Value' },
    { value: 'equals', label: 'Equals Value' },
  ],
  'histogram': [
    // Crossovers with Zero
    { value: 'crosses_above_zero', label: 'Crosses Above Zero' },
    { value: 'crosses_below_zero', label: 'Crosses Below Zero' },
    // Comparisons with Zero
    { value: 'greater_than_zero', label: 'Greater Than Zero' },
    { value: 'less_than_zero', label: 'Less Than Zero' },
    // Comparisons with Custom Value
    { value: 'greater_than', label: 'Greater Than Value' },
    { value: 'less_than', label: 'Less Than Value' },
    { value: 'equals', label: 'Equals Value' },
    { value: 'between', label: 'Between Values' },
  ],
  
  // Stochastic
  'k_percent': [
    { value: 'crosses_above', label: 'Crosses Above %D Line' },
    { value: 'crosses_below', label: 'Crosses Below %D Line' },
    { value: 'crosses_above_overbought', label: 'Crosses Above Overbought (80)' },
    { value: 'crosses_below_oversold', label: 'Crosses Below Oversold (20)' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'between', label: 'Between' },
    { value: 'greater_than_d', label: 'Greater Than %D' },
    { value: 'less_than_d', label: 'Less Than %D' },
  ],
  'd_percent': [
    { value: 'crosses_above', label: 'Crosses Above %K Line' },
    { value: 'crosses_below', label: 'Crosses Below %K Line' },
    { value: 'crosses_above_overbought', label: 'Crosses Above Overbought (80)' },
    { value: 'crosses_below_oversold', label: 'Crosses Below Oversold (20)' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'between', label: 'Between' },
    { value: 'greater_than_k', label: 'Greater Than %K' },
    { value: 'less_than_k', label: 'Less Than %K' },
  ],
  
  // Williams %R
  'williams_line': [
    { value: 'crosses_above', label: 'Crosses Above Level' },
    { value: 'crosses_below', label: 'Crosses Below Level' },
    { value: 'crosses_above_oversold', label: 'Crosses Above Oversold (-80)' },
    { value: 'crosses_below_overbought', label: 'Crosses Below Overbought (-20)' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'between', label: 'Between' },
  ],
  
  // CCI
  'cci_line': [
    { value: 'crosses_above', label: 'Crosses Above Level' },
    { value: 'crosses_below', label: 'Crosses Below Level' },
    { value: 'crosses_above_zero', label: 'Crosses Above Zero' },
    { value: 'crosses_below_zero', label: 'Crosses Below Zero' },
    { value: 'crosses_above_overbought', label: 'Crosses Above Overbought (+100)' },
    { value: 'crosses_below_oversold', label: 'Crosses Below Oversold (-100)' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'between', label: 'Between' },
  ],
  
  // MFI
  'mfi_line': [
    { value: 'crosses_above', label: 'Crosses Above Level' },
    { value: 'crosses_below', label: 'Crosses Below Level' },
    { value: 'crosses_above_overbought', label: 'Crosses Above Overbought (80)' },
    { value: 'crosses_below_oversold', label: 'Crosses Below Oversold (20)' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'between', label: 'Between' },
  ],
  
  // ADX
  'adx_line': [
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'between', label: 'Between' },
    { value: 'crosses_above', label: 'Crosses Above Level' },
    { value: 'crosses_below', label: 'Crosses Below Level' },
  ],
  'plus_di': [
    { value: 'crosses_above', label: 'Crosses Above -DI' },
    { value: 'crosses_below', label: 'Crosses Below -DI' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than_minus_di', label: 'Greater Than -DI' },
    { value: 'less_than_minus_di', label: 'Less Than -DI' },
  ],
  'minus_di': [
    { value: 'crosses_above', label: 'Crosses Above +DI' },
    { value: 'crosses_below', label: 'Crosses Below +DI' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than_plus_di', label: 'Greater Than +DI' },
    { value: 'less_than_plus_di', label: 'Less Than +DI' },
  ],
  
  // Moving Averages (EMA, SMA, WMA, TEMA, HULL)
  'line': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
    { value: 'crosses_above_ma', label: 'Crosses Above Another MA' },
    { value: 'crosses_below_ma', label: 'Crosses Below Another MA' },
    { value: 'greater_than_ma', label: 'Greater Than Another MA' },
    { value: 'less_than_ma', label: 'Less Than Another MA' },
    { value: 'price_above', label: 'Price Above' },
    { value: 'price_below', label: 'Price Below' },
    { value: 'price_percent_above', label: 'Price % Above' },
    { value: 'price_percent_below', label: 'Price % Below' },
  ],
  
  // Bollinger Bands
  'upper_band': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
    { value: 'price_percent_above', label: 'Price % Above' },
    { value: 'price_percent_below', label: 'Price % Below' },
  ],
  'middle_band': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
    { value: 'price_percent_above', label: 'Price % Above' },
    { value: 'price_percent_below', label: 'Price % Below' },
  ],
  'lower_band': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
    { value: 'price_percent_above', label: 'Price % Above' },
    { value: 'price_percent_below', label: 'Price % Below' },
  ],
  'bandwidth': [
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'between', label: 'Between' },
    { value: 'crosses_above', label: 'Crosses Above Level' },
    { value: 'crosses_below', label: 'Crosses Below Level' },
  ],
  
  // ATR
  'atr_line': [
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'between', label: 'Between' },
    { value: 'crosses_above', label: 'Crosses Above Level' },
    { value: 'crosses_below', label: 'Crosses Below Level' },
  ],
  
  // Keltner Channels
  'upper_channel': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
    { value: 'price_percent_above', label: 'Price % Above' },
    { value: 'price_percent_below', label: 'Price % Below' },
  ],
  'middle_channel': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
    { value: 'price_percent_above', label: 'Price % Above' },
    { value: 'price_percent_below', label: 'Price % Below' },
  ],
  'lower_channel': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
    { value: 'price_percent_above', label: 'Price % Above' },
    { value: 'price_percent_below', label: 'Price % Below' },
  ],
  
  // OBV
  'obv_line': [
    { value: 'crosses_above', label: 'Crosses Above Level' },
    { value: 'crosses_below', label: 'Crosses Below Level' },
    { value: 'crosses_above_zero', label: 'Crosses Above Zero' },
    { value: 'crosses_below_zero', label: 'Crosses Below Zero' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than_zero', label: 'Greater Than Zero' },
    { value: 'less_than_zero', label: 'Less Than Zero' },
  ],
  
  // VWAP
  'vwap_line': [
    { value: 'crosses_above', label: 'Price Crosses Above' },
    { value: 'crosses_below', label: 'Price Crosses Below' },
    { value: 'price_percent_above', label: 'Price % Above' },
    { value: 'price_percent_below', label: 'Price % Below' },
  ],
  
  // Price Action
  'close': [
    { value: 'crosses_above', label: 'Crosses Above Level' },
    { value: 'crosses_below', label: 'Crosses Below Level' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'crosses_above_open', label: 'Crosses Above Open' },
    { value: 'crosses_below_open', label: 'Crosses Below Open' },
    { value: 'crosses_above_high', label: 'Crosses Above High' },
    { value: 'crosses_below_low', label: 'Crosses Below Low' },
  ],
  'open': [
    { value: 'crosses_above', label: 'Crosses Above Level' },
    { value: 'crosses_below', label: 'Crosses Below Level' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'crosses_above_close', label: 'Crosses Above Close' },
    { value: 'crosses_below_close', label: 'Crosses Below Close' },
  ],
  'high': [
    { value: 'crosses_above', label: 'Crosses Above Level' },
    { value: 'crosses_below', label: 'Crosses Below Level' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  'low': [
    { value: 'crosses_above', label: 'Crosses Above Level' },
    { value: 'crosses_below', label: 'Crosses Below Level' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
};

// Available timeframes
const TIMEFRAMES = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
];

const EntryConditions: React.FC<EntryConditionsProps> = ({
  conditions,
  onChange,
  className = '',
  showTitle = true,
  selectedPairs = [],
  expandedConditionId,
  onExpandedChange,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  
  // Use controlled expanded state from parent if provided, otherwise use local state
  const [localExpandedCondition, setLocalExpandedCondition] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  
  const expandedCondition = expandedConditionId !== undefined ? expandedConditionId : localExpandedCondition;
  const setExpandedCondition = (id: string | null) => {
    if (onExpandedChange) {
      onExpandedChange(id);
    } else {
      setLocalExpandedCondition(id);
    }
  };
  
  // Clear expanded state if condition no longer exists
  useEffect(() => {
    if (expandedCondition && !conditions.conditions.find(c => c.id === expandedCondition)) {
      setExpandedCondition(null);
    }
  }, [conditions.conditions, expandedCondition]);

  // Helper function to determine if an operator needs a value input
  const operatorNeedsValue = (operator: string, indicator: string, component?: string): boolean => {
    // Operators that don't need values
    const noValueOperators = [
      'crosses_above_zero',
      'crosses_below_zero',
      'greater_than_zero',
      'less_than_zero',
    ];
    
    if (noValueOperators.includes(operator)) {
      return false;
    }
    
    // RSI operators don't need value field (they use overboughtLevel/oversoldLevel)
    if (indicator === 'RSI' && ['crosses_above_overbought', 'crosses_below_overbought', 'crosses_above_oversold', 'crosses_below_oversold', 'greater_than_overbought', 'less_than_overbought', 'greater_than_oversold', 'less_than_oversold'].includes(operator)) {
      return false;
    }
    
    // Component crossover operators (comparing components to each other)
    if (operator === 'crosses_above' || operator === 'crosses_below') {
      if (indicator === 'MACD' && component === 'macd_line') return false; // MACD line crosses signal
      if (indicator === 'MACD' && component === 'signal_line') return false; // Signal crosses MACD
      if (indicator === 'STOCHASTIC' && component === 'k_percent') return false; // %K crosses %D
      if (indicator === 'STOCHASTIC' && component === 'd_percent') return false; // %D crosses %K
      if (indicator === 'ADX' && component === 'plus_di') return false; // +DI crosses -DI
      if (indicator === 'ADX' && component === 'minus_di') return false; // -DI crosses +DI
      // Price crossing indicators (for moving averages, bands, channels, VWAP)
      if (['EMA', 'SMA', 'WMA', 'TEMA', 'HULL', 'BOLLINGER_BANDS', 'KELTNER_CHANNELS', 'VWAP'].includes(indicator)) {
        return false; // Price crosses indicator - no value needed
      }
      // Price action crossovers (comparing price components to each other)
      if (indicator === 'Price' && ['crosses_above_open', 'crosses_below_open', 'crosses_above_close', 'crosses_below_close', 'crosses_above_high', 'crosses_below_low'].includes(operator)) {
        return false; // Price component crosses another price component - no value needed
      }
    }
    
    // MACD zero crossover and comparison operators don't need values
    if (indicator === 'MACD') {
      if (['crosses_above_zero', 'crosses_below_zero', 'greater_than_zero', 'less_than_zero'].includes(operator)) {
        return false;
      }
      // Component comparison operators (MACD vs Signal, Signal vs MACD)
      if (['crosses_above', 'crosses_below', 'greater_than_signal', 'less_than_signal', 'greater_than_macd', 'less_than_macd'].includes(operator)) {
        return false;
      }
    }
    
    // MA crossover operators (comparing MA to another MA)
    if (operator === 'crosses_above_ma' || operator === 'crosses_below_ma' || 
        operator === 'greater_than_ma' || operator === 'less_than_ma') {
      return false; // Uses comparisonPeriod and comparisonMaType instead
    }
    
    // Comparison operators that compare to other components (not values)
    const componentComparisonOperators = [
      'greater_than_signal',
      'less_than_signal',
      'greater_than_macd',
      'less_than_macd',
      'greater_than_d',
      'less_than_d',
      'greater_than_k',
      'less_than_k',
      'greater_than_minus_di',
      'less_than_minus_di',
      'greater_than_plus_di',
      'less_than_plus_di',
    ];
    
    if (componentComparisonOperators.includes(operator)) {
      return false;
    }
    
    // Overbought/oversold level crossings (levels are predefined)
    if (component === 'overbought' || component === 'oversold') {
      if (operator === 'crosses_above' || operator === 'crosses_below') {
        return false;
      }
    }
    
    // Zero line crossings
    if (component === 'zero_line') {
      return false;
    }
    
    // All other operators need values
    return true;
  };

  const handleAddPreset = (preset: Omit<EntryCondition, 'id'>) => {
    const newCondition: EntryCondition = {
      ...preset,
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    onChange({
      ...conditions,
      conditions: [...conditions.conditions, newCondition],
    });
    setShowPresets(false);
  };

  const handleAddCustom = () => {
    const defaultIndicator = 'RSI';
    const defaultComponent = INDICATOR_COMPONENTS[defaultIndicator]?.[0]?.value || '';
    const defaultOperator = defaultComponent ? COMPONENT_OPERATORS[defaultComponent]?.[0]?.value || 'crosses_below_oversold' : 'crosses_below_oversold';
    
    const newCondition: EntryCondition = {
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Custom Condition',
      enabled: true,
      indicator: defaultIndicator,
      component: defaultComponent,
      operator: defaultOperator,
      period: 14,
      timeframe: '1h',
      ...(defaultIndicator === 'RSI' && {
        overboughtLevel: 70,
        oversoldLevel: 30,
      }),
    };
    
    onChange({
      ...conditions,
      conditions: [...conditions.conditions, newCondition],
    });
    setExpandedCondition(newCondition.id);
  };

  const handleUpdateCondition = (id: string, updates: Partial<EntryCondition>) => {
    // Preserve expanded state when updating
    const wasExpanded = expandedCondition === id;
    
    onChange({
      ...conditions,
      conditions: conditions.conditions.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    });
    
    // Keep the condition expanded after update
    if (wasExpanded) {
      setExpandedCondition(id);
    }
  };

  const handleRemoveCondition = (id: string) => {
    onChange({
      ...conditions,
      conditions: conditions.conditions.filter((c) => c.id !== id),
    });
  };

  const handleToggleCondition = (id: string) => {
    handleUpdateCondition(id, {
      enabled: !conditions.conditions.find((c) => c.id === id)?.enabled,
    });
  };

  const formatConditionDescription = (condition: EntryCondition): string => {
    const indicator = INDICATORS.find((ind) => ind.value === condition.indicator);
    const component = condition.component 
      ? INDICATOR_COMPONENTS[condition.indicator]?.find((c) => c.value === condition.component)
      : null;
    const operator = condition.component && COMPONENT_OPERATORS[condition.component]
      ? COMPONENT_OPERATORS[condition.component]?.find((op) => op.value === condition.operator)
      : null;
    
    if (!indicator) return condition.name;
    
    // Special handling for MA crossovers - show cleaner format
    if ((condition.operator === 'crosses_above_ma' || condition.operator === 'crosses_below_ma' || 
         condition.operator === 'greater_than_ma' || condition.operator === 'less_than_ma') &&
        condition.comparisonPeriod !== undefined && condition.comparisonPeriod !== null &&
        condition.comparisonMaType && 
        condition.period !== undefined && condition.period !== null) {
      const operatorText = condition.operator === 'crosses_above_ma' ? 'Crosses Above' :
                          condition.operator === 'crosses_below_ma' ? 'Crosses Below' :
                          condition.operator === 'greater_than_ma' ? 'Greater Than' :
                          'Less Than';
      return `${indicator.label} ${condition.period} ${operatorText} ${condition.comparisonMaType} ${condition.comparisonPeriod} on ${TIMEFRAMES.find((tf) => tf.value === condition.timeframe)?.label || condition.timeframe}`;
    }
    
    // Special handling for MACD conditions - show Fast, Slow, Signal periods
    if (condition.indicator === 'MACD') {
      const fastPeriod = condition.fastPeriod !== undefined ? condition.fastPeriod : 12;
      const slowPeriod = condition.slowPeriod !== undefined ? condition.slowPeriod : 26;
      const signalPeriod = condition.signalPeriod !== undefined ? condition.signalPeriod : 9;
      
      let macdDesc = indicator.label;
      if (component) {
        macdDesc += ` ${component.label}`;
      }
      if (operator) {
        macdDesc += ` ${operator.label}`;
      }
      
      // Handle value-based operators
      if (condition.operator === 'between' && condition.lowerBound !== undefined && condition.upperBound !== undefined) {
        macdDesc += ` ${condition.lowerBound}-${condition.upperBound}`;
      } else if (condition.value !== undefined) {
        macdDesc += ` ${condition.value}`;
      }
      
      // Add MACD parameters
      macdDesc += ` (Fast: ${fastPeriod}, Slow: ${slowPeriod}, Signal: ${signalPeriod})`;
      macdDesc += ` on ${TIMEFRAMES.find((tf) => tf.value === condition.timeframe)?.label || condition.timeframe}`;
      
      return macdDesc;
    }
    
    // Special handling for RSI overbought/oversold conditions
    if (condition.indicator === 'RSI' && condition.component === 'rsi_line') {
      const overboughtLevel = condition.overboughtLevel ?? 70;
      const oversoldLevel = condition.oversoldLevel ?? 30;
      
      if (condition.operator === 'crosses_above_overbought') {
        return `RSI ${condition.period || 14} Crosses Above Overbought Level (${overboughtLevel}) on ${TIMEFRAMES.find((tf) => tf.value === condition.timeframe)?.label || condition.timeframe}`;
      } else if (condition.operator === 'crosses_below_overbought') {
        return `RSI ${condition.period || 14} Crosses Below Overbought Level (${overboughtLevel}) on ${TIMEFRAMES.find((tf) => tf.value === condition.timeframe)?.label || condition.timeframe}`;
      } else if (condition.operator === 'crosses_above_oversold') {
        return `RSI ${condition.period || 14} Crosses Above Oversold Level (${oversoldLevel}) on ${TIMEFRAMES.find((tf) => tf.value === condition.timeframe)?.label || condition.timeframe}`;
      } else if (condition.operator === 'crosses_below_oversold') {
        return `RSI ${condition.period || 14} Crosses Below Oversold Level (${oversoldLevel}) on ${TIMEFRAMES.find((tf) => tf.value === condition.timeframe)?.label || condition.timeframe}`;
      } else if (condition.operator === 'greater_than_overbought') {
        return `RSI ${condition.period || 14} Greater Than Overbought Level (${overboughtLevel}) on ${TIMEFRAMES.find((tf) => tf.value === condition.timeframe)?.label || condition.timeframe}`;
      } else if (condition.operator === 'less_than_overbought') {
        return `RSI ${condition.period || 14} Less Than Overbought Level (${overboughtLevel}) on ${TIMEFRAMES.find((tf) => tf.value === condition.timeframe)?.label || condition.timeframe}`;
      } else if (condition.operator === 'greater_than_oversold') {
        return `RSI ${condition.period || 14} Greater Than Oversold Level (${oversoldLevel}) on ${TIMEFRAMES.find((tf) => tf.value === condition.timeframe)?.label || condition.timeframe}`;
      } else if (condition.operator === 'less_than_oversold') {
        return `RSI ${condition.period || 14} Less Than Oversold Level (${oversoldLevel}) on ${TIMEFRAMES.find((tf) => tf.value === condition.timeframe)?.label || condition.timeframe}`;
      }
    }
    
    let desc = indicator.label;
    if (component) {
      desc += ` ${component.label}`;
    }
    if (operator) {
      desc += ` ${operator.label}`;
    }
    
    // Handle different operator types
    if (condition.operator === 'between' && condition.lowerBound !== undefined && condition.upperBound !== undefined) {
      desc += ` ${condition.lowerBound}-${condition.upperBound}`;
    } else if (condition.operator === 'price_percent_above' || condition.operator === 'price_percent_below') {
      // Price percentage conditions
      if (condition.value !== undefined) {
        desc += ` ${condition.value}%`;
      }
    } else if (condition.operator === 'crosses_above_zero' || condition.operator === 'crosses_below_zero') {
      // Zero crossover conditions
      desc += ' Zero';
    } else if (condition.operator === 'crosses_above' && condition.indicator === 'MACD' && condition.component === 'macd_line') {
      // MACD line crosses above signal line
      desc += ' Signal Line';
    } else if (condition.operator === 'crosses_below' && condition.indicator === 'MACD' && condition.component === 'macd_line') {
      // MACD line crosses below signal line
      desc += ' Signal Line';
    } else if (condition.operator === 'crosses_above' && condition.indicator === 'STOCHASTIC' && condition.component === 'k_percent') {
      // %K crosses above %D
      desc += ' %D Line';
    } else if (condition.operator === 'crosses_below' && condition.indicator === 'STOCHASTIC' && condition.component === 'k_percent') {
      // %K crosses below %D
      desc += ' %D Line';
    } else if (condition.operator === 'crosses_above' && condition.indicator === 'ADX' && condition.component === 'plus_di') {
      // +DI crosses above -DI
      desc += ' -DI';
    } else if (condition.operator === 'crosses_below' && condition.indicator === 'ADX' && condition.component === 'plus_di') {
      // +DI crosses below -DI
      desc += ' -DI';
    } else if (condition.value !== undefined) {
      desc += ` ${condition.value}`;
    }
    
    // Don't show period for MACD (handled separately above)
    if (condition.period && condition.indicator !== 'MACD') {
      if (condition.indicator === 'BOLLINGER_BANDS' && condition.stdDeviation !== undefined) {
        desc += ` (Period: ${condition.period}, StdDev: ${condition.stdDeviation})`;
      } else {
        desc += ` (Period: ${condition.period})`;
      }
    }
    if (condition.indicator === 'BOLLINGER_BANDS' && condition.stdDeviation !== undefined && !condition.period) {
      desc += ` (StdDev: ${condition.stdDeviation})`;
    }
    
    desc += ` on ${TIMEFRAMES.find((tf) => tf.value === condition.timeframe)?.label || condition.timeframe}`;
    
    return desc;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && (
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
            <Target className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Entry Conditions
            </h3>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-0.5`}>
              Define when your bot should start trading
            </p>
          </div>
        </div>
      )}

      {/* Entry Type Selection */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200 bg-white'}`}>
        <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3 block`}>
          Entry Type
        </label>
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={conditions.entryType === 'immediate' ? 'default' : 'outline'}
            onClick={() => onChange({ ...conditions, entryType: 'immediate', orderType: conditions.orderType || 'market' })}
            className={`flex-1 ${
              conditions.entryType === 'immediate' 
                ? isDark 
                  ? 'ring-2 ring-yellow-500/50 shadow-lg shadow-yellow-500/20' 
                  : 'ring-2 ring-yellow-500/30 shadow-md'
                : ''
            }`}
          >
            <Zap className={`w-4 h-4 mr-2 ${conditions.entryType === 'immediate' ? 'text-yellow-300' : ''}`} />
            Enter Immediately
            {conditions.entryType === 'immediate' && (
              <CheckCircle2 className="w-4 h-4 ml-2" />
            )}
          </Button>
          <Button
            type="button"
            variant={conditions.entryType === 'conditional' ? 'default' : 'outline'}
            onClick={() => onChange({ ...conditions, entryType: 'conditional', enabled: true })}
            className={`flex-1 ${
              conditions.entryType === 'conditional' 
                ? isDark 
                  ? 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20' 
                  : 'ring-2 ring-blue-500/30 shadow-md'
                : ''
            }`}
          >
            <Target className={`w-4 h-4 mr-2 ${conditions.entryType === 'conditional' ? 'text-blue-300' : ''}`} />
            Wait for Conditions
            {conditions.entryType === 'conditional' && (
              <CheckCircle2 className="w-4 h-4 ml-2" />
            )}
          </Button>
        </div>

        {/* Immediate Entry Options */}
        {conditions.entryType === 'immediate' && (
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} space-y-3`}>
            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                Order Type
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={conditions.orderType === 'market' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onChange({ ...conditions, orderType: 'market', limitPrice: undefined, limitPrices: undefined, limitPricePercent: undefined })}
                  className={`flex-1 ${
                    conditions.orderType === 'market' 
                      ? isDark 
                        ? 'ring-2 ring-green-500/50 shadow-lg shadow-green-500/20' 
                        : 'ring-2 ring-green-500/30 shadow-md'
                      : ''
                  }`}
                >
                  Market Order
                  {conditions.orderType === 'market' && (
                    <CheckCircle2 className="w-3 h-3 ml-1.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant={conditions.orderType === 'limit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    // Initialize based on number of pairs
                    const newConditions = { ...conditions, orderType: 'limit' };
                    if (selectedPairs.length === 1) {
                      // Single pair: use exact limitPrice
                      newConditions.limitPrice = conditions.limitPrice || 0;
                      newConditions.limitPrices = undefined;
                      newConditions.limitPricePercent = undefined;
                    } else if (selectedPairs.length <= 5) {
                      // 2-5 pairs: use individual limitPrices
                      const initialLimitPrices: { [pair: string]: number } = {};
                      selectedPairs.forEach(pair => {
                        if (conditions.limitPrices?.[pair]) {
                          initialLimitPrices[pair] = conditions.limitPrices[pair];
                        }
                      });
                      newConditions.limitPrices = Object.keys(initialLimitPrices).length > 0 ? initialLimitPrices : undefined;
                      newConditions.limitPrice = undefined;
                      newConditions.limitPricePercent = undefined;
                    } else {
                      // 6+ pairs: use percentage offset
                      newConditions.limitPricePercent = conditions.limitPricePercent || -2; // Default to 2% below
                      newConditions.limitPrice = undefined;
                      newConditions.limitPrices = undefined;
                    }
                    onChange(newConditions);
                  }}
                  className={`flex-1 ${
                    conditions.orderType === 'limit' 
                      ? isDark 
                        ? 'ring-2 ring-orange-500/50 shadow-lg shadow-orange-500/20' 
                        : 'ring-2 ring-orange-500/30 shadow-md'
                      : ''
                  }`}
                >
                  Limit Order
                  {conditions.orderType === 'limit' && (
                    <CheckCircle2 className="w-3 h-3 ml-1.5" />
                  )}
                </Button>
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {conditions.orderType === 'market'
                  ? 'Order will execute immediately at current market price'
                  : 'Order will execute when price reaches your specified limit price'}
              </p>
            </div>

            {/* Limit Price Input - Only show when Limit Order is selected */}
            {conditions.orderType === 'limit' && (
              <div className="space-y-3">
                {selectedPairs.length === 0 ? (
                  <div className={`p-3 rounded-lg ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                    <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      Please select trading pairs in Bot Configuration first
                    </p>
                  </div>
                ) : selectedPairs.length === 1 ? (
                  // Single pair - show single exact price input
                  <div>
                    <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                      Limit Price for {selectedPairs[0].replace(/([A-Z]+)(USDT|BUSD|BTC|ETH)$/, '$1/$2')} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.00000001"
                      value={conditions.limitPrice || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                        onChange({ ...conditions, limitPrice: value, limitPrices: undefined, limitPricePercent: undefined });
                      }}
                      className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                      placeholder="Enter limit price"
                    />
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      The order will execute when the market price reaches this limit price
                    </p>
                  </div>
                ) : selectedPairs.length <= 5 ? (
                  // 2-5 pairs - show table with individual inputs
                  <div>
                    <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                      Limit Prices <span className="text-red-500">*</span>
                    </label>
                    <div className={`rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'} overflow-hidden`}>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full">
                          <thead className={`${isDark ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}`}>
                            <tr>
                              <th className={`text-left py-2 px-3 text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Trading Pair
                              </th>
                              <th className={`text-left py-2 px-3 text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Limit Price
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPairs.map((pair) => {
                              const formattedPair = pair.replace(/([A-Z]+)(USDT|BUSD|BTC|ETH)$/, '$1/$2');
                              const pairPrice = conditions.limitPrices?.[pair] || '';
                              return (
                                <tr key={pair} className={`border-b ${isDark ? 'border-gray-700/50' : 'border-gray-100'} last:border-0`}>
                                  <td className={`py-2 px-3 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {formattedPair}
                                  </td>
                                  <td className="py-2 px-3">
                                    <Input
                                      type="number"
                                      step="0.00000001"
                                      value={pairPrice}
                                      onChange={(e) => {
                                        const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                        const newLimitPrices = {
                                          ...(conditions.limitPrices || {}),
                                          [pair]: value,
                                        };
                                        // Remove pair from limitPrices if value is empty
                                        if (value === undefined) {
                                          delete newLimitPrices[pair];
                                        }
                                        onChange({
                                          ...conditions,
                                          limitPrices: Object.keys(newLimitPrices).length > 0 ? newLimitPrices : undefined,
                                          limitPrice: undefined,
                                          limitPricePercent: undefined,
                                        });
                                      }}
                                      className={`w-full ${isDark ? 'bg-gray-900 border-gray-700 text-white' : ''}`}
                                      placeholder="Enter price"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Set individual limit prices for each trading pair. Orders will execute when market prices reach these limits.
                    </p>
                  </div>
                ) : (
                  // 6+ pairs - use percentage offset (more practical)
                  <div>
                    <div className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                      <div className="flex items-start gap-2">
                        <Info className={`w-4 h-4 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        <div>
                          <p className={`text-xs font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                            Percentage-Based Limit Orders
                          </p>
                          <p className={`text-xs mt-1 ${isDark ? 'text-blue-400/80' : 'text-blue-700'}`}>
                            With {selectedPairs.length} pairs, limit orders use a percentage offset from current market price. This applies to all selected pairs.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                        Price Offset (%) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          step="0.1"
                          value={conditions.limitPricePercent !== undefined ? Math.abs(conditions.limitPricePercent) : ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Math.abs(parseFloat(e.target.value));
                            onChange({
                              ...conditions,
                              limitPricePercent: value !== undefined ? -value : undefined, // Negative means below current price
                              limitPrice: undefined,
                              limitPrices: undefined,
                            });
                          }}
                          className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                          placeholder="2.5"
                        />
                        <Select
                          value={conditions.limitPricePercent !== undefined && conditions.limitPricePercent < 0 ? 'below' : 'above'}
                          onValueChange={(value) => {
                            const currentPercent = Math.abs(conditions.limitPricePercent || 0);
                            onChange({
                              ...conditions,
                              limitPricePercent: value === 'below' ? -currentPercent : currentPercent,
                            });
                          }}
                        >
                          <SelectTrigger className={`w-32 ${isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="below">Below</SelectItem>
                            <SelectItem value="above">Above</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {conditions.limitPricePercent !== undefined ? (
                          <>
                            Orders will execute when prices are{' '}
                            <span className="font-medium">
                              {Math.abs(conditions.limitPricePercent)}% {conditions.limitPricePercent < 0 ? 'below' : 'above'}{' '}
                            </span>
                            current market price for all {selectedPairs.length} pairs.
                          </>
                        ) : (
                          'Enter a percentage offset (e.g., 2.5 means 2.5% below/above current price)'
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Conditional Entry Options */}
        {conditions.entryType === 'conditional' && (
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Enable Entry Conditions
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                  Wait for technical indicators before starting trades
                </p>
              </div>
              <button
                onClick={() => onChange({ ...conditions, enabled: !conditions.enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  conditions.enabled
                    ? 'bg-blue-500'
                    : isDark
                    ? 'bg-gray-700'
                    : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    conditions.enabled ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {conditions.entryType === 'conditional' && conditions.enabled && (
        <>
          {/* Logic Gate Selection */}
          {conditions.conditions.length > 1 && (
            <div className={`p-4 rounded-lg border ${isDark ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200 bg-white'}`}>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                Logic Gate
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={conditions.logicGate === 'AND' ? 'default' : 'outline'}
                  onClick={() => onChange({ ...conditions, logicGate: 'AND' })}
                  className="flex-1"
                >
                  ALL (AND)
                </Button>
                <Button
                  type="button"
                  variant={conditions.logicGate === 'OR' ? 'default' : 'outline'}
                  onClick={() => onChange({ ...conditions, logicGate: 'OR' })}
                  className="flex-1"
                >
                  ANY (OR)
                </Button>
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {conditions.logicGate === 'AND'
                  ? 'All enabled conditions must be true for entry'
                  : 'At least one enabled condition must be true for entry'}
              </p>
            </div>
          )}

          {/* Conditions List */}
          <div className="space-y-2">
            {conditions.conditions.map((condition, index) => {
              const isExpanded = expandedCondition === condition.id;
              
              return (
                <div
                  key={condition.id}
                  className={`rounded-lg border transition-all ${
                    isDark
                      ? 'border-gray-700/50 bg-gray-800/30'
                      : 'border-gray-200 bg-white'
                  } ${!condition.enabled ? 'opacity-60' : ''}`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => handleToggleCondition(condition.id)}
                          className={`mt-1 p-1 rounded ${
                            condition.enabled
                              ? isDark
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-blue-100 text-blue-600'
                              : isDark
                              ? 'bg-gray-700 text-gray-500'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          {condition.enabled ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-current" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {condition.name}
                            </span>
                            {index > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {conditions.logicGate}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formatConditionDescription(condition)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newExpanded = isExpanded ? null : condition.id;
                            setExpandedCondition(newExpanded);
                          }}
                          className={`p-1 rounded transition-colors ${
                            isDark
                              ? 'hover:bg-gray-700 text-gray-400'
                              : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveCondition(condition.id)}
                          className={`p-1 rounded transition-colors ${
                            isDark
                              ? 'hover:bg-gray-700 text-gray-400'
                              : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Configuration */}
                    {isExpanded && (
                      <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'} space-y-4`}>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                              Condition Name
                            </label>
                            <Input
                              value={condition.name}
                              onChange={(e) =>
                                handleUpdateCondition(condition.id, { name: e.target.value })
                              }
                              className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                              placeholder="RSI Oversold"
                            />
                          </div>
                          <div>
                            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                              Indicator
                            </label>
                            <Select
                              value={condition.indicator}
                              onValueChange={(value: EntryCondition['indicator']) =>
                                handleUpdateCondition(condition.id, { indicator: value })
                              }
                            >
                              <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INDICATORS.map((ind) => (
                                  <SelectItem key={ind.value} value={ind.value}>
                                    {ind.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Component Selection */}
                          {INDICATOR_COMPONENTS[condition.indicator] && INDICATOR_COMPONENTS[condition.indicator].length > 0 && (
                            <div>
                              <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                Component
                              </label>
                              <Select
                                value={condition.component || ''}
                                onValueChange={(value) => {
                                  // Reset operator when component changes
                                  const newComponent = value;
                                  const availableOps = COMPONENT_OPERATORS[newComponent] || [];
                                  const newOperator = availableOps[0]?.value || condition.operator;
                                  const updates: any = {
                                    component: newComponent,
                                    operator: newOperator,
                                  };
                                  // If MA crossover operator is selected, default comparisonMaType to same as indicator
                                  if (['crosses_above_ma', 'crosses_below_ma', 'greater_than_ma', 'less_than_ma'].includes(newOperator) && 
                                      ['EMA', 'SMA', 'WMA', 'TEMA', 'HULL'].includes(condition.indicator)) {
                                    updates.comparisonMaType = condition.indicator;
                                  }
                                  handleUpdateCondition(condition.id, updates);
                                }}
                              >
                                <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                                  <SelectValue placeholder="Select component" />
                                </SelectTrigger>
                                <SelectContent>
                                  {INDICATOR_COMPONENTS[condition.indicator].map((comp) => (
                                    <SelectItem key={comp.value} value={comp.value}>
                                      <div>
                                        <div className="font-medium">{comp.label}</div>
                                        <div className="text-xs text-gray-500">{comp.description}</div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                              Operator
                            </label>
                            <Select
                              value={condition.operator}
                              onValueChange={(value) => {
                                const updates: any = { operator: value };
                                // If MA crossover operator is selected, default comparisonMaType to same as indicator
                                if (['crosses_above_ma', 'crosses_below_ma', 'greater_than_ma', 'less_than_ma'].includes(value) && 
                                    ['EMA', 'SMA', 'WMA', 'TEMA', 'HULL'].includes(condition.indicator) &&
                                    !condition.comparisonMaType) {
                                  updates.comparisonMaType = condition.indicator;
                                }
                                handleUpdateCondition(condition.id, updates);
                              }}
                              disabled={!condition.component || !COMPONENT_OPERATORS[condition.component]}
                            >
                              <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                                <SelectValue placeholder={condition.component ? "Select operator" : "Select component first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {(condition.component ? COMPONENT_OPERATORS[condition.component] : []).map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                              Timeframe
                            </label>
                            <Select
                              value={condition.timeframe}
                              onValueChange={(value) =>
                                handleUpdateCondition(condition.id, { timeframe: value })
                              }
                            >
                              <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIMEFRAMES.map((tf) => (
                                  <SelectItem key={tf.value} value={tf.value}>
                                    {tf.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Period/Parameters based on indicator type */}
                          {/* OBV and VWAP don't need periods - OBV is cumulative, VWAP is session-based */}
                          {['RSI', 'EMA', 'SMA', 'WMA', 'TEMA', 'HULL', 'CCI', 'MFI', 'STOCHASTIC', 'WILLIAMS_R', 'ATR', 'ADX'].includes(condition.indicator) && 
                           !(['EMA', 'SMA', 'WMA', 'TEMA', 'HULL'].includes(condition.indicator) && 
                             (condition.operator === 'crosses_above_ma' || condition.operator === 'crosses_below_ma' || 
                              condition.operator === 'greater_than_ma' || condition.operator === 'less_than_ma')) && (
                            <div>
                              <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                Period
                              </label>
                              <Input
                                type="number"
                                value={condition.period || ''}
                                onChange={(e) =>
                                  handleUpdateCondition(condition.id, {
                                    period: parseInt(e.target.value) || undefined,
                                  })
                                }
                                className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                placeholder={condition.indicator === 'RSI' ? '14' : condition.indicator === 'EMA' ? '20' : '14'}
                              />
                            </div>
                          )}
                          
                          {/* RSI Overbought/Oversold Levels */}
                          {condition.indicator === 'RSI' && condition.component === 'rsi_line' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                  Overbought Level
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={condition.overboughtLevel !== undefined ? condition.overboughtLevel : 70}
                                  onChange={(e) =>
                                    handleUpdateCondition(condition.id, {
                                      overboughtLevel: parseInt(e.target.value) || 70,
                                    })
                                  }
                                  className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                  placeholder="70"
                                />
                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Default: 70 (typical range: 65-80)
                                </p>
                              </div>
                              <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                  Oversold Level
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={condition.oversoldLevel !== undefined ? condition.oversoldLevel : 30}
                                  onChange={(e) =>
                                    handleUpdateCondition(condition.id, {
                                      oversoldLevel: parseInt(e.target.value) || 30,
                                    })
                                  }
                                  className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                  placeholder="30"
                                />
                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Default: 30 (typical range: 20-35)
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Moving Average Crossover Parameters */}
                          {['EMA', 'SMA', 'WMA', 'TEMA', 'HULL'].includes(condition.indicator) && 
                           (condition.operator === 'crosses_above_ma' || condition.operator === 'crosses_below_ma' || 
                            condition.operator === 'greater_than_ma' || condition.operator === 'less_than_ma') && (
                            <>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                    {(condition.comparisonMaType || condition.indicator) === condition.indicator ? `${condition.indicator} 1` : `${condition.indicator} Period`}
                                  </label>
                                  <Input
                                    type="number"
                                    value={condition.period !== undefined && condition.period !== null ? condition.period : ''}
                                    onChange={(e) =>
                                      handleUpdateCondition(condition.id, {
                                        period: e.target.value ? parseInt(e.target.value) : undefined,
                                      })
                                    }
                                    className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                    placeholder={condition.indicator === 'EMA' ? '20' : '50'}
                                  />
                                </div>
                                <div>
                                  <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                    {(condition.comparisonMaType || condition.indicator) === condition.indicator ? `${condition.indicator} 2` : 'Comparison MA Type'}
                                  </label>
                                  {(condition.comparisonMaType || condition.indicator) === condition.indicator ? (
                                    <>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={condition.comparisonPeriod !== undefined && condition.comparisonPeriod !== null ? condition.comparisonPeriod : ''}
                                        onChange={(e) => {
                                          const compPeriod = e.target.value ? parseInt(e.target.value) : undefined;
                                          // Warn if comparisonPeriod equals period for same MA type
                                          if (compPeriod && compPeriod === condition.period && condition.indicator === condition.comparisonMaType) {
                                            // Still allow but will show warning
                                          }
                                          handleUpdateCondition(condition.id, { comparisonPeriod: compPeriod });
                                        }}
                                        className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                        placeholder={condition.indicator === 'EMA' ? '200' : '100'}
                                      />
                                      {condition.comparisonPeriod !== undefined && condition.comparisonPeriod <= 0 && (
                                        <p className={`text-xs mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                          ⚠️ Period must be greater than 0
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <Select
                                      value={condition.comparisonMaType || condition.indicator}
                                      onValueChange={(value: 'EMA' | 'SMA' | 'WMA' | 'TEMA' | 'HULL') =>
                                        handleUpdateCondition(condition.id, { comparisonMaType: value })
                                      }
                                    >
                                      <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="EMA">EMA</SelectItem>
                                        <SelectItem value="SMA">SMA</SelectItem>
                                        <SelectItem value="WMA">WMA</SelectItem>
                                        <SelectItem value="TEMA">TEMA</SelectItem>
                                        <SelectItem value="HULL">Hull MA</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                              {(condition.comparisonMaType || condition.indicator) !== condition.indicator && (
                                <div>
                                  <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                    {condition.comparisonMaType || 'EMA'} Period
                                  </label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={condition.comparisonPeriod !== undefined && condition.comparisonPeriod !== null ? condition.comparisonPeriod : ''}
                                    onChange={(e) => {
                                      const compPeriod = e.target.value ? parseInt(e.target.value) : undefined;
                                      handleUpdateCondition(condition.id, { comparisonPeriod: compPeriod });
                                    }}
                                    className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                    placeholder={condition.comparisonMaType === 'EMA' ? '100' : '200'}
                                  />
                                  {condition.comparisonPeriod !== undefined && condition.comparisonPeriod <= 0 && (
                                    <p className={`text-xs mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                      ⚠️ Period must be greater than 0
                                    </p>
                                  )}
                                </div>
                              )}
                              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {condition.indicator} {condition.period !== undefined && condition.period !== null ? condition.period : 'X'} {condition.operator === 'crosses_above_ma' ? 'crosses above' : condition.operator === 'crosses_below_ma' ? 'crosses below' : condition.operator === 'greater_than_ma' ? 'is greater than' : 'is less than'} {condition.comparisonMaType || condition.indicator} {condition.comparisonPeriod !== undefined && condition.comparisonPeriod !== null ? condition.comparisonPeriod : 'X'}
                                {condition.period === condition.comparisonPeriod && condition.indicator === condition.comparisonMaType && condition.period !== undefined && condition.comparisonPeriod !== undefined && (
                                  <span className={`ml-2 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                    ⚠️ Both periods are the same
                                  </span>
                                )}
                              </p>
                            </>
                          )}
                          
                          {/* Bollinger Bands Parameters */}
                          {condition.indicator === 'BOLLINGER_BANDS' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                  Period
                                </label>
                                <Input
                                  type="number"
                                  value={condition.period || ''}
                                  onChange={(e) =>
                                    handleUpdateCondition(condition.id, {
                                      period: parseInt(e.target.value) || undefined,
                                    })
                                  }
                                  className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                  placeholder="20"
                                />
                              </div>
                              <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                  Standard Deviation
                                </label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={condition.stdDeviation !== undefined ? condition.stdDeviation : ''}
                                  onChange={(e) =>
                                    handleUpdateCondition(condition.id, {
                                      stdDeviation: parseFloat(e.target.value) || undefined,
                                    })
                                  }
                                  className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                  placeholder="2"
                                />
                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Default: 2 (typical range: 1.5-2.5)
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* MACD Parameters */}
                          {condition.indicator === 'MACD' && (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                  Fast Period
                                </label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={condition.fastPeriod !== undefined ? condition.fastPeriod : 12}
                                  onChange={(e) => {
                                    const fast = parseInt(e.target.value) || 12;
                                    // Ensure fast < slow if slow is set
                                    const slow = condition.slowPeriod !== undefined ? condition.slowPeriod : 26;
                                    if (fast >= slow) {
                                      return; // Don't update if invalid
                                    }
                                    handleUpdateCondition(condition.id, { fastPeriod: fast });
                                  }}
                                  className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                  placeholder="12"
                                />
                                {condition.fastPeriod && condition.slowPeriod && condition.fastPeriod >= condition.slowPeriod && (
                                  <p className={`text-xs mt-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                    ⚠️ Fast period must be less than slow period
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                  Slow Period
                                </label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={condition.slowPeriod !== undefined ? condition.slowPeriod : 26}
                                  onChange={(e) => {
                                    const slow = parseInt(e.target.value) || 26;
                                    // Ensure slow > fast if fast is set
                                    const fast = condition.fastPeriod !== undefined ? condition.fastPeriod : 12;
                                    if (slow <= fast) {
                                      return; // Don't update if invalid
                                    }
                                    handleUpdateCondition(condition.id, { slowPeriod: slow });
                                  }}
                                  className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                  placeholder="26"
                                />
                                {((condition.fastPeriod !== undefined ? condition.fastPeriod : 12) >= (condition.slowPeriod !== undefined ? condition.slowPeriod : 26)) && (
                                  <p className={`text-xs mt-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                    ⚠️ Slow period must be greater than fast period
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                  Signal Period
                                </label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={condition.signalPeriod !== undefined ? condition.signalPeriod : 9}
                                  onChange={(e) =>
                                    handleUpdateCondition(condition.id, {
                                      signalPeriod: parseInt(e.target.value) || 9,
                                    })
                                  }
                                  className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                  placeholder="9"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Value Inputs */}
                        {condition.operator === 'between' ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                Lower Bound
                              </label>
                              <Input
                                type="number"
                                value={condition.lowerBound || ''}
                                onChange={(e) =>
                                  handleUpdateCondition(condition.id, {
                                    lowerBound: parseFloat(e.target.value) || undefined,
                                  })
                                }
                                className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                placeholder="25"
                              />
                            </div>
                            <div>
                              <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                                Upper Bound
                              </label>
                              <Input
                                type="number"
                                value={condition.upperBound || ''}
                                onChange={(e) =>
                                  handleUpdateCondition(condition.id, {
                                    upperBound: parseFloat(e.target.value) || undefined,
                                  })
                                }
                                className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                                placeholder="35"
                              />
                            </div>
                          </div>
                        ) : condition.operator === 'price_percent_above' || condition.operator === 'price_percent_below' ? (
                          // Percentage-based price conditions
                          <div>
                            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                              Percentage (%) <span className="text-red-500">*</span>
                            </label>
                            <Input
                              type="number"
                              step="0.1"
                              value={condition.value !== undefined ? Math.abs(condition.value) : ''}
                              onChange={(e) => {
                                const percent = parseFloat(e.target.value) || undefined;
                                handleUpdateCondition(condition.id, {
                                  value: percent !== undefined ? Math.abs(percent) : undefined,
                                });
                              }}
                              className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                              placeholder="2.5"
                            />
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {condition.operator === 'price_percent_above'
                                ? `Price must be ${condition.value || 'X'}% above the ${condition.component === 'line' ? 'indicator' : 'band/channel'}`
                                : `Price must be ${condition.value || 'X'}% below the ${condition.component === 'line' ? 'indicator' : 'band/channel'}`}
                            </p>
                          </div>
                        ) : !operatorNeedsValue(condition.operator, condition.indicator, condition.component) ? (
                          // Operators that don't need value input - show description
                          <div>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {condition.operator === 'crosses_above_zero' && 'Triggers when the component crosses above zero'}
                              {condition.operator === 'crosses_below_zero' && 'Triggers when the component crosses below zero'}
                              {condition.operator === 'crosses_above' && condition.indicator === 'MACD' && condition.component === 'macd_line' && 'Triggers when MACD Line crosses above Signal Line'}
                              {condition.operator === 'crosses_below' && condition.indicator === 'MACD' && condition.component === 'macd_line' && 'Triggers when MACD Line crosses below Signal Line'}
                              {condition.operator === 'crosses_above' && condition.indicator === 'MACD' && condition.component === 'signal_line' && 'Triggers when Signal Line crosses above MACD Line'}
                              {condition.operator === 'crosses_below' && condition.indicator === 'MACD' && condition.component === 'signal_line' && 'Triggers when Signal Line crosses below MACD Line'}
                              {condition.operator === 'crosses_above' && condition.indicator === 'STOCHASTIC' && condition.component === 'k_percent' && 'Triggers when %K crosses above %D'}
                              {condition.operator === 'crosses_below' && condition.indicator === 'STOCHASTIC' && condition.component === 'k_percent' && 'Triggers when %K crosses below %D'}
                              {condition.operator === 'crosses_above' && condition.indicator === 'STOCHASTIC' && condition.component === 'd_percent' && 'Triggers when %D crosses above %K'}
                              {condition.operator === 'crosses_below' && condition.indicator === 'STOCHASTIC' && condition.component === 'd_percent' && 'Triggers when %D crosses below %K'}
                              {condition.operator === 'crosses_above' && condition.indicator === 'ADX' && condition.component === 'plus_di' && 'Triggers when +DI crosses above -DI'}
                              {condition.operator === 'crosses_below' && condition.indicator === 'ADX' && condition.component === 'plus_di' && 'Triggers when +DI crosses below -DI'}
                              {condition.operator === 'crosses_above' && condition.indicator === 'ADX' && condition.component === 'minus_di' && 'Triggers when -DI crosses above +DI'}
                              {condition.operator === 'crosses_below' && condition.indicator === 'ADX' && condition.component === 'minus_di' && 'Triggers when -DI crosses below +DI'}
                              {condition.operator === 'crosses_above' && ['EMA', 'SMA', 'WMA', 'TEMA', 'HULL'].includes(condition.indicator) && 'Triggers when price crosses above the moving average'}
                              {condition.operator === 'crosses_below' && ['EMA', 'SMA', 'WMA', 'TEMA', 'HULL'].includes(condition.indicator) && 'Triggers when price crosses below the moving average'}
                              {condition.operator === 'crosses_above' && condition.indicator === 'BOLLINGER_BANDS' && 'Triggers when price crosses above the band'}
                              {condition.operator === 'crosses_below' && condition.indicator === 'BOLLINGER_BANDS' && 'Triggers when price crosses below the band'}
                              {condition.operator === 'crosses_above' && condition.indicator === 'KELTNER_CHANNELS' && 'Triggers when price crosses above the channel'}
                              {condition.operator === 'crosses_below' && condition.indicator === 'KELTNER_CHANNELS' && 'Triggers when price crosses below the channel'}
                              {condition.operator === 'crosses_above' && condition.indicator === 'VWAP' && 'Triggers when price crosses above VWAP'}
                              {condition.operator === 'crosses_below' && condition.indicator === 'VWAP' && 'Triggers when price crosses below VWAP'}
                              {condition.operator === 'crosses_above_overbought' && condition.indicator === 'RSI' && `Triggers when RSI crosses above overbought level (${condition.overboughtLevel ?? 70})`}
                              {condition.operator === 'crosses_below_overbought' && condition.indicator === 'RSI' && `Triggers when RSI crosses below overbought level (${condition.overboughtLevel ?? 70})`}
                              {condition.operator === 'crosses_above_oversold' && condition.indicator === 'RSI' && `Triggers when RSI crosses above oversold level (${condition.oversoldLevel ?? 30})`}
                              {condition.operator === 'crosses_below_oversold' && condition.indicator === 'RSI' && `Triggers when RSI crosses below oversold level (${condition.oversoldLevel ?? 30})`}
                              {condition.operator === 'greater_than_overbought' && condition.indicator === 'RSI' && `Triggers when RSI is greater than overbought level (${condition.overboughtLevel ?? 70})`}
                              {condition.operator === 'less_than_overbought' && condition.indicator === 'RSI' && `Triggers when RSI is less than overbought level (${condition.overboughtLevel ?? 70})`}
                              {condition.operator === 'greater_than_oversold' && condition.indicator === 'RSI' && `Triggers when RSI is greater than oversold level (${condition.oversoldLevel ?? 30})`}
                              {condition.operator === 'less_than_oversold' && condition.indicator === 'RSI' && `Triggers when RSI is less than oversold level (${condition.oversoldLevel ?? 30})`}
                              {condition.operator === 'crosses_above_overbought' && condition.indicator !== 'RSI' && 'Triggers when indicator crosses above overbought level'}
                              {condition.operator === 'crosses_below_oversold' && condition.indicator !== 'RSI' && 'Triggers when indicator crosses below oversold level'}
                              {condition.operator === 'crosses_above_oversold' && condition.indicator !== 'RSI' && 'Triggers when indicator crosses above oversold level'}
                              {condition.operator === 'crosses_below_overbought' && condition.indicator !== 'RSI' && 'Triggers when indicator crosses below overbought level'}
                              {condition.operator === 'crosses_above' && condition.indicator === 'MACD' && condition.component === 'macd_line' && 'Triggers when MACD Line crosses above Signal Line'}
                              {condition.operator === 'crosses_below' && condition.indicator === 'MACD' && condition.component === 'macd_line' && 'Triggers when MACD Line crosses below Signal Line'}
                              {condition.operator === 'crosses_above_zero' && condition.indicator === 'MACD' && condition.component === 'macd_line' && 'Triggers when MACD Line crosses above zero'}
                              {condition.operator === 'crosses_below_zero' && condition.indicator === 'MACD' && condition.component === 'macd_line' && 'Triggers when MACD Line crosses below zero'}
                              {condition.operator === 'greater_than_zero' && condition.indicator === 'MACD' && condition.component === 'macd_line' && 'Triggers when MACD Line is greater than zero'}
                              {condition.operator === 'less_than_zero' && condition.indicator === 'MACD' && condition.component === 'macd_line' && 'Triggers when MACD Line is less than zero'}
                              {condition.operator === 'greater_than_signal' && condition.indicator === 'MACD' && condition.component === 'macd_line' && 'Triggers when MACD Line is greater than Signal Line'}
                              {condition.operator === 'less_than_signal' && condition.indicator === 'MACD' && condition.component === 'macd_line' && 'Triggers when MACD Line is less than Signal Line'}
                              {condition.operator === 'crosses_above' && condition.indicator === 'MACD' && condition.component === 'signal_line' && 'Triggers when Signal Line crosses above MACD Line'}
                              {condition.operator === 'crosses_below' && condition.indicator === 'MACD' && condition.component === 'signal_line' && 'Triggers when Signal Line crosses below MACD Line'}
                              {condition.operator === 'crosses_above_zero' && condition.indicator === 'MACD' && condition.component === 'signal_line' && 'Triggers when Signal Line crosses above zero'}
                              {condition.operator === 'crosses_below_zero' && condition.indicator === 'MACD' && condition.component === 'signal_line' && 'Triggers when Signal Line crosses below zero'}
                              {condition.operator === 'greater_than_zero' && condition.indicator === 'MACD' && condition.component === 'signal_line' && 'Triggers when Signal Line is greater than zero'}
                              {condition.operator === 'less_than_zero' && condition.indicator === 'MACD' && condition.component === 'signal_line' && 'Triggers when Signal Line is less than zero'}
                              {condition.operator === 'greater_than_macd' && condition.indicator === 'MACD' && condition.component === 'signal_line' && 'Triggers when Signal Line is greater than MACD Line'}
                              {condition.operator === 'less_than_macd' && condition.indicator === 'MACD' && condition.component === 'signal_line' && 'Triggers when Signal Line is less than MACD Line'}
                              {condition.operator === 'crosses_above_zero' && condition.indicator === 'MACD' && condition.component === 'histogram' && 'Triggers when Histogram crosses above zero'}
                              {condition.operator === 'crosses_below_zero' && condition.indicator === 'MACD' && condition.component === 'histogram' && 'Triggers when Histogram crosses below zero'}
                              {condition.operator === 'greater_than_zero' && condition.indicator === 'MACD' && condition.component === 'histogram' && 'Triggers when Histogram is greater than zero'}
                              {condition.operator === 'less_than_zero' && condition.indicator === 'MACD' && condition.component === 'histogram' && 'Triggers when Histogram is less than zero'}
                              {condition.operator === 'greater_than_zero' && condition.indicator !== 'MACD' && 'Triggers when indicator is greater than zero'}
                              {condition.operator === 'less_than_zero' && condition.indicator !== 'MACD' && 'Triggers when indicator is less than zero'}
                              {condition.operator === 'greater_than_d' && 'Triggers when %K is greater than %D'}
                              {condition.operator === 'less_than_d' && 'Triggers when %K is less than %D'}
                              {condition.operator === 'greater_than_k' && 'Triggers when %D is greater than %K'}
                              {condition.operator === 'less_than_k' && 'Triggers when %D is less than %K'}
                              {condition.operator === 'greater_than_minus_di' && 'Triggers when +DI is greater than -DI'}
                              {condition.operator === 'less_than_minus_di' && 'Triggers when +DI is less than -DI'}
                              {condition.operator === 'greater_than_plus_di' && 'Triggers when -DI is greater than +DI'}
                              {condition.operator === 'less_than_plus_di' && 'Triggers when -DI is less than +DI'}
                              {condition.operator === 'crosses_above_ma' && condition.comparisonPeriod && condition.comparisonMaType && `Triggers when ${condition.indicator} ${condition.period || 'X'} crosses above ${condition.comparisonMaType} ${condition.comparisonPeriod}`}
                              {condition.operator === 'crosses_below_ma' && condition.comparisonPeriod && condition.comparisonMaType && `Triggers when ${condition.indicator} ${condition.period || 'X'} crosses below ${condition.comparisonMaType} ${condition.comparisonPeriod}`}
                              {condition.operator === 'greater_than_ma' && condition.comparisonPeriod && condition.comparisonMaType && `Triggers when ${condition.indicator} ${condition.period || 'X'} is greater than ${condition.comparisonMaType} ${condition.comparisonPeriod}`}
                              {condition.operator === 'less_than_ma' && condition.comparisonPeriod && condition.comparisonMaType && `Triggers when ${condition.indicator} ${condition.period || 'X'} is less than ${condition.comparisonMaType} ${condition.comparisonPeriod}`}
                              {((condition.operator === 'crosses_above_ma' || condition.operator === 'crosses_below_ma' || condition.operator === 'greater_than_ma' || condition.operator === 'less_than_ma') && (!condition.comparisonPeriod || !condition.comparisonMaType)) && 'Select comparison MA type and period below'}
                              {!['crosses_above_zero', 'crosses_below_zero', 'crosses_above', 'crosses_below', 'crosses_above_overbought', 'crosses_below_oversold', 'crosses_above_oversold', 'crosses_below_overbought', 'greater_than_zero', 'less_than_zero', 'greater_than_signal', 'less_than_signal', 'greater_than_macd', 'less_than_macd', 'greater_than_d', 'less_than_d', 'greater_than_k', 'less_than_k', 'greater_than_minus_di', 'less_than_minus_di', 'greater_than_plus_di', 'less_than_plus_di', 'crosses_above_ma', 'crosses_below_ma', 'greater_than_ma', 'less_than_ma'].includes(condition.operator) && 'No value input needed for this operator'}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                              {condition.operator === 'price_above' || condition.operator === 'price_below' 
                                ? 'Price Threshold' 
                                : 'Value'}
                            </label>
                            <Input
                              type="number"
                              step="0.1"
                              value={condition.value || ''}
                              onChange={(e) =>
                                handleUpdateCondition(condition.id, {
                                  value: parseFloat(e.target.value) || undefined,
                                })
                              }
                              className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
                              placeholder={condition.operator === 'price_above' || condition.operator === 'price_below' ? "50000" : "30"}
                            />
                            {condition.operator === 'price_above' || condition.operator === 'price_below' ? (
                              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {condition.operator === 'price_above' 
                                  ? `Price must be above ${condition.value || 'threshold'}`
                                  : `Price must be below ${condition.value || 'threshold'}`}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Condition Buttons */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPresets(!showPresets)}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Add Preset Condition
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
              </Button>

              {showPresets && (
                <div
                  className={`absolute z-50 w-full mt-2 rounded-lg border shadow-lg ${
                    isDark
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200'
                  } max-h-80 overflow-y-auto`}
                >
                  <div className="p-2">
                    <div className={`text-xs font-medium px-2 py-1 mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Popular Conditions
                    </div>
                    {PREDEFINED_CONDITIONS.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleAddPreset(preset)}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-opacity-50 transition-colors ${
                          isDark
                            ? 'hover:bg-gray-700 text-gray-300'
                            : 'hover:bg-gray-50 text-gray-900'
                        }`}
                      >
                        <div className="font-medium text-sm">{preset.name}</div>
                        <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                          {formatConditionDescription(preset as EntryCondition)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddCustom}
            >
              <Plus className="w-4 h-4 mr-2" />
              Custom
            </Button>
          </div>

          {conditions.conditions.length === 0 && (
            <div className={`p-6 rounded-lg border border-dashed text-center ${
              isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50'
            }`}>
              <Target className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                No entry conditions configured
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Add preset or custom conditions to define when trading should start
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders that cause state loss
export default React.memo(EntryConditions);


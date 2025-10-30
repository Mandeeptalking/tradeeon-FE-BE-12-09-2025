// Comprehensive type definitions for the indicator system

export type SourceType = 'close' | 'open' | 'high' | 'low' | 'hlc3' | 'ohlc4';
export type SmoothingType = 'None' | 'SMA' | 'EMA' | 'RMA' | 'WMA';
export type PaneType = 'price' | 'rsi' | 'macd' | 'volume';

// Parameter configuration types
export interface ParamConfig {
  type: 'number' | 'select' | 'boolean' | 'color';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  label: string;
  description?: string;
}

// Indicator metadata interface
export interface IndicatorMetadata {
  name: string;
  shortName: string;
  category: 'TREND' | 'MOMENTUM' | 'VOLATILITY' | 'VOLUME';
  pane: PaneType;
  description: string;
  defaultParams: Record<string, any>;
  defaultStyle: {
    color: string;
    width: number;
    dashed?: boolean;
    alpha?: number;
  };
  paramConfig: Record<string, ParamConfig>;
}

// Common parameter interfaces for type safety
export interface EMAParams {
  length: number;
  source: SourceType;
}

export interface RSIParams {
  length: number;
  source: SourceType;
  smoothingType: SmoothingType;
  smoothingLength: number;
  showGradientFill: boolean;
  overboughtLevel: number;
  oversoldLevel: number;
}

// Style interface
export interface IndicatorStyle {
  color: string;
  width: number;
  dashed?: boolean;
  alpha?: number;
}

// Instance interface for UI state management
export interface IndicatorUIInstance {
  id: string;
  name: string;
  displayName: string;
  category: string;
  pane: PaneType;
  params: Record<string, any>;
  style: IndicatorStyle;
  metadata: IndicatorMetadata;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}


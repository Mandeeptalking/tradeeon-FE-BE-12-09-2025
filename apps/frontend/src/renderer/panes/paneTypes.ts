import { IChartApi, ISeriesApi } from 'lightweight-charts';

/**
 * Pane types for different chart areas
 */
export type PaneType = 'price' | 'oscillator' | 'volume';

/**
 * Pane configuration
 */
export interface PaneConfig {
  id: string;
  type: PaneType;
  height: number;
  order: number;
  visible: boolean;
  autoScale: boolean;
  fixedRange?: {
    min: number;
    max: number;
  };
}

/**
 * Pane instance containing chart and series
 */
export interface PaneInstance {
  id: string;
  type: PaneType;
  chart: IChartApi;
  container: HTMLElement;
  series: Map<string, ISeriesApi<any>>;
  config: PaneConfig;
}

/**
 * Series configuration for different indicator types
 */
export interface SeriesConfig {
  id: string;
  paneId: string;
  type: 'line' | 'histogram' | 'area' | 'candlestick';
  color: string;
  lineWidth?: number;
  overlay: boolean;
  zeroLine?: boolean;
  levels?: number[];
  visible: boolean;
}

/**
 * Crosshair sync configuration
 */
export interface CrosshairSyncConfig {
  enabled: boolean;
  syncTime: boolean;
  syncPrice: boolean;
  showLabels: boolean;
}

/**
 * Autoscale configuration
 */
export interface AutoscaleConfig {
  enabled: boolean;
  padding: {
    top: number;
    bottom: number;
  };
  mode: 'auto' | 'fixed' | 'locked';
  range?: {
    min: number;
    max: number;
  };
}

/**
 * Default pane configurations
 */
export const DEFAULT_PANE_CONFIGS: Record<PaneType, Partial<PaneConfig>> = {
  price: {
    type: 'price',
    height: 400,
    order: 0,
    visible: true,
    autoScale: true,
  },
  oscillator: {
    type: 'oscillator',
    height: 200,
    order: 1,
    visible: true,
    autoScale: true,
  },
  volume: {
    type: 'volume',
    height: 150,
    order: 2,
    visible: true,
    autoScale: true,
  },
};

/**
 * Default series configurations
 */
export const DEFAULT_SERIES_CONFIGS: Record<string, Partial<SeriesConfig>> = {
  candlestick: {
    type: 'candlestick',
    color: '#26a69a',
    overlay: false,
    visible: true,
  },
  line: {
    type: 'line',
    color: '#2196f3',
    lineWidth: 2,
    overlay: true,
    visible: true,
  },
  histogram: {
    type: 'histogram',
    color: '#ff9800',
    overlay: false,
    visible: true,
  },
  area: {
    type: 'area',
    color: '#4caf50',
    overlay: true,
    visible: true,
  },
};

/**
 * Default crosshair sync configuration
 */
export const DEFAULT_CROSSHAIR_SYNC_CONFIG: CrosshairSyncConfig = {
  enabled: true,
  syncTime: true,
  syncPrice: false,
  showLabels: true,
};

/**
 * Default autoscale configuration
 */
export const DEFAULT_AUTOSCALE_CONFIG: AutoscaleConfig = {
  enabled: true,
  padding: {
    top: 0.1,
    bottom: 0.1,
  },
  mode: 'auto',
};


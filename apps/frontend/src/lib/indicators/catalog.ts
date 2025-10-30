import { INDICATOR_TYPES } from '../indicator_engine';

// If your real catalog is elsewhere, import it here.
// Example expected shape per indicator:
// {
//   key: "RSI",
//   label: "RSI",
//   components: ["RSI", "RSI_MA"],
//   defaults: { length: 14 },
//   settings: [{ key: "length", type: "number", min: 1, max: 200, step: 1 }],
//   pane: "indicator", // "price" | "indicator"
//   range: { min: 0, max: 100 } // optional (for overlays)
// }

export type SettingSpec =
  | { key: string; type: "number"; min?: number; max?: number; step?: number }
  | { key: string; type: "select"; options: { value: string; label: string }[] }
  | { key: string; type: "boolean" };

export type CatalogItem = {
  key: string;
  label: string;
  components: string[];
  defaults?: Record<string, any>;
  settings?: SettingSpec[];
  pane: "price" | "indicator";
  range?: { min: number; max: number };
};

// Enhanced indicator catalog with proper settings
const INDICATOR_CATALOG: CatalogItem[] = [
  {
    key: "RSI",
    label: "RSI (Relative Strength Index)",
    components: ["RSI", "RSI_MA"],
    defaults: { length: 14, overboughtLevel: 70, oversoldLevel: 30 },
    settings: [
      { key: "length", type: "number", min: 1, max: 200, step: 1 },
      { key: "overboughtLevel", type: "number", min: 50, max: 100, step: 1 },
      { key: "oversoldLevel", type: "number", min: 0, max: 50, step: 1 },
      { key: "emaLength", type: "number", min: 1, max: 50, step: 1 }
    ],
    pane: "indicator",
    range: { min: 0, max: 100 }
  },
  {
    key: "EMA",
    label: "EMA (Exponential Moving Average)",
    components: ["EMA"],
    defaults: { period: 20 },
    settings: [
      { key: "period", type: "number", min: 1, max: 500, step: 1 }
    ],
    pane: "price"
  },
  {
    key: "SMA",
    label: "SMA (Simple Moving Average)",
    components: ["SMA"],
    defaults: { period: 20 },
    settings: [
      { key: "period", type: "number", min: 1, max: 500, step: 1 }
    ],
    pane: "price"
  },
  {
    key: "MACD",
    label: "MACD (Moving Average Convergence Divergence)",
    components: ["MACD Line", "Signal Line", "Histogram"],
    defaults: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    settings: [
      { key: "fastPeriod", type: "number", min: 1, max: 50, step: 1 },
      { key: "slowPeriod", type: "number", min: 1, max: 100, step: 1 },
      { key: "signalPeriod", type: "number", min: 1, max: 50, step: 1 }
    ],
    pane: "indicator"
  },
  {
    key: "CCI",
    label: "CCI (Commodity Channel Index)",
    components: ["CCI"],
    defaults: { period: 20, overboughtLevel: 100, oversoldLevel: -100 },
    settings: [
      { key: "period", type: "number", min: 1, max: 100, step: 1 },
      { key: "overboughtLevel", type: "number", min: 50, max: 300, step: 1 },
      { key: "oversoldLevel", type: "number", min: -300, max: -50, step: 1 }
    ],
    pane: "indicator"
  },
  {
    key: "MFI",
    label: "MFI (Money Flow Index)",
    components: ["MFI"],
    defaults: { period: 14, overboughtLevel: 80, oversoldLevel: 20 },
    settings: [
      { key: "period", type: "number", min: 1, max: 100, step: 1 },
      { key: "overboughtLevel", type: "number", min: 50, max: 100, step: 1 },
      { key: "oversoldLevel", type: "number", min: 0, max: 50, step: 1 }
    ],
    pane: "indicator",
    range: { min: 0, max: 100 }
  },
  {
    key: "Bollinger",
    label: "Bollinger Bands",
    components: ["Upper Band", "Middle Band", "Lower Band"],
    defaults: { period: 20, stdDev: 2 },
    settings: [
      { key: "period", type: "number", min: 1, max: 100, step: 1 },
      { key: "stdDev", type: "number", min: 1, max: 5, step: 0.1 }
    ],
    pane: "price"
  },
  {
    key: "Stochastic",
    label: "Stochastic Oscillator",
    components: ["%K", "%D"],
    defaults: { kPeriod: 14, dPeriod: 3, overboughtLevel: 80, oversoldLevel: 20 },
    settings: [
      { key: "kPeriod", type: "number", min: 1, max: 50, step: 1 },
      { key: "dPeriod", type: "number", min: 1, max: 20, step: 1 },
      { key: "overboughtLevel", type: "number", min: 50, max: 100, step: 1 },
      { key: "oversoldLevel", type: "number", min: 0, max: 50, step: 1 }
    ],
    pane: "indicator",
    range: { min: 0, max: 100 }
  },
  {
    key: "ATR",
    label: "ATR (Average True Range)",
    components: ["ATR"],
    defaults: { period: 14 },
    settings: [
      { key: "period", type: "number", min: 1, max: 100, step: 1 }
    ],
    pane: "indicator"
  },
  {
    key: "ADX",
    label: "ADX (Average Directional Index)",
    components: ["ADX", "+DI", "-DI"],
    defaults: { period: 14 },
    settings: [
      { key: "period", type: "number", min: 1, max: 100, step: 1 }
    ],
    pane: "indicator",
    range: { min: 0, max: 100 }
  }
];

export function listIndicators(): CatalogItem[] {
  // Normalize your catalog to CatalogItem[]
  return INDICATOR_CATALOG;
}

export function getIndicator(key?: string): CatalogItem | undefined {
  if (!key) return undefined;
  return listIndicators().find(i => i.key === key);
}




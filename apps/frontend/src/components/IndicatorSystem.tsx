import React, { useEffect, useRef, useState } from 'react';
import { 
  IChartApi, 
  ISeriesApi, 
  LineSeries, 
  HistogramSeries, 
  LineData, 
  HistogramData,
  PriceLineOptions,
  LineStyle
} from 'lightweight-charts';
import { ChartPane } from './ScreenSplitManager';

export type IndicatorType = 'RSI' | 'MACD' | 'CCI' | 'ADX' | 'EMA' | 'BB' | 'VWAP' | 'SMA';

export interface IndicatorConfig {
  id: IndicatorType;
  name: string;
  description: string;
  category: 'overlay' | 'oscillator';
  defaultParams: Record<string, number>;
  paramLabels: Record<string, string>;
  outputs: string[];
  colors: Record<string, string>;
}

export interface IndicatorInstance {
  key: string;
  type: IndicatorType;
  params: Record<string, number>;
  paneId: string;
  series: Record<string, ISeriesApi<'Line'> | ISeriesApi<'Histogram'>>;
  priceLines: PriceLineOptions[];
}

export const INDICATOR_CONFIGS: Record<IndicatorType, IndicatorConfig> = {
  RSI: {
    id: 'RSI',
    name: 'RSI',
    description: 'Relative Strength Index',
    category: 'oscillator',
    defaultParams: { length: 14 },
    paramLabels: { length: 'Period' },
    outputs: ['rsi'],
    colors: { rsi: '#6a5acd' }
  },
  MACD: {
    id: 'MACD',
    name: 'MACD',
    description: 'Moving Average Convergence Divergence',
    category: 'oscillator',
    defaultParams: { fast: 12, slow: 26, signal: 9 },
    paramLabels: { fast: 'Fast', slow: 'Slow', signal: 'Signal' },
    outputs: ['macd', 'signal', 'hist'],
    colors: { macd: '#2962ff', signal: '#ff6d00', hist: '#26a69a' }
  },
  CCI: {
    id: 'CCI',
    name: 'CCI',
    description: 'Commodity Channel Index',
    category: 'oscillator',
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    outputs: ['cci'],
    colors: { cci: '#8e24aa' }
  },
  ADX: {
    id: 'ADX',
    name: 'ADX',
    description: 'Average Directional Index',
    category: 'oscillator',
    defaultParams: { length: 14 },
    paramLabels: { length: 'Period' },
    outputs: ['adx'],
    colors: { adx: '#ff5722' }
  },
  EMA: {
    id: 'EMA',
    name: 'EMA',
    description: 'Exponential Moving Average',
    category: 'overlay',
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    outputs: ['ema'],
    colors: { ema: '#1e88e5' }
  },
  BB: {
    id: 'BB',
    name: 'Bollinger Bands',
    description: 'Bollinger Bands',
    category: 'overlay',
    defaultParams: { length: 20, mult: 2 },
    paramLabels: { length: 'Period', mult: 'Multiplier' },
    outputs: ['basis', 'upper', 'lower'],
    colors: { basis: '#2962ff', upper: '#ff6d00', lower: '#ff6d00' }
  },
  VWAP: {
    id: 'VWAP',
    name: 'VWAP',
    description: 'Volume Weighted Average Price',
    category: 'overlay',
    defaultParams: {},
    paramLabels: {},
    outputs: ['vwap'],
    colors: { vwap: '#9c27b0' }
  },
  SMA: {
    id: 'SMA',
    name: 'SMA',
    description: 'Simple Moving Average',
    category: 'overlay',
    defaultParams: { length: 50 },
    paramLabels: { length: 'Period' },
    outputs: ['sma'],
    colors: { sma: '#8e24aa' }
  }
};

export class IndicatorSystem {
  private indicators: Map<string, IndicatorInstance> = new Map();
  private paneManager: Map<string, ChartPane> = new Map();

  constructor(paneManager: Map<string, ChartPane>) {
    this.paneManager = paneManager;
  }

  addIndicator(paneId: string, type: IndicatorType, params: Record<string, number>): IndicatorInstance {
    const config = INDICATOR_CONFIGS[type];
    const key = `${type}(${Object.values(params).join(',')})`;
    
    const pane = this.paneManager.get(paneId);
    if (!pane) {
      throw new Error(`Pane ${paneId} not found`);
    }

    const instance: IndicatorInstance = {
      key,
      type,
      params,
      paneId,
      series: {},
      priceLines: []
    };

    if (config.category === 'overlay') {
      // Add overlay indicators to the main chart
      this.createOverlayIndicator(pane, instance, config);
    } else {
      // Create sub-pane for oscillator indicators
      this.createOscillatorIndicator(pane, instance, config);
    }

    this.indicators.set(key, instance);
    console.log(`✅ Added ${type} indicator to pane ${paneId}`);
    return instance;
  }

  private createOverlayIndicator(pane: ChartPane, instance: IndicatorInstance, config: IndicatorConfig): void {
    config.outputs.forEach(output => {
      const series = pane.chart.addSeries(LineSeries, {
        color: config.colors[output],
        lineWidth: 2,
        priceScaleId: 'right', // Use main price scale
      });
      instance.series[output] = series;
    });

    // Add level lines for specific indicators
    if (instance.type === 'BB') {
      // Bollinger Bands don't need level lines
    } else if (instance.type === 'VWAP') {
      // VWAP doesn't need level lines
    }
  }

  private createOscillatorIndicator(pane: ChartPane, instance: IndicatorInstance, config: IndicatorConfig): void {
    // Create sub-pane for oscillator
    const subPaneContainer = document.createElement('div');
    subPaneContainer.className = 'indicator-sub-pane';
    subPaneContainer.style.cssText = `
      width: 100%;
      height: 200px;
      border-top: 1px solid #e5e7eb;
      position: relative;
    `;
    
    // Insert sub-pane after the main pane
    pane.container.parentNode?.insertBefore(subPaneContainer, pane.container.nextSibling);

    const subChart = pane.chart; // For now, we'll use the same chart but with different price scale
    const priceScaleId = `${instance.type.toLowerCase()}-scale`;

    config.outputs.forEach(output => {
      let series: ISeriesApi<'Line'> | ISeriesApi<'Histogram'>;
      
      if (output === 'hist') {
        // MACD histogram
        series = subChart.addSeries(HistogramSeries, {
          color: config.colors[output],
          priceFormat: { type: 'volume' },
          priceScaleId: priceScaleId,
        });
      } else {
        // Line series
        series = subChart.addSeries(LineSeries, {
          color: config.colors[output],
          lineWidth: 2,
          priceScaleId: priceScaleId,
        });
      }
      
      instance.series[output] = series;
    });

    // Configure price scale for oscillator
    subChart.priceScale(priceScaleId).applyOptions({
      autoScale: instance.type === 'RSI' ? false : true,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    // Add level lines
    this.addLevelLines(subChart, instance, priceScaleId);
  }

  private addLevelLines(chart: IChartApi, instance: IndicatorInstance, priceScaleId: string): void {
    const levelLines: Record<string, number[]> = {
      'RSI': [70, 30],
      'CCI': [100, -100],
      'ADX': [25, 50],
      'MACD': [0]
    };

    const levels = levelLines[instance.type];
    if (levels) {
      levels.forEach(level => {
        const priceLine: PriceLineOptions = {
          price: level,
          color: '#666666',
          lineStyle: LineStyle.Dashed,
          lineWidth: 1,
          axisLabelVisible: true,
          title: level.toString(),
        };
        
        chart.priceScale(priceScaleId).createPriceLine(priceLine);
        instance.priceLines.push(priceLine);
      });
    }
  }

  removeIndicator(key: string): void {
    const indicator = this.indicators.get(key);
    if (!indicator) return;

    // Remove series
    Object.values(indicator.series).forEach(series => {
      if (series && typeof series.remove === 'function') {
        series.remove();
      }
    });

    // Remove price lines
    indicator.priceLines.forEach(priceLine => {
      // Note: Lightweight Charts doesn't have a direct way to remove price lines
      // They will be removed when the chart is destroyed
    });

    this.indicators.delete(key);
    console.log(`🗑️ Removed indicator ${key}`);
  }

  updateIndicatorData(key: string, data: Array<Record<string, number>>): void {
    const indicator = this.indicators.get(key);
    if (!indicator) return;

    Object.entries(indicator.series).forEach(([output, series]) => {
      if (series && typeof series.setData === 'function') {
        const seriesData = data
          .map(point => ({
            time: point.t as any,
            value: point[output] || 0,
          }))
          .filter(item => item.value !== null && item.value !== undefined && !isNaN(item.value));
        
        series.setData(seriesData);
      }
    });
  }

  updateIndicatorPoint(key: string, point: Record<string, number>): void {
    const indicator = this.indicators.get(key);
    if (!indicator) return;

    Object.entries(indicator.series).forEach(([output, series]) => {
      if (series && typeof series.update === 'function') {
        const value = point[output];
        if (value !== undefined) {
          series.update({
            time: point.t as any,
            value: value,
          });
        }
      }
    });
  }

  getIndicator(key: string): IndicatorInstance | undefined {
    return this.indicators.get(key);
  }

  getAllIndicators(): IndicatorInstance[] {
    return Array.from(this.indicators.values());
  }

  getIndicatorsByPane(paneId: string): IndicatorInstance[] {
    return Array.from(this.indicators.values())
      .filter(ind => ind.paneId === paneId);
  }

  clear(): void {
    this.indicators.forEach((_, key) => {
      this.removeIndicator(key);
    });
  }
}



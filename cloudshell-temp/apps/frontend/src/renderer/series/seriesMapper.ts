import { 
  IChartApi, 
  ISeriesApi, 
  CandlestickSeries, 
  LineSeries, 
  HistogramSeries, 
  AreaSeries,
  CandlestickData,
  LineData,
  HistogramData,
  AreaData,
  Time,
  ColorType,
  LineStyle
} from 'lightweight-charts';
import { PaneInstance } from '../panes/paneTypes';
import { SeriesConfig } from '../panes/paneTypes';
import { Candle } from '../../contracts/candle';
import { IndicatorPoint } from '../../contracts/indicator';

/**
 * Series mapper for creating and managing chart series
 */
export class SeriesMapper {
  private panes: Map<string, PaneInstance> = new Map();

  /**
   * Register a pane for series management
   */
  registerPane(pane: PaneInstance): void {
    this.panes.set(pane.id, pane);
  }

  /**
   * Unregister a pane
   */
  unregisterPane(paneId: string): void {
    this.panes.delete(paneId);
  }

  /**
   * Create a candlestick series
   */
  createCandlestickSeries(paneId: string, config: SeriesConfig): ISeriesApi<'Candlestick'> {
    const pane = this.panes.get(paneId);
    if (!pane) {
      throw new Error(`Pane with id '${paneId}' not found`);
    }

    const series = pane.chart.addCandlestickSeries({
      upColor: config.color,
      downColor: this.getDownColor(config.color),
      borderVisible: false,
      wickUpColor: config.color,
      wickDownColor: this.getDownColor(config.color),
    });

    pane.series.set(config.id, series);
    return series;
  }

  /**
   * Create a line series
   */
  createLineSeries(paneId: string, config: SeriesConfig): ISeriesApi<'Line'> {
    const pane = this.panes.get(paneId);
    if (!pane) {
      throw new Error(`Pane with id '${paneId}' not found`);
    }

    const series = pane.chart.addLineSeries({
      color: config.color,
      lineWidth: config.lineWidth || 2,
      lineStyle: LineStyle.Solid,
    });

    pane.series.set(config.id, series);
    return series;
  }

  /**
   * Create a histogram series
   */
  createHistogramSeries(paneId: string, config: SeriesConfig): ISeriesApi<'Histogram'> {
    const pane = this.panes.get(paneId);
    if (!pane) {
      throw new Error(`Pane with id '${paneId}' not found`);
    }

    const series = pane.chart.addHistogramSeries({
      color: config.color,
    });

    pane.series.set(config.id, series);
    return series;
  }

  /**
   * Create an area series
   */
  createAreaSeries(paneId: string, config: SeriesConfig): ISeriesApi<'Area'> {
    const pane = this.panes.get(paneId);
    if (!pane) {
      throw new Error(`Pane with id '${paneId}' not found`);
    }

    const series = pane.chart.addAreaSeries({
      topColor: this.getTransparentColor(config.color, 0.3),
      bottomColor: this.getTransparentColor(config.color, 0.1),
      lineColor: config.color,
      lineWidth: config.lineWidth || 2,
    });

    pane.series.set(config.id, series);
    return series;
  }

  /**
   * Create a series based on type
   */
  createSeries(paneId: string, config: SeriesConfig): ISeriesApi<any> {
    switch (config.type) {
      case 'candlestick':
        return this.createCandlestickSeries(paneId, config);
      case 'line':
        return this.createLineSeries(paneId, config);
      case 'histogram':
        return this.createHistogramSeries(paneId, config);
      case 'area':
        return this.createAreaSeries(paneId, config);
      default:
        throw new Error(`Unsupported series type: ${config.type}`);
    }
  }

  /**
   * Remove a series
   */
  removeSeries(paneId: string, seriesId: string): void {
    const pane = this.panes.get(paneId);
    if (!pane) {
      throw new Error(`Pane with id '${paneId}' not found`);
    }

    const series = pane.series.get(seriesId);
    if (series) {
      pane.chart.removeSeries(series);
      pane.series.delete(seriesId);
    }
  }

  /**
   * Get a series
   */
  getSeries(paneId: string, seriesId: string): ISeriesApi<any> | undefined {
    const pane = this.panes.get(paneId);
    if (!pane) {
      return undefined;
    }
    return pane.series.get(seriesId);
  }

  /**
   * Update candlestick data
   */
  updateCandlestickData(paneId: string, seriesId: string, data: Candle[]): void {
    const series = this.getSeries(paneId, seriesId);
    if (!series) {
      throw new Error(`Series '${seriesId}' not found in pane '${paneId}'`);
    }

    const chartData: CandlestickData[] = data.map(candle => ({
      time: candle.t as Time,
      open: candle.o,
      high: candle.h,
      low: candle.l,
      close: candle.c,
    }));

    series.setData(chartData);
  }

  /**
   * Update line data
   */
  updateLineData(paneId: string, seriesId: string, data: Array<{ time: number; value: number }>): void {
    const series = this.getSeries(paneId, seriesId);
    if (!series) {
      throw new Error(`Series '${seriesId}' not found in pane '${paneId}'`);
    }

    const chartData: LineData[] = data.map(point => ({
      time: point.time as Time,
      value: point.value,
    }));

    series.setData(chartData);
  }

  /**
   * Update histogram data
   */
  updateHistogramData(paneId: string, seriesId: string, data: Array<{ time: number; value: number; color?: string }>): void {
    const series = this.getSeries(paneId, seriesId);
    if (!series) {
      throw new Error(`Series '${seriesId}' not found in pane '${paneId}'`);
    }

    const chartData: HistogramData[] = data.map(point => ({
      time: point.time as Time,
      value: point.value,
      color: point.color,
    }));

    series.setData(chartData);
  }

  /**
   * Update area data
   */
  updateAreaData(paneId: string, seriesId: string, data: Array<{ time: number; value: number }>): void {
    const series = this.getSeries(paneId, seriesId);
    if (!series) {
      throw new Error(`Series '${seriesId}' not found in pane '${paneId}'`);
    }

    const chartData: AreaData[] = data.map(point => ({
      time: point.time as Time,
      value: point.value,
    }));

    series.setData(chartData);
  }

  /**
   * Update indicator data
   */
  updateIndicatorData(
    paneId: string, 
    seriesId: string, 
    data: IndicatorPoint[], 
    outputKey: string
  ): void {
    const series = this.getSeries(paneId, seriesId);
    if (!series) {
      throw new Error(`Series '${seriesId}' not found in pane '${paneId}'`);
    }

    const chartData = data
      .filter(point => point.values[outputKey] !== null && point.values[outputKey] !== undefined)
      .map(point => ({
        time: point.t as Time,
        value: point.values[outputKey] as number,
      }));

    series.setData(chartData);
  }

  /**
   * Add a single data point to a series
   */
  addDataPoint(paneId: string, seriesId: string, time: number, value: number): void {
    const series = this.getSeries(paneId, seriesId);
    if (!series) {
      throw new Error(`Series '${seriesId}' not found in pane '${paneId}'`);
    }

    series.update({
      time: time as Time,
      value: value,
    });
  }

  /**
   * Get series statistics
   */
  getSeriesStats(): {
    totalSeries: number;
    seriesByPane: Record<string, number>;
    seriesByType: Record<string, number>;
  } {
    const seriesByPane: Record<string, number> = {};
    const seriesByType: Record<string, number> = {};

    this.panes.forEach(pane => {
      seriesByPane[pane.id] = pane.series.size;
      pane.series.forEach((series, seriesId) => {
        // Determine series type from seriesId or series properties
        const type = this.getSeriesType(series);
        seriesByType[type] = (seriesByType[type] || 0) + 1;
      });
    });

    const totalSeries = Object.values(seriesByPane).reduce((sum, count) => sum + count, 0);

    return {
      totalSeries,
      seriesByPane,
      seriesByType,
    };
  }

  /**
   * Get series type from series instance
   */
  private getSeriesType(series: ISeriesApi<any>): string {
    // This is a simplified approach - in practice, you might want to store type info
    if (series.seriesType() === 'Candlestick') return 'candlestick';
    if (series.seriesType() === 'Line') return 'line';
    if (series.seriesType() === 'Histogram') return 'histogram';
    if (series.seriesType() === 'Area') return 'area';
    return 'unknown';
  }

  /**
   * Get down color for candlestick series
   */
  private getDownColor(upColor: string): string {
    // Simple color inversion - in practice, you might want more sophisticated logic
    return upColor === '#26a69a' ? '#ef5350' : '#ff5722';
  }

  /**
   * Get transparent color
   */
  private getTransparentColor(color: string, alpha: number): string {
    // Simple hex to rgba conversion - in practice, you might want a more robust solution
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

/**
 * Create a series mapper instance
 */
export const createSeriesMapper = (): SeriesMapper => {
  return new SeriesMapper();
};

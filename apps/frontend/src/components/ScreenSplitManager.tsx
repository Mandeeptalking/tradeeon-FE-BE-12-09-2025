import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts';

export type SplitLayout = 'single' | 'split-2' | 'split-4';

export interface ChartPane {
  id: string;
  chart: IChartApi;
  container: HTMLDivElement;
  series: ISeriesApi<'Candlestick'> | null;
  symbol: string;
  interval: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'full';
}

interface ScreenSplitManagerProps {
  container: HTMLDivElement;
}

export class ScreenSplitManager {
  private panes: Map<string, ChartPane> = new Map();
  private container: HTMLDivElement;
  private currentLayout: SplitLayout = 'single';
  private timeSyncEnabled = true;

  constructor(container: HTMLDivElement) {
    this.container = container;
  }

  setLayout(layout: SplitLayout): void {
    this.currentLayout = layout;
    this.clearAllPanes();
    this.createLayoutPanes();
  }

  private createLayoutPanes(): void {
    switch (this.currentLayout) {
      case 'single':
        this.createSinglePane();
        break;
      case 'split-2':
        this.createSplit2Panes();
        break;
      case 'split-4':
        this.createSplit4Panes();
        break;
    }
  }

  private createSinglePane(): void {
    const paneContainer = document.createElement('div');
    paneContainer.className = 'chart-pane single';
    paneContainer.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
    `;
    
    this.container.appendChild(paneContainer);

    const chart = this.createChart(paneContainer);
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const pane: ChartPane = {
      id: 'main',
      chart,
      container: paneContainer,
      series: candlestickSeries,
      symbol: 'BTCUSDT',
      interval: '1m',
      position: 'full',
    };

    this.panes.set('main', pane);
    this.setupTimeSync(pane);
  }

  private createSplit2Panes(): void {
    // Top pane
    const topContainer = document.createElement('div');
    topContainer.className = 'chart-pane split-2-top';
    topContainer.style.cssText = `
      width: 100%;
      height: 50%;
      border-bottom: 1px solid #e5e7eb;
      position: relative;
    `;
    this.container.appendChild(topContainer);

    const topChart = this.createChart(topContainer);
    const topSeries = topChart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const topPane: ChartPane = {
      id: 'top',
      chart: topChart,
      container: topContainer,
      series: topSeries,
      symbol: 'BTCUSDT',
      interval: '1m',
      position: 'top-left',
    };

    // Bottom pane
    const bottomContainer = document.createElement('div');
    bottomContainer.className = 'chart-pane split-2-bottom';
    bottomContainer.style.cssText = `
      width: 100%;
      height: 50%;
      position: relative;
    `;
    this.container.appendChild(bottomContainer);

    const bottomChart = this.createChart(bottomContainer);
    const bottomSeries = bottomChart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const bottomPane: ChartPane = {
      id: 'bottom',
      chart: bottomChart,
      container: bottomContainer,
      series: bottomSeries,
      symbol: 'ETHUSDT',
      interval: '1m',
      position: 'bottom-left',
    };

    this.panes.set('top', topPane);
    this.panes.set('bottom', bottomPane);
    
    this.setupTimeSync(topPane);
    this.setupTimeSync(bottomPane);
  }

  private createSplit4Panes(): void {
    const positions = [
      { id: 'top-left', style: 'width: 50%; height: 50%; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; position: relative;' },
      { id: 'top-right', style: 'width: 50%; height: 50%; border-bottom: 1px solid #e5e7eb; position: relative;' },
      { id: 'bottom-left', style: 'width: 50%; height: 50%; border-right: 1px solid #e5e7eb; position: relative;' },
      { id: 'bottom-right', style: 'width: 50%; height: 50%; position: relative;' },
    ];

    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT'];

    positions.forEach((pos, index) => {
      const container = document.createElement('div');
      container.className = `chart-pane split-4-${pos.id}`;
      container.style.cssText = pos.style;
      this.container.appendChild(container);

      const chart = this.createChart(container);
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      const pane: ChartPane = {
        id: pos.id,
        chart,
        container,
        series,
        symbol: symbols[index],
        interval: '1m',
        position: pos.id as any,
      };

      this.panes.set(pos.id, pane);
      this.setupTimeSync(pane);
    });
  }

  private createChart(container: HTMLDivElement): IChartApi {
    return createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#1f2937',
      },
      grid: {
        vertLines: { color: '#e5e7eb' },
        horzLines: { color: '#e5e7eb' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#d1d5db',
      },
      timeScale: {
        borderColor: '#d1d5db',
        timeVisible: true,
        secondsVisible: false,
      },
    });
  }

  private setupTimeSync(pane: ChartPane): void {
    pane.chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
      if (!this.timeSyncEnabled || !logicalRange) return;

      this.panes.forEach(otherPane => {
        if (otherPane.id !== pane.id) {
          try {
            otherPane.chart.timeScale().setVisibleLogicalRange(logicalRange);
          } catch (error) {
            console.warn('Failed to sync time range to pane:', otherPane.id, error);
          }
        }
      });
    });
  }

  getPane(paneId: string): ChartPane | undefined {
    return this.panes.get(paneId);
  }

  getAllPanes(): ChartPane[] {
    return Array.from(this.panes.values());
  }

  getLayout(): SplitLayout {
    return this.currentLayout;
  }

  updatePaneSymbol(paneId: string, symbol: string, interval: string): void {
    const pane = this.panes.get(paneId);
    if (pane) {
      pane.symbol = symbol;
      pane.interval = interval;
    }
  }

  resize(): void {
    this.panes.forEach(pane => {
      if (pane.container && pane.chart) {
        pane.chart.applyOptions({
          width: pane.container.clientWidth,
          height: pane.container.clientHeight,
        });
      }
    });
  }

  private clearAllPanes(): void {
    this.panes.forEach(pane => {
      pane.chart.remove();
      pane.container.remove();
    });
    this.panes.clear();
  }

  destroy(): void {
    this.clearAllPanes();
  }
}

// React Hook for using ScreenSplitManager
export const useScreenSplitManager = (containerRef: React.RefObject<HTMLDivElement>) => {
  const [splitManager, setSplitManager] = useState<ScreenSplitManager | null>(null);
  const [currentLayout, setCurrentLayout] = useState<SplitLayout>('single');
  const [panes, setPanes] = useState<ChartPane[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const manager = new ScreenSplitManager(containerRef.current);
    setSplitManager(manager);
    setPanes(manager.getAllPanes());

    // Handle resize
    const handleResize = () => {
      manager.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      manager.destroy();
    };
  }, [containerRef]);

  const setLayout = (layout: SplitLayout) => {
    if (!splitManager) return;
    
    splitManager.setLayout(layout);
    setCurrentLayout(layout);
    setPanes(splitManager.getAllPanes());
  };

  const updatePaneSymbol = (paneId: string, symbol: string, interval: string) => {
    if (!splitManager) return;
    
    splitManager.updatePaneSymbol(paneId, symbol, interval);
    setPanes(splitManager.getAllPanes());
  };

  const getPane = (paneId: string) => {
    return splitManager?.getPane(paneId);
  };

  return {
    splitManager,
    currentLayout,
    panes,
    setLayout,
    updatePaneSymbol,
    getPane,
  };
};



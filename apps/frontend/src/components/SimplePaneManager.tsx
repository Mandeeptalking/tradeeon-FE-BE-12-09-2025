import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts';

export interface ChartPane {
  id: string;
  chart: IChartApi;
  container: HTMLDivElement;
  series: ISeriesApi<'Candlestick'> | null;
  symbol: string;
  interval: string;
}

interface SimplePaneManagerProps {
  container: HTMLDivElement;
  defaultPaneHeight?: number;
}

export class SimplePaneManager {
  private panes: Map<string, ChartPane> = new Map();
  private container: HTMLDivElement;
  private defaultPaneHeight: number;
  private paneCounter = 0;
  private timeSyncEnabled = true;

  constructor(container: HTMLDivElement, defaultPaneHeight: number = 300) {
    this.container = container;
    this.defaultPaneHeight = defaultPaneHeight;
  }

  createPane(symbol: string, interval: string): ChartPane {
    const paneId = `pane-${++this.paneCounter}`;
    
    const paneContainer = document.createElement('div');
    paneContainer.className = 'chart-pane';
    paneContainer.style.cssText = `
      width: 100%;
      height: ${this.defaultPaneHeight}px;
      border-bottom: 1px solid #e5e7eb;
      position: relative;
    `;
    
    this.container.appendChild(paneContainer);

    const chart = createChart(paneContainer, {
      width: paneContainer.clientWidth,
      height: paneContainer.clientHeight,
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

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const pane: ChartPane = {
      id: paneId,
      chart,
      container: paneContainer,
      series: candlestickSeries,
      symbol,
      interval,
    };

    this.panes.set(paneId, pane);

    // Setup time synchronization
    this.setupTimeSync(pane);

    console.log(`✅ Created pane ${paneId} for ${symbol} ${interval}`);
    return pane;
  }

  getPane(paneId: string): ChartPane | undefined {
    return this.panes.get(paneId);
  }

  getAllPanes(): ChartPane[] {
    return Array.from(this.panes.values());
  }

  removePane(paneId: string): void {
    const pane = this.panes.get(paneId);
    if (!pane) return;

    // Remove chart
    pane.chart.remove();
    
    // Remove container
    pane.container.remove();
    
    // Remove from map
    this.panes.delete(paneId);
    
    console.log(`🗑️ Removed pane ${paneId}`);
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

  private setupTimeSync(pane: ChartPane): void {
    // Subscribe to time scale changes
    pane.chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
      if (!this.timeSyncEnabled || !logicalRange) return;

      // Sync all other panes
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

  enableTimeSync(): void {
    this.timeSyncEnabled = true;
  }

  disableTimeSync(): void {
    this.timeSyncEnabled = false;
  }

  destroy(): void {
    this.panes.forEach(pane => {
      pane.chart.remove();
      pane.container.remove();
    });
    this.panes.clear();
  }
}

// React Hook for using SimplePaneManager
export const useSimplePaneManager = (containerRef: React.RefObject<HTMLDivElement>) => {
  const [paneManager, setPaneManager] = useState<SimplePaneManager | null>(null);
  const [panes, setPanes] = useState<ChartPane[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const manager = new SimplePaneManager(containerRef.current);
    setPaneManager(manager);

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

  const createPane = (symbol: string, interval: string) => {
    if (!paneManager) return null;
    
    const pane = paneManager.createPane(symbol, interval);
    setPanes(prev => [...prev, pane]);
    return pane;
  };

  const removePane = (paneId: string) => {
    if (!paneManager) return;
    
    paneManager.removePane(paneId);
    setPanes(prev => prev.filter(p => p.id !== paneId));
  };

  const getPane = (paneId: string) => {
    return paneManager?.getPane(paneId);
  };

  return {
    paneManager,
    panes,
    createPane,
    removePane,
    getPane,
  };
};



import { createChart, IChartApi, ColorType, LineStyle } from 'lightweight-charts';
import { PaneType, PaneConfig, PaneInstance, CrosshairSyncConfig, AutoscaleConfig } from './paneTypes';

/**
 * Pane manager for creating and managing chart panes
 */
export class PaneManager {
  private panes: Map<string, PaneInstance> = new Map();
  private mainPane: PaneInstance | null = null;
  private crosshairSyncConfig: CrosshairSyncConfig;
  private autoscaleConfig: AutoscaleConfig;
  private container: HTMLElement;
  private paneOrder: string[] = [];

  constructor(
    container: HTMLElement,
    crosshairSyncConfig: CrosshairSyncConfig,
    autoscaleConfig: AutoscaleConfig
  ) {
    this.container = container;
    this.crosshairSyncConfig = crosshairSyncConfig;
    this.autoscaleConfig = autoscaleConfig;
  }

  /**
   * Create a new pane
   */
  createPane(config: PaneConfig): PaneInstance {
    if (this.panes.has(config.id)) {
      throw new Error(`Pane with id '${config.id}' already exists`);
    }

    // Create container element
    const paneContainer = document.createElement('div');
    paneContainer.id = `pane-${config.id}`;
    paneContainer.style.width = '100%';
    paneContainer.style.height = `${config.height}px`;
    paneContainer.style.position = 'relative';
    paneContainer.style.borderBottom = '1px solid #e5e7eb';

    // Add to main container
    this.container.appendChild(paneContainer);

    // Create chart
    const chart = createChart(paneContainer, {
      width: paneContainer.clientWidth,
      height: config.height,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#1f2937',
      },
      grid: {
        vertLines: { color: '#e5e7eb' },
        horzLines: { color: '#e5e7eb' },
      },
      crosshair: {
        mode: this.crosshairSyncConfig.enabled ? 1 : 0,
      },
      rightPriceScale: {
        borderColor: '#d1d5db',
        autoScale: this.autoscaleConfig.enabled,
        scaleMargins: this.autoscaleConfig.padding,
      },
      timeScale: {
        borderColor: '#d1d5db',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Create pane instance
    const pane: PaneInstance = {
      id: config.id,
      type: config.type,
      chart,
      container: paneContainer,
      series: new Map(),
      config,
    };

    // Store pane
    this.panes.set(config.id, pane);

    // Set as main pane if it's the first price pane
    if (config.type === 'price' && !this.mainPane) {
      this.mainPane = pane;
    }

    // Add to order
    this.paneOrder.push(config.id);
    this.updatePaneOrder();

    // Setup crosshair sync if enabled
    if (this.crosshairSyncConfig.enabled && this.mainPane) {
      this.setupCrosshairSync(pane);
    }

    return pane;
  }

  /**
   * Remove a pane
   */
  removePane(paneId: string): void {
    const pane = this.panes.get(paneId);
    if (!pane) {
      throw new Error(`Pane with id '${paneId}' not found`);
    }

    // Remove from order
    const orderIndex = this.paneOrder.indexOf(paneId);
    if (orderIndex > -1) {
      this.paneOrder.splice(orderIndex, 1);
    }

    // Remove from container
    this.container.removeChild(pane.container);

    // Remove from map
    this.panes.delete(paneId);

    // Update main pane if needed
    if (this.mainPane?.id === paneId) {
      this.mainPane = this.findMainPane();
    }
  }

  /**
   * Get a pane by ID
   */
  getPane(paneId: string): PaneInstance | undefined {
    return this.panes.get(paneId);
  }

  /**
   * Get all panes
   */
  getAllPanes(): PaneInstance[] {
    return Array.from(this.panes.values());
  }

  /**
   * Get panes by type
   */
  getPanesByType(type: PaneType): PaneInstance[] {
    return Array.from(this.panes.values()).filter(pane => pane.type === type);
  }

  /**
   * Get the main price pane
   */
  getMainPane(): PaneInstance | null {
    return this.mainPane;
  }

  /**
   * Resize all panes
   */
  resizePanes(): void {
    this.panes.forEach(pane => {
      const container = pane.container;
      pane.chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    });
  }

  /**
   * Update pane order
   */
  updatePaneOrder(): void {
    // Sort panes by order
    this.paneOrder.sort((a, b) => {
      const paneA = this.panes.get(a);
      const paneB = this.panes.get(b);
      if (!paneA || !paneB) return 0;
      return paneA.config.order - paneB.config.order;
    });

    // Reorder DOM elements
    this.paneOrder.forEach(paneId => {
      const pane = this.panes.get(paneId);
      if (pane) {
        this.container.appendChild(pane.container);
      }
    });
  }

  /**
   * Setup crosshair sync between panes
   */
  private setupCrosshairSync(pane: PaneInstance): void {
    if (!this.mainPane || pane.id === this.mainPane.id) {
      return;
    }

    // Subscribe to main pane time scale changes
    this.mainPane.chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
      if (logicalRange) {
        pane.chart.timeScale().setVisibleLogicalRange(logicalRange);
      }
    });

    // Subscribe to main pane crosshair moves
    this.mainPane.chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        pane.chart.setCrosshairPosition(param.logical, param.seriesData);
      } else {
        pane.chart.clearCrosshairPosition();
      }
    });
  }

  /**
   * Find the main price pane
   */
  private findMainPane(): PaneInstance | null {
    const pricePanes = this.getPanesByType('price');
    return pricePanes.length > 0 ? pricePanes[0] : null;
  }

  /**
   * Get pane statistics
   */
  getStats(): {
    totalPanes: number;
    paneTypes: Record<PaneType, number>;
    totalSeries: number;
  } {
    const paneTypes: Record<PaneType, number> = {
      price: 0,
      oscillator: 0,
      volume: 0,
    };

    let totalSeries = 0;
    this.panes.forEach(pane => {
      paneTypes[pane.type]++;
      totalSeries += pane.series.size;
    });

    return {
      totalPanes: this.panes.size,
      paneTypes,
      totalSeries,
    };
  }

  /**
   * Clear all panes
   */
  clearAllPanes(): void {
    this.panes.forEach(pane => {
      this.container.removeChild(pane.container);
    });
    this.panes.clear();
    this.paneOrder = [];
    this.mainPane = null;
  }

  /**
   * Destroy the pane manager
   */
  destroy(): void {
    this.clearAllPanes();
  }
}

/**
 * Create a pane manager instance
 */
export const createPaneManager = (
  container: HTMLElement,
  crosshairSyncConfig: CrosshairSyncConfig,
  autoscaleConfig: AutoscaleConfig
): PaneManager => {
  return new PaneManager(container, crosshairSyncConfig, autoscaleConfig);
};


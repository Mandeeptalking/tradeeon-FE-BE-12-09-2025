import { IChartApi } from 'lightweight-charts';
import { PaneInstance } from '../panes/paneTypes';
import { CrosshairSyncConfig } from '../panes/paneTypes';

/**
 * Crosshair sync manager for synchronizing crosshairs across panes
 */
export class CrosshairSync {
  private panes: Map<string, PaneInstance> = new Map();
  private mainPane: PaneInstance | null = null;
  private config: CrosshairSyncConfig;
  private isEnabled = false;

  constructor(config: CrosshairSyncConfig) {
    this.config = config;
    this.isEnabled = config.enabled;
  }

  /**
   * Register a pane for crosshair sync
   */
  registerPane(pane: PaneInstance): void {
    this.panes.set(pane.id, pane);

    // Set as main pane if it's the first price pane
    if (pane.type === 'price' && !this.mainPane) {
      this.mainPane = pane;
      this.setupMainPaneCrosshair();
    } else if (this.mainPane && this.isEnabled) {
      this.setupPaneCrosshair(pane);
    }
  }

  /**
   * Unregister a pane
   */
  unregisterPane(paneId: string): void {
    this.panes.delete(paneId);

    // Update main pane if needed
    if (this.mainPane?.id === paneId) {
      this.mainPane = this.findMainPane();
      if (this.mainPane) {
        this.setupMainPaneCrosshair();
      }
    }
  }

  /**
   * Enable crosshair sync
   */
  enable(): void {
    this.isEnabled = true;
    this.setupAllPaneCrosshairs();
  }

  /**
   * Disable crosshair sync
   */
  disable(): void {
    this.isEnabled = false;
    this.clearAllCrosshairs();
  }

  /**
   * Update crosshair sync configuration
   */
  updateConfig(config: CrosshairSyncConfig): void {
    this.config = config;
    this.isEnabled = config.enabled;

    if (this.isEnabled) {
      this.setupAllPaneCrosshairs();
    } else {
      this.clearAllCrosshairs();
    }
  }

  /**
   * Setup crosshair sync for all panes
   */
  private setupAllPaneCrosshairs(): void {
    if (!this.isEnabled || !this.mainPane) {
      return;
    }

    this.panes.forEach(pane => {
      if (pane.id !== this.mainPane!.id) {
        this.setupPaneCrosshair(pane);
      }
    });
  }

  /**
   * Setup crosshair sync for a specific pane
   */
  private setupPaneCrosshair(pane: PaneInstance): void {
    if (!this.mainPane || !this.isEnabled) {
      return;
    }

    // Sync time scale
    if (this.config.syncTime) {
      this.mainPane.chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
        if (logicalRange) {
          pane.chart.timeScale().setVisibleLogicalRange(logicalRange);
        }
      });
    }

    // Sync crosshair position
    this.mainPane.chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        pane.chart.setCrosshairPosition(param.logical, param.seriesData);
      } else {
        pane.chart.clearCrosshairPosition();
      }
    });
  }

  /**
   * Setup main pane crosshair
   */
  private setupMainPaneCrosshair(): void {
    if (!this.mainPane || !this.isEnabled) {
      return;
    }

    // Main pane doesn't need special setup, it's the source of crosshair events
    // But we can add any main pane specific crosshair configuration here
  }

  /**
   * Clear all crosshairs
   */
  private clearAllCrosshairs(): void {
    this.panes.forEach(pane => {
      pane.chart.clearCrosshairPosition();
    });
  }

  /**
   * Find the main price pane
   */
  private findMainPane(): PaneInstance | null {
    const pricePanes = Array.from(this.panes.values()).filter(pane => pane.type === 'price');
    return pricePanes.length > 0 ? pricePanes[0] : null;
  }

  /**
   * Get crosshair sync statistics
   */
  getStats(): {
    enabled: boolean;
    totalPanes: number;
    mainPane: string | null;
    syncTime: boolean;
    syncPrice: boolean;
  } {
    return {
      enabled: this.isEnabled,
      totalPanes: this.panes.size,
      mainPane: this.mainPane?.id || null,
      syncTime: this.config.syncTime,
      syncPrice: this.config.syncPrice,
    };
  }

  /**
   * Destroy the crosshair sync manager
   */
  destroy(): void {
    this.clearAllCrosshairs();
    this.panes.clear();
    this.mainPane = null;
  }
}

/**
 * Create a crosshair sync manager
 */
export const createCrosshairSync = (config: CrosshairSyncConfig): CrosshairSync => {
  return new CrosshairSync(config);
};


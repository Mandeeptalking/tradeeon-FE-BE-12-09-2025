import { IChartApi } from 'lightweight-charts';
import { PaneInstance } from '../panes/paneTypes';
import { AutoscaleConfig } from '../panes/paneTypes';

/**
 * Autoscale controller for managing price scale behavior
 */
export class AutoscaleController {
  private panes: Map<string, PaneInstance> = new Map();
  private config: AutoscaleConfig;
  private isEnabled = false;

  constructor(config: AutoscaleConfig) {
    this.config = config;
    this.isEnabled = config.enabled;
  }

  /**
   * Register a pane for autoscale control
   */
  registerPane(pane: PaneInstance): void {
    this.panes.set(pane.id, pane);
    this.applyAutoscaleToPane(pane);
  }

  /**
   * Unregister a pane
   */
  unregisterPane(paneId: string): void {
    this.panes.delete(paneId);
  }

  /**
   * Enable autoscale
   */
  enable(): void {
    this.isEnabled = true;
    this.applyAutoscaleToAllPanes();
  }

  /**
   * Disable autoscale
   */
  disable(): void {
    this.isEnabled = false;
    this.applyAutoscaleToAllPanes();
  }

  /**
   * Update autoscale configuration
   */
  updateConfig(config: AutoscaleConfig): void {
    this.config = config;
    this.isEnabled = config.enabled;
    this.applyAutoscaleToAllPanes();
  }

  /**
   * Apply autoscale to a specific pane
   */
  applyAutoscaleToPane(pane: PaneInstance): void {
    if (!this.isEnabled) {
      return;
    }

    const priceScale = pane.chart.priceScale('right');
    
    switch (this.config.mode) {
      case 'auto':
        priceScale.applyOptions({
          autoScale: true,
          scaleMargins: this.config.padding,
        });
        break;
      case 'fixed':
        if (this.config.range) {
          priceScale.applyOptions({
            autoScale: false,
            scaleMargins: this.config.padding,
            mode: 0, // Fixed scale mode
          });
          // Note: Setting fixed range would require additional API calls
        }
        break;
      case 'locked':
        priceScale.applyOptions({
          autoScale: false,
          scaleMargins: this.config.padding,
          mode: 1, // Locked scale mode
        });
        break;
    }
  }

  /**
   * Apply autoscale to all panes
   */
  private applyAutoscaleToAllPanes(): void {
    this.panes.forEach(pane => {
      this.applyAutoscaleToPane(pane);
    });
  }

  /**
   * Set fixed range for a specific pane
   */
  setFixedRange(paneId: string, min: number, max: number): void {
    const pane = this.panes.get(paneId);
    if (!pane) {
      throw new Error(`Pane with id '${paneId}' not found`);
    }

    const priceScale = pane.chart.priceScale('right');
    priceScale.applyOptions({
      autoScale: false,
      scaleMargins: this.config.padding,
      mode: 0, // Fixed scale mode
    });

    // Note: Setting exact min/max values would require additional API calls
    // This is a simplified implementation
  }

  /**
   * Reset autoscale for a specific pane
   */
  resetAutoscale(paneId: string): void {
    const pane = this.panes.get(paneId);
    if (!pane) {
      throw new Error(`Pane with id '${paneId}' not found`);
    }

    const priceScale = pane.chart.priceScale('right');
    priceScale.applyOptions({
      autoScale: true,
      scaleMargins: this.config.padding,
    });
  }

  /**
   * Reset autoscale for all panes
   */
  resetAllAutoscale(): void {
    this.panes.forEach(pane => {
      this.resetAutoscale(pane.id);
    });
  }

  /**
   * Get autoscale statistics
   */
  getStats(): {
    enabled: boolean;
    mode: string;
    totalPanes: number;
    padding: { top: number; bottom: number };
  } {
    return {
      enabled: this.isEnabled,
      mode: this.config.mode,
      totalPanes: this.panes.size,
      padding: this.config.padding,
    };
  }

  /**
   * Destroy the autoscale controller
   */
  destroy(): void {
    this.panes.clear();
  }
}

/**
 * Create an autoscale controller
 */
export const createAutoscaleController = (config: AutoscaleConfig): AutoscaleController => {
  return new AutoscaleController(config);
};


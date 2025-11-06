import { IndicatorSpec, IndicatorUpdate } from '../../contracts/indicator';
import { IndicatorBus } from '../bridge/indicatorBus';
import { SeriesState } from '../state/seriesState';
import { ComputeRegistry, ComputeState, IndicatorComputeAdapter } from './registry';

/**
 * Compute runner for managing indicator calculations
 */
export class ComputeRunner {
  private registry: ComputeRegistry;
  private indicatorBus: IndicatorBus;
  private seriesState: SeriesState;
  private computeStates = new Map<string, ComputeState>();
  private activeSpecs = new Map<string, IndicatorSpec>();
  
  constructor(registry: ComputeRegistry, indicatorBus: IndicatorBus, seriesState: SeriesState) {
    this.registry = registry;
    this.indicatorBus = indicatorBus;
    this.seriesState = seriesState;
  }
  
  /**
   * Initialize compute states for active indicators
   */
  private initializeComputeState(spec: IndicatorSpec): ComputeState {
    return {
      lastFinalizedIndex: -1,
      lastPartialValues: {},
      rollingSums: {},
      emaSeeds: {},
      rsiSmoothedGains: {},
      rsiSmoothedLosses: {},
      bbVarianceState: {}
    };
  }
  
  /**
   * Add indicator for computation
   */
  addIndicator(spec: IndicatorSpec): void {
    const adapter = this.registry.getAdapter(spec.name);
    if (!adapter) {
      throw new Error(`No adapter found for indicator: ${spec.name}`);
    }
    
    this.activeSpecs.set(spec.id, spec);
    this.computeStates.set(spec.id, this.initializeComputeState(spec));
    
    console.log(`📊 Added indicator for computation: ${spec.name} (${spec.id})`);
  }
  
  /**
   * Remove indicator from computation
   */
  removeIndicator(specId: string): void {
    this.activeSpecs.delete(specId);
    this.computeStates.delete(specId);
    console.log(`📊 Removed indicator from computation: ${specId}`);
  }
  
  /**
   * Get all active indicators
   */
  getActiveIndicators(): IndicatorSpec[] {
    return Array.from(this.activeSpecs.values());
  }
  
  /**
   * Compute indicators for historical data (batch mode)
   */
  async computeBatch(candles: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>): Promise<void> {
    if (this.activeSpecs.size === 0) {
      console.log('📊 No active indicators for batch computation');
      return;
    }
    
    console.log(`📊 Computing batch for ${this.activeSpecs.size} indicators over ${candles.length} candles`);
    
    const specs = Array.from(this.activeSpecs.values());
    const computeOrder = this.registry.getComputeOrder(specs);
    
    for (const spec of computeOrder) {
      const adapter = this.registry.getAdapter(spec.name);
      if (!adapter) {
        console.warn(`⚠️ No adapter found for ${spec.name}, skipping`);
        continue;
      }
      
      try {
        const startTime = performance.now();
        const points = adapter.batch(spec, candles);
        const computeTime = performance.now() - startTime;
        
        // Update compute state
        const state = this.computeStates.get(spec.id);
        if (state) {
          state.lastFinalizedIndex = candles.length - 1;
          if (points.length > 0) {
            const lastPoint = points[points.length - 1];
            state.lastPartialValues = { ...lastPoint.values };
          }
        }
        
        // Add to series state
        this.seriesState.addIndicatorPoints(spec.id, points);
        
        // Publish to indicator bus
        this.indicatorBus.publish({
          id: spec.id,
          points
        });
        
        console.log(`✅ Computed ${spec.name}: ${points.length} points in ${computeTime.toFixed(2)}ms`);
      } catch (error) {
        console.error(`❌ Error computing ${spec.name}:`, error);
      }
    }
  }
  
  /**
   * Compute incremental updates for live data
   */
  async computeIncremental(barUpdate: {
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    isPartial: boolean;
  }): Promise<void> {
    if (this.activeSpecs.size === 0) {
      return;
    }
    
    const specs = Array.from(this.activeSpecs.values());
    const computeOrder = this.registry.getComputeOrder(specs);
    
    for (const spec of computeOrder) {
      const adapter = this.registry.getAdapter(spec.name);
      if (!adapter) {
        continue;
      }
      
      const state = this.computeStates.get(spec.id);
      if (!state) {
        continue;
      }
      
      try {
        const startTime = performance.now();
        const result = adapter.incremental(spec, state, barUpdate);
        const computeTime = performance.now() - startTime;
        
        // Update compute state
        this.computeStates.set(spec.id, result.nextState);
        
        // Add to series state
        this.seriesState.addIndicatorPoints(spec.id, result.pointsDelta);
        
        // Publish to indicator bus
        this.indicatorBus.publish({
          id: spec.id,
          points: result.pointsDelta
        });
        
        if (computeTime > 5) { // Log slow computations
          console.log(`🐌 Slow compute ${spec.name}: ${computeTime.toFixed(2)}ms`);
        }
      } catch (error) {
        console.error(`❌ Error in incremental compute ${spec.name}:`, error);
      }
    }
  }
  
  /**
   * Get compute metrics
   */
  getComputeMetrics(): {
    activeIndicators: number;
    computeStates: number;
    lastUpdateTime: number;
  } {
    return {
      activeIndicators: this.activeSpecs.size,
      computeStates: this.computeStates.size,
      lastUpdateTime: Date.now()
    };
  }
  
  /**
   * Clear all compute states
   */
  clear(): void {
    this.activeSpecs.clear();
    this.computeStates.clear();
    console.log('📊 Cleared all compute states');
  }
  
  /**
   * Get compute state for debugging
   */
  getComputeState(specId: string): ComputeState | undefined {
    return this.computeStates.get(specId);
  }
}


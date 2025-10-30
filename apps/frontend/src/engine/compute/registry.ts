import { IndicatorSpec, IndicatorInstanceMeta } from '../../contracts/indicator';

/**
 * Canonical specification for dependency resolution
 */
export type CanonicalSpec = {
  id: string;
  name: string;
  inputs: Record<string, number | string>;
  timeframe: string;
};

/**
 * Compute state for incremental calculations
 */
export interface ComputeState {
  lastFinalizedIndex: number;
  lastPartialValues: Record<string, number | null>;
  rollingSums: Record<string, number>;
  emaSeeds: Record<string, number>;
  rsiSmoothedGains: Record<string, number>;
  rsiSmoothedLosses: Record<string, number>;
  bbVarianceState: Record<string, { sum: number; sumSquares: number; count: number }>;
  [key: string]: any; // Allow additional state
}

/**
 * Indicator compute adapter interface
 */
export interface IndicatorComputeAdapter {
  key: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB';
  
  /**
   * Calculate warmup period for this indicator
   */
  warmup(spec: IndicatorSpec): number;
  
  /**
   * Get dependencies for this indicator
   */
  dependencies(spec: IndicatorSpec): CanonicalSpec[];
  
  /**
   * Batch computation for historical data
   */
  batch(spec: IndicatorSpec, candles: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>): Array<{
    t: number;
    values: Record<string, number | null>;
    status: 'partial' | 'final';
  }>;
  
  /**
   * Incremental computation for live updates
   */
  incremental(
    spec: IndicatorSpec,
    prevState: ComputeState,
    barUpdate: {
      t: number;
      o: number;
      h: number;
      l: number;
      c: number;
      v: number;
      isPartial: boolean;
    }
  ): {
    pointsDelta: Array<{
      t: number;
      values: Record<string, number | null>;
      status: 'partial' | 'final';
    }>;
    nextState: ComputeState;
  };
}

/**
 * Compute registry for managing indicator adapters
 */
export class ComputeRegistry {
  private adapters = new Map<string, IndicatorComputeAdapter>();
  private dependencyGraph = new Map<string, string[]>();
  
  /**
   * Register an indicator adapter
   */
  register(adapter: IndicatorComputeAdapter): void {
    this.adapters.set(adapter.key, adapter);
    console.log(`📊 Registered compute adapter: ${adapter.key}`);
  }
  
  /**
   * Get adapter by key
   */
  getAdapter(key: string): IndicatorComputeAdapter | undefined {
    return this.adapters.get(key);
  }
  
  /**
   * Get all registered adapters
   */
  getAllAdapters(): IndicatorComputeAdapter[] {
    return Array.from(this.adapters.values());
  }
  
  /**
   * Build dependency graph for a set of specs
   */
  buildDependencyGraph(specs: IndicatorSpec[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    for (const spec of specs) {
      const adapter = this.getAdapter(spec.name);
      if (!adapter) {
        console.warn(`⚠️ No adapter found for indicator: ${spec.name}`);
        continue;
      }
      
      const dependencies = adapter.dependencies(spec);
      const depIds = dependencies.map(dep => dep.id);
      graph.set(spec.id, depIds);
    }
    
    this.dependencyGraph = graph;
    return graph;
  }
  
  /**
   * Get topological order for computation
   */
  getTopologicalOrder(specs: IndicatorSpec[]): IndicatorSpec[] {
    const graph = this.buildDependencyGraph(specs);
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: IndicatorSpec[] = [];
    
    const visit = (specId: string) => {
      if (visiting.has(specId)) {
        throw new Error(`Circular dependency detected: ${specId}`);
      }
      if (visited.has(specId)) {
        return;
      }
      
      visiting.add(specId);
      const dependencies = graph.get(specId) || [];
      
      for (const depId of dependencies) {
        const depSpec = specs.find(s => s.id === depId);
        if (depSpec) {
          visit(depId);
        }
      }
      
      visiting.delete(specId);
      visited.add(specId);
      
      const spec = specs.find(s => s.id === specId);
      if (spec) {
        result.push(spec);
      }
    };
    
    for (const spec of specs) {
      if (!visited.has(spec.id)) {
        visit(spec.id);
      }
    }
    
    return result;
  }
  
  /**
   * Validate that all dependencies are available
   */
  validateDependencies(specs: IndicatorSpec[]): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    const available = new Set(specs.map(s => s.id));
    
    for (const spec of specs) {
      const adapter = this.getAdapter(spec.name);
      if (!adapter) {
        missing.push(spec.name);
        continue;
      }
      
      const dependencies = adapter.dependencies(spec);
      for (const dep of dependencies) {
        if (!available.has(dep.id)) {
          missing.push(dep.id);
        }
      }
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }
  
  /**
   * Get compute order for a set of specs
   */
  getComputeOrder(specs: IndicatorSpec[]): IndicatorSpec[] {
    const validation = this.validateDependencies(specs);
    if (!validation.valid) {
      throw new Error(`Missing dependencies: ${validation.missing.join(', ')}`);
    }
    
    return this.getTopologicalOrder(specs);
  }
}

/**
 * Global compute registry instance
 */
export const computeRegistry = new ComputeRegistry();


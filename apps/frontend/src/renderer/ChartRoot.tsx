import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PaneManager, createPaneManager } from './panes/paneManager';
import { SeriesMapper, createSeriesMapper } from './series/seriesMapper';
import { CrosshairSync, createCrosshairSync } from './ui/crosshairSync';
import { AutoscaleController, createAutoscaleController } from './ui/autoscaleController';
import { DiagnosticsOverlay, useDiagnosticsMetrics, useFPS, usePaintDuration } from './ui/diagnosticsOverlay';
import { 
  PaneType, 
  PaneConfig, 
  SeriesConfig, 
  DEFAULT_CROSSHAIR_SYNC_CONFIG, 
  DEFAULT_AUTOSCALE_CONFIG 
} from './panes/paneTypes';
import { Candle } from '../contracts/candle';
import { IndicatorPoint, IndicatorInstanceMeta } from '../contracts/indicator';
import { SeriesState } from '../engine/state/seriesState';
import { IndicatorBus } from '../engine/bridge/indicatorBus';

/**
 * Chart root component props
 */
interface ChartRootProps {
  symbol: string;
  timeframe: string;
  seriesState: SeriesState;
  indicatorBus: IndicatorBus;
  className?: string;
  showDiagnostics?: boolean;
}

/**
 * Chart root component
 */
export const ChartRoot: React.FC<ChartRootProps> = ({
  symbol,
  timeframe,
  seriesState,
  indicatorBus,
  className = '',
  showDiagnostics = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const paneManagerRef = useRef<PaneManager | null>(null);
  const seriesMapperRef = useRef<SeriesMapper | null>(null);
  const crosshairSyncRef = useRef<CrosshairSync | null>(null);
  const autoscaleControllerRef = useRef<AutoscaleController | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiagnosticsOverlay, setShowDiagnosticsOverlay] = useState(showDiagnostics);
  
  const { metrics, updateMetrics } = useDiagnosticsMetrics();
  const fps = useFPS();
  const paintDuration = usePaintDuration();

  // Initialize chart system
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    try {
      // Create managers
      const paneManager = createPaneManager(
        containerRef.current,
        DEFAULT_CROSSHAIR_SYNC_CONFIG,
        DEFAULT_AUTOSCALE_CONFIG
      );
      const seriesMapper = createSeriesMapper();
      const crosshairSync = createCrosshairSync(DEFAULT_CROSSHAIR_SYNC_CONFIG);
      const autoscaleController = createAutoscaleController(DEFAULT_AUTOSCALE_CONFIG);

      // Store references
      paneManagerRef.current = paneManager;
      seriesMapperRef.current = seriesMapper;
      crosshairSyncRef.current = crosshairSync;
      autoscaleControllerRef.current = autoscaleController;

      // Create main price pane
      const mainPane = paneManager.createPane({
        id: 'main-price',
        type: 'price',
        height: 400,
        order: 0,
        visible: true,
        autoScale: true,
      });

      // Register with managers
      seriesMapper.registerPane(mainPane);
      crosshairSync.registerPane(mainPane);
      autoscaleController.registerPane(mainPane);

      // Create candlestick series
      const candlestickSeries = seriesMapper.createCandlestickSeries('main-price', {
        id: 'candlesticks',
        paneId: 'main-price',
        type: 'candlestick',
        color: '#26a69a',
        overlay: false,
        visible: true,
      });

      // Load initial data
      loadInitialData();

      setIsInitialized(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize chart');
    }
  }, [isInitialized]);

  // Update diagnostics metrics
  useEffect(() => {
    updateMetrics({
      fps,
      lastPaintDuration: paintDuration,
      totalPanes: paneManagerRef.current?.getStats().totalPanes || 0,
      totalSeries: seriesMapperRef.current?.getSeriesStats().totalSeries || 0,
    });
  }, [fps, paintDuration, updateMetrics]);

  // Load initial data
  const loadInitialData = useCallback(() => {
    if (!seriesMapperRef.current) return;

    const candles = seriesState.getAllCandles();
    if (candles.length > 0) {
      seriesMapperRef.current.updateCandlestickData('main-price', 'candlesticks', candles);
    }
  }, [seriesState]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (paneManagerRef.current) {
        paneManagerRef.current.resizePanes();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add indicator pane
  const addIndicatorPane = useCallback((indicatorMeta: IndicatorInstanceMeta) => {
    if (!paneManagerRef.current || !seriesMapperRef.current || !crosshairSyncRef.current || !autoscaleControllerRef.current) {
      return;
    }

    try {
      const paneId = `indicator-${indicatorMeta.id}`;
      
      // Create pane
      const pane = paneManagerRef.current.createPane({
        id: paneId,
        type: 'oscillator',
        height: 200,
        order: 1,
        visible: true,
        autoScale: true,
      });

      // Register with managers
      seriesMapperRef.current.registerPane(pane);
      crosshairSyncRef.current.registerPane(pane);
      autoscaleControllerRef.current.registerPane(pane);

      // Create series for each output
      indicatorMeta.outputsMeta.forEach(output => {
        const seriesId = `${indicatorMeta.id}-${output.key}`;
        
        const series = seriesMapperRef.current!.createSeries(paneId, {
          id: seriesId,
          paneId,
          type: output.type,
          color: getColorForOutput(output.key),
          overlay: output.overlay,
          visible: true,
        });

        // Load existing data
        const points = seriesState.getAllIndicatorPoints(indicatorMeta.id);
        if (points.length > 0) {
          seriesMapperRef.current!.updateIndicatorData(paneId, seriesId, points, output.key);
        }
      });

      // Update diagnostics
      updateMetrics({
        totalPanes: paneManagerRef.current.getStats().totalPanes,
        totalSeries: seriesMapperRef.current.getSeriesStats().totalSeries,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add indicator pane');
    }
  }, [seriesState, updateMetrics]);

  // Remove indicator pane
  const removeIndicatorPane = useCallback((indicatorId: string) => {
    if (!paneManagerRef.current || !seriesMapperRef.current || !crosshairSyncRef.current || !autoscaleControllerRef.current) {
      return;
    }

    try {
      const paneId = `indicator-${indicatorId}`;
      
      // Unregister from managers
      seriesMapperRef.current.unregisterPane(paneId);
      crosshairSyncRef.current.unregisterPane(paneId);
      autoscaleControllerRef.current.unregisterPane(paneId);

      // Remove pane
      paneManagerRef.current.removePane(paneId);

      // Update diagnostics
      updateMetrics({
        totalPanes: paneManagerRef.current.getStats().totalPanes,
        totalSeries: seriesMapperRef.current.getSeriesStats().totalSeries,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove indicator pane');
    }
  }, [updateMetrics]);

  // Get color for output key
  const getColorForOutput = (outputKey: string): string => {
    const colors: Record<string, string> = {
      'rsi': '#6a5acd',
      'macd': '#2196f3',
      'signal': '#ff9800',
      'hist': '#f44336',
      'ema': '#4caf50',
      'sma': '#9c27b0',
      'bb_upper': '#ff5722',
      'bb_middle': '#607d8b',
      'bb_lower': '#ff5722',
    };
    return colors[outputKey] || '#2196f3';
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (paneManagerRef.current) {
        paneManagerRef.current.destroy();
      }
      if (crosshairSyncRef.current) {
        crosshairSyncRef.current.destroy();
      }
      if (autoscaleControllerRef.current) {
        autoscaleControllerRef.current.destroy();
      }
    };
  }, []);

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 bg-red-50 border border-red-200 rounded ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">Chart Error</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Chart Container */}
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Diagnostics Overlay */}
      <DiagnosticsOverlay
        metrics={metrics}
        isVisible={showDiagnosticsOverlay}
        onToggle={() => setShowDiagnosticsOverlay(!showDiagnosticsOverlay)}
      />
    </div>
  );
};

// Export the add/remove functions for external use
export const useChartActions = (chartRoot: ChartRoot) => {
  return {
    addIndicatorPane: (indicatorMeta: IndicatorInstanceMeta) => {
      // This would be implemented to call the addIndicatorPane function
      // from the ChartRoot component
    },
    removeIndicatorPane: (indicatorId: string) => {
      // This would be implemented to call the removeIndicatorPane function
      // from the ChartRoot component
    },
  };
};


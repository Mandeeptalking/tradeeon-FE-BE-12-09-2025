import React, { useState, useEffect } from 'react';

/**
 * Diagnostics metrics interface
 */
export interface DiagnosticsMetrics {
  fps: number;
  lastPaintDuration: number;
  queuedUpdates: number;
  lastTickAge: number;
  droppedUpdates: number;
  totalPanes: number;
  totalSeries: number;
  memoryUsage?: number;
}

/**
 * Diagnostics overlay component
 */
interface DiagnosticsOverlayProps {
  metrics: DiagnosticsMetrics;
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
}

export const DiagnosticsOverlay: React.FC<DiagnosticsOverlayProps> = ({
  metrics,
  isVisible,
  onToggle,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className={`fixed top-4 right-4 z-50 bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 ${className}`}
      >
        Show Diagnostics
      </button>
    );
  }

  return (
    <div className={`fixed top-4 right-4 z-50 bg-gray-900 text-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-sm font-medium">Diagnostics</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white text-xs"
          >
            {isExpanded ? '−' : '+'}
          </button>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white text-xs"
          >
            ×
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-3 space-y-2 text-xs">
        {/* Performance Metrics */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">FPS:</span>
            <span className={metrics.fps < 30 ? 'text-red-400' : metrics.fps < 60 ? 'text-yellow-400' : 'text-green-400'}>
              {metrics.fps.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Last Paint:</span>
            <span className={metrics.lastPaintDuration > 16 ? 'text-red-400' : 'text-green-400'}>
              {metrics.lastPaintDuration.toFixed(1)}ms
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Last Tick Age:</span>
            <span className={metrics.lastTickAge > 1000 ? 'text-red-400' : 'text-green-400'}>
              {metrics.lastTickAge.toFixed(0)}ms
            </span>
          </div>
        </div>

        {/* Queue Metrics */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Queued Updates:</span>
            <span className={metrics.queuedUpdates > 100 ? 'text-red-400' : 'text-green-400'}>
              {metrics.queuedUpdates}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Dropped Updates:</span>
            <span className={metrics.droppedUpdates > 0 ? 'text-red-400' : 'text-green-400'}>
              {metrics.droppedUpdates}
            </span>
          </div>
        </div>

        {/* Chart Metrics */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Panes:</span>
            <span className="text-white">{metrics.totalPanes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Series:</span>
            <span className="text-white">{metrics.totalSeries}</span>
          </div>
        </div>

        {/* Memory Usage (if available) */}
        {metrics.memoryUsage !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Memory:</span>
              <span className={metrics.memoryUsage > 100 ? 'text-red-400' : 'text-green-400'}>
                {metrics.memoryUsage.toFixed(1)}MB
              </span>
            </div>
          </div>
        )}

        {/* Expanded Metrics */}
        {isExpanded && (
          <div className="pt-2 border-t border-gray-700 space-y-1">
            <div className="text-gray-400 text-xs">
              Performance Status:
            </div>
            <div className="text-xs">
              {metrics.fps >= 60 && metrics.lastPaintDuration <= 16 ? (
                <span className="text-green-400">✓ Excellent</span>
              ) : metrics.fps >= 30 && metrics.lastPaintDuration <= 33 ? (
                <span className="text-yellow-400">⚠ Good</span>
              ) : (
                <span className="text-red-400">✗ Poor</span>
              )}
            </div>
            <div className="text-gray-400 text-xs">
              Update Status:
            </div>
            <div className="text-xs">
              {metrics.queuedUpdates === 0 && metrics.droppedUpdates === 0 ? (
                <span className="text-green-400">✓ Stable</span>
              ) : metrics.queuedUpdates > 0 && metrics.droppedUpdates === 0 ? (
                <span className="text-yellow-400">⚠ Queuing</span>
              ) : (
                <span className="text-red-400">✗ Dropping</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Hook for managing diagnostics metrics
 */
export const useDiagnosticsMetrics = (): {
  metrics: DiagnosticsMetrics;
  updateMetrics: (updates: Partial<DiagnosticsMetrics>) => void;
  resetMetrics: () => void;
} => {
  const [metrics, setMetrics] = useState<DiagnosticsMetrics>({
    fps: 0,
    lastPaintDuration: 0,
    queuedUpdates: 0,
    lastTickAge: 0,
    droppedUpdates: 0,
    totalPanes: 0,
    totalSeries: 0,
  });

  const updateMetrics = (updates: Partial<DiagnosticsMetrics>) => {
    setMetrics(prev => ({ ...prev, ...updates }));
  };

  const resetMetrics = () => {
    setMetrics({
      fps: 0,
      lastPaintDuration: 0,
      queuedUpdates: 0,
      lastTickAge: 0,
      droppedUpdates: 0,
      totalPanes: 0,
      totalSeries: 0,
    });
  };

  return { metrics, updateMetrics, resetMetrics };
};

/**
 * Hook for measuring FPS
 */
export const useFPS = (): number => {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return fps;
};

/**
 * Hook for measuring paint duration
 */
export const usePaintDuration = (): number => {
  const [paintDuration, setPaintDuration] = useState(0);

  useEffect(() => {
    const measurePaint = () => {
      const start = performance.now();
      
      requestAnimationFrame(() => {
        const end = performance.now();
        setPaintDuration(end - start);
      });
    };

    // Measure paint duration periodically
    const interval = setInterval(measurePaint, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return paintDuration;
};


import React, { forwardRef, useEffect, useImperativeHandle, useRef, useCallback, useState } from 'react';
import { 
  IndicatorInst, 
  IndParams, 
  IndStyle, 
  PaneId, 
  createIndicator, 
  updateIndicator, 
  removeIndicator, 
  listIndicators, 
  getIndicatorDef,
  EMA,
  RSI
} from './indicators';
import { emaIncremental } from './indicators/ema';

export type Candle = { t: number; o: number; h: number; l: number; c: number; v?: number };

// Chart styling constants
const COLORS = {
  up: '#26A69A',
  down: '#EF5350',
  grid: 'rgba(0,0,0,0.06)',
  crosshair: 'rgba(0,0,0,0.3)',
  axis: '#666',
  text: '#333',
  tooltip: 'rgba(0,0,0,0.8)',
  lastPrice: '#2196F3'
};

const PADDING = { top: 8, bottom: 50, left: 8, right: 60 };
const PANE_SEPARATOR_HEIGHT = 6; // Space between panes

// Pane configuration
const PANE_CONFIG = {
  price: { heightRatio: 0.25, yMin: null, yMax: null, fixedRange: false },
  rsi: { heightRatio: 0.1, yMin: 0, yMax: 100, fixedRange: true },
  macd: { heightRatio: 0.1, yMin: null, yMax: null, fixedRange: false, autoScaleZero: true },
  stochastic: { heightRatio: 0.1, yMin: 0, yMax: 100, fixedRange: true },
  williams_r: { heightRatio: 0.1, yMin: -100, yMax: 0, fixedRange: true },
  atr: { heightRatio: 0.15, yMin: 0, yMax: null, fixedRange: false },
  adx: { heightRatio: 0.15, yMin: 0, yMax: 100, fixedRange: true }
};

// Helper functions
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(6);
  return price.toFixed(8);
}

function formatTime(timestamp: number, interval: string): string {
  const date = new Date(timestamp);
  
  if (interval === '1d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (interval === '4h' || interval === '1h') {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }
  if (interval === '1m' || interval === '3m' || interval === '5m' || interval === '15m' || interval === '30m') {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }
  
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

function formatCrosshairTime(timestamp: number): string {
  const date = new Date(timestamp);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2); // Last 2 digits
  const time = date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  return `${dayName} ${day} ${month} ${year} ${time}`;
}

function findVisibleRange(w: number, n: number, barWidth: number, gap: number, rightOffsetBars: number): [number, number] {
  if (n === 0) return [0, 0];
  
  const barSpace = barWidth + gap;
  const rightOffset = rightOffsetBars * barSpace;
  const visibleWidth = w - PADDING.left - PADDING.right - rightOffset;
  const visibleBars = Math.floor(visibleWidth / barSpace);
  
  const to = n - 1;
  const from = Math.max(0, to - visibleBars + 1);
  
  return [from, to];
}

function computePriceRange(data: Candle[], from: number, to: number, paddingPct: number): [number, number] {
  if (!data.length || from > to) return [0, 1];
  
  let min = Infinity, max = -Infinity;
  for (let i = from; i <= to; i++) {
    if (i >= 0 && i < data.length) {
      const d = data[i];
      if (d.l < min) min = d.l;
      if (d.h > max) max = d.h;
    }
  }
  
  if (min === max) {
    min -= 1;
    max += 1;
  }
  
  const pad = (max - min) * paddingPct;
  return [min - pad, max + pad];
}

function computeMacdRange(data: Candle[], from: number, to: number, activeIndicators: Map<string, IndicatorInst>): [number, number] {
  if (!data.length || from > to) return [-1, 1];
  
  let min = Infinity;
  let max = -Infinity;
  let foundMacdIndicators = 0;
  
  // Find MACD indicators and collect their values
  activeIndicators.forEach(inst => {
    if (inst.pane === 'macd' && inst.data) {
      foundMacdIndicators++;
      
      // Handle multi-series MACD data
      if (inst.data instanceof Map) {
        // Single series (shouldn't happen for MACD, but handle gracefully)
        console.log('[MACD Range] Found single-series MACD data (unexpected)');
        for (let i = from; i <= to && i < data.length; i++) {
          const value = inst.data.get(data[i].t);
          if (value !== null && value !== undefined) {
            min = Math.min(min, value);
            max = Math.max(max, value);
          }
        }
      } else if (inst.data && typeof inst.data === 'object' && inst.data.macd && inst.data.signal && inst.data.hist) {
        // Multi-series data (macd, signal, hist)
        const macdData = inst.data as Record<string, Map<number, number | null>>;
        console.log('[MACD Range] Found multi-series MACD data:', {
          seriesNames: Object.keys(macdData),
          hasMacd: !!macdData.macd,
          hasSignal: !!macdData.signal,
          hasHist: !!macdData.hist
        });
        
        ['macd', 'signal', 'hist'].forEach(seriesName => {
          const series = macdData[seriesName];
          if (series && series instanceof Map) {
            let seriesValues = 0;
            for (let i = from; i <= to && i < data.length; i++) {
              const value = series.get(data[i].t);
              if (value !== null && value !== undefined) {
                min = Math.min(min, value);
                max = Math.max(max, value);
                seriesValues++;
              }
            }
            console.log(`[MACD Range] ${seriesName}: ${seriesValues} values in range`);
          }
        });
      } else {
        console.warn('[MACD Range] Invalid MACD data structure:', typeof inst.data, inst.data);
      }
    }
  });
  
  console.log('[MACD Range] Summary:', { foundMacdIndicators, min, max });
  
  if (min === Infinity || max === -Infinity) {
    console.warn('[MACD Range] No valid MACD data found, using fallback range');
    return [-1, 1];
  }
  
  // Ensure zero is always visible
  min = Math.min(min, 0);
  max = Math.max(max, 0);
  
  // Add some padding
  const range = max - min;
  const padding = Math.max(range * 0.1, 0.01); // At least 0.01 padding
  
  return [min - padding, max + padding];
}

function getPaneLayout(containerHeight: number, activeIndicators: Map<string, IndicatorInst>, userPaneHeights: Map<PaneId, number>): Map<PaneId, { top: number; height: number; yMin: number; yMax: number; isLast: boolean }> {
  const layout = new Map<PaneId, { top: number; height: number; yMin: number; yMax: number; isLast: boolean }>();
  
  // Determine which panes are needed
  const neededPanes = new Set<PaneId>(['price']); // Always need price pane
  activeIndicators.forEach(inst => {
    neededPanes.add(inst.pane);
  });
  
  const paneArray = Array.from(neededPanes).sort((a, b) => {
    // Ensure price pane comes first
    if (a === 'price') return -1;
    if (b === 'price') return 1;
    return a.localeCompare(b);
  });
  
  // Calculate available height (subtract separators)
  const separatorSpace = (paneArray.length - 1) * PANE_SEPARATOR_HEIGHT;
  const totalHeight = containerHeight - PADDING.top - PADDING.bottom - separatorSpace;
  let currentTop = PADDING.top;
  
  // Calculate heights based on ratios (use user-defined or default)
  const totalRatio = paneArray.reduce((sum, paneId) => {
    return sum + (userPaneHeights.get(paneId) || PANE_CONFIG[paneId].heightRatio);
  }, 0);
  
  paneArray.forEach((paneId, index) => {
    const config = PANE_CONFIG[paneId];
    // Use user-defined height ratio if available, otherwise use default
    const heightRatio = userPaneHeights.get(paneId) || config.heightRatio;
    const height = (totalHeight * heightRatio) / totalRatio;
    const isLast = index === paneArray.length - 1;
    
    let yMin: number, yMax: number;
    if (config.fixedRange) {
      yMin = config.yMin!;
      yMax = config.yMax!;
    } else if (paneId === 'macd') {
      // MACD needs special scaling to include zero and auto-scale
      yMin = -1; // Will be calculated based on actual MACD data
      yMax = 1;
    } else {
      // Will be set later based on data
      yMin = 0;
      yMax = 1;
    }
    
    layout.set(paneId, {
      top: currentTop,
      height,
      yMin,
      yMax,
      isLast
    });
    
    currentTop += height;
    if (!isLast) {
      currentTop += PANE_SEPARATOR_HEIGHT; // Add separator space
    }
  });
  
  return layout;
}

export interface CanvasCandleChartHandle {
  setData: (candles: Candle[]) => void;
  appendOrUpdate: (bar: Candle) => void;
  clear: () => void;
  addIndicator: (name: string, pane: PaneId, params: IndParams, style: IndStyle) => string;
  updateIndicator: (id: string, next: { params?: IndParams; style?: IndStyle }) => void;
  removeIndicator: (id: string) => void;
}

interface CanvasCandleChartProps {
  className?: string;
  timeframe?: string;
  onIndicatorSettings?: (paneId: PaneId, indicators: IndicatorInst[]) => void;
}

export const CanvasCandleChart = forwardRef<CanvasCandleChartHandle, CanvasCandleChartProps>(
  ({ className, timeframe = '1m', onIndicatorSettings }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const baseRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const dataRef = useRef<Candle[]>([]);
    const rafRef = useRef<number | null>(null);

    // Chart state
    const timeState = useRef({
      barWidth: 8,
      minBar: 2,
      maxBar: 30,
      gap: 2,
      rightOffsetBars: 2
    });

    const priceState = useRef({
      auto: true,
      min: 0,
      max: 1,
      paddingPct: 0.05,
      manualZoom: false,
      verticalScale: 1.0  // Multiplier for vertical bar height (1.0 = normal)
    });

    // Interaction state
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number>(-1);
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);
    const [hoveredSettingsPane, setHoveredSettingsPane] = useState<PaneId | null>(null);
    const [hoveredResizeHandle, setHoveredResizeHandle] = useState<PaneId | null>(null);
    const [isResizing, setIsResizing] = useState<{ paneId: PaneId; startY: number } | null>(null);

    // Pane height state (user can adjust from defaults)
    const [paneHeights, setPaneHeights] = useState<Map<PaneId, number>>(new Map([
      ['price', 0.7],
      ['rsi', 0.3]
    ]));

    // Indicator state
    const indicatorsRef = useRef<Map<string, IndicatorInst>>(new Map());

    // Helper functions
    const barsPerPx = () => 1 / (timeState.current.barWidth + timeState.current.gap);
    
    const xOfIndex = (i: number, w: number) => {
      const barSpace = timeState.current.barWidth + timeState.current.gap;
      const rightOffset = timeState.current.rightOffsetBars * barSpace;
      const lastIndex = dataRef.current.length - 1;
      return w - PADDING.right - rightOffset - (lastIndex - i) * barSpace;
    };

    const yOfPrice = (price: number, h: number, min: number, max: number) => {
      return PADDING.top + (max - price) * (h - PADDING.top - PADDING.bottom) / (max - min);
    };

    const priceOfY = (y: number, h: number, min: number, max: number) => {
      return max - (y - PADDING.top) * (max - min) / (h - PADDING.top - PADDING.bottom);
    };

    // Indicator management functions
    const computeIndicators = useCallback(() => {
      const data = dataRef.current;
      if (!data.length) return;

      indicatorsRef.current.forEach((inst, id) => {
        const def = getIndicatorDef(inst.name);
        if (!def) return;

        try {
          // For multi-series indicators like MACD and Bollinger Bands, don't pass prev data
          const prevData = (inst.data instanceof Map) ? inst.data : undefined;
          const newData = def.calc(data, inst.params, prevData);
          inst.data = newData;
          
          // Debug logging for Bollinger Bands
          if (inst.name === 'BOLLINGER_BANDS' && process.env.NODE_ENV !== 'production') {
            console.log('[Canvas Compute] Bollinger Bands computed:', {
              instName: inst.name,
              dataLength: data.length,
              newDataType: typeof newData,
              newDataKeys: newData && typeof newData === 'object' ? Object.keys(newData) : 'N/A',
              newDataSizes: newData && typeof newData === 'object' ? 
                Object.entries(newData).map(([k, v]: [string, any]) => ({ [k]: v instanceof Map ? v.size : 'not Map' })) : 'N/A'
            });
          }
        } catch (error) {
          console.error(`Error computing indicator ${inst.name}:`, error);
        }
      });
    }, []);

    const drawIndicators = useCallback((ctx: CanvasRenderingContext2D, w: number, data: Candle[], paneId: PaneId, paneLayout: { top: number; height: number; yMin: number; yMax: number }) => {
      const [from, to] = findVisibleRange(w, data.length, timeState.current.barWidth, timeState.current.gap, timeState.current.rightOffsetBars);
      
      // Set clipping region for indicators to stay within pane
      ctx.save();
      ctx.beginPath();
      ctx.rect(PADDING.left, paneLayout.top, w - PADDING.left - PADDING.right, paneLayout.height);
      ctx.clip();
      
      indicatorsRef.current.forEach((inst) => {
        if (inst.pane !== paneId) return;
        
        const def = getIndicatorDef(inst.name);
        if (!def) return;
        
        // Check if data exists (handle both single Map and multi-series)
        const hasData = inst.data instanceof Map ? inst.data.size > 0 : 
          (inst.data && typeof inst.data === 'object' && Object.values(inst.data).some((map: any) => map instanceof Map && map.size > 0));
        
        // Debug logging for Bollinger Bands
        if (inst.name === 'BOLLINGER_BANDS' && process.env.NODE_ENV !== 'production') {
          console.log('[Canvas Draw] Bollinger Bands check:', {
            paneId,
            instName: inst.name,
            dataType: typeof inst.data,
            isMap: inst.data instanceof Map,
            hasData,
            dataKeys: inst.data && typeof inst.data === 'object' ? Object.keys(inst.data) : 'N/A',
            dataSizes: inst.data && typeof inst.data === 'object' ? 
              Object.entries(inst.data).map(([k, v]: [string, any]) => ({ [k]: v instanceof Map ? v.size : 'not Map' })) : 'N/A'
          });
        }
        
        if (!hasData) return;

        try {
          def.draw(
            ctx,
            inst.data as any, // Allow both Map and Record<string, Map> types
            inst.style,
            (i) => xOfIndex(i, w),
            (p) => {
              const baseY = paneLayout.top + (paneLayout.yMax - p) * paneLayout.height / (paneLayout.yMax - paneLayout.yMin);
              if (paneId === 'price') {
                // Apply vertical scaling to price pane indicators (like EMA)
                const centerY = paneLayout.top + paneLayout.height / 2;
                return centerY + (baseY - centerY) * priceState.current.verticalScale;
              }
              return baseY; // RSI and other panes use normal scaling
            },
            from,
            to,
            data
          );
        } catch (error) {
          console.error(`Error drawing indicator ${inst.name}:`, error);
        }
      });
      
      ctx.restore(); // Remove clipping
    }, []);

    function resizeCanvasToContainer(canvas: HTMLCanvasElement) {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth: w, clientHeight: h } = canvas.parentElement!;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w, h, dpr };
    }

    function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, priceMin: number, priceMax: number) {
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;

      // Horizontal grid lines (price levels)
      const priceSteps = 6;
      for (let i = 1; i < priceSteps; i++) {
        const price = priceMin + (priceMax - priceMin) * (i / priceSteps);
        const y = yOfPrice(price, h, priceMin, priceMax);
        ctx.beginPath();
        ctx.moveTo(PADDING.left, y);
        ctx.lineTo(w - PADDING.right, y);
        ctx.stroke();
      }

      // Vertical grid lines (time)
      const timeSteps = 8;
      for (let i = 1; i < timeSteps; i++) {
        const x = PADDING.left + (w - PADDING.left - PADDING.right) * (i / timeSteps);
        ctx.beginPath();
        ctx.moveTo(x, PADDING.top);
        ctx.lineTo(x, h - PADDING.bottom);
        ctx.stroke();
      }
    }


    function drawPaneGrid(ctx: CanvasRenderingContext2D, w: number, layout: { top: number; height: number; isLast: boolean }, yMin: number, yMax: number) {
      // Set clipping region to keep grid within pane bounds
      ctx.save();
      ctx.beginPath();
      ctx.rect(PADDING.left, layout.top, w - PADDING.left - PADDING.right, layout.height);
      ctx.clip();

      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;

      // Horizontal grid lines
      const steps = 6;
      for (let i = 1; i < steps; i++) {
        const value = yMin + (yMax - yMin) * (i / steps);
        const y = layout.top + (yMax - value) * layout.height / (yMax - yMin);
        ctx.beginPath();
        ctx.moveTo(PADDING.left, y);
        ctx.lineTo(w - PADDING.right, y);
        ctx.stroke();
      }

      // Vertical grid lines (only within this pane)
      const timeSteps = 8;
      for (let i = 1; i < timeSteps; i++) {
        const x = PADDING.left + (w - PADDING.left - PADDING.right) * (i / timeSteps);
        ctx.beginPath();
        ctx.moveTo(x, layout.top);
        ctx.lineTo(x, layout.top + layout.height);
        ctx.stroke();
      }

      ctx.restore(); // Remove clipping

      // Draw pane border (outside clipping region)
      ctx.strokeStyle = 'rgba(200, 205, 210, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(PADDING.left, layout.top, w - PADDING.left - PADDING.right, layout.height);
    }

    function drawPaneAxes(ctx: CanvasRenderingContext2D, w: number, data: Candle[], layout: { top: number; height: number }, yMin: number, yMax: number, paneId: PaneId) {
      ctx.fillStyle = COLORS.text;
      ctx.font = '11px system-ui';

      // Y-axis labels
      const steps = 6;
      for (let i = 0; i <= steps; i++) {
        const value = yMin + (yMax - yMin) * (i / steps);
        const y = layout.top + (yMax - value) * layout.height / (yMax - yMin);
        const label = paneId === 'rsi' ? value.toFixed(0) : formatPrice(value);
        
        ctx.textAlign = 'left';
        ctx.fillText(label, w - PADDING.right + 4, y + 3);
      }
    }

    function drawTimeAxis(ctx: CanvasRenderingContext2D, w: number, h: number, data: Candle[]) {
      if (!data.length) return;

      // Draw time axis background
      ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
      ctx.fillRect(0, h - PADDING.bottom, w, PADDING.bottom);

      // Draw border line above time axis
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h - PADDING.bottom);
      ctx.lineTo(w, h - PADDING.bottom);
      ctx.stroke();

      ctx.fillStyle = COLORS.text;
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';

      const [from, to] = findVisibleRange(w, data.length, timeState.current.barWidth, timeState.current.gap, timeState.current.rightOffsetBars);
      const step = Math.max(1, Math.floor((to - from) / 8)); // More time labels
      
      // Draw time labels at the bottom
      for (let i = from; i <= to; i += step) {
        if (i >= 0 && i < data.length) {
          const x = xOfIndex(i, w);
          const label = formatTime(data[i].t, timeframe);
          
          // Draw label at bottom of chart
          ctx.fillText(label, x, h - 15);
          
          // Draw small tick mark
          ctx.strokeStyle = COLORS.grid;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, h - PADDING.bottom);
          ctx.lineTo(x, h - PADDING.bottom + 5);
          ctx.stroke();
        }
      }
    }

    function drawCandles(ctx: CanvasRenderingContext2D, w: number, data: Candle[], layout: { top: number; height: number }, priceMin: number, priceMax: number) {
      if (!data.length) return;

      // Set clipping region to prevent drawing outside pane
      ctx.save();
      ctx.beginPath();
      ctx.rect(PADDING.left, layout.top, w - PADDING.left - PADDING.right, layout.height);
      ctx.clip();

      const [from, to] = findVisibleRange(w, data.length, timeState.current.barWidth, timeState.current.gap, timeState.current.rightOffsetBars);
      
      ctx.lineWidth = 1;
      for (let i = from; i <= to; i++) {
        if (i < 0 || i >= data.length) continue;
        
        const candle = data[i];
        const x = xOfIndex(i, w);
        const up = candle.c >= candle.o;
        const color = up ? COLORS.up : COLORS.down;

        // Skip if outside visible area
        if (x < PADDING.left - timeState.current.barWidth || x > w - PADDING.right + timeState.current.barWidth) continue;

        const yOfPrice = (price: number) => {
          const baseY = layout.top + (priceMax - price) * layout.height / (priceMax - priceMin);
          const centerY = layout.top + layout.height / 2;
          // Apply vertical scaling around center of pane
          return centerY + (baseY - centerY) * priceState.current.verticalScale;
        };

        // Wick
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, yOfPrice(candle.h));
        ctx.lineTo(x, yOfPrice(candle.l));
        ctx.stroke();

        // Body
        const bodyTop = yOfPrice(Math.max(candle.o, candle.c));
        const bodyBottom = yOfPrice(Math.min(candle.o, candle.c));
        const bodyHeight = Math.max(1, Math.abs(bodyBottom - bodyTop));
        
        ctx.fillStyle = color;
        ctx.fillRect(
          x - Math.floor(timeState.current.barWidth / 2),
          Math.min(bodyTop, bodyBottom),
          timeState.current.barWidth,
          bodyHeight
        );
      }
      
      ctx.restore(); // Remove clipping
    }

    function drawMultiPaneOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, data: Candle[], paneLayout: Map<PaneId, { top: number; height: number; yMin: number; yMax: number }>) {
      // Find the price pane for crosshair reference
      const pricePane = paneLayout.get('price');
      if (!pricePane) return;

      // Crosshair and tooltip
      if (mousePos && hoveredIndex >= 0 && hoveredIndex < data.length) {
        const candle = data[hoveredIndex];
        const x = xOfIndex(hoveredIndex, w);

        // Vertical crosshair line across all panes (with proper clipping)
        ctx.strokeStyle = COLORS.crosshair;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        
        // Draw vertical line through each pane separately to respect boundaries
        paneLayout.forEach((paneInfo, paneId) => {
          ctx.save();
          ctx.beginPath();
          ctx.rect(PADDING.left, paneInfo.top, w - PADDING.left - PADDING.right, paneInfo.height);
          ctx.clip();
          
          ctx.beginPath();
          ctx.moveTo(x, paneInfo.top);
          ctx.lineTo(x, paneInfo.top + paneInfo.height);
          ctx.stroke();
          
          ctx.restore();
        });
        
        // Horizontal crosshair line only in hovered pane
        const hoveredPane = findHoveredPane(mousePos.y, paneLayout);
        if (hoveredPane) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(PADDING.left, hoveredPane.layout.top, w - PADDING.left - PADDING.right, hoveredPane.layout.height);
          ctx.clip();
          
          ctx.beginPath();
          ctx.moveTo(PADDING.left, mousePos.y);
          ctx.lineTo(w - PADDING.right, mousePos.y);
          ctx.stroke();
          
          ctx.restore();
        }
        
        ctx.setLineDash([]);

        // OHLC Tooltip (top-left)
        const tooltipText = `O: ${formatPrice(candle.o)} H: ${formatPrice(candle.h)} L: ${formatPrice(candle.l)} C: ${formatPrice(candle.c)}`;
        ctx.fillStyle = COLORS.tooltip;
        ctx.fillRect(10, 10, 200, 25);
        ctx.fillStyle = 'white';
        ctx.font = '11px system-ui';
        ctx.fillText(tooltipText, 15, 28);

        // Time tooltip (bottom, like TradingView)
        const timeLabel = formatCrosshairTime(candle.t);
        ctx.font = '12px system-ui';
        const timeWidth = ctx.measureText(timeLabel).width + 16;
        const timeX = Math.max(8, Math.min(w - timeWidth - 8, x - timeWidth / 2));
        const timeY = h - PADDING.bottom + 5;
        
        // Time tooltip background (dark like TradingView)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(timeX, timeY, timeWidth, 22);
        
        // Time tooltip text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(timeLabel, timeX + timeWidth / 2, timeY + 15);
      }

      // Last price line (only in price pane with clipping)
      if (data.length > 0 && pricePane) {
        const lastCandle = data[data.length - 1];
        const y = pricePane.top + (pricePane.yMax - lastCandle.c) * pricePane.height / (pricePane.yMax - pricePane.yMin);
        
        // Clip to price pane only
        ctx.save();
        ctx.beginPath();
        ctx.rect(PADDING.left, pricePane.top, w - PADDING.left - PADDING.right, pricePane.height);
        ctx.clip();
        
        ctx.strokeStyle = COLORS.lastPrice;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(PADDING.left, y);
        ctx.lineTo(w - PADDING.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.restore(); // Remove clipping

        // Last price label (outside clipping region)
        const label = formatPrice(lastCandle.c);
        const labelWidth = ctx.measureText(label).width + 8;
        ctx.fillStyle = COLORS.lastPrice;
        ctx.fillRect(w - PADDING.right, y - 10, labelWidth, 20);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.fillText(label, w - PADDING.right + 4, y + 3);
      }
    }

    function findHoveredPane(y: number, paneLayout: Map<PaneId, { top: number; height: number; yMin: number; yMax: number }>): { paneId: PaneId; layout: { top: number; height: number; yMin: number; yMax: number } } | null {
      for (const [paneId, layout] of paneLayout) {
        if (y >= layout.top && y <= layout.top + layout.height) {
          return { paneId, layout };
        }
      }
      return null;
    }

    function drawPaneSeparators(ctx: CanvasRenderingContext2D, w: number, h: number, paneLayout: Map<PaneId, { top: number; height: number; yMin: number; yMax: number; isLast: boolean }>) {
      ctx.save();
      
      paneLayout.forEach((layout, paneId) => {
        if (!layout.isLast) {
          const separatorY = layout.top + layout.height;
          const isHovered = hoveredResizeHandle === paneId;
          
          // Draw separator background (more visible when hovered)
          ctx.fillStyle = isHovered ? 'rgba(59, 130, 246, 0.1)' : 'rgba(248, 250, 252, 0.5)';
          ctx.fillRect(0, separatorY, w, PANE_SEPARATOR_HEIGHT);
          
          // Draw top border
          ctx.strokeStyle = 'rgba(200, 205, 210, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, separatorY);
          ctx.lineTo(w, separatorY);
          ctx.stroke();
          
          // Draw bottom border
          ctx.beginPath();
          ctx.moveTo(0, separatorY + PANE_SEPARATOR_HEIGHT);
          ctx.lineTo(w, separatorY + PANE_SEPARATOR_HEIGHT);
          ctx.stroke();
          
          // Store resize handle area for interaction (full width)
          (ctx.canvas as any).resizeAreas = (ctx.canvas as any).resizeAreas || [];
          (ctx.canvas as any).resizeAreas.push({
            paneId,
            x: 0,
            y: separatorY,
            width: w,
            height: PANE_SEPARATOR_HEIGHT
          });
          
          // Debug: Log resize area creation
          console.log(`Created resize area for ${paneId}: y=${separatorY}, height=${PANE_SEPARATOR_HEIGHT}`);
        }
      });
      
      ctx.restore();
    }

    function drawResizeHandle(ctx: CanvasRenderingContext2D, w: number, separatorY: number, isVisible: boolean) {
      if (!isVisible) return;
      
      ctx.save();
      
      // Draw resize handle background
      const handleWidth = 40;
      const handleHeight = 4;
      const centerX = w / 2;
      const centerY = separatorY + PANE_SEPARATOR_HEIGHT / 2;
      
      // Background
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.fillRect(centerX - handleWidth / 2, centerY - handleHeight / 2, handleWidth, handleHeight);
      
      // Border
      ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(centerX - handleWidth / 2, centerY - handleHeight / 2, handleWidth, handleHeight);
      
      // 3 dots for grip
      ctx.fillStyle = 'white';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(centerX + i * 6, centerY, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }

    function drawPaneTitles(ctx: CanvasRenderingContext2D, w: number, paneLayout: Map<PaneId, { top: number; height: number; yMin: number; yMax: number; isLast: boolean }>) {
      ctx.save();
      ctx.font = '12px system-ui';
      ctx.fillStyle = COLORS.text;

      paneLayout.forEach((layout, paneId) => {
        const paneIndicators = Array.from(indicatorsRef.current.values()).filter(ind => ind.pane === paneId);
        
        if (paneId === 'price') {
          // Price pane title
          ctx.fillText('Price', PADDING.left + 8, layout.top + 16);
        } else if (paneId === 'rsi') {
          // RSI pane title with current values in indicator colors
          const rsiIndicators = paneIndicators.filter(ind => ind.name === 'RSI');
          if (rsiIndicators.length > 0 && dataRef.current.length > 0) {
            const lastCandle = dataRef.current[dataRef.current.length - 1];
            const lastTimestamp = lastCandle.t;
            
            let xOffset = PADDING.left + 8;
            
            // Base RSI title
            ctx.fillStyle = COLORS.text;
            const baseTitle = `RSI (${rsiIndicators[0].params.length})`;
            ctx.fillText(baseTitle, xOffset, layout.top + 16);
            xOffset += ctx.measureText(baseTitle).width + 8;
            
            // Get current RSI values for the last candle
            rsiIndicators.forEach(rsiIndicator => {
              if (rsiIndicator.data && rsiIndicator.data instanceof Map && rsiIndicator.data.has(lastTimestamp)) {
                const rsiValue = rsiIndicator.data.get(lastTimestamp);
                if (rsiValue !== null && rsiValue !== undefined) {
                  // Main RSI value in purple
                  ctx.fillStyle = '#7E57C2'; // Purple color matching RSI line
                  const rsiText = rsiValue.toFixed(2);
                  ctx.fillText(rsiText, xOffset, layout.top + 16);
                  xOffset += ctx.measureText(rsiText).width + 12;
                  
                  // RSI EMA value in yellow (if smoothing is enabled)
                  if (rsiIndicator.params.smoothingType && rsiIndicator.params.smoothingType !== 'None') {
                    // Get smoothed data from indicator output (stored as .smoothed property)
                    const smoothedData = (rsiIndicator.data as any)?.smoothed;
                    if (smoothedData && smoothedData.has(lastTimestamp)) {
                      const smoothedValue = smoothedData.get(lastTimestamp);
                      if (smoothedValue !== null && smoothedValue !== undefined) {
                        ctx.fillStyle = '#FFD700'; // Yellow/Gold color matching RSI EMA line
                        const smoothedText = smoothedValue.toFixed(2);
                        ctx.fillText(smoothedText, xOffset, layout.top + 16);
                        xOffset += ctx.measureText(smoothedText).width;
                      }
                    }
                  }
                }
              }
            });
          } else {
            // Fallback title if no indicators or data
            const title = rsiIndicators.length > 0 
              ? `RSI (${rsiIndicators.map(ind => ind.params.length).join(', ')})`
              : 'RSI';
            ctx.fillText(title, PADDING.left + 8, layout.top + 16);
          }
        } else if (paneId === 'macd') {
          // MACD pane title
          const macdIndicators = paneIndicators.filter(ind => ind.name === 'MACD');
          if (macdIndicators.length > 0) {
            const macdIndicator = macdIndicators[0];
            const title = `MACD (${macdIndicator.params.fast}, ${macdIndicator.params.slow}, ${macdIndicator.params.signal})`;
            ctx.fillStyle = COLORS.text;
            ctx.fillText(title, PADDING.left + 8, layout.top + 16);
          } else {
            ctx.fillText('MACD', PADDING.left + 8, layout.top + 16);
          }
        } else if (paneId === 'stochastic') {
          // Stochastic pane title
          const stochasticIndicators = paneIndicators.filter(ind => ind.name === 'STOCHASTIC');
          if (stochasticIndicators.length > 0) {
            const stochasticIndicator = stochasticIndicators[0];
            const title = `Stochastic (${stochasticIndicator.params.k_period}, ${stochasticIndicator.params.d_period}, ${stochasticIndicator.params.smooth_k})`;
            ctx.fillStyle = COLORS.text;
            ctx.fillText(title, PADDING.left + 8, layout.top + 16);
          } else {
            ctx.fillText('Stochastic', PADDING.left + 8, layout.top + 16);
          }
        } else if (paneId === 'williams_r') {
          // Williams %R pane title
          const williamsIndicators = paneIndicators.filter(ind => ind.name === 'WILLIAMS_R');
          if (williamsIndicators.length > 0) {
            const williamsIndicator = williamsIndicators[0];
            const title = `Williams %R (${williamsIndicator.params.period})`;
            ctx.fillStyle = COLORS.text;
            ctx.fillText(title, PADDING.left + 8, layout.top + 16);
          } else {
            ctx.fillText('Williams %R', PADDING.left + 8, layout.top + 16);
          }
      } else if (paneId === 'atr') {
        // ATR pane title
        const atrIndicators = paneIndicators.filter(ind => ind.name === 'ATR');
        if (atrIndicators.length > 0) {
          const atrIndicator = atrIndicators[0];
          const title = `ATR (${atrIndicator.params.period})`;
          ctx.fillStyle = COLORS.text;
          ctx.fillText(title, PADDING.left + 8, layout.top + 16);
        } else {
          ctx.fillText('ATR', PADDING.left + 8, layout.top + 16);
        }
      } else if (paneId === 'adx') {
        // ADX pane title
        const adxIndicators = paneIndicators.filter(ind => ind.name === 'ADX');
        if (adxIndicators.length > 0) {
          const adxIndicator = adxIndicators[0];
          const title = `ADX (${adxIndicator.params.period})`;
          ctx.fillStyle = COLORS.text;
          ctx.fillText(title, PADDING.left + 8, layout.top + 16);
        } else {
          ctx.fillText('ADX', PADDING.left + 8, layout.top + 16);
        }
      }

        // Settings gear icon for panes with indicators
        if (paneIndicators.length > 0) {
          drawSettingsIcon(ctx, PADDING.left + 8, layout.top + 24, paneId);
        }
      });

      ctx.restore();
    }

    function drawSettingsIcon(ctx: CanvasRenderingContext2D, x: number, y: number, paneId: PaneId) {
      const size = 12;
      const centerX = x + size / 2;
      const centerY = y + size / 2;
      const isHovered = hoveredSettingsPane === paneId;
      
      // Draw gear icon with hover effect
      ctx.save();
      ctx.strokeStyle = isHovered ? 'rgba(59, 130, 246, 0.8)' : 'rgba(120, 123, 134, 0.7)';
      ctx.fillStyle = isHovered ? 'rgba(59, 130, 246, 0.8)' : 'rgba(120, 123, 134, 0.7)';
      ctx.lineWidth = isHovered ? 1.5 : 1;
      
      // Simple gear representation
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.stroke();
      
      // Gear teeth (simplified)
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        const x1 = centerX + Math.cos(angle) * 3;
        const y1 = centerY + Math.sin(angle) * 3;
        const x2 = centerX + Math.cos(angle) * 5;
        const y2 = centerY + Math.sin(angle) * 5;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      
      // Center hole
      ctx.beginPath();
      ctx.arc(centerX, centerY, 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      
      // Store clickable area for settings
      (ctx.canvas as any).settingsAreas = (ctx.canvas as any).settingsAreas || [];
      (ctx.canvas as any).settingsAreas.push({
        paneId,
        x: x - 2,
        y: y - 2,
        width: size + 4,
        height: size + 4
      });
    }

    function draw() {
      if (!baseRef.current || !overlayRef.current) return;
      const { ctx: bctx, w, h } = resizeCanvasToContainer(baseRef.current);
      const { ctx: octx } = resizeCanvasToContainer(overlayRef.current);

      const data = dataRef.current;
      if (!data.length) {
        bctx.clearRect(0, 0, w, h);
        octx.clearRect(0, 0, w, h);
        return;
      }

      // Calculate pane layout
      const paneLayout = getPaneLayout(h, indicatorsRef.current, paneHeights);
      const [from, to] = findVisibleRange(w, data.length, timeState.current.barWidth, timeState.current.gap, timeState.current.rightOffsetBars);

      // Clear canvases
      bctx.clearRect(0, 0, w, h);
      octx.clearRect(0, 0, w, h);
      
      // Clear interaction areas
      (octx.canvas as any).settingsAreas = [];
      (bctx.canvas as any).resizeAreas = []; // Store on base canvas since separators are drawn there

      // Draw each pane
      paneLayout.forEach((layout, paneId) => {
        let yMin = layout.yMin;
        let yMax = layout.yMax;

        if (paneId === 'price') {
          // Calculate price range for price pane
          [yMin, yMax] = priceState.current.auto 
            ? computePriceRange(data, from, to, priceState.current.paddingPct)
            : [priceState.current.min, priceState.current.max];
          
          // Update layout with actual price range
          layout.yMin = yMin;
          layout.yMax = yMax;

          // Draw price pane elements
          drawPaneGrid(bctx, w, layout, yMin, yMax);
          drawCandles(bctx, w, data, layout, yMin, yMax);
          drawPaneAxes(bctx, w, data, layout, yMin, yMax, paneId);
        } else if (paneId === 'macd') {
          // Calculate MACD range to include zero and auto-scale
          [yMin, yMax] = computeMacdRange(data, from, to, indicatorsRef.current);
          
          // Debug logging
          if (process.env.NODE_ENV !== 'production') {
            console.log('[MACD Range] Computed range:', { yMin, yMax, from, to, dataLength: data.length });
          }
          
          // Update layout with actual MACD range
          layout.yMin = yMin;
          layout.yMax = yMax;

          // Draw MACD pane elements
          drawPaneGrid(bctx, w, layout, yMin, yMax);
          drawPaneAxes(bctx, w, data, layout, yMin, yMax, paneId);
        } else {
          // Draw indicator pane elements
          drawPaneGrid(bctx, w, layout, yMin, yMax);
          drawPaneAxes(bctx, w, data, layout, yMin, yMax, paneId);
        }

        // Draw indicators for this pane
        drawIndicators(bctx, w, data, paneId, layout);
      });

      // Draw time axis at the bottom (shared across all panes)
      drawTimeAxis(bctx, w, h, data);

      // Draw pane separators and resize handles
      drawPaneSeparators(bctx, w, h, paneLayout);

      // Draw overlay elements
      drawMultiPaneOverlay(octx, w, h, data, paneLayout);
      
      // Draw pane titles and settings icons
      drawPaneTitles(octx, w, paneLayout);
      
      // Draw resize handles only when hovering or resizing
      if (hoveredResizeHandle || isResizing) {
        paneLayout.forEach((layout, paneId) => {
          if (!layout.isLast && (hoveredResizeHandle === paneId || isResizing?.paneId === paneId)) {
            const separatorY = layout.top + layout.height;
            drawResizeHandle(octx, w, separatorY, true);
          }
        });
      }
    }


    // Mouse event handlers
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMousePos({ x, y });
      
      // Find hovered candle
      const data = dataRef.current;
      if (data.length > 0) {
        const [from, to] = findVisibleRange(rect.width, data.length, timeState.current.barWidth, timeState.current.gap, timeState.current.rightOffsetBars);
        let closestIndex = -1;
        let closestDistance = Infinity;
        
        for (let i = from; i <= to; i++) {
          if (i >= 0 && i < data.length) {
            const candleX = xOfIndex(i, rect.width);
            const distance = Math.abs(x - candleX);
            if (distance < closestDistance && distance < timeState.current.barWidth + timeState.current.gap) {
              closestDistance = distance;
              closestIndex = i;
            }
          }
        }
        
        setHoveredIndex(closestIndex);
      }
      
      // Handle dragging
      if (isDragging && lastMousePos && !isResizing) {
        const dx = x - lastMousePos.x;
        timeState.current.rightOffsetBars = Math.max(0.5, timeState.current.rightOffsetBars - dx * barsPerPx());
        schedule();
      }

      // Handle pane resizing
      if (isResizing && lastMousePos && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dy = y - lastMousePos.y; // Use incremental change
        const containerHeight = rect.height;
        const totalUsableHeight = containerHeight - PADDING.top - PADDING.bottom - PANE_SEPARATOR_HEIGHT;
        
        // Calculate incremental height change
        const deltaRatio = dy / totalUsableHeight;
        
        setPaneHeights(prev => {
          const newHeights = new Map(prev);
          const currentPriceHeight = prev.get('price') || 0.7;
          const currentRsiHeight = prev.get('rsi') || 0.3;
          
          // Apply change (price grows when dragging down, RSI shrinks)
          const newPriceHeight = Math.max(0.2, Math.min(0.9, currentPriceHeight + deltaRatio));
          const newRsiHeight = Math.max(0.1, Math.min(0.8, currentRsiHeight - deltaRatio));
          
          // Ensure they add up to 1.0
          const total = newPriceHeight + newRsiHeight;
          newHeights.set('price', newPriceHeight / total);
          newHeights.set('rsi', newRsiHeight / total);
          
          return newHeights;
        });
        
        schedule();
      }
      
      // Check if hovering over settings icon
      const settingsAreas = (overlayRef.current as any)?.settingsAreas || [];
      let hoveredSettings: PaneId | null = null;
      for (const area of settingsAreas) {
        if (x >= area.x && x <= area.x + area.width && 
            y >= area.y && y <= area.y + area.height) {
          hoveredSettings = area.paneId;
          break;
        }
      }
      setHoveredSettingsPane(hoveredSettings);

      // Check if hovering over resize handle
      const resizeAreas = (baseRef.current as any)?.resizeAreas || [];
      let hoveredResize: PaneId | null = null;
      for (const area of resizeAreas) {
        if (x >= area.x && x <= area.x + area.width && 
            y >= area.y && y <= area.y + area.height) {
          hoveredResize = area.paneId;
          console.log(`Hovering over resize area for ${area.paneId} at y=${y}, area.y=${area.y}`);
          break;
        }
      }
      setHoveredResizeHandle(hoveredResize);

      // Update cursor style
      if (containerRef.current) {
        if (hoveredResize) {
          containerRef.current.style.cursor = 'ns-resize';
        } else if (hoveredSettings) {
          containerRef.current.style.cursor = 'pointer';
        } else {
          containerRef.current.style.cursor = 'crosshair';
        }
      }
      
      setLastMousePos({ x, y });
      schedule();
    }, [isDragging, lastMousePos]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!containerRef.current || !overlayRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Check if clicking on resize handle
      const resizeAreas = (baseRef.current as any).resizeAreas || [];
      for (const area of resizeAreas) {
        if (x >= area.x && x <= area.x + area.width && 
            y >= area.y && y <= area.y + area.height) {
          // Resize handle clicked
          console.log(`Clicked resize handle for ${area.paneId} at y=${y}`);
          setIsResizing({ paneId: area.paneId, startY: y });
          setLastMousePos({ x, y });
          return; // Don't start normal dragging
        }
      }

      // Check if clicking on settings icon
      const settingsAreas = (overlayRef.current as any).settingsAreas || [];
      for (const area of settingsAreas) {
        if (x >= area.x && x <= area.x + area.width && 
            y >= area.y && y <= area.y + area.height) {
          // Settings icon clicked
          if (onIndicatorSettings) {
            const paneIndicators = Array.from(indicatorsRef.current.values()).filter(ind => ind.pane === area.paneId);
            onIndicatorSettings(area.paneId, paneIndicators);
          }
          return; // Don't start dragging
        }
      }
      
      setIsDragging(true);
      setLastMousePos({ x, y });
    }, [onIndicatorSettings]);

    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
      setIsResizing(null);
      setLastMousePos(null);
    }, []);

    const handleMouseLeave = useCallback(() => {
      setMousePos(null);
      setHoveredIndex(-1);
      setIsDragging(false);
      setIsResizing(null);
      setLastMousePos(null);
      setHoveredSettingsPane(null);
      setHoveredResizeHandle(null);
      
      // Reset cursor
      if (containerRef.current) {
        containerRef.current.style.cursor = 'default';
      }
      
      schedule();
    }, []);


    const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      // If double-click is on the Y-axis area, reset vertical scale
      if (x > rect.width - PADDING.right) {
        priceState.current.auto = true;
        priceState.current.manualZoom = false;
        priceState.current.verticalScale = 1.0; // Reset to normal scale
        schedule();
      }
    }, []);

    // Keyboard handlers
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement as Node)) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          timeState.current.rightOffsetBars += 10;
          schedule();
          break;
        case 'ArrowRight':
          timeState.current.rightOffsetBars = Math.max(0.5, timeState.current.rightOffsetBars - 10);
          schedule();
          break;
        case 'ArrowUp':
          // Vertical expand (taller bars) - pure visual scaling
          priceState.current.verticalScale = clamp(priceState.current.verticalScale * 1.1, 0.2, 5.0);
          schedule();
          break;
        case 'ArrowDown':
          // Vertical contract (shorter bars) - pure visual scaling
          priceState.current.verticalScale = clamp(priceState.current.verticalScale * 0.9, 0.2, 5.0);
          schedule();
          break;
        case 'Home':
          timeState.current.rightOffsetBars = dataRef.current.length;
          schedule();
          break;
        case 'End':
          timeState.current.rightOffsetBars = 2;
          schedule();
          break;
        case 'a':
        case 'A':
          priceState.current.auto = !priceState.current.auto;
          priceState.current.manualZoom = !priceState.current.auto;
          schedule();
          break;
      }
    }, []);

    useImperativeHandle(ref, () => ({
      setData: (candles) => { 
        dataRef.current = candles; 
        computeIndicators();
        schedule(); 
      },
      appendOrUpdate: (bar) => {
        const arr = dataRef.current;
        const last = arr[arr.length - 1];
        if (last && last.t === bar.t) {
          // Update existing bar
          arr[arr.length - 1] = bar;
        } else {
          // Add new bar
          arr.push(bar);
        }

        // Recompute indicators — incremental for EMA, full for others
        indicatorsRef.current.forEach((inst) => {
          if (inst.name === 'EMA' && inst.data instanceof Map) {
            // grab last non-null value
            const values = Array.from(inst.data.values());
            const prev = values.length ? values[values.length - 1] : null;
            const nextVal = emaIncremental(bar, (prev as number|null) ?? null, {
              length: Number(inst.params.length ?? 20),
              source: (inst.params.source ?? 'close'),
            } as any);
            inst.data.set(bar.t, nextVal);
          } else {
            // Full recompute for RSI, MACD, and others
            const def = getIndicatorDef(inst.name);
            if (def) {
              // Always do full recompute to ensure data structure consistency
              try {
                const newData = def.calc(arr, inst.params);
                
                // Only update if we got valid data back
                if (newData) {
                  inst.data = newData;
                  
                  // Special handling for MACD to ensure multi-series structure
                  if (inst.name === 'MACD' && inst.data) {
                    if (!(inst.data instanceof Map) && typeof inst.data === 'object' && 
                        'macd' in inst.data && 'signal' in inst.data && 'hist' in inst.data) {
                      // Data structure is correct - multi-series
                      console.log('[MACD Update] Multi-series data structure maintained');
                    } else {
                      console.warn('[MACD Update] Unexpected data structure after recalculation:', typeof inst.data, inst.data);
                    }
                  }
                  
                  // Special handling for Bollinger Bands to ensure multi-series structure
                  if (inst.name === 'BOLLINGER_BANDS' && inst.data) {
                    if (!(inst.data instanceof Map) && typeof inst.data === 'object' && 
                        'upper' in inst.data && 'middle' in inst.data && 'lower' in inst.data) {
                      // Data structure is correct - multi-series
                      console.log('[BB Update] Multi-series data structure maintained');
                    } else {
                      console.warn('[BB Update] Unexpected data structure after recalculation:', typeof inst.data, inst.data);
                    }
                  }
                  
                  // Special handling for ATR to ensure multi-series structure
                  if (inst.name === 'ATR' && inst.data) {
                    if (!(inst.data instanceof Map) && typeof inst.data === 'object' && 
                        'atr' in inst.data) {
                      // Data structure is correct - multi-series
                      console.log('[ATR Update] Multi-series data structure maintained');
                    } else {
                      console.warn('[ATR Update] Unexpected data structure after recalculation:', typeof inst.data, inst.data);
                    }
                  }
                  
                  // Special handling for ADX to ensure multi-series structure
                  if (inst.name === 'ADX' && inst.data) {
                    if (!(inst.data instanceof Map) && typeof inst.data === 'object' && 
                        'diPlus' in inst.data && 'diMinus' in inst.data && 'adx' in inst.data) {
                      // Data structure is correct - multi-series
                      console.log('[ADX Update] Multi-series data structure maintained');
                    } else {
                      console.warn('[ADX Update] Unexpected data structure after recalculation:', typeof inst.data, inst.data);
                    }
                  }
                } else {
                  console.warn(`[Indicator Update] ${inst.name} returned null/undefined data`);
                }
              } catch (error) {
                console.error(`[Indicator Update] Error recalculating ${inst.name}:`, error);
              }
            }
          }
        });

        schedule(); // redraw
      },
      clear: () => { 
        dataRef.current = []; 
        indicatorsRef.current.clear();
        schedule(); 
      },
      addIndicator: (name: string, pane: PaneId, params: IndParams, style: IndStyle): string => {
        const inst = createIndicator(name, pane, params, style);
        indicatorsRef.current.set(inst.id, inst);
        computeIndicators();
        schedule();
        return inst.id;
      },
      updateIndicator: (id: string, next: { params?: IndParams; style?: IndStyle }): void => {
        const inst = indicatorsRef.current.get(id);
        if (inst) {
          if (next.params) {
            inst.params = { ...inst.params, ...next.params };
          }
          if (next.style) {
            inst.style = { ...inst.style, ...next.style };
          }
          computeIndicators();
          schedule();
        }
      },
      removeIndicator: (id: string): void => {
        indicatorsRef.current.delete(id);
        removeIndicator(id);
        schedule();
      }
    }));

    function schedule() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    }

    useEffect(() => {
      function onResize() { schedule(); }
      const ro = new ResizeObserver(onResize);
      if (containerRef.current) ro.observe(containerRef.current);
      
      // Add keyboard listener
      document.addEventListener('keydown', handleKeyDown);
      
      // Add wheel event listener with proper options to completely prevent browser zoom
      const handleWheelCapture = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (!containerRef.current || !dataRef.current.length) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        // Find which pane is being scrolled
        const paneLayout = getPaneLayout(rect.height, indicatorsRef.current, paneHeights);
        const hoveredPane = findHoveredPane(y, paneLayout);
        
        if (hoveredPane && hoveredPane.paneId === 'price') {
          // Pure vertical bar scaling - ONLY change visual height
          const scaleFactor = e.deltaY < 0 ? 1.05 : 0.95;
          const newScale = clamp(priceState.current.verticalScale * scaleFactor, 0.3, 3.0);
          
          priceState.current.verticalScale = newScale;
          schedule();
        }
        
        return false;
      };

      if (containerRef.current) {
        containerRef.current.addEventListener('wheel', handleWheelCapture, {
          passive: false,  // Allow preventDefault
          capture: true    // Capture early to prevent other handlers
        });
      }
      
      schedule();
      return () => { 
        ro.disconnect(); 
        document.removeEventListener('keydown', handleKeyDown);
        if (containerRef.current) {
          containerRef.current.removeEventListener('wheel', handleWheelCapture);
        }
        if (rafRef.current) cancelAnimationFrame(rafRef.current); 
      };
    }, [handleKeyDown, paneHeights]);

    return (
      <div 
        ref={containerRef} 
        className={className ?? ''} 
        style={{ 
          position: 'relative',
          touchAction: 'none', // Prevent touch zoom
          userSelect: 'none'   // Prevent text selection
        }}
      >
        <canvas ref={baseRef} style={{ position: 'absolute', inset: 0 }} />
        <canvas 
          ref={overlayRef} 
          style={{ 
            position: 'absolute', 
            inset: 0,
            touchAction: 'none', // Prevent touch zoom
            userSelect: 'none'   // Prevent text selection
          }} 
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={handleDoubleClick}
          tabIndex={0}
        />
      </div>
    );
  }
);
CanvasCandleChart.displayName = 'CanvasCandleChart';

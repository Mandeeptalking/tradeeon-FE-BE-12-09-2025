import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface RSIData {
  time: number;
  rsi: number;
  rsiMA?: number;
}

interface RSIPaneProps {
  theme: 'light' | 'dark';
  settings: {
    length: number;
    mode: 'classic' | 'extended';
    ma?: number | null;
    overbought: number;
    oversold: number;
  };
  height?: number;
  onViewRangeChange?: (viewRange: { start: number; end: number }) => void;
  initialViewRange?: { start: number; end: number };
}

interface RSIPaneRef {
  updateData: (data: RSIData[]) => void;
  appendData: (data: RSIData) => void;
  updateLastData: (data: RSIData) => void;
  syncViewRange: (viewRange: { start: number; end: number }) => void;
}

const RSIPane = forwardRef<RSIPaneRef, RSIPaneProps>(({ 
  theme, 
  settings, 
  height = 200,
  onViewRangeChange,
  initialViewRange
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rsiDataRef = useRef<RSIData[]>([]);
  
  // Interaction state
  const viewRangeRef = useRef(initialViewRange || { start: 0, end: 50 }); // Visible time range (indices)
  const yScaleRef = useRef({ min: 0, max: 100 }); // Y-axis range
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, range: { start: 0, end: 0 }, yScale: { min: 0, max: 100 } });
  const isYAxisDragRef = useRef(false);
  const isUpdatingFromSyncRef = useRef(false);

  // Draw RSI chart using canvas
  const drawRSIChart = () => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = rsiDataRef.current;
    if (data.length === 0) return;

    // Set canvas size
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = theme === 'dark' ? '#0D1117' : '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, height);

    // Get visible data range - ensure we always show the latest data
    const startIndex = Math.max(0, Math.floor(viewRangeRef.current.start));
    const endIndex = Math.min(data.length - 1, Math.ceil(viewRangeRef.current.end));
    
    // Always include the last data point to ensure RSI line reaches the edge
    const actualEndIndex = Math.max(endIndex, data.length - 1);
    const visibleData = data.slice(startIndex, actualEndIndex + 1);
    
    if (visibleData.length === 0) return;

    // Use current Y-scale
    const yMin = yScaleRef.current.min;
    const yMax = yScaleRef.current.max;

    // Draw background zones for classic mode
    if (settings.mode === 'classic') {
      const oversoldY = height - ((settings.oversold - yMin) / (yMax - yMin)) * height;
      const overboughtY = height - ((settings.overbought - yMin) / (yMax - yMin)) * height;

      // Draw shaded zone between oversold and overbought
      ctx.fillStyle = 'rgba(128,0,128,0.05)';
      ctx.fillRect(0, overboughtY, rect.width, oversoldY - overboughtY);

      // Draw dashed lines
      ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // Overbought line
      ctx.beginPath();
      ctx.moveTo(0, overboughtY);
      ctx.lineTo(rect.width, overboughtY);
      ctx.stroke();
      
      // Oversold line
      ctx.beginPath();
      ctx.moveTo(0, oversoldY);
      ctx.lineTo(rect.width, oversoldY);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }

    // Calculate time scale for visible range
    const timeSpan = Math.max(1, viewRangeRef.current.end - viewRangeRef.current.start);
    const timeStart = viewRangeRef.current.start;

    // Draw RSI line (purple) - ensure it extends to the right edge
    ctx.strokeStyle = '#6A5ACD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    visibleData.forEach((point, index) => {
      const dataIndex = startIndex + index;
      
      // Calculate X position - for the last data point, ensure it reaches the right edge
      let x;
      if (dataIndex === data.length - 1) {
        // Latest data point should be at the right edge
        x = rect.width - 10; // Leave small margin for Y-axis labels
      } else {
        x = ((dataIndex - timeStart) / timeSpan) * (rect.width - 20); // Leave space for labels
      }
      
      const y = height - ((point.rsi - yMin) / (yMax - yMin)) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw RSI MA line if enabled (red dashed)
    if (settings.ma) {
      const maData = visibleData.filter(d => d.rsiMA !== undefined);
      if (maData.length > 0) {
        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        
        maData.forEach((point, index) => {
          const originalIndex = visibleData.findIndex(d => d.time === point.time);
          const dataIndex = startIndex + originalIndex;
          
          // Use same positioning logic as RSI line
          let x;
          if (dataIndex === data.length - 1) {
            x = rect.width - 10;
          } else {
            x = ((dataIndex - timeStart) / timeSpan) * (rect.width - 20);
          }
          
          const y = height - ((point.rsiMA! - yMin) / (yMax - yMin)) * height;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw Y-axis labels
    ctx.fillStyle = theme === 'dark' ? '#D1D5DB' : '#374151';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const value = yMin + (yMax - yMin) * (i / labelCount);
      const y = height - (i / labelCount) * height;
      ctx.fillText(value.toFixed(0), rect.width - 5, y + 3);
    }
  };

  useImperativeHandle(ref, () => ({
    updateData: (data: RSIData[]) => {
      rsiDataRef.current = data;
      
      // Update view range to show last 50 candles, ensuring we see the latest data
      const dataLength = data.length;
      if (dataLength > 0) {
        viewRangeRef.current = {
          start: Math.max(0, dataLength - 50),
          end: Math.max(0, dataLength - 1), // Ensure end is at least 0
        };
      }
      
      // Update Y-scale based on mode and visible data
      updateYScale();
      drawRSIChart();
    },
    appendData: (data: RSIData) => {
      rsiDataRef.current.push(data);
      // Keep only last 200 points for performance
      if (rsiDataRef.current.length > 200) {
        rsiDataRef.current = rsiDataRef.current.slice(-200);
        // Adjust view range after trimming
        viewRangeRef.current.start = Math.max(0, viewRangeRef.current.start - 1);
        viewRangeRef.current.end = Math.max(0, viewRangeRef.current.end - 1);
      }
      
      // Auto-scroll to follow new data
      const dataLength = rsiDataRef.current.length;
      viewRangeRef.current.end = dataLength - 1;
      viewRangeRef.current.start = Math.max(0, dataLength - 50);
      
      updateYScale();
      drawRSIChart();
    },
    updateLastData: (data: RSIData) => {
      if (rsiDataRef.current.length > 0) {
        rsiDataRef.current[rsiDataRef.current.length - 1] = data;
        updateYScale();
        drawRSIChart();
      }
    },
    syncViewRange: (viewRange: { start: number; end: number }) => {
      if (isUpdatingFromSyncRef.current) return;
      
      isUpdatingFromSyncRef.current = true;
      viewRangeRef.current = viewRange;
      updateYScale();
      drawRSIChart();
      
      setTimeout(() => {
        isUpdatingFromSyncRef.current = false;
      }, 10);
    },
  }));

  // Update Y-axis scale based on visible data and mode
  const updateYScale = () => {
    const data = rsiDataRef.current;
    if (data.length === 0) return;

    if (settings.mode === 'classic') {
      yScaleRef.current = { min: 0, max: 100 };
    } else {
      // Extended mode - auto-scale to visible data
      const startIndex = Math.max(0, Math.floor(viewRangeRef.current.start));
      const endIndex = Math.min(data.length - 1, Math.ceil(viewRangeRef.current.end));
      const visibleData = data.slice(startIndex, endIndex + 1);
      
      if (visibleData.length > 0) {
        const minRSI = Math.min(...visibleData.map(d => d.rsi));
        const maxRSI = Math.max(...visibleData.map(d => d.rsi));
        const padding = (maxRSI - minRSI) * 0.1;
        
        yScaleRef.current = {
          min: minRSI - padding,
          max: maxRSI + padding,
        };
      }
    }
  };

  useEffect(() => {
    drawRSIChart();
  }, [theme, settings]);

  // Setup TradingView-like interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Mouse wheel handler for zoom and pan
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      // Check if over Y-axis (right side)
      const isOverYAxis = x > rect.width - 60;
      
      if (isOverYAxis) {
        // Y-axis scaling - expand/contract RSI scale
        const scaleFactor = e.deltaY > 0 ? 0.92 : 1.08; // 20% slower as requested
        const currentRange = yScaleRef.current.max - yScaleRef.current.min;
        const center = (yScaleRef.current.max + yScaleRef.current.min) / 2;
        const newRange = currentRange * scaleFactor;
        
        yScaleRef.current = {
          min: center - newRange / 2,
          max: center + newRange / 2,
        };
        
        drawRSIChart();
      } else {
        // Horizontal scroll or zoom
        const isHorizontalScroll = Math.abs(e.deltaX) > Math.abs(e.deltaY);
        const isShiftPressed = e.shiftKey;
        
        if (isHorizontalScroll || isShiftPressed) {
          // Horizontal pan
          const data = rsiDataRef.current;
          if (data.length === 0) return;
          
          const viewSpan = viewRangeRef.current.end - viewRangeRef.current.start;
          const scrollDelta = isHorizontalScroll ? e.deltaX : e.deltaY;
          const scrollMultiplier = isShiftPressed ? 1.6 : 1;
          const indexDelta = (scrollDelta / rect.width) * viewSpan * scrollMultiplier * 0.08;
          
          const newStart = Math.max(0, viewRangeRef.current.start + indexDelta);
          const newEnd = Math.min(data.length - 1, viewRangeRef.current.end + indexDelta);
          
          viewRangeRef.current = { start: newStart, end: newEnd };
          updateYScale();
          drawRSIChart();
          
          // Notify parent of view range change for synchronization
          if (onViewRangeChange && !isUpdatingFromSyncRef.current) {
            onViewRangeChange(viewRangeRef.current);
          }
        } else {
          // Vertical zoom
          const data = rsiDataRef.current;
          if (data.length === 0) return;
          
          const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
          const viewSpan = viewRangeRef.current.end - viewRangeRef.current.start;
          const newSpan = viewSpan * zoomFactor;
          const center = (viewRangeRef.current.start + viewRangeRef.current.end) / 2;
          
          const newStart = Math.max(0, center - newSpan / 2);
          const newEnd = Math.min(data.length - 1, center + newSpan / 2);
          
          viewRangeRef.current = { start: newStart, end: newEnd };
          updateYScale();
          drawRSIChart();
          
          // Notify parent of view range change for synchronization
          if (onViewRangeChange && !isUpdatingFromSyncRef.current) {
            onViewRangeChange(viewRangeRef.current);
          }
        }
      }
    };

    // Mouse drag handlers
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      // Check if clicking on Y-axis
      const isOverYAxis = x > rect.width - 60;
      
      isDraggingRef.current = true;
      isYAxisDragRef.current = isOverYAxis;
      
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        range: { ...viewRangeRef.current },
        yScale: { ...yScaleRef.current },
      };
      
      canvas.style.cursor = isOverYAxis ? 'ns-resize' : 'grabbing';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) {
        // Update cursor based on position
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const isOverYAxis = x > rect.width - 60;
        canvas.style.cursor = isOverYAxis ? 'ns-resize' : 'crosshair';
        return;
      }
      
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      if (isYAxisDragRef.current) {
        // Y-axis drag - rescale RSI range
        const scaleFactor = 1 + (deltaY * 0.008);
        const originalRange = dragStartRef.current.yScale.max - dragStartRef.current.yScale.min;
        const center = (dragStartRef.current.yScale.max + dragStartRef.current.yScale.min) / 2;
        const newRange = originalRange * scaleFactor;
        
        yScaleRef.current = {
          min: center - newRange / 2,
          max: center + newRange / 2,
        };
        
        drawRSIChart();
      } else {
        // Horizontal drag - pan time
        const data = rsiDataRef.current;
        if (data.length === 0) return;
        
        const rect = canvas.getBoundingClientRect();
        const viewSpan = dragStartRef.current.range.end - dragStartRef.current.range.start;
        const indexDelta = -(deltaX / rect.width) * viewSpan * 0.8;
        
        const newStart = Math.max(0, dragStartRef.current.range.start + indexDelta);
        const newEnd = Math.min(data.length - 1, dragStartRef.current.range.end + indexDelta);
        
        viewRangeRef.current = { start: newStart, end: newEnd };
        updateYScale();
        drawRSIChart();
        
        // Notify parent of view range change for synchronization
        if (onViewRangeChange && !isUpdatingFromSyncRef.current) {
          onViewRangeChange(viewRangeRef.current);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isYAxisDragRef.current = false;
      canvas.style.cursor = 'crosshair';
      document.body.style.userSelect = '';
    };

    // Double-click to reset
    const handleDoubleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      if (x > rect.width - 60) {
        // Reset Y-scale
        if (settings.mode === 'classic') {
          yScaleRef.current = { min: 0, max: 100 };
        } else {
          updateYScale();
        }
      } else {
        // Reset time range to show last 50 candles
        const dataLength = rsiDataRef.current.length;
        viewRangeRef.current = {
          start: Math.max(0, dataLength - 50),
          end: dataLength - 1,
        };
        updateYScale();
      }
      
      drawRSIChart();
    };

    // Add event listeners
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('dblclick', handleDoubleClick);

    // Resize handler
    const handleResize = () => {
      drawRSIChart();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme, settings]);

  return (
    <div className="w-full relative" ref={containerRef}>
      {/* Canvas Chart */}
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />
      
      {/* Legend */}
      <div className={`absolute top-2 left-2 text-xs ${
        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
      }`}>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-0.5 bg-purple-500"></div>
            <span>RSI({settings.length})</span>
          </div>
          {settings.ma && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-orange-500" style={{ 
                backgroundImage: 'repeating-linear-gradient(to right, #FF4500 0, #FF4500 2px, transparent 2px, transparent 4px)' 
              }}></div>
              <span>MA({settings.ma})</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Current RSI Value */}
      {rsiDataRef.current.length > 0 && (
        <div className={`absolute top-2 right-2 text-xs font-mono ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          <div className="bg-black bg-opacity-50 px-2 py-1 rounded">
            RSI: {rsiDataRef.current[rsiDataRef.current.length - 1]?.rsi.toFixed(2)}
            {settings.ma && rsiDataRef.current[rsiDataRef.current.length - 1]?.rsiMA && (
              <div>MA: {rsiDataRef.current[rsiDataRef.current.length - 1]?.rsiMA!.toFixed(2)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

RSIPane.displayName = 'RSIPane';

export default RSIPane;
export type { RSIData, RSIPaneRef };

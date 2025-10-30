/**
 * RSI Levels Overlay - Simplified Persistent Version
 * 
 * Uses a different approach to ensure reference lines never disappear
 */

/**
 * Simple RSI Levels Overlay that always draws reference lines
 */
export const RSI_LEVELS_OVERLAY = {
  name: 'rsiLevels',
  totalStep: 1, // Minimal step to ensure it's always active
  lock: true,
  needDefaultPointFigure: false,
  needDefaultXAxisFigure: false, 
  needDefaultYAxisFigure: false,
  visible: true,
  zLevel: 0,
  
  // Always create the figures regardless of interaction state
  createPointFigures: ({ overlay, coordinates, bounding, xAxis, yAxis }: any) => {
    if (!bounding || !yAxis || !xAxis) return [];
    
    const figures = [];
    
    // Get parameters with defaults
    const extendData = overlay.extendData || {};
    const overbought = extendData.overbought || 70;
    const oversold = extendData.oversold || 30;
    const middle = extendData.middle || 50;
    const showBands = extendData.showBands !== false;
    const showBackground = extendData.showBackground !== false;
    const overboughtColor = extendData.overboughtColor || '#ef4444';
    const oversoldColor = extendData.oversoldColor || '#22c55e';
    const middleColor = extendData.middleColor || '#787B86';
    const backgroundColor = extendData.backgroundColor || '#4C84FF';
    
    const leftX = bounding.left;
    const rightX = bounding.left + bounding.width;
    
    console.log('🎨 Drawing RSI levels:', { overbought, oversold, middle, leftX, rightX });
    
    if (showBands) {
      // Background shading between oversold and overbought
      if (showBackground) {
        const overboughtY = yAxis.convertToPixel(overbought);
        const oversoldY = yAxis.convertToPixel(oversold);
        
        figures.push({
          key: 'rsiBackground',
          type: 'rect',
          attrs: {
            x: leftX,
            y: Math.min(overboughtY, oversoldY),
            width: rightX - leftX,
            height: Math.abs(overboughtY - oversoldY)
          },
          styles: {
            style: 'fill',
            color: backgroundColor,
            opacity: 0.1
          }
        });
      }
      
      // Overbought line
      figures.push({
        key: 'overboughtLine',
        type: 'line',
        attrs: {
          coordinates: [
            { x: leftX, y: yAxis.convertToPixel(overbought) },
            { x: rightX, y: yAxis.convertToPixel(overbought) }
          ]
        },
        styles: {
          style: 'stroke',
          color: overboughtColor,
          size: 1,
          dashedValue: [4, 4]
        }
      });
      
      // Oversold line
      figures.push({
        key: 'oversoldLine',
        type: 'line',
        attrs: {
          coordinates: [
            { x: leftX, y: yAxis.convertToPixel(oversold) },
            { x: rightX, y: yAxis.convertToPixel(oversold) }
          ]
        },
        styles: {
          style: 'stroke',
          color: oversoldColor,
          size: 1,
          dashedValue: [4, 4]
        }
      });
      
      // Middle line
      figures.push({
        key: 'middleLine',
        type: 'line',
        attrs: {
          coordinates: [
            { x: leftX, y: yAxis.convertToPixel(middle) },
            { x: rightX, y: yAxis.convertToPixel(middle) }
          ]
        },
        styles: {
          style: 'stroke',
          color: middleColor,
          size: 1,
          dashedValue: [2, 2]
        }
      });
    }
    
    console.log(`✅ Created ${figures.length} persistent RSI level figures`);
    return figures;
  },
  
  // Minimal interaction to keep overlay active
  performEventPressedMove: () => true,
  performEventMoveForDrawing: () => true,
  
  // No tooltip needed
  createTooltipDataSource: () => []
};


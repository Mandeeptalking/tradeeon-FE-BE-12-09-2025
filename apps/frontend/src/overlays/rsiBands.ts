/**
 * RSI Bands Overlay for KlineCharts
 * 
 * Visual decorations for RSI indicator:
 * - Overbought/Oversold horizontal lines (70/30)
 * - Middle line (50)
 * - Background shading between bands (30-70)
 * - Optional cross markers at band crossings
 */

interface RSIBandsParams {
  overbought: number;
  oversold: number;
  middle: number;
  showBands: boolean;
  showBackground: boolean;
  showCrosses: boolean;
  overboughtColor: string;
  oversoldColor: string;
  middleColor: string;
  backgroundColor: string;
  backgroundAlpha: number;
}

/**
 * RSI Bands Overlay Definition
 */
export const RSI_BANDS_OVERLAY = {
  name: 'rsiBands',
  totalStep: 0, // No interaction steps needed
  lock: true, // Cannot be moved/edited by user
  needDefaultPointFigure: false,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  visible: true, // Always visible
  zLevel: 0, // Behind other elements
  mode: 'normal', // Normal drawing mode
  modeSensitivity: 1, // Not sensitive to mouse
  
  // Create visual figures for RSI bands (persistent, not cursor-dependent)
  createPointFigures: ({ overlay, coordinates, bounding, xAxis, yAxis }: any) => {
    // CRITICAL: Always draw bands regardless of cursor position or coordinates
    if (!bounding || !yAxis) {
      return [];
    }
    
    console.log('🎨 Drawing persistent RSI bands...');
    
    // Force drawing even without points/coordinates
    const shouldDraw = true; // Always draw reference lines
    
    const figures = [];
    
    // Get parameters from overlay data
    const params: RSIBandsParams = {
      overbought: 70,
      oversold: 30,
      middle: 50,
      showBands: true,
      showBackground: true,
      showCrosses: false,
      overboughtColor: '#ef4444',
      oversoldColor: '#22c55e',
      middleColor: '#787B86',
      backgroundColor: '#4C84FF',
      backgroundAlpha: 0.1,
      ...overlay.extendData
    };
    
    const leftX = bounding.left;
    const rightX = bounding.left + bounding.width;
    
    // Draw background shading first (so it appears behind lines)
    if (params.showBackground) {
      const overboughtY = yAxis.convertToPixel(params.overbought);
      const oversoldY = yAxis.convertToPixel(params.oversold);
      
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
          color: `${params.backgroundColor}${Math.floor(params.backgroundAlpha * 255).toString(16).padStart(2, '0')}` // Add alpha
        }
      });
    }
    
    // Draw horizontal reference lines
    if (params.showBands) {
      // Overbought line (70)
      const overboughtY = yAxis.convertToPixel(params.overbought);
      figures.push({
        key: 'overboughtLine',
        type: 'line',
        attrs: {
          coordinates: [
            { x: leftX, y: overboughtY },
            { x: rightX, y: overboughtY }
          ]
        },
        styles: {
          style: 'stroke',
          color: params.overboughtColor,
          size: 1,
          dashedValue: [5, 5] // Dashed line
        }
      });
      
      // Oversold line (30)
      const oversoldY = yAxis.convertToPixel(params.oversold);
      figures.push({
        key: 'oversoldLine',
        type: 'line',
        attrs: {
          coordinates: [
            { x: leftX, y: oversoldY },
            { x: rightX, y: oversoldY }
          ]
        },
        styles: {
          style: 'stroke',
          color: params.oversoldColor,
          size: 1,
          dashedValue: [5, 5] // Dashed line
        }
      });
      
      // Middle line (50)
      const middleY = yAxis.convertToPixel(params.middle);
      figures.push({
        key: 'middleLine',
        type: 'line',
        attrs: {
          coordinates: [
            { x: leftX, y: middleY },
            { x: rightX, y: middleY }
          ]
        },
        styles: {
          style: 'stroke',
          color: params.middleColor,
          size: 1,
          dashedValue: [2, 2] // Dotted line
        }
      });
    }
    
    // Add cross markers if enabled (optional feature)
    if (params.showCrosses && overlay.points && overlay.points.length > 1) {
      // This would analyze RSI crossings and add markers
      // Implementation would detect when RSI crosses above oversold or below overbought
      // For now, we'll skip this advanced feature
    }
    
    console.log(`✅ Created ${figures.length} RSI band figures`);
    return figures;
  },
  
  // No tooltip needed for bands (they're just visual decorations)
  createTooltipDataSource: () => [],
};

/**
 * Helper function to get source value from kline data
 */
function getSourceValue(kline: KlineData, source: string): number {
  switch (source) {
    case 'open': return kline.open;
    case 'high': return kline.high;
    case 'low': return kline.low;
    case 'close': return kline.close;
    case 'hlc3': return (kline.high + kline.low + kline.close) / 3;
    case 'ohlc4': return (kline.open + kline.high + kline.low + kline.close) / 4;
    case 'hl2': return (kline.high + kline.low) / 2;
    default: return kline.close;
  }
}

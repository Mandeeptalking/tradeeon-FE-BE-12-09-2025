import { IndicatorDef, Candle, registerIndicator } from './registry';
import { rsiSeries, type Candle as SharedCandle } from '../../shared/indicators/core';

// Helper function for moving averages
function calculateMA(values: number[], length: number, type: string): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < length - 1) {
      result.push(NaN);
      continue;
    }
    
    let value: number;
    switch (type) {
      case 'SMA':
        value = values.slice(i - length + 1, i + 1).reduce((a, b) => a + b) / length;
        break;
      case 'EMA':
        if (i === length - 1) {
          value = values.slice(i - length + 1, i + 1).reduce((a, b) => a + b) / length;
        } else {
          const k = 2 / (length + 1);
          value = values[i] * k + result[i - 1] * (1 - k);
        }
        break;
      case 'RMA':
        if (i === length - 1) {
          value = values.slice(i - length + 1, i + 1).reduce((a, b) => a + b) / length;
        } else {
          value = (result[i - 1] * (length - 1) + values[i]) / length;
        }
        break;
      case 'WMA':
        let sum = 0;
        let weightSum = 0;
        for (let j = 0; j < length; j++) {
          const weight = j + 1;
          sum += values[i - length + 1 + j] * weight;
          weightSum += weight;
        }
        value = sum / weightSum;
        break;
      default:
        value = values[i];
    }
    result.push(value);
  }
  
  return result;
}

const RSI: IndicatorDef = {
  name: 'RSI',
  pane: 'rsi',
  calc(candles, { 
    length = 14, 
    source = 'close', 
    smoothingType = 'EMA', 
    smoothingLength = 14,
    showGradientFill = true,
    overboughtLevel = 70,
    oversoldLevel = 30
  }) {
    const lengthNum = Number(length);
    const sourceStr = (source ?? 'close') as 'close'|'hlc3'|'ohlc4';
    const out = rsiSeries(candles as SharedCandle[], lengthNum, sourceStr);
    
    // Apply smoothing if enabled
    if (smoothingType !== 'None') {
      const rsiValues: number[] = [];
      const timestamps: number[] = [];
      
      // Extract RSI values and their timestamps
      out.forEach((value, ts) => {
        if (value !== null) {
          rsiValues.push(value);
          timestamps.push(ts);
        }
      });
      
      if (rsiValues.length > 0) {
        const smoothedValues = calculateMA(rsiValues, smoothingLength, smoothingType);
        const smoothedOut = new Map<number, number | null>();
        
        // Map smoothed values back to the correct timestamps
        for (let i = 0; i < smoothedValues.length; i++) {
          if (!isNaN(smoothedValues[i])) {
            smoothedOut.set(timestamps[i], smoothedValues[i]);
          }
        }
        
        // Store smoothed data for drawing
        (out as any).smoothed = smoothedOut;
      }
    }

    // Store additional parameters for drawing
    (out as any).showGradientFill = showGradientFill;
    (out as any).smoothingType = smoothingType;
    (out as any).overboughtLevel = overboughtLevel;
    (out as any).oversoldLevel = oversoldLevel;

    return out;
  },

  draw(ctx, data, style, xOfIdx, yOfPrice, from, to, candles) {
    ctx.save();
    
    const showGradientFill = (data as any).showGradientFill !== false;
    const smoothingType = (data as any).smoothingType || 'None';
    const smoothedData = (data as any).smoothed;
    const overboughtLevel = (data as any).overboughtLevel || 70;
    const oversoldLevel = (data as any).oversoldLevel || 30;
    
    // Draw background fill (oversold-overbought zone)
    const yOversold = yOfPrice(oversoldLevel);
    const yOverbought = yOfPrice(overboughtLevel);
    const y50 = yOfPrice(50);
    
    ctx.fillStyle = 'rgba(126, 87, 194, 0.1)'; // Purple tint like TradingView
    ctx.fillRect(xOfIdx(from), yOverbought, xOfIdx(to) - xOfIdx(from), yOversold - yOverbought);
    
    // Draw horizontal reference lines
    ctx.strokeStyle = 'rgba(120, 123, 134, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // Overbought line
    ctx.beginPath();
    ctx.moveTo(xOfIdx(from), yOverbought);
    ctx.lineTo(xOfIdx(to), yOverbought);
    ctx.stroke();
    
    // 50 line (midline with reduced opacity)
    ctx.strokeStyle = 'rgba(120, 123, 134, 0.3)';
    ctx.beginPath();
    ctx.moveTo(xOfIdx(from), y50);
    ctx.lineTo(xOfIdx(to), y50);
    ctx.stroke();
    
    // Oversold line
    ctx.strokeStyle = 'rgba(120, 123, 134, 0.5)';
    ctx.beginPath();
    ctx.moveTo(xOfIdx(from), yOversold);
    ctx.lineTo(xOfIdx(to), yOversold);
    ctx.stroke();
    
    ctx.setLineDash([]);

    // Draw gradient fills if enabled
    if (showGradientFill) {
      drawGradientFills(ctx, data, xOfIdx, yOfPrice, from, to, yOversold, y50, yOverbought, overboughtLevel, oversoldLevel);
    }

    // Draw main RSI line
    drawRSILine(ctx, data, style, xOfIdx, yOfPrice, from, to, candles);
    
    // Draw smoothed line if enabled
    if (smoothingType !== 'None' && smoothedData) {
      ctx.strokeStyle = '#FFD700'; // Yellow color for smoothed line
      ctx.lineWidth = 1.5;
      drawRSILine(ctx, smoothedData, { ...style, color: '#FFD700' }, xOfIdx, yOfPrice, from, to, candles);
    }
    
    ctx.restore();
  }
};

function drawGradientFills(ctx: CanvasRenderingContext2D, data: Map<number, number | null>, 
                          xOfIdx: (i: number) => number, yOfPrice: (p: number) => number, 
                          from: number, to: number, yOversold: number, y50: number, yOverbought: number, 
                          overboughtLevel: number, oversoldLevel: number) {
  const dataArray = Array.from(data.entries()).sort((a, b) => a[0] - b[0]);
  
  // Create gradient fills for overbought and oversold zones
  for (let i = from; i < to; i++) {
    if (i < 0 || i >= dataArray.length - 1) continue;
    
    const [, value] = dataArray[i];
    const [, nextValue] = dataArray[i + 1];
    
    if (value == null || nextValue == null) continue;
    
    const x1 = xOfIdx(i);
    const x2 = xOfIdx(i + 1);
    const y1 = yOfPrice(value);
    const y2 = yOfPrice(nextValue);
    
    // Overbought gradient fill
    if (value >= overboughtLevel) {
      const gradient = ctx.createLinearGradient(0, y50, 0, yOverbought);
      gradient.addColorStop(0, 'rgba(0, 255, 0, 0)');   // Transparent green at 50
      gradient.addColorStop(1, 'rgba(0, 255, 0, 0.3)'); // Semi-transparent green at overbought level
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x1, y50);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, y50);
      ctx.closePath();
      ctx.fill();
    }
    
    // Oversold gradient fill
    if (value <= oversoldLevel) {
      const gradient = ctx.createLinearGradient(0, yOversold, 0, y50);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.3)'); // Semi-transparent red at oversold level
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');   // Transparent red at 50
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x1, y50);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, y50);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawRSILine(ctx: CanvasRenderingContext2D, data: Map<number, number | null>, 
                     style: any, xOfIdx: (i: number) => number, yOfPrice: (p: number) => number, 
                     from: number, to: number, candles: Candle[]) {
  ctx.lineWidth = style.width ?? 1.5;
  ctx.strokeStyle = style.color;
  if (style.alpha && style.alpha < 1) {
    ctx.globalAlpha = style.alpha;
  }
  if (style.dashed) {
    ctx.setLineDash([4, 3]);
  }

  let started = false;
  
  // Draw based on candle indices, not data array indices
  for (let i = from; i <= to; i++) {
    if (i < 0 || i >= candles.length) continue;
    
    const timestamp = candles[i].t;
    const value = data.get(timestamp);
    
    if (value == null) {
      started = false;
      continue;
    }

    const x = xOfIdx(i);
    const y = yOfPrice(value);

    if (!started) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }

  if (started) {
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

// Register the indicator
registerIndicator(RSI);

export default RSI;

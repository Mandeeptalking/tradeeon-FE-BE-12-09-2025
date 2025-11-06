// src/canvas/indicators/atr.ts
import { IndicatorDef, registerIndicator, type Candle } from './registry';
import { atrSeries } from '../../shared/indicators/core';

const ATR: IndicatorDef = {
  name: 'ATR',
  pane: 'atr', // Dedicated pane for ATR
  calc(candles: Candle[], params: { period?:number }) {
    const period = Number(params.period ?? 14)
    const { atr } = atrSeries(candles, period)
    
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      const atrValues = Array.from(atr.values()).filter(v => v !== null);
      console.log('[ATR Calc] Computed:', {
        candles: candles.length,
        period,
        atrCount: atrValues.length,
        sampleATR: atrValues.slice(-3),
        firstATR: atrValues[0],
        minATR: Math.min(...atrValues),
        maxATR: Math.max(...atrValues)
      });
    }
    
    // Return as multi-series structure to match TA service format
    return { atr }
  },
  draw(ctx, data:any, style, xOfIdx, yOfPrice, from, to, candles) {
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ATR Draw] Starting draw:', {
        dataType: typeof data,
        isMap: data instanceof Map,
        hasAtr: !!(data && data.atr),
        dataSize: data?.size || data?.atr?.size || 0,
        from, to, candlesLength: candles.length,
        style: style
      });
    }
    
    // Handle both single Map and multi-series formats
    let atrData: Map<number, number | null>;
    
    if (data instanceof Map) {
      // Single Map format (fallback)
      atrData = data;
    } else if (data && typeof data === 'object' && 'atr' in data && data.atr instanceof Map) {
      // Multi-series format
      atrData = data.atr;
    } else {
      console.warn('[ATR Draw] Invalid data structure, skipping draw:', typeof data, data);
      return;
    }
    
    // Check if we have any data to draw
    if (!atrData || atrData.size === 0) {
      console.warn('[ATR Draw] No ATR data available, skipping draw');
      return;
    }
    
    ctx.save()
    
    // Draw ATR line
    ctx.strokeStyle = (style as any).color || style.color || '#9C27B0'; // Purple
    ctx.lineWidth = (style as any).width || style.width || 1.5;
    let started = false;
    ctx.beginPath();
    
    for (let i = from; i <= to; i++) {
      if (i < 0 || i >= candles.length) continue;
      
      const ts = candles[i].t;
      const atrVal = atrData.get(ts);
      
      if (atrVal === null) {
        started = false;
        continue;
      }
      
      const x = xOfIdx(i);
      const y = yOfPrice(atrVal);
      
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (started) ctx.stroke();
    
    // Draw zero line (ATR should never be negative, but good for reference)
    const zeroY = yOfPrice(0);
    ctx.strokeStyle = 'rgba(120, 123, 134, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(xOfIdx(from), zeroY);
    ctx.lineTo(xOfIdx(to), zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.restore()
  }
};

registerIndicator(ATR);
export default ATR;

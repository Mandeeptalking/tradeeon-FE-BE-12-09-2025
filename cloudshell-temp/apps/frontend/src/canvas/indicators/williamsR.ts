// src/canvas/indicators/williamsR.ts
import { IndicatorDef, registerIndicator, type Candle } from './registry';
import { williamsRSeries } from '../../shared/indicators/core';

const WILLIAMS_R: IndicatorDef = {
  name: 'WILLIAMS_R',
  pane: 'williams_r', // Dedicated pane for Williams %R
  calc(candles: Candle[], params: { period?:number }) {
    const period = Number(params.period ?? 14)
    const { williamsR } = williamsRSeries(candles, period)
    
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      const wrValues = Array.from(williamsR.values()).filter(v => v !== null);
      console.log('[Williams %R Calc] Computed:', {
        candles: candles.length,
        period,
        wrCount: wrValues.length,
        sampleWR: wrValues.slice(-3),
        firstWR: wrValues[0],
        minWR: Math.min(...wrValues),
        maxWR: Math.max(...wrValues)
      });
    }
    
    return williamsR
  },
  draw(ctx, data:any, style, xOfIdx, yOfPrice, from, to, candles) {
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Williams %R Draw] Starting draw:', {
        dataType: typeof data,
        isMap: data instanceof Map,
        dataSize: data?.size || 0,
        from, to, candlesLength: candles.length,
        style: style
      });
    }
    
    // Early exit if data structure is not ready
    if (!data || !(data instanceof Map)) {
      console.warn('[Williams %R Draw] Data is not a Map, skipping draw');
      return;
    }
    
    // Check if we have any data to draw
    if (data.size === 0) {
      console.warn('[Williams %R Draw] No data available, skipping draw');
      return;
    }
    
    ctx.save()
    
    // Draw horizontal reference lines at -20, -50, and -80
    const y20 = yOfPrice(-20); // Oversold level
    const y50 = yOfPrice(-50); // Middle level
    const y80 = yOfPrice(-80); // Overbought level
    
    ctx.strokeStyle = 'rgba(120, 123, 134, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // -20 line (oversold)
    ctx.beginPath();
    ctx.moveTo(xOfIdx(from), y20);
    ctx.lineTo(xOfIdx(to), y20);
    ctx.stroke();
    
    // -50 line (middle)
    ctx.beginPath();
    ctx.moveTo(xOfIdx(from), y50);
    ctx.lineTo(xOfIdx(to), y50);
    ctx.stroke();
    
    // -80 line (overbought)
    ctx.beginPath();
    ctx.moveTo(xOfIdx(from), y80);
    ctx.lineTo(xOfIdx(to), y80);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Draw Williams %R line
    ctx.strokeStyle = (style as any).color || style.color || '#FF9800'; // Orange
    ctx.lineWidth = (style as any).width || style.width || 1.5;
    let started = false;
    ctx.beginPath();
    
    for (let i = from; i <= to; i++) {
      if (i < 0 || i >= candles.length) continue;
      
      const ts = candles[i].t;
      const wrVal = data.get(ts);
      
      if (wrVal === null) {
        started = false;
        continue;
      }
      
      const x = xOfIdx(i);
      const y = yOfPrice(wrVal);
      
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (started) ctx.stroke();
    
    ctx.restore()
  }
};

registerIndicator(WILLIAMS_R);
export default WILLIAMS_R;

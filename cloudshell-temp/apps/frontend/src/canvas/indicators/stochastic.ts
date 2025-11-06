// src/canvas/indicators/stochastic.ts
import { IndicatorDef, registerIndicator, type Candle } from './registry';
import { stochasticSeries } from '../../shared/indicators/core';

const STOCHASTIC: IndicatorDef = {
  name: 'STOCHASTIC',
  pane: 'stochastic', // Dedicated pane for stochastic
  calc(candles: Candle[], params: { k_period?:number; d_period?:number; smooth_k?:number }) {
    const kPeriod = Number(params.k_period ?? 14)
    const dPeriod = Number(params.d_period ?? 3)
    const smoothK = Number(params.smooth_k ?? 1)
    const { k, d } = stochasticSeries(candles, kPeriod, dPeriod, smoothK)
    
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      const kValues = Array.from(k.values()).filter(v => v !== null);
      const dValues = Array.from(d.values()).filter(v => v !== null);
      console.log('[Stochastic Calc] Computed:', {
        candles: candles.length,
        kPeriod,
        dPeriod,
        smoothK,
        kCount: kValues.length,
        dCount: dValues.length,
        sampleK: kValues.slice(-3),
        sampleD: dValues.slice(-3),
        firstK: kValues[0],
        firstD: dValues[0]
      });
    }
    
    return { k, d } as any
  },
  draw(ctx, data:any, style, xOfIdx, yOfPrice, from, to, candles) {
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Stochastic Draw] Starting draw:', {
        hasK: !!(data && data.k),
        hasD: !!(data && data.d), 
        kSize: data?.k?.size || 0,
        dSize: data?.d?.size || 0,
        from, to, candlesLength: candles.length,
        style: style
      });
    }
    
    // Early exit if data structure is not ready
    if (!data || !data.k || !data.d) {
      console.warn('[Stochastic Draw] Incomplete data structure, skipping draw');
      return;
    }
    
    // Additional check to ensure we have Map objects
    if (!(data.k instanceof Map) || !(data.d instanceof Map)) {
      console.warn('[Stochastic Draw] Data is not in Map format, skipping draw');
      return;
    }
    
    // Check if we have any data to draw
    const hasData = data.k.size > 0 || data.d.size > 0;
    if (!hasData) {
      console.warn('[Stochastic Draw] No data available, skipping draw');
      return;
    }
    
    ctx.save()
    
    // Draw horizontal reference lines at 20, 50, and 80
    const y20 = yOfPrice(20);
    const y50 = yOfPrice(50);
    const y80 = yOfPrice(80);
    
    ctx.strokeStyle = 'rgba(120, 123, 134, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // 20 line (oversold)
    ctx.beginPath();
    ctx.moveTo(xOfIdx(from), y20);
    ctx.lineTo(xOfIdx(to), y20);
    ctx.stroke();
    
    // 50 line (middle)
    ctx.beginPath();
    ctx.moveTo(xOfIdx(from), y50);
    ctx.lineTo(xOfIdx(to), y50);
    ctx.stroke();
    
    // 80 line (overbought)
    ctx.beginPath();
    ctx.moveTo(xOfIdx(from), y80);
    ctx.lineTo(xOfIdx(to), y80);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Draw %K line (main stochastic line)
    ctx.strokeStyle = (style as any).kColor || '#FF6B6B'; // Red
    ctx.lineWidth = (style as any).lineWidth || 1.5;
    let kStarted = false;
    ctx.beginPath();
    
    for (let i = from; i <= to; i++) {
      if (i < 0 || i >= candles.length) continue;
      
      const ts = candles[i].t;
      const kVal = data.k.get(ts);
      
      if (kVal === null) {
        kStarted = false;
        continue;
      }
      
      const x = xOfIdx(i);
      const y = yOfPrice(kVal);
      
      if (!kStarted) {
        ctx.moveTo(x, y);
        kStarted = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (kStarted) ctx.stroke();
    
    // Draw %D line (signal line)
    ctx.strokeStyle = (style as any).dColor || '#4ECDC4'; // Teal
    ctx.lineWidth = (style as any).lineWidth || 1.5;
    let dStarted = false;
    ctx.beginPath();
    
    for (let i = from; i <= to; i++) {
      if (i < 0 || i >= candles.length) continue;
      
      const ts = candles[i].t;
      const dVal = data.d.get(ts);
      
      if (dVal === null) {
        dStarted = false;
        continue;
      }
      
      const x = xOfIdx(i);
      const y = yOfPrice(dVal);
      
      if (!dStarted) {
        ctx.moveTo(x, y);
        dStarted = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (dStarted) ctx.stroke();
    
    ctx.restore()
  }
};

registerIndicator(STOCHASTIC);
export default STOCHASTIC;

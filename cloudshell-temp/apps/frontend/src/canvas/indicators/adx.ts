// src/canvas/indicators/adx.ts
import { IndicatorDef, registerIndicator, type Candle } from './registry';
import { adxSeries } from '../../shared/indicators/core';

const ADX: IndicatorDef = {
  name: 'ADX',
  pane: 'adx', // Dedicated pane for ADX
  calc(candles: Candle[], params: { period?:number; threshold?:number }) {
    const period = Number(params.period ?? 14)
    const { diPlus, diMinus, adx } = adxSeries(candles, period)
    
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      const diPlusValues = Array.from(diPlus.values()).filter(v => v !== null);
      const diMinusValues = Array.from(diMinus.values()).filter(v => v !== null);
      const adxValues = Array.from(adx.values()).filter(v => v !== null);
      console.log('[ADX Calc] Computed:', {
        candles: candles.length,
        period,
        diPlusCount: diPlusValues.length,
        diMinusCount: diMinusValues.length,
        adxCount: adxValues.length,
        sampleDiPlus: diPlusValues.slice(-3),
        sampleDiMinus: diMinusValues.slice(-3),
        sampleAdx: adxValues.slice(-3)
      });
    }
    
    // Return as multi-series structure to match TA service format
    return { diPlus, diMinus, adx }
  },
  draw(ctx, data:any, style, xOfIdx, yOfPrice, from, to, candles) {
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ADX Draw] Starting draw:', {
        hasDiPlus: !!(data && data.diPlus),
        hasDiMinus: !!(data && data.diMinus),
        hasAdx: !!(data && data.adx),
        diPlusSize: data?.diPlus?.size || 0,
        diMinusSize: data?.diMinus?.size || 0,
        adxSize: data?.adx?.size || 0,
        from, to, candlesLength: candles.length,
        style: style
      });
    }
    
    // Early exit if data structure is not ready
    if (!data || !data.diPlus || !data.diMinus || !data.adx) {
      console.warn('[ADX Draw] Incomplete data structure, skipping draw');
      return;
    }
    
    // Additional check to ensure we have Map objects
    if (!(data.diPlus instanceof Map) || !(data.diMinus instanceof Map) || !(data.adx instanceof Map)) {
      console.warn('[ADX Draw] Data is not in Map format, skipping draw');
      return;
    }
    
    // Check if we have any data to draw
    const hasData = data.diPlus.size > 0 || data.diMinus.size > 0 || data.adx.size > 0;
    if (!hasData) {
      console.warn('[ADX Draw] No data available, skipping draw');
      return;
    }
    
    ctx.save()
    
    // Get threshold value from style parameters or use default
    const threshold = (style as any).threshold || 20;
    
    // Draw horizontal reference line (threshold) if enabled
    if ((style as any).showThreshold !== false) {
      const yThreshold = yOfPrice(threshold);
      ctx.strokeStyle = (style as any).thresholdColor || 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = (style as any).thresholdWidth || 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(xOfIdx(from), yThreshold);
      ctx.lineTo(xOfIdx(to), yThreshold);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw DI+ line (green) if enabled
    if ((style as any).showDiPlus !== false) {
      ctx.strokeStyle = (style as any).diPlusColor || '#4CAF50'; // Green
      ctx.lineWidth = (style as any).diPlusWidth || 1.5;
      // Apply line style
      if ((style as any).diPlusStyle === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }
      let diPlusStarted = false;
      ctx.beginPath();
      
      for (let i = from; i <= to; i++) {
        if (i < 0 || i >= candles.length) continue;
        
        const ts = candles[i].t;
        const diPlusVal = data.diPlus.get(ts);
        
        if (diPlusVal === null) {
          diPlusStarted = false;
          continue;
        }
        
        const x = xOfIdx(i);
        const y = yOfPrice(diPlusVal);
        
        if (!diPlusStarted) {
          ctx.moveTo(x, y);
          diPlusStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      if (diPlusStarted) ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw DI- line (red) if enabled
    if ((style as any).showDiMinus !== false) {
      ctx.strokeStyle = (style as any).diMinusColor || '#F44336'; // Red
      ctx.lineWidth = (style as any).diMinusWidth || 1.5;
      // Apply line style
      if ((style as any).diMinusStyle === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }
      let diMinusStarted = false;
      ctx.beginPath();
      
      for (let i = from; i <= to; i++) {
        if (i < 0 || i >= candles.length) continue;
        
        const ts = candles[i].t;
        const diMinusVal = data.diMinus.get(ts);
        
        if (diMinusVal === null) {
          diMinusStarted = false;
          continue;
        }
        
        const x = xOfIdx(i);
        const y = yOfPrice(diMinusVal);
        
        if (!diMinusStarted) {
          ctx.moveTo(x, y);
          diMinusStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      if (diMinusStarted) ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw ADX line (navy blue) if enabled
    if ((style as any).showAdx !== false) {
      ctx.strokeStyle = (style as any).adxColor || '#1976D2'; // Navy blue
      ctx.lineWidth = (style as any).adxWidth || 2;
      // Apply line style
      if ((style as any).adxStyle === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }
      let adxStarted = false;
      ctx.beginPath();
      
      for (let i = from; i <= to; i++) {
        if (i < 0 || i >= candles.length) continue;
        
        const ts = candles[i].t;
        const adxVal = data.adx.get(ts);
        
        if (adxVal === null) {
          adxStarted = false;
          continue;
        }
        
        const x = xOfIdx(i);
        const y = yOfPrice(adxVal);
        
        if (!adxStarted) {
          ctx.moveTo(x, y);
          adxStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      if (adxStarted) ctx.stroke();
      ctx.setLineDash([]);
    }
    
    ctx.restore()
  }
};

registerIndicator(ADX);
export default ADX;

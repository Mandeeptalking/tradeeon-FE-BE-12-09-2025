// src/canvas/indicators/bollinger.ts
import { IndicatorDef, registerIndicator, type Candle } from './registry';
import { bollingerBandsSeries } from '../../shared/indicators/core';

const BOLLINGER_BANDS: IndicatorDef = {
  name: 'BOLLINGER_BANDS',
  pane: 'price', // Overlay on price chart
  calc(candles: Candle[], params: { period?:number; std_dev?:number; source?:any }) {
    const period = Number(params.period ?? 20)
    const stdDev = Number(params.std_dev ?? 2)
    const source = (params.source ?? 'close') as any
    const { upper, middle, lower } = bollingerBandsSeries(candles, period, stdDev, source)
    
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      const upperValues = Array.from(upper.values()).filter(v => v !== null);
      const middleValues = Array.from(middle.values()).filter(v => v !== null);
      const lowerValues = Array.from(lower.values()).filter(v => v !== null);
      console.log('[Bollinger Bands Calc] Computed:', {
        candles: candles.length,
        period: period,
        stdDev: stdDev,
        source: source,
        upperCount: upperValues.length,
        middleCount: middleValues.length,
        lowerCount: lowerValues.length,
        sampleUpper: upperValues.slice(-3),
        sampleMiddle: middleValues.slice(-3),
        sampleLower: lowerValues.slice(-3),
        firstUpper: upperValues[0],
        firstMiddle: middleValues[0],
        firstLower: lowerValues[0]
      });
    }
    
    return { upper, middle, lower } as any
  },
  draw(ctx, data:any, style, xOfIdx, yOfPrice, from, to, candles) {
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Bollinger Bands Draw] Starting draw:', {
        hasUpper: !!(data && data.upper),
        hasMiddle: !!(data && data.middle), 
        hasLower: !!(data && data.lower),
        upperSize: data?.upper?.size || 0,
        middleSize: data?.middle?.size || 0,
        lowerSize: data?.lower?.size || 0,
        from, to, candlesLength: candles.length,
        style: style
      });
    }
    
    // Early exit if data structure is not ready
    if (!data || !data.upper || !data.middle || !data.lower) {
      console.warn('[Bollinger Bands Draw] Incomplete data structure, skipping draw');
      return;
    }
    
    // Additional check to ensure we have Map objects
    if (!(data.upper instanceof Map) || !(data.middle instanceof Map) || !(data.lower instanceof Map)) {
      console.warn('[Bollinger Bands Draw] Data is not in Map format, skipping draw');
      return;
    }
    
    // Check if we have any data to draw
    const hasData = data.upper.size > 0 || data.middle.size > 0 || data.lower.size > 0;
    if (!hasData) {
      console.warn('[Bollinger Bands Draw] No data available, skipping draw');
      return;
    }
    
    ctx.save()
    
    // 1) Draw the band fill (area between upper and lower bands)
    ctx.fillStyle = (style as any).fillColor || 'rgba(100, 149, 237, 0.1)'; // Light blue with transparency
    
    // Create upper and lower band paths
    const upperPath: {x: number, y: number}[] = [];
    const lowerPath: {x: number, y: number}[] = [];
    
    for (let i = from; i <= to; i++) {
      if (i < 0 || i >= candles.length) continue;
      
      const ts = candles[i].t;
      const upperVal = data.upper.get(ts);
      const lowerVal = data.lower.get(ts);
      
      if (upperVal === null || lowerVal === null) continue;
      
      const x = xOfIdx(i);
      upperPath.push({ x, y: yOfPrice(upperVal) });
      lowerPath.push({ x, y: yOfPrice(lowerVal) });
    }
    
    // Draw the fill area
    if (upperPath.length > 0 && lowerPath.length > 0) {
      ctx.beginPath();
      
      // Draw upper path
      ctx.moveTo(upperPath[0].x, upperPath[0].y);
      for (let i = 1; i < upperPath.length; i++) {
        ctx.lineTo(upperPath[i].x, upperPath[i].y);
      }
      
      // Draw lower path in reverse
      for (let i = lowerPath.length - 1; i >= 0; i--) {
        ctx.lineTo(lowerPath[i].x, lowerPath[i].y);
      }
      
      ctx.closePath();
      ctx.fill();
    }
    
    // 2) Draw upper band line
    ctx.strokeStyle = (style as any).upperColor || '#8B4513'; // Brown
    ctx.lineWidth = (style as any).lineWidth || 1;
    let upperStarted = false;
    ctx.beginPath();
    
    for (let i = from; i <= to; i++) {
      if (i < 0 || i >= candles.length) continue;
      
      const ts = candles[i].t;
      const upperVal = data.upper.get(ts);
      
      if (upperVal === null) {
        upperStarted = false;
        continue;
      }
      
      const x = xOfIdx(i);
      const y = yOfPrice(upperVal);
      
      if (!upperStarted) {
        ctx.moveTo(x, y);
        upperStarted = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (upperStarted) ctx.stroke();
    
    // 3) Draw middle band line (SMA)
    ctx.strokeStyle = (style as any).middleColor || '#4169E1'; // Royal blue
    ctx.lineWidth = (style as any).lineWidth || 1;
    let middleStarted = false;
    ctx.beginPath();
    
    for (let i = from; i <= to; i++) {
      if (i < 0 || i >= candles.length) continue;
      
      const ts = candles[i].t;
      const middleVal = data.middle.get(ts);
      
      if (middleVal === null) {
        middleStarted = false;
        continue;
      }
      
      const x = xOfIdx(i);
      const y = yOfPrice(middleVal);
      
      if (!middleStarted) {
        ctx.moveTo(x, y);
        middleStarted = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (middleStarted) ctx.stroke();
    
    // 4) Draw lower band line
    ctx.strokeStyle = (style as any).lowerColor || '#8B4513'; // Brown
    ctx.lineWidth = (style as any).lineWidth || 1;
    let lowerStarted = false;
    ctx.beginPath();
    
    for (let i = from; i <= to; i++) {
      if (i < 0 || i >= candles.length) continue;
      
      const ts = candles[i].t;
      const lowerVal = data.lower.get(ts);
      
      if (lowerVal === null) {
        lowerStarted = false;
        continue;
      }
      
      const x = xOfIdx(i);
      const y = yOfPrice(lowerVal);
      
      if (!lowerStarted) {
        ctx.moveTo(x, y);
        lowerStarted = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (lowerStarted) ctx.stroke();
    
    ctx.restore()
  }
};

registerIndicator(BOLLINGER_BANDS);
export default BOLLINGER_BANDS;

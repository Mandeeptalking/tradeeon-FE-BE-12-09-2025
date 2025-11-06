// src/canvas/indicators/macd.ts
import { IndicatorDef, registerIndicator, type Candle } from './registry';
import { macdSeries } from '../../shared/indicators/core';

const MACD: IndicatorDef = {
  name: 'MACD',
  pane: 'macd',
  calc(candles: Candle[], params: { fast?:number; slow?:number; signal?:number; source?:any }) {
    const fast = Number(params.fast ?? 12)
    const slow = Number(params.slow ?? 26)
    const signal = Number(params.signal ?? 9)
    const source = (params.source ?? 'close') as any
    const { macd, signal: sig, hist } = macdSeries(candles, fast, slow, signal, source)
    
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      const macdValues = Array.from(macd.values()).filter(v => v !== null);
      const signalValues = Array.from(sig.values()).filter(v => v !== null);
      const histValues = Array.from(hist.values()).filter(v => v !== null);
      console.log('[MACD Calc] Computed:', {
        candles: candles.length,
        macdCount: macdValues.length,
        signalCount: signalValues.length,
        histCount: histValues.length,
        sampleMacd: macdValues.slice(-3),
        sampleSignal: signalValues.slice(-3),
        sampleHist: histValues.slice(-3)
      });
    }
    
    return { macd, signal: sig, hist } as any
  },
  draw(ctx, data:any, style, xOfIdx, yOfPrice, from, to, candles) {
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('[MACD Draw] Data structure:', {
        hasMacd: !!(data && data.macd),
        hasSignal: !!(data && data.signal), 
        hasHist: !!(data && data.hist),
        macdSize: data?.macd?.size || 0,
        signalSize: data?.signal?.size || 0,
        histSize: data?.hist?.size || 0,
        from, to, candlesLength: candles.length
      });
    }
    
    // Early exit if data structure is not ready
    if (!data || !data.macd || !data.signal || !data.hist) {
      console.warn('[MACD Draw] Incomplete data structure, skipping draw');
      return;
    }
    
    // Additional check to ensure we have Map objects
    if (!(data.macd instanceof Map) || !(data.signal instanceof Map) || !(data.hist instanceof Map)) {
      console.warn('[MACD Draw] Data is not in Map format, skipping draw');
      return;
    }
    
    // Check if we have any data to draw
    const hasData = data.macd.size > 0 || data.signal.size > 0 || data.hist.size > 0;
    if (!hasData) {
      console.warn('[MACD Draw] No data available, skipping draw');
      return;
    }
    
    ctx.save()
    
    // 1) zero line (dashed gray)
    const zeroY = yOfPrice(0)
    ctx.strokeStyle = 'rgba(120, 123, 134, 0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.moveTo(xOfIdx(from), zeroY)
    ctx.lineTo(xOfIdx(to), zeroY)
    ctx.stroke()
    ctx.setLineDash([])

    // 2) histogram bars (green above zero, red below)
    const barW = Math.max(1, Math.floor((xOfIdx(from+1)-xOfIdx(from))*0.6))
    for (let i=from;i<=to;i++){
      const ts=candles[i].t
      const h = data.hist.get(ts)
      if (h==null) continue
      
      const x = Math.round(xOfIdx(i) - barW/2)
      const yh = yOfPrice(h)
      
      ctx.fillStyle = h >= 0 ? '#16a34a' : '#ef4444'
      const top = Math.min(zeroY, yh)
      const height = Math.abs(yh - zeroY)
      ctx.fillRect(x, top, barW, Math.max(1, height))
    }

    // 3) MACD line (blue)
    ctx.strokeStyle = '#4f46e5'
    ctx.lineWidth = 1.5
    let started = false
    ctx.beginPath()
    for(let i=from;i<=to;i++){
      const ts=candles[i].t
      const v=data.macd.get(ts)
      if(v==null){
        started = false
        continue
      }
      const x=xOfIdx(i)
      const y=yOfPrice(v)
      if(!started){
        ctx.moveTo(x,y)
        started = true
      } else {
        ctx.lineTo(x,y)
      }
    }
    if(started) ctx.stroke()

    // 4) Signal line (orange)
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 1.5
    started = false
    ctx.beginPath()
    for(let i=from;i<=to;i++){
      const ts=candles[i].t
      const v=data.signal.get(ts)
      if(v==null){
        started = false
        continue
      }
      const x=xOfIdx(i)
      const y=yOfPrice(v)
      if(!started){
        ctx.moveTo(x,y)
        started = true
      } else {
        ctx.lineTo(x,y)
      }
    }
    if(started) ctx.stroke()
    
    ctx.restore()
  }
};

registerIndicator(MACD);
export default MACD;

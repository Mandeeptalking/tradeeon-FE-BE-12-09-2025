// src/mocks/taService.ts (only in dev)
// Very small mock: uses local core to compute series
import { emaSeries, rsiSeries, macdSeries, bollingerBandsSeries, stochasticSeries, williamsRSeries, atrSeries, adxSeries, type Candle } from '../shared/indicators/core'
import { TF_MS, resampleOHLC } from '../shared/indicators/mtf'

// Additional indicator calculations for mock service
function calculateMACD(candles: Candle[], params: { fast?: number; slow?: number; signal?: number }): Map<number, number|null> {
  const fast = params.fast ?? 12
  const slow = params.slow ?? 26
  const signal = params.signal ?? 9
  
  const emaFast = emaSeries(candles, fast, 'close')
  const emaSlow = emaSeries(candles, slow, 'close')
  
  const macdMap = new Map<number, number|null>()
  
  for (const candle of candles) {
    const fastVal = emaFast.get(candle.t)
    const slowVal = emaSlow.get(candle.t)
    
    if (fastVal !== null && slowVal !== null) {
      const macdLine = fastVal - slowVal
      macdMap.set(candle.t, macdLine)
    } else {
      macdMap.set(candle.t, null)
    }
  }
  
  return macdMap
}

function calculateBBands(candles: Candle[], params: { length?: number; std?: number }): Map<number, number|null> {
  const length = params.length ?? 20
  const std = params.std ?? 2
  
  const ema = emaSeries(candles, length, 'close')
  const bbMap = new Map<number, number|null>()
  
  // Simple BB calculation (in real implementation, use proper standard deviation)
  for (let i = length - 1; i < candles.length; i++) {
    const slice = candles.slice(i - length + 1, i + 1)
    const close = ema.get(candles[i].t)
    
    if (close !== null) {
      const variance = slice.reduce((sum, c) => sum + Math.pow(c.c - close, 2), 0) / length
      const stdDev = Math.sqrt(variance)
      const upperBand = close + (std * stdDev)
      bbMap.set(candles[i].t, upperBand) // Return upper band for simplicity
    } else {
      bbMap.set(candles[i].t, null)
    }
  }
  
  return bbMap
}

function calculateStoch(candles: Candle[], params: { k?: number; d?: number }): Map<number, number|null> {
  const k = params.k ?? 14
  const d = params.d ?? 3
  
  const stochMap = new Map<number, number|null>()
  
  for (let i = k - 1; i < candles.length; i++) {
    const slice = candles.slice(i - k + 1, i + 1)
    const highest = Math.max(...slice.map(c => c.h))
    const lowest = Math.min(...slice.map(c => c.l))
    const current = candles[i].c
    
    if (highest !== lowest) {
      const stochK = ((current - lowest) / (highest - lowest)) * 100
      stochMap.set(candles[i].t, stochK)
    } else {
      stochMap.set(candles[i].t, null)
    }
  }
  
  return stochMap
}

function calculateATR(candles: Candle[], params: { length?: number }): Map<number, number|null> {
  const length = params.length ?? 14
  
  const atrMap = new Map<number, number|null>()
  
  if (candles.length < 2) {
    candles.forEach(c => atrMap.set(c.t, null))
    return atrMap
  }
  
  const trValues: number[] = []
  
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1]
    const curr = candles[i]
    
    const tr = Math.max(
      curr.h - curr.l,
      Math.abs(curr.h - prev.c),
      Math.abs(curr.l - prev.c)
    )
    
    trValues.push(tr)
    
    if (i >= length) {
      const atrSlice = trValues.slice(-length)
      const atr = atrSlice.reduce((sum, val) => sum + val, 0) / length
      atrMap.set(curr.t, atr)
    } else {
      atrMap.set(curr.t, null)
    }
  }
  
  return atrMap
}

function calculateADX(candles: Candle[], params: { length?: number }): Map<number, number|null> {
  const length = params.length ?? 14
  
  const adxMap = new Map<number, number|null>()
  
  if (candles.length < length + 1) {
    candles.forEach(c => adxMap.set(c.t, null))
    return adxMap
  }
  
  // Simplified ADX calculation (in real implementation, use proper DI+ and DI-)
  const atr = calculateATR(candles, { length })
  
  for (let i = length; i < candles.length; i++) {
    const curr = candles[i]
    const prev = candles[i - 1]
    
    const atrVal = atr.get(curr.t)
    if (atrVal !== null && atrVal > 0) {
      const dmPlus = Math.max(0, curr.h - prev.h)
      const dmMinus = Math.max(0, prev.l - curr.l)
      
      const diPlus = (dmPlus / atrVal) * 100
      const diMinus = (dmMinus / atrVal) * 100
      
      const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100
      adxMap.set(curr.t, dx)
    } else {
      adxMap.set(curr.t, null)
    }
  }
  
  return adxMap
}

export function createMockTaRouter(getCandles: (symbol:string, tf:string)=>Candle[]) {
  return async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url)
    if (!url.pathname.endsWith('/series')) return new Response('Not found', { status: 404 })

    const symbol = url.searchParams.get('symbol')!
    const tf = url.searchParams.get('tf')!
    const name = url.searchParams.get('name')!
    const source = (url.searchParams.get('source') ?? 'close') as any
    const params = JSON.parse(url.searchParams.get('params') ?? '{}')

    const base = getCandles(symbol, tf) // supply candles by tf
    const candles = tf in TF_MS ? resampleOHLC(base, TF_MS[tf as keyof typeof TF_MS]) : base

    let map: Map<number, number|null>
    switch (name.toUpperCase()) {
      case 'EMA': map = emaSeries(candles, Number(params.length ?? 20), source); break
      case 'RSI': map = rsiSeries(candles, Number(params.length ?? 14), source); break
      
      // Add more indicators here
      case 'MACD': {
        const f = Number(params.fast ?? 12), s = Number(params.slow ?? 26), sig = Number(params.signal ?? 9)
        const m = macdSeries(candles, f, s, sig, source)
        const pack = (map:Map<number,number|null>) => Array.from(map, ([t,v]) => ({ t, v }))
        const payload = { macd: pack(m.macd), signal: pack(m.signal), hist: pack(m.hist) }
        return new Response(JSON.stringify(payload), { headers:{'Content-Type':'application/json'} })
      }
      case 'BOLLINGER_BANDS': {
        const period = Number(params.period ?? 20), stdDev = Number(params.std_dev ?? 2)
        const bb = bollingerBandsSeries(candles, period, stdDev, source)
        const pack = (map:Map<number,number|null>) => Array.from(map, ([t,v]) => ({ t, v }))
        const payload = { upper: pack(bb.upper), middle: pack(bb.middle), lower: pack(bb.lower) }
        return new Response(JSON.stringify(payload), { headers:{'Content-Type':'application/json'} })
      }
      case 'STOCHASTIC': {
        const kPeriod = Number(params.k_period ?? 14), dPeriod = Number(params.d_period ?? 3), smoothK = Number(params.smooth_k ?? 1)
        const stoch = stochasticSeries(candles, kPeriod, dPeriod, smoothK)
        const pack = (map:Map<number,number|null>) => Array.from(map, ([t,v]) => ({ t, v }))
        const payload = { k: pack(stoch.k), d: pack(stoch.d) }
        return new Response(JSON.stringify(payload), { headers:{'Content-Type':'application/json'} })
      }
      case 'WILLIAMS_R': {
        const period = Number(params.period ?? 14)
        const wr = williamsRSeries(candles, period)
        const pack = (map:Map<number,number|null>) => Array.from(map, ([t,v]) => ({ t, v }))
        const payload = { williamsR: pack(wr.williamsR) }
        return new Response(JSON.stringify(payload), { headers:{'Content-Type':'application/json'} })
      }
      case 'ATR': {
        const period = Number(params.period ?? 14)
        const atr = atrSeries(candles, period)
        const pack = (map:Map<number,number|null>) => Array.from(map, ([t,v]) => ({ t, v }))
        const payload = { atr: pack(atr.atr) }
        return new Response(JSON.stringify(payload), { headers:{'Content-Type':'application/json'} })
      }
      case 'ADX': {
        const period = Number(params.period ?? 14)
        const threshold = Number(params.threshold ?? 20)
        const adx = adxSeries(candles, period)
        const pack = (map:Map<number,number|null>) => Array.from(map, ([t,v]) => ({ t, v }))
        const payload = { diPlus: pack(adx.diPlus), diMinus: pack(adx.diMinus), adx: pack(adx.adx), threshold }
        return new Response(JSON.stringify(payload), { headers:{'Content-Type':'application/json'} })
      }
      case 'BBANDS': map = calculateBBands(candles, params); break
      case 'STOCH': map = calculateStoch(candles, params); break
      
      default:    map = new Map(candles.map(c => [c.t, null]))
    }

    const arr = Array.from(map.entries()).map(([t, v]) => ({ t, v }))
    return new Response(JSON.stringify(arr), { headers: { 'Content-Type': 'application/json' } })
  }
}

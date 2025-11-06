// src/services/taEngineClient.ts
import type { Candle, IndicatorEngine, IndicatorQuery, Series } from '../shared/engine/indicators'
import { resampleOHLC, stepAlign, TF_MS } from '../shared/indicators/mtf'

const BASE = '/api/ta'  // set real URL later via environment variable

type Point = { t:number, v:number|null }

async function fetchSeries(symbol: string, tf: string, name: string, params: any, source?: string): Promise<Point[] | Record<string, Point[]>> {
  const qs = new URLSearchParams({
    symbol, tf, name, source: source ?? 'close', params: JSON.stringify(params)
  })
  const r = await fetch(`${BASE}/series?${qs.toString()}`)
  if (!r.ok) throw new Error(`TA service ${r.status}`)
  return r.json()
}

export function createTaEngine(symbolProvider: () => string, baseTfProvider: () => string): IndicatorEngine {
  return {
    async compute(candles: Candle[], q: IndicatorQuery): Promise<Series | Record<string, Series>> {
      const symbol = symbolProvider()
      const baseTf = baseTfProvider()
      const targetTf = q.timeframe ?? baseTf

      // 1) pull HTF series from TA service (it computes on its own OHLC by tf)
      const response = await fetchSeries(symbol, targetTf, q.name, q.params, q.source)
      
      // Handle multi-series indicators (like MACD, ATR, ADX)
      if ((q.name.toUpperCase() === 'MACD' || q.name.toUpperCase() === 'ATR' || q.name.toUpperCase() === 'ADX') && Array.isArray(response) === false) {
        const multiData = response as Record<string, Point[]>
        const result: Record<string, Series> = {}
        
        for (const [seriesName, points] of Object.entries(multiData)) {
          const htfMap = new Map<number, number|null>(points.map(p => [p.t, p.v]))
          
          // 2) if MTF, align back to base candles
          if (targetTf !== baseTf) {
            const tfMs = TF_MS[targetTf as keyof typeof TF_MS]
            const htf = resampleOHLC(candles, tfMs)
            result[seriesName] = stepAlign(candles, htf, htfMap, tfMs, q.confirmOnClose ?? true)
          } else {
            // 3) otherwise return as-is
            const out: Series = new Map()
            for (const c of candles) out.set(c.t, htfMap.get(c.t) ?? null)
            result[seriesName] = out
          }
        }
        return result
      }
      
      // Handle single-series indicators
      const points = response as Point[]
      const htfMap = new Map<number, number|null>(points.map(p => [p.t, p.v]))

      // 2) if MTF, align back to base candles
      if (targetTf !== baseTf) {
        const tfMs = TF_MS[targetTf as keyof typeof TF_MS]
        // resample base to target tf to get HTF anchors
        const htf = resampleOHLC(candles, tfMs)
        return stepAlign(candles, htf, htfMap, tfMs, q.confirmOnClose ?? true)
      }

      // 3) otherwise return as-is (assume service ts matches input candles ts)
      const out: Series = new Map()
      for (const c of candles) out.set(c.t, htfMap.get(c.t) ?? null)
      return out
    }
  }
}

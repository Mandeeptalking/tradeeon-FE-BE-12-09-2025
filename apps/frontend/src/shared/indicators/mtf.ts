// src/shared/indicators/mtf.ts
import type { Candle } from './core'

export const TF_MS = {
  '1m': 60_000, '3m': 180_000, '5m': 300_000, '15m': 900_000, '30m': 1_800_000,
  '1h': 3_600_000, '2h': 7_200_000, '4h': 14_400_000, '6h': 21_600_000,
  '8h': 28_800_000, '12h': 43_200_000, '1d': 86_400_000, '3d': 259_200_000,
  '1w': 604_800_000, '1M': 2_592_000_000 // rough month bucket
} as const

export const bucket = (ts: number, tfMs: number) => Math.floor(ts / tfMs) * tfMs

export function resampleOHLC(base: Candle[], tfMs: number) {
  const out: Candle[] = []
  let cur: Candle | undefined
  for (const k of base) {
    const b = bucket(k.t, tfMs)
    if (!cur || bucket(cur.t, tfMs) !== b) {
      if (cur) out.push(cur)
      cur = { t: b, o: k.o, h: k.h, l: k.l, c: k.c, v: k.v }
    } else {
      cur.h = Math.max(cur.h, k.h)
      cur.l = Math.min(cur.l, k.l)
      cur.c = k.c
      if (k.v != null) cur.v = (cur.v ?? 0) + (k.v ?? 0)
    }
  }
  if (cur) out.push(cur)
  return out
}

/** Hold the last closed HTF value across LTF bars. confirmOnClose=true uses previous completed HTF bar. */
export function stepAlign(
  base: Candle[],
  htf: Candle[],
  htfMap: Map<number, number|null>,
  tfMs: number,
  confirmOnClose = true
) {
  const byTs = new Map<number, number>()
  htf.forEach((k, i) => byTs.set(k.t, i))
  const out = new Map<number, number|null>()
  for (const b of base) {
    const bkt = bucket(b.t, tfMs)
    const idx = byTs.get(bkt)
    const use = confirmOnClose ? (idx == null ? null : idx - 1) : idx
    const key = use != null && use >= 0 ? htf[use].t : undefined
    out.set(b.t, key != null ? (htfMap.get(key) ?? null) : null)
  }
  return out
}
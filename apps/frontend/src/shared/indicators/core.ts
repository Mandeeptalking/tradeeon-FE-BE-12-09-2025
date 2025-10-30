// src/shared/indicators/core.ts
export type Candle = { t:number; o:number; h:number; l:number; c:number; v?:number }

// ---------- EMA ----------
export function emaSeries(
  candles: Candle[],
  length: number,
  source: 'close'|'open'|'high'|'low'|'hlc3'|'ohlc4' = 'close'
) {
  const val = (k:Candle) => source==='open'?k.o
    : source==='high'?k.h
    : source==='low'?k.l
    : source==='hlc3'? (k.h+k.l+k.c)/3
    : source==='ohlc4'? (k.o+k.h+k.l+k.c)/4
    : k.c

  const out = new Map<number, number|null>()
  if (!candles.length) return out
  if (candles.length < length) { candles.forEach(k => out.set(k.t, null)); return out }

  let sum = 0
  for (let i = 0; i < length; i++) sum += val(candles[i])
  let ema = sum / length
  for (let i = 0; i < length - 1; i++) out.set(candles[i].t, null)
  out.set(candles[length - 1].t, ema)

  const k = 2 / (length + 1)
  for (let i = length; i < candles.length; i++) {
    ema = val(candles[i]) * k + ema * (1 - k)
    out.set(candles[i].t, ema)
  }
  return out
}

export function emaNext(
  next: Candle,
  prevEma: number | null,
  length: number,
  source: 'close'|'open'|'high'|'low'|'hlc3'|'ohlc4' = 'close'
) {
  if (prevEma == null) return null
  const v = source==='open'?next.o
    : source==='high'?next.h
    : source==='low'?next.l
    : source==='hlc3'?(next.h+next.l+next.c)/3
    : source==='ohlc4'?(next.o+next.h+next.l+next.c)/4
    : next.c
  const k = 2 / (length + 1)
  return v * k + prevEma * (1 - k)
}

// ---------- RSI (Wilder / RMA) ----------
export function rsiSeries(
  candles: Candle[],
  length = 14,
  source: 'close'|'hlc3'|'ohlc4' = 'close'
) {
  const val = (k:Candle)=> source==='hlc3'?(k.h+k.l+k.c)/3
    : source==='ohlc4'?(k.o+k.h+k.l+k.c)/4
    : k.c

  const out = new Map<number, number|null>()
  const n = candles.length
  if (n < length + 1) { candles.forEach(k => out.set(k.t, null)); return out }

  const changes: number[] = []
  for (let i = 1; i < n; i++) changes.push(val(candles[i]) - val(candles[i-1]))

  let avgGain = 0, avgLoss = 0
  for (let i = 0; i < length; i++) {
    const c = changes[i]
    if (c > 0) avgGain += c; else avgLoss -= c
  }
  avgGain /= length; avgLoss /= length

  // First 'length' bars => null
  for (let i = 0; i < length; i++) out.set(candles[i].t, null)

  // First RSI (at index length)
  const rs0 = avgLoss === 0 ? (avgGain === 0 ? 1 : Infinity) : avgGain / avgLoss
  out.set(candles[length].t, 100 - 100 / (1 + rs0))

  // Wilder smoothing
  for (let i = length + 1; i < n; i++) {
    const ch = changes[i - 1]
    const gain = ch > 0 ? ch : 0
    const loss = ch < 0 ? -ch : 0
    avgGain = (avgGain * (length - 1) + gain) / length
    avgLoss = (avgLoss * (length - 1) + loss) / length
    const rsi = avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - 100 / (1 + avgGain / avgLoss)
    out.set(candles[i].t, rsi)
  }
  return out
}

// ---------- MACD ----------
export function macdSeries(
  candles: Candle[],
  fast = 12, slow = 26, signalLen = 9,
  source: 'close'|'open'|'high'|'low'|'hlc3'|'ohlc4' = 'close'
) {
  // reuse emaSeries maps then build macd, signal(ema of macd), hist
  const fastMap = emaSeries(candles, fast, source)
  const slowMap = emaSeries(candles, slow, source)

  const macd = new Map<number, number|null>()
  const macdVals: (number|null)[] = []
  for (const k of candles) {
    const f = fastMap.get(k.t) ?? null
    const s = slowMap.get(k.t) ?? null
    const v = f == null || s == null ? null : (f - s)
    macd.set(k.t, v)
    macdVals.push(v)
  }

  // signal EMA over macd values (skip nulls until first real)
  const firstIdx = macdVals.findIndex(v => v != null)
  const signal = new Map<number, number|null>()
  if (firstIdx < 0) {
    for (const k of candles) signal.set(k.t, null)
  } else {
    // seed with SMA of first signalLen macd values
    let i = firstIdx
    while (i < macdVals.length && macdVals[i] == null) i++
    const buf:number[]=[]
    for (; i < macdVals.length && buf.length < signalLen; i++) {
      if (macdVals[i] == null) break
      buf.push(macdVals[i] as number)
    }
    const outArr:(number|null)[] = Array(candles.length).fill(null)
    if (buf.length === signalLen) {
      let ema = buf.reduce((a,b)=>a+b,0)/signalLen
      outArr[i-1] = ema
      const k = 2/(signalLen+1)
      for (let j=i; j<macdVals.length; j++){
        const m = macdVals[j]; if (m == null) { outArr[j] = null; continue }
        ema = m*k + ema*(1-k); outArr[j] = ema
      }
    }
    for (let j=0;j<candles.length;j++) signal.set(candles[j].t, outArr[j])
  }

  const hist = new Map<number, number|null>()
  for (const k of candles) {
    const m = macd.get(k.t) ?? null
    const s = signal.get(k.t) ?? null
    hist.set(k.t, m==null || s==null ? null : m - s)
  }

  return { macd, signal, hist }
}

// ---------- BOLLINGER BANDS ----------
export function bollingerBandsSeries(
  candles: Candle[],
  period = 20,
  stdDev = 2,
  source: 'close'|'open'|'high'|'low'|'hlc3'|'ohlc4' = 'close'
) {
  const middle = new Map<number, number|null>();
  const upper = new Map<number, number|null>();
  const lower = new Map<number, number|null>();
  
  // Calculate SMA (middle band) first
  const smaValues: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      middle.set(candles[i].t, null);
      upper.set(candles[i].t, null);
      lower.set(candles[i].t, null);
      continue;
    }
    
    // Calculate SMA
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const value = source === 'close' ? candles[j].c :
                   source === 'open' ? candles[j].o :
                   source === 'high' ? candles[j].h :
                   source === 'low' ? candles[j].l :
                   source === 'hlc3' ? (candles[j].h + candles[j].l + candles[j].c) / 3 :
                   source === 'ohlc4' ? (candles[j].o + candles[j].h + candles[j].l + candles[j].c) / 4 :
                   candles[j].c; // default to close
      sum += value;
    }
    const sma = sum / period;
    smaValues.push(sma);
    middle.set(candles[i].t, sma);
    
    // Calculate standard deviation
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const value = source === 'close' ? candles[j].c :
                   source === 'open' ? candles[j].o :
                   source === 'high' ? candles[j].h :
                   source === 'low' ? candles[j].l :
                   source === 'hlc3' ? (candles[j].h + candles[j].l + candles[j].c) / 3 :
                   source === 'ohlc4' ? (candles[j].o + candles[j].h + candles[j].l + candles[j].c) / 4 :
                   candles[j].c; // default to close
      variance += Math.pow(value - sma, 2);
    }
    const stdDeviation = Math.sqrt(variance / period);
    
    // Calculate upper and lower bands
    upper.set(candles[i].t, sma + (stdDeviation * stdDev));
    lower.set(candles[i].t, sma - (stdDeviation * stdDev));
  }
  
  return { upper, middle, lower }
}

// ---------- STOCHASTIC OSCILLATOR ----------
export function stochasticSeries(
  candles: Candle[],
  kPeriod = 14,
  dPeriod = 3,
  smoothK = 1
) {
  const k = new Map<number, number|null>();
  const d = new Map<number, number|null>();
  
  // Calculate %K for each period
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) {
      k.set(candles[i].t, null);
      continue;
    }
    
    // Find the highest high and lowest low over the period
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let j = i - kPeriod + 1; j <= i; j++) {
      highestHigh = Math.max(highestHigh, candles[j].h);
      lowestLow = Math.min(lowestLow, candles[j].l);
    }
    
    // Calculate %K
    const close = candles[i].c;
    const range = highestHigh - lowestLow;
    const kValue = range === 0 ? 50 : ((close - lowestLow) / range) * 100;
    
    k.set(candles[i].t, kValue);
  }
  
  // Calculate smoothed %K if requested
  const smoothedK = new Map<number, number|null>();
  if (smoothK > 1) {
    for (let i = 0; i < candles.length; i++) {
      if (i < kPeriod + smoothK - 2) {
        smoothedK.set(candles[i].t, null);
        continue;
      }
      
      let sum = 0;
      let count = 0;
      for (let j = i - smoothK + 1; j <= i; j++) {
        const kVal = k.get(candles[j].t);
        if (kVal !== null) {
          sum += kVal;
          count++;
        }
      }
      
      smoothedK.set(candles[i].t, count > 0 ? sum / count : null);
    }
  } else {
    // No smoothing, copy %K values
    k.forEach((value, timestamp) => {
      smoothedK.set(timestamp, value);
    });
  }
  
  // Calculate %D (SMA of smoothed %K)
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod + smoothK + dPeriod - 3) {
      d.set(candles[i].t, null);
      continue;
    }
    
    let sum = 0;
    let count = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) {
      const smoothedKVal = smoothedK.get(candles[j].t);
      if (smoothedKVal !== null) {
        sum += smoothedKVal;
        count++;
      }
    }
    
    d.set(candles[i].t, count > 0 ? sum / count : null);
  }
  
  return { k: smoothedK, d }
}

// ---------- WILLIAMS %R ----------
export function williamsRSeries(
  candles: Candle[],
  period = 14
) {
  const williamsR = new Map<number, number|null>();
  
  // Calculate Williams %R for each period
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      williamsR.set(candles[i].t, null);
      continue;
    }
    
    // Find the highest high and lowest low over the period
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let j = i - period + 1; j <= i; j++) {
      highestHigh = Math.max(highestHigh, candles[j].h);
      lowestLow = Math.min(lowestLow, candles[j].l);
    }
    
    // Calculate Williams %R
    const close = candles[i].c;
    const range = highestHigh - lowestLow;
    const williamsValue = range === 0 ? -50 : ((highestHigh - close) / range) * -100;
    
    williamsR.set(candles[i].t, williamsValue);
  }
  
  return { williamsR }
}

// ---------- AVERAGE TRUE RANGE (ATR) ----------
export function atrSeries(
  candles: Candle[],
  period = 14
) {
  const atr = new Map<number, number|null>();
  
  if (candles.length === 0) return { atr };
  
  // Calculate True Range for each candle
  const trueRanges: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      // First candle: True Range = High - Low
      trueRanges.push(candles[i].h - candles[i].l);
    } else {
      // True Range = max of:
      // 1. High - Low
      // 2. |High - Previous Close|
      // 3. |Low - Previous Close|
      const currentHigh = candles[i].h;
      const currentLow = candles[i].l;
      const prevClose = candles[i - 1].c;
      
      const tr1 = currentHigh - currentLow;
      const tr2 = Math.abs(currentHigh - prevClose);
      const tr3 = Math.abs(currentLow - prevClose);
      
      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }
    
    // Set initial values to null
    atr.set(candles[i].t, null);
  }
  
  // Calculate ATR using Wilder's smoothing (exponential moving average)
  if (candles.length >= period) {
    // Initial ATR = Simple Average of first 'period' True Ranges
    let atrSum = 0;
    for (let i = 0; i < period; i++) {
      atrSum += trueRanges[i];
    }
    let currentATR = atrSum / period;
    atr.set(candles[period - 1].t, currentATR);
    
    // Calculate subsequent ATR values using Wilder's smoothing
    for (let i = period; i < candles.length; i++) {
      // ATR = Previous ATR * (period - 1) + Current TR) / period
      currentATR = (currentATR * (period - 1) + trueRanges[i]) / period;
      atr.set(candles[i].t, currentATR);
    }
  }
  
  return { atr }
}

// ---------- AVERAGE DIRECTIONAL INDEX (ADX) ----------
export function adxSeries(
  candles: Candle[],
  period = 14
) {
  const diPlus = new Map<number, number|null>();
  const diMinus = new Map<number, number|null>();
  const adx = new Map<number, number|null>();
  
  if (candles.length === 0) return { diPlus, diMinus, adx };
  
  // Arrays to store smoothed values
  const trueRanges: number[] = [];
  const dmPlus: number[] = [];
  const dmMinus: number[] = [];
  
  // Calculate True Range, DM+, and DM- for each candle
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      // First candle
      trueRanges.push(candles[i].h - candles[i].l);
      dmPlus.push(0);
      dmMinus.push(0);
    } else {
      // True Range
      const tr1 = candles[i].h - candles[i].l;
      const tr2 = Math.abs(candles[i].h - candles[i - 1].c);
      const tr3 = Math.abs(candles[i].l - candles[i - 1].c);
      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
      
      // Directional Movement
      const highDiff = candles[i].h - candles[i - 1].h;
      const lowDiff = candles[i - 1].l - candles[i].l;
      
      let dmP = 0;
      let dmM = 0;
      
      if (highDiff > lowDiff && highDiff > 0) {
        dmP = highDiff;
      }
      if (lowDiff > highDiff && lowDiff > 0) {
        dmM = lowDiff;
      }
      
      dmPlus.push(dmP);
      dmMinus.push(dmM);
    }
    
    // Initialize with null
    diPlus.set(candles[i].t, null);
    diMinus.set(candles[i].t, null);
    adx.set(candles[i].t, null);
  }
  
  // Calculate smoothed values using Wilder's smoothing
  if (candles.length >= period) {
    // Initial smoothed values (simple average)
    let smoothedTR = 0;
    let smoothedDMPlus = 0;
    let smoothedDMMinus = 0;
    
    for (let i = 0; i < period; i++) {
      smoothedTR += trueRanges[i];
      smoothedDMPlus += dmPlus[i];
      smoothedDMMinus += dmMinus[i];
    }
    
    smoothedTR /= period;
    smoothedDMPlus /= period;
    smoothedDMMinus /= period;
    
    // Calculate DI+ and DI- for the first period
    const diP = (smoothedDMPlus / smoothedTR) * 100;
    const diM = (smoothedDMMinus / smoothedTR) * 100;
    
    diPlus.set(candles[period - 1].t, diP);
    diMinus.set(candles[period - 1].t, diM);
    
    // Calculate DX for the first period
    const dx = Math.abs(diP - diM) / (diP + diM) * 100;
    const dxValues = [dx];
    
    // Continue with Wilder's smoothing for subsequent periods
    for (let i = period; i < candles.length; i++) {
      // Update smoothed values using Wilder's smoothing
      smoothedTR = (smoothedTR * (period - 1) + trueRanges[i]) / period;
      smoothedDMPlus = (smoothedDMPlus * (period - 1) + dmPlus[i]) / period;
      smoothedDMMinus = (smoothedDMMinus * (period - 1) + dmMinus[i]) / period;
      
      // Calculate DI+ and DI-
      const diP = (smoothedDMPlus / smoothedTR) * 100;
      const diM = (smoothedDMMinus / smoothedTR) * 100;
      
      diPlus.set(candles[i].t, diP);
      diMinus.set(candles[i].t, diM);
      
      // Calculate DX
      const dx = Math.abs(diP - diM) / (diP + diM) * 100;
      dxValues.push(dx);
    }
    
    // Calculate ADX using simple moving average of DX
    if (dxValues.length >= period) {
      // Initial ADX (simple average of first period DX values)
      let adxSum = 0;
      for (let i = 0; i < period; i++) {
        adxSum += dxValues[i];
      }
      adx.set(candles[period * 2 - 2].t, adxSum / period);
      
      // Continue with simple moving average for subsequent periods
      for (let i = period; i < dxValues.length; i++) {
        adxSum = adxSum - dxValues[i - period] + dxValues[i];
        adx.set(candles[period + i - 1].t, adxSum / period);
      }
    }
  }
  
  return { diPlus, diMinus, adx }
}
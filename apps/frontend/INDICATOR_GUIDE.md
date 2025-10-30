# Adding Custom Indicators to Tradeeon

This guide shows you how to add any indicator you want to the Tradeeon platform using TA-Lib.

## 🎯 Quick Start

### 1. **Add to Mock Service** (for development)

Edit `src/mocks/taService.ts`:

```typescript
// Add your indicator case
case 'YOUR_INDICATOR': map = calculateYourIndicator(candles, params); break

// Add your calculation function
function calculateYourIndicator(candles: Candle[], params: { param1?: number; param2?: number }): Map<number, number|null> {
  // Your calculation logic here
  const result = new Map<number, number|null>()
  
  // Example: Simple moving average
  const length = params.param1 ?? 20
  for (let i = length - 1; i < candles.length; i++) {
    const slice = candles.slice(i - length + 1, i + 1)
    const sma = slice.reduce((sum, c) => sum + c.c, 0) / length
    result.set(candles[i].t, sma)
  }
  
  return result
}
```

### 2. **Add to Python TA-Lib Service** (for production)

Edit your FastAPI service:

```python
@app.get("/series")
def series(symbol: str, tf: str, name: str, params: str = "{}", source: str = "close"):
    df = load_candles(symbol, tf)
    p = eval(params) if isinstance(params, str) else params

    if name.upper() == "YOUR_INDICATOR":
        # Using pandas-ta
        s = ta.your_indicator(df[source], **p)
        
        # Or using TA-Lib directly
        import talib
        s = talib.YOUR_INDICATOR(df[source], **p)
    
    out = [{"t": int(df["time"].iloc[i]), "v": (None if pd.isna(s.iloc[i]) else float(s.iloc[i]))} for i in range(len(df))]
    return out
```

## 📊 Popular Indicators You Can Add

### **MACD (Moving Average Convergence Divergence)**
```typescript
// Parameters: { fast: 12, slow: 26, signal: 9 }
case 'MACD': map = calculateMACD(candles, params); break
```

### **Bollinger Bands**
```typescript
// Parameters: { length: 20, std: 2 }
case 'BBANDS': map = calculateBBands(candles, params); break
```

### **Stochastic Oscillator**
```typescript
// Parameters: { k: 14, d: 3 }
case 'STOCH': map = calculateStoch(candles, params); break
```

### **Average True Range (ATR)**
```typescript
// Parameters: { length: 14 }
case 'ATR': map = calculateATR(candles, params); break
```

### **Average Directional Index (ADX)**
```typescript
// Parameters: { length: 14 }
case 'ADX': map = calculateADX(candles, params); break
```

## 🔧 Python TA-Lib Service Setup

### **1. Install Dependencies**
```bash
pip install fastapi uvicorn pandas pandas-ta talib
```

### **2. Create Service**
```python
# main.py
from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import pandas_ta as ta
import talib

app = FastAPI()

@app.get("/series")
def series(symbol: str, tf: str, name: str, params: str = "{}", source: str = "close"):
    # Load your OHLCV data
    df = load_candles(symbol, tf)  # Implement this function
    p = eval(params) if isinstance(params, str) else params

    # Calculate indicator
    if name.upper() == "EMA":
        s = ta.ema(df[source], length=p.get("length", 20))
    elif name.upper() == "RSI":
        s = ta.rsi(df[source], length=p.get("length", 14))
    elif name.upper() == "MACD":
        s = ta.macd(df[source], fast=p.get("fast", 12), slow=p.get("slow", 26), signal=p.get("signal", 9))["MACD_12_26_9"]
    elif name.upper() == "BBANDS":
        s = ta.bbands(df[source], length=p.get("length", 20), std=p.get("std", 2))["BBU_20_2.0"]
    elif name.upper() == "STOCH":
        s = ta.stoch(df["high"], df["low"], df["close"], k=p.get("k", 14), d=p.get("d", 3))["STOCHk_14_3_3"]
    elif name.upper() == "ATR":
        s = ta.atr(df["high"], df["low"], df["close"], length=p.get("length", 14))
    elif name.upper() == "ADX":
        s = ta.adx(df["high"], df["low"], df["close"], length=p.get("length", 14))
    else:
        # Try to use TA-Lib directly
        try:
            s = getattr(talib, name.upper())(df[source], **p)
        except:
            s = pd.Series([None] * len(df))
    
    # Convert to response format
    out = [{"t": int(df["time"].iloc[i]), "v": (None if pd.isna(s.iloc[i]) else float(s.iloc[i]))} for i in range(len(df))]
    return out

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### **3. Run Service**
```bash
python main.py
```

### **4. Update Frontend**
Set environment variable:
```bash
VITE_TA_SERVICE_URL=http://localhost:8000
```

## 🎨 Adding to Canvas Chart

### **1. Create Canvas Indicator**
Create `src/canvas/indicators/yourIndicator.ts`:

```typescript
import { IndicatorDef, registerIndicator } from './registry';
import { emaSeries, type Candle as SharedCandle } from '../../shared/indicators/core';

const YOUR_INDICATOR: IndicatorDef = {
  name: 'YOUR_INDICATOR',
  pane: 'price', // or 'rsi', 'volume', etc.
  
  calc(candles, { param1 = 20, param2 = 2 }) {
    // Use shared core or TA service
    return emaSeries(candles as SharedCandle[], Number(param1), 'close');
  },

  draw(ctx, data, style, xOfIdx, yOfPrice, from, to, candles) {
    // Your drawing logic
    ctx.save();
    ctx.lineWidth = style.width ?? 1.5;
    ctx.strokeStyle = style.color;
    
    let started = false;
    for (let i = from; i <= to; i++) {
      if (i < 0 || i >= candles.length) continue;
      
      const timestamp = candles[i].t;
      const value = data.get(timestamp);
      
      if (value == null) {
        started = false;
        continue;
      }

      const x = xOfIdx(i);
      const y = yOfPrice(value);

      if (!started) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    if (started) {
      ctx.stroke();
    }
    
    ctx.restore();
  }
};

registerIndicator(YOUR_INDICATOR);
export default YOUR_INDICATOR;
```

### **2. Add to Indicator Manager**
The indicator will automatically appear in the UI once registered.

## 🚀 Advanced Features

### **Multi-Line Indicators (MACD)**
```typescript
function calculateMACD(candles: Candle[], params: { fast?: number; slow?: number; signal?: number }) {
  const fast = params.fast ?? 12
  const slow = params.slow ?? 26
  const signal = params.signal ?? 9
  
  const emaFast = emaSeries(candles, fast, 'close')
  const emaSlow = emaSeries(candles, slow, 'close')
  
  const macdMap = new Map<number, number|null>()
  const signalMap = new Map<number, number|null>()
  const histogramMap = new Map<number, number|null>()
  
  // Calculate MACD line
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
  
  // Calculate signal line (EMA of MACD)
  const macdValues = Array.from(macdMap.values()).filter(v => v !== null) as number[]
  const signalLine = emaSeries(candles.map((c, i) => ({ ...c, c: macdValues[i] || 0 })), signal, 'close')
  
  // Calculate histogram
  for (const candle of candles) {
    const macdVal = macdMap.get(candle.t)
    const signalVal = signalLine.get(candle.t)
    
    if (macdVal !== null && signalVal !== null) {
      histogramMap.set(candle.t, macdVal - signalVal)
    } else {
      histogramMap.set(candle.t, null)
    }
  }
  
  // Store multiple series
  (macdMap as any).signal = signalMap
  (macdMap as any).histogram = histogramMap
  
  return macdMap
}
```

### **Band Indicators (Bollinger Bands)**
```typescript
function calculateBBands(candles: Candle[], params: { length?: number; std?: number }) {
  const length = params.length ?? 20
  const std = params.std ?? 2
  
  const ema = emaSeries(candles, length, 'close')
  const upperMap = new Map<number, number|null>()
  const lowerMap = new Map<number, number|null>()
  const middleMap = new Map<number, number|null>()
  
  for (let i = length - 1; i < candles.length; i++) {
    const slice = candles.slice(i - length + 1, i + 1)
    const middle = ema.get(candles[i].t)
    
    if (middle !== null) {
      const variance = slice.reduce((sum, c) => sum + Math.pow(c.c - middle, 2), 0) / length
      const stdDev = Math.sqrt(variance)
      
      const upper = middle + (std * stdDev)
      const lower = middle - (std * stdDev)
      
      upperMap.set(candles[i].t, upper)
      middleMap.set(candles[i].t, middle)
      lowerMap.set(candles[i].t, lower)
    } else {
      upperMap.set(candles[i].t, null)
      middleMap.set(candles[i].t, null)
      lowerMap.set(candles[i].t, null)
    }
  }
  
  // Store multiple series
  (upperMap as any).middle = middleMap
  (upperMap as any).lower = lowerMap
  
  return upperMap
}
```

## 🔍 Testing Your Indicators

### **1. Test Mock Service**
```bash
# Start dev server
npm run dev

# Test with curl
curl "http://localhost:5173/api/ta/series?symbol=BTCUSDT&tf=1m&name=MACD&params=%7B%22fast%22%3A12%2C%22slow%22%3A26%7D"
```

### **2. Test Python Service**
```bash
# Start Python service
python main.py

# Test with curl
curl "http://localhost:8000/series?symbol=BTCUSDT&tf=1m&name=MACD&params=%7B%22fast%22%3A12%2C%22slow%22%3A26%7D"
```

### **3. Test in UI**
1. Toggle "TA Service: ON"
2. Add your indicator to the chart
3. Check browser console for logs
4. Verify indicator renders correctly

## 📝 Best Practices

1. **Always implement both mock and real versions**
2. **Use proper parameter validation**
3. **Handle edge cases (insufficient data, null values)**
4. **Test with different timeframes**
5. **Use consistent naming conventions**
6. **Document parameter meanings**
7. **Add proper error handling**

## 🎯 Next Steps

1. **Add more indicators** using the patterns above
2. **Create indicator presets** for common configurations
3. **Add indicator overlays** (like trend lines)
4. **Implement indicator alerts** based on conditions
5. **Add indicator backtesting** capabilities

Happy coding! 🚀

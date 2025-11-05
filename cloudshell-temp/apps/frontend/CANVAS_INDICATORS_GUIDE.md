# Adding Indicators to Canvas Charts

This guide shows you exactly how to add indicators to the canvas charts in Tradeeon. There are two main approaches:

## 🎯 **Method 1: Canvas Indicator Components (Visual Indicators)**

This creates visual indicators that render directly on the chart canvas.

### **Step 1: Create Indicator File**

Create a new file: `src/canvas/indicators/yourIndicator.ts`

```typescript
// src/canvas/indicators/yourIndicator.ts
import { IndicatorDef, registerIndicator } from './registry';
import { emaSeries, type Candle as SharedCandle } from '../../shared/indicators/core';

const YOUR_INDICATOR: IndicatorDef = {
  name: 'YOUR_INDICATOR',
  pane: 'price', // or 'rsi', 'macd', etc.
  
  calc(candles, { param1 = 20, param2 = 2 }) {
    // Your calculation logic here
    // Can use shared core functions or TA service
    return emaSeries(candles as SharedCandle[], Number(param1), 'close');
  },

  draw(ctx, data, style, xOfIdx, yOfPrice, from, to, candles) {
    // Your drawing logic here
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

### **Step 2: Add to Indicators Index**

Edit `src/canvas/indicators/index.ts`:

```typescript
// Import your indicator
import YOUR_INDICATOR from './yourIndicator';

// Re-export
export { EMA, RSI, MACD, YOUR_INDICATOR };

// Add to categories
export const INDICATOR_CATEGORIES = {
  TREND: {
    name: 'Trend Analysis',
    indicators: ['EMA', 'SMA', 'WMA', 'YOUR_INDICATOR']
  },
  // ... other categories
};

// Add metadata
export const AVAILABLE_INDICATORS = {
  // ... existing indicators
  YOUR_INDICATOR: {
    name: 'Your Indicator Name',
    shortName: 'YOUR_INDICATOR',
    category: 'TREND',
    pane: 'price',
    description: 'Description of your indicator',
    defaultParams: {
      param1: 20,
      param2: 2
    },
    defaultStyle: {
      color: '#FFA500',
      width: 1.8
    },
    paramConfig: {
      param1: { type: 'number', min: 1, max: 200, step: 1, label: 'Parameter 1' },
      param2: { type: 'number', min: 1, max: 10, step: 0.1, label: 'Parameter 2' }
    }
  }
};
```

### **Step 3: Add Pane Support (if needed)**

If your indicator needs its own pane:

1. **Add to PaneId type** in `src/canvas/indicators/registry.ts`:
```typescript
export type PaneId = 'price' | 'rsi' | 'macd' | 'yourPane';
```

2. **Add to PANE_CONFIG** in `src/canvas/CanvasCandleChart.tsx`:
```typescript
const PANE_CONFIG = {
  price: { heightRatio: 0.5, yMin: null, yMax: null, fixedRange: false },
  rsi: { heightRatio: 0.25, yMin: 0, yMax: 100, fixedRange: true },
  macd: { heightRatio: 0.25, yMin: null, yMax: null, fixedRange: false },
  yourPane: { heightRatio: 0.2, yMin: 0, yMax: 100, fixedRange: true }
};
```

3. **Add pane title** in `drawPaneTitles` function:
```typescript
} else if (paneId === 'yourPane') {
  ctx.fillText('YOUR_PANE', PADDING.left + 8, layout.top + 16);
}
```

## 🎯 **Method 2: Using TA Service (Data-Only Indicators)**

This uses the TA service to get indicator data without visual rendering.

### **Step 1: Use getSeries Function**

In your component:

```typescript
import { getSeries } from '../pages/CanvasChartPage'; // or wherever it's defined

// Get indicator data
const indicatorData = await getSeries(candles, {
  name: 'YOUR_INDICATOR',
  params: { param1: 20, param2: 2 },
  source: 'close',
  timeframe: '1h' // Optional: higher timeframe
});

// Use the data for analysis, alerts, etc.
indicatorData.forEach((value, timestamp) => {
  if (value !== null) {
    console.log(`At ${timestamp}: ${value}`);
  }
});
```

### **Step 2: Add to Mock Service**

Edit `src/mocks/taService.ts`:

```typescript
// Add to switch statement
case 'YOUR_INDICATOR': map = calculateYourIndicator(candles, params); break

// Add calculation function
function calculateYourIndicator(candles: Candle[], params: { param1?: number; param2?: number }): Map<number, number|null> {
  const result = new Map<number, number|null>()
  
  // Your calculation logic
  const param1 = params.param1 ?? 20
  const param2 = params.param2 ?? 2
  
  for (let i = param1 - 1; i < candles.length; i++) {
    const slice = candles.slice(i - param1 + 1, i + 1)
    const sma = slice.reduce((sum, c) => sum + c.c, 0) / param1
    result.set(candles[i].t, sma * param2) // Example calculation
  }
  
  return result
}
```

### **Step 3: Add to Python Service**

Edit your FastAPI service:

```python
elif name.upper() == "YOUR_INDICATOR":
    # Using pandas-ta
    s = ta.your_indicator(df[source], **p)
    
    # Or using TA-Lib directly
    import talib
    s = talib.YOUR_INDICATOR(df[source], **p)
```

## 📊 **Example: Complete MACD Implementation**

I've already implemented MACD as a complete example. Here's how it works:

### **MACD Canvas Indicator** (`src/canvas/indicators/macd.ts`)

```typescript
const MACD: IndicatorDef = {
  name: 'MACD',
  pane: 'macd', // Custom pane
  
  calc(candles, { fast = 12, slow = 26, signal = 9 }) {
    // Calculate MACD line (EMA fast - EMA slow)
    const emaFast = emaSeries(candles, fast, 'close');
    const emaSlow = emaSeries(candles, slow, 'close');
    
    const macdMap = new Map<number, number|null>();
    
    for (const candle of candles) {
      const fastVal = emaFast.get(candle.t);
      const slowVal = emaSlow.get(candle.t);
      
      if (fastVal !== null && slowVal !== null) {
        macdMap.set(candle.t, fastVal - slowVal);
      } else {
        macdMap.set(candle.t, null);
      }
    }
    
    // Calculate signal line (EMA of MACD)
    const signalLine = emaSeries(macdValues, signal, 'close');
    
    // Calculate histogram (MACD - Signal)
    const histogramMap = new Map<number, number|null>();
    for (const candle of candles) {
      const macdVal = macdMap.get(candle.t);
      const signalVal = signalLine.get(candle.t);
      
      if (macdVal !== null && signalVal !== null) {
        histogramMap.set(candle.t, macdVal - signalVal);
      }
    }
    
    // Store multiple series
    (macdMap as any).signal = signalLine;
    (macdMap as any).histogram = histogramMap;
    
    return macdMap;
  },

  draw(ctx, data, style, xOfIdx, yOfPrice, from, to, candles) {
    const signalData = (data as any).signal;
    const histogramData = (data as any).histogram;
    
    // Draw MACD line (blue)
    ctx.strokeStyle = '#2196F3';
    // ... drawing logic
    
    // Draw signal line (orange)
    ctx.strokeStyle = '#FF9800';
    // ... drawing logic
    
    // Draw histogram (green/red bars)
    ctx.fillStyle = value >= 0 ? '#4CAF50' : '#F44336';
    // ... drawing logic
  }
};
```

## 🎨 **Drawing Patterns**

### **Line Indicator**
```typescript
draw(ctx, data, style, xOfIdx, yOfPrice, from, to, candles) {
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
```

### **Bar Indicator (Histogram)**
```typescript
draw(ctx, data, style, xOfIdx, yOfPrice, from, to, candles) {
  const barWidth = Math.max(1, xOfIdx(1) - xOfIdx(0) - 2);
  
  for (let i = from; i <= to; i++) {
    if (i < 0 || i >= candles.length) continue;
    
    const timestamp = candles[i].t;
    const value = data.get(timestamp);
    
    if (value == null) continue;
    
    const x = xOfIdx(i) - barWidth / 2;
    const y = yOfPrice(value);
    const zeroY = yOfPrice(0);
    
    ctx.fillStyle = value >= 0 ? '#4CAF50' : '#F44336';
    ctx.fillRect(x, Math.min(y, zeroY), barWidth, Math.abs(y - zeroY));
  }
}
```

### **Band Indicator (Bollinger Bands)**
```typescript
draw(ctx, data, style, xOfIdx, yOfPrice, from, to, candles) {
  const upperData = (data as any).upper;
  const middleData = (data as any).middle;
  const lowerData = (data as any).lower;
  
  // Draw middle line
  ctx.strokeStyle = style.color;
  // ... draw middle line
  
  // Draw upper and lower bands
  ctx.strokeStyle = style.color;
  ctx.globalAlpha = 0.3;
  // ... draw bands
  
  // Fill between bands
  ctx.fillStyle = style.color;
  ctx.globalAlpha = 0.1;
  // ... fill area
}
```

## 🚀 **Testing Your Indicators**

### **1. Test Canvas Indicator**
1. Add indicator to the chart using the UI
2. Verify it renders correctly
3. Check that parameters work
4. Test with different timeframes

### **2. Test TA Service Indicator**
1. Toggle "TA Service: ON"
2. Use `getSeries()` to fetch data
3. Verify data matches expected values
4. Test with different parameters

### **3. Test Both Methods**
```typescript
// Test local calculation
const localData = await getSeries(candles, { name: 'MACD', params: { fast: 12, slow: 26, signal: 9 } }, false);

// Test TA service
const taData = await getSeries(candles, { name: 'MACD', params: { fast: 12, slow: 26, signal: 9 } }, true);

// Compare results
console.log('Local vs TA:', localData.size, taData.size);
```

## 📝 **Best Practices**

1. **Use shared core functions** when possible for consistency
2. **Handle null values** gracefully in drawing
3. **Optimize drawing** for performance (clip regions, avoid unnecessary operations)
4. **Use consistent colors** and styling
5. **Add proper error handling** for calculations
6. **Test with edge cases** (insufficient data, extreme values)
7. **Document parameters** clearly
8. **Use appropriate panes** for different indicator types

## 🎯 **Next Steps**

1. **Add more indicators** using the patterns above
2. **Create indicator presets** for common configurations
3. **Add indicator overlays** (like trend lines)
4. **Implement indicator alerts** based on conditions
5. **Add indicator backtesting** capabilities
6. **Create custom drawing tools** for advanced indicators

The system is now ready to handle any indicator you want to add! 🚀

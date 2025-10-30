# Indicators Integration Guide

## Overview

The frontend now supports real-time technical indicators on the Live Charts page. Users can add RSI, EMA, SMA, MACD, and Bollinger Bands indicators that update in real-time alongside price data.

## Features

### ✅ Indicator Picker
- **Modal Interface**: Clean, intuitive indicator selection
- **Parameter Configuration**: Adjustable parameters for each indicator
- **Real-time Preview**: See indicator specifications before applying

### ✅ Supported Indicators

#### **RSI (Relative Strength Index)**
- **Pane**: Sub (below price chart)
- **Output**: `rsi` (0-100 scale)
- **Default**: 14 period
- **Color**: Red (#ff6b6b)

#### **EMA (Exponential Moving Average)**
- **Pane**: Main (overlay on price chart)
- **Output**: `ema`
- **Default**: 20 period
- **Color**: Teal (#4ecdc4)

#### **SMA (Simple Moving Average)**
- **Pane**: Main (overlay on price chart)
- **Output**: `sma`
- **Default**: 50 period
- **Color**: Blue (#45b7d1)

#### **MACD (Moving Average Convergence Divergence)**
- **Pane**: Sub (below price chart)
- **Outputs**: `macd`, `signal`, `hist` (histogram)
- **Defaults**: Fast=12, Slow=26, Signal=9
- **Colors**: Green (#96ceb4), Yellow (#feca57), Histogram (Green/Red)

#### **BB (Bollinger Bands)**
- **Pane**: Main (overlay on price chart)
- **Outputs**: `upper`, `basis`, `lower`
- **Defaults**: Period=20, Multiplier=2.0
- **Colors**: Pink (#ff9ff3), Blue (#54a0ff), Purple (#5f27cd)

### ✅ Real-time Updates
- **WebSocket Streaming**: Live indicator updates via `/indicators/stream`
- **Incremental Updates**: Only latest values are computed and sent
- **Price Integration**: Maintains existing price WebSocket for candlesticks
- **Error Handling**: Robust error handling and reconnection logic

## Usage

### 1. Access Live Charts
Navigate to `/live-charts` (public route, no authentication required)

### 2. Add Indicators
- Click the **"+ Indicators"** button in the top-right corner
- Select indicators from the available list
- Adjust parameters as needed
- Click **"Apply Indicators"**

### 3. Real-time Updates
- Indicators automatically update with new price data
- Each indicator shows its latest value
- Historical data is loaded on first application

## Technical Implementation

### Files Created/Modified

#### **New Files:**
- `src/lib/indicators/contracts.ts` - TypeScript types for indicator data
- `src/lib/indicators/ws.ts` - WebSocket client for indicator streaming
- `src/components/IndicatorPicker.tsx` - Indicator selection modal
- `src/components/ChartHostWithIndicators.tsx` - Enhanced chart with indicators
- `src/pages/IndicatorTest.tsx` - Test page for indicators API

#### **Modified Files:**
- `src/pages/LiveChartPage.tsx` - Updated to use new chart component
- `src/App.tsx` - Added indicator test route

### Data Flow

1. **User Interaction**: Click "+ Indicators" → Open picker modal
2. **Indicator Selection**: Choose indicators and parameters
3. **API Call**: Fetch snapshot from `/indicators/snapshot`
4. **Series Creation**: Create Lightweight Charts series for each indicator
5. **WebSocket Connection**: Connect to `/indicators/stream`
6. **Real-time Updates**: Receive and apply indicator updates

### Series Mapping

```typescript
// Main pane (overlay on price)
EMA, SMA, BB(upper/basis/lower) → LineSeries

// Sub pane (below price)
RSI → LineSeries
MACD(macd/signal) → LineSeries
MACD(hist) → HistogramSeries
```

### WebSocket Messages

#### **Snapshot** (on connect):
```json
{
  "type": "snapshot",
  "candles": [...],
  "indicators": {
    "RSI(14)": [{"t": 1640995200000, "rsi": 65.5}, ...],
    "EMA(20)": [{"t": 1640995200000, "ema": 50000.0}, ...]
  }
}
```

#### **Indicator Update**:
```json
{
  "type": "indicators:update",
  "values": {
    "RSI(14)": {"t": 1640995200000, "rsi": 65.5},
    "EMA(20)": {"t": 1640995200000, "ema": 50000.0}
  }
}
```

#### **Kline Update** (price data):
```json
{
  "type": "kline",
  "candle": {"t": 1640995200000, "o": 50000.0, "h": 50100.0, "l": 49900.0, "c": 50050.0, "v": 1000.0, "x": false}
}
```

## Testing

### Test Page
Visit `/indicator-test` to:
- Test snapshot API endpoint
- Test WebSocket connection
- View real-time messages
- Debug indicator data

### Manual Testing
1. **Start Backend**: Ensure indicators API is running on port 8000
2. **Open Live Charts**: Navigate to `/live-charts`
3. **Add Indicators**: Click "+ Indicators" and select RSI, EMA
4. **Verify Updates**: Watch indicators update in real-time
5. **Check Console**: Monitor WebSocket messages and errors

## Backend Requirements

The frontend expects the indicators API to be running on `http://localhost:8000` with:

- **GET /indicators/snapshot** - Historical indicator data
- **WebSocket /indicators/stream** - Real-time indicator updates
- **TA-Lib** - For indicator computation
- **CORS** - Enabled for frontend requests

## Performance Notes

- **Efficient Updates**: Only latest indicator values are computed and sent
- **Series Management**: Automatic cleanup of indicator series when removed
- **Memory Management**: WebSocket connections are properly cleaned up
- **Error Recovery**: Automatic reconnection with exponential backoff

## Future Enhancements

- **More Indicators**: Stochastic, Williams %R, ATR, etc.
- **Custom Parameters**: Save indicator configurations
- **Multiple Timeframes**: Different intervals for indicators
- **Alert System**: Price/indicator-based alerts
- **Backtesting**: Historical indicator analysis



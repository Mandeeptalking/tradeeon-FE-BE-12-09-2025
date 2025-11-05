# Indicators API Setup Guide

## Overview

The Indicators API provides real-time technical analysis using TA-Lib. It computes indicators from market data channels and serves them via REST and WebSocket endpoints.

## Installation

### 1. Install TA-Lib

**Windows:**
```bash
# Download TA-Lib wheel from https://www.lfd.uci.edu/~gohlke/pythonlibs/#ta-lib
pip install TA_Lib-0.4.25-cp311-cp311-win_amd64.whl
```

**macOS:**
```bash
brew install ta-lib
pip install TA-Lib
```

**Linux:**
```bash
sudo apt-get install libta-lib-dev
pip install TA-Lib
```

### 2. Install Additional Dependencies

```bash
pip install -r requirements_indicators.txt
```

### 3. Start the API Server

```bash
cd apps/api
uvicorn main:app --reload --port 8000
```

## API Endpoints

### GET /indicators/snapshot

Get a snapshot of candles and computed indicators.

**Parameters:**
- `symbol`: Trading symbol (e.g., "BTCUSDT")
- `interval`: Time interval (e.g., "1m", "1h", "1d")
- `list`: Comma-separated indicator specifications

**Example:**
```
GET /indicators/snapshot?symbol=BTCUSDT&interval=1m&list=RSI(14),EMA(20),MACD(12,26,9),BB(20,2)
```

**Response:**
```json
{
  "success": true,
  "symbol": "BTCUSDT",
  "interval": "1m",
  "candles": [...],
  "indicators": {
    "RSI(length=14)": [{"t": 1640995200000, "rsi": 65.5}, ...],
    "EMA(length=20)": [{"t": 1640995200000, "ema": 50000.0}, ...],
    "MACD(fast=12,slow=26,signal=9)": [{"t": 1640995200000, "macd": 100.0, "signal": 95.0, "hist": 5.0}, ...],
    "BB(length=20,mult=2.0)": [{"t": 1640995200000, "upper": 51000.0, "basis": 50000.0, "lower": 49000.0}, ...]
  }
}
```

### WebSocket /indicators/stream

Real-time indicator updates via WebSocket.

**Parameters:** Same as snapshot endpoint

**Message Types:**

1. **Snapshot** (on connect):
```json
{
  "type": "snapshot",
  "symbol": "BTCUSDT",
  "interval": "1m",
  "candles": [...],
  "indicators": {...}
}
```

2. **Kline Update**:
```json
{
  "type": "kline",
  "symbol": "BTCUSDT",
  "interval": "1m",
  "candle": {"t": 1640995200000, "o": 50000.0, "h": 50100.0, "l": 49900.0, "c": 50050.0, "v": 1000.0, "x": false}
}
```

3. **Indicator Update**:
```json
{
  "type": "indicators:update",
  "symbol": "BTCUSDT",
  "interval": "1m",
  "values": {
    "RSI(length=14)": {"t": 1640995200000, "rsi": 65.5},
    "EMA(length=20)": {"t": 1640995200000, "ema": 50000.0}
  }
}
```

## Supported Indicators

### RSI (Relative Strength Index)
- **Spec**: `RSI(14)` or `RSI(length=14)`
- **Output**: `{"t": timestamp, "rsi": value}`

### EMA (Exponential Moving Average)
- **Spec**: `EMA(20)` or `EMA(length=20)`
- **Output**: `{"t": timestamp, "ema": value}`

### SMA (Simple Moving Average)
- **Spec**: `SMA(50)` or `SMA(length=50)`
- **Output**: `{"t": timestamp, "sma": value}`

### MACD (Moving Average Convergence Divergence)
- **Spec**: `MACD(12,26,9)` or `MACD(fast=12,slow=26,signal=9)`
- **Output**: `{"t": timestamp, "macd": value, "signal": value, "hist": value}`

### BB (Bollinger Bands)
- **Spec**: `BB(20,2)` or `BB(length=20,mult=2.0)`
- **Output**: `{"t": timestamp, "upper": value, "basis": value, "lower": value}`

## Testing

Run the test script to verify everything works:

```bash
python test_indicators.py
```

## Integration with ChannelsHub

The indicators API is designed to integrate with the ChannelsHub from the streamer service. Currently, it uses mock data for testing. To connect to real data:

1. Start the streamer service: `python apps/streamer/main.py`
2. Update `apps/api/services/channel_service.py` to connect to the actual ChannelsHub
3. The indicators will automatically use real market data

## Performance Notes

- Indicators are computed using TA-Lib for optimal performance
- WebSocket updates only recompute the latest values (not full history)
- Uses numpy arrays for efficient computation
- Filters out NaN values automatically



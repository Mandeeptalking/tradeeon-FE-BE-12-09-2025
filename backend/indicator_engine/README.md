# Indicator Engine with TA-Lib

A high-performance technical indicator calculation engine powered by TA-Lib and FastAPI.

## 🚀 Features

- **150+ Technical Indicators**: RSI, MACD, SMA, EMA, Bollinger Bands, Stochastic, and many more
- **Real-time Updates**: WebSocket support for live indicator calculations
- **High Performance**: TA-Lib's C implementation for blazing-fast calculations
- **REST API**: Easy integration with any frontend framework
- **Type Safety**: Full TypeScript support for frontend integration

## 📦 Installation

### Prerequisites

1. **Install TA-Lib** (Required):
   ```bash
   # Windows (using conda)
   conda install -c conda-forge ta-lib
   
   # macOS
   brew install ta-lib
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install libta-lib-dev
   ```

2. **Python 3.8+**

### Setup

1. **Install Python dependencies**:
   ```bash
   cd backend/indicator_engine
   pip install -r requirements.txt
   ```

2. **Start the server**:
   ```bash
   python start.py
   ```

   Or manually:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   ```

## 🎯 Usage

### REST API

**Get all available indicators**:
```bash
curl http://localhost:8001/indicators
```

**Calculate RSI**:
```bash
curl -X POST http://localhost:8001/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "interval": "1h",
    "indicator": "RSI",
    "parameters": {"timeperiod": 14},
    "data_points": 1000
  }'
```

**Calculate MACD**:
```bash
curl -X POST http://localhost:8001/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "interval": "1h",
    "indicator": "MACD",
    "parameters": {"fastperiod": 12, "slowperiod": 26, "signalperiod": 9},
    "data_points": 1000
  }'
```

### WebSocket (Real-time)

```javascript
const ws = new WebSocket('ws://localhost:8001/ws/realtime');

// Subscribe to RSI updates
ws.send(JSON.stringify({
  type: 'subscribe',
  symbol: 'BTCUSDT',
  interval: '1m',
  indicator: 'RSI',
  parameters: { timeperiod: 14 }
}));

// Receive updates
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('RSI update:', update);
};
```

## 📊 Available Indicators

### Trend Indicators
- **SMA**: Simple Moving Average
- **EMA**: Exponential Moving Average
- **WMA**: Weighted Moving Average
- **DEMA**: Double Exponential Moving Average
- **TEMA**: Triple Exponential Moving Average
- **KAMA**: Kaufman Adaptive Moving Average

### Momentum Indicators
- **RSI**: Relative Strength Index
- **MACD**: Moving Average Convergence Divergence
- **STOCH**: Stochastic Oscillator
- **STOCHF**: Stochastic Fast
- **STOCHRSI**: Stochastic RSI
- **WILLR**: Williams %R
- **CCI**: Commodity Channel Index
- **ROC**: Rate of Change
- **MOM**: Momentum
- **PPO**: Percentage Price Oscillator
- **TRIX**: TRIX
- **ULTOSC**: Ultimate Oscillator

### Volatility Indicators
- **BBANDS**: Bollinger Bands
- **ATR**: Average True Range
- **NATR**: Normalized Average True Range
- **TRANGE**: True Range

### Volume Indicators
- **AD**: Accumulation/Distribution Line
- **ADOSC**: Accumulation/Distribution Oscillator
- **OBV**: On Balance Volume
- **MFI**: Money Flow Index

### Trend Detection
- **ADX**: Average Directional Index
- **AROON**: Aroon
- **AROONOSC**: Aroon Oscillator
- **CMO**: Chande Momentum Oscillator
- **DX**: Directional Movement Index
- **MINUS_DI**: Minus Directional Indicator
- **MINUS_DM**: Minus Directional Movement
- **PLUS_DI**: Plus Directional Indicator
- **PLUS_DM**: Plus Directional Movement

## 🎨 Frontend Integration

The frontend includes a comprehensive **Indicator Tester** page at `/indicator-tester` that allows you to:

1. **Select any indicator** from the full TA-Lib library
2. **Configure parameters** (periods, thresholds, etc.)
3. **Test calculations** with real or mock data
4. **Visualize results** on interactive charts
5. **Enable real-time updates** via WebSocket

### Example Usage in React

```typescript
import { indicatorAPI } from '@/lib/indicators/api';

// Calculate RSI
const response = await indicatorAPI.calculateIndicator({
  symbol: 'BTCUSDT',
  interval: '1h',
  indicator: 'RSI',
  parameters: { timeperiod: 14 },
  data_points: 1000
});

// Subscribe to real-time updates
await indicatorAPI.connect();
indicatorAPI.subscribeToIndicator(
  {
    symbol: 'BTCUSDT',
    interval: '1m',
    indicator: 'RSI',
    parameters: { timeperiod: 14 }
  },
  (update) => {
    console.log('Real-time RSI:', update.values.rsi);
  }
);
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
# Data Provider (binance or mock)
DATA_PROVIDER=mock

# Binance API (if using binance provider)
BINANCE_API_KEY=your_api_key
BINANCE_SECRET_KEY=your_secret_key
```

### Custom Indicators

You can easily add custom indicators by extending the `INDICATOR_REGISTRY` in `indicator_registry.py`:

```python
"CUSTOM_RSI": IndicatorConfig(
    id="CUSTOM_RSI",
    name="Custom RSI",
    description="Custom RSI with different parameters",
    category=IndicatorCategory.MOMENTUM,
    type=IndicatorType.OSCILLATOR,
    talib_function="RSI",
    parameters={"timeperiod": 21},  # Different default period
    outputs=["rsi"],
    colors={"rsi": "#ff6b6b"},
    level_lines={"overbought": 75, "oversold": 25}  # Custom levels
),
```

## 🚀 Performance

- **Calculation Speed**: 100x faster than pure Python implementations
- **Memory Usage**: Optimized for large datasets (5000+ data points)
- **Real-time**: Sub-second updates via WebSocket
- **Scalability**: Handles multiple concurrent connections

## 📚 API Documentation

Visit `http://localhost:8001/docs` for interactive API documentation.

## 🐛 Troubleshooting

### TA-Lib Installation Issues

**Windows**:
```bash
# If conda install fails, try:
pip install TA-Lib
# If that fails, download wheel from:
# https://www.lfd.uci.edu/~gohlke/pythonlibs/#ta-lib
```

**macOS**:
```bash
# If brew install fails:
export LDFLAGS="-L$(brew --prefix ta-lib)/lib"
export CPPFLAGS="-I$(brew --prefix ta-lib)/include"
pip install TA-Lib
```

**Linux**:
```bash
# Install development headers
sudo apt-get install libta-lib-dev
# or
sudo yum install ta-lib-devel
```

### Common Issues

1. **"TA-Lib not found"**: Ensure TA-Lib is properly installed
2. **WebSocket connection failed**: Check if port 8001 is available
3. **Calculation errors**: Verify indicator parameters are valid

## 🤝 Contributing

1. Fork the repository
2. Add new indicators to `indicator_registry.py`
3. Test with the Indicator Tester page
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.



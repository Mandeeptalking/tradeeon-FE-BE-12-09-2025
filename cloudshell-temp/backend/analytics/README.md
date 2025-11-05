# Analytics Service

A FastAPI microservice for cryptocurrency trading analytics and technical indicators.

## Features

- **Real-time Market Data**: Fetch live price data from Binance API
- **Technical Indicators**: Calculate RSI, MACD, Bollinger Bands, Moving Averages, and more
- **Risk Metrics**: Volatility, Sharpe ratio, VaR, CVaR, Maximum Drawdown
- **Correlation Analysis**: Multi-symbol correlation and covariance matrices
- **High Performance**: Async/await throughout, optimized for concurrent requests
- **Comprehensive Testing**: Full test coverage with pytest
- **Type Safety**: Complete type hints with mypy validation

## Tech Stack

- **Python 3.11+**
- **FastAPI** - Modern, fast web framework
- **uvicorn** - ASGI server
- **httpx** - Async HTTP client for Binance API
- **pydantic** - Data validation and settings
- **numpy & pandas** - Numerical computing and data analysis
- **scipy** - Scientific computing (optional)
- **redis** - Caching (optional)

## Installation

### Using pip

```bash
# Clone the repository
git clone <repository-url>
cd backend/analytics

# Install dependencies
pip install -e .

# For development with all optional dependencies
pip install -e ".[all]"
```

### Using Poetry (Alternative)

```bash
# Install poetry if you haven't already
pip install poetry

# Install dependencies
poetry install --with dev
```

## Configuration

The service uses environment variables for configuration:

```bash
# Required
BINANCE_BASE_URL=https://api.binance.com

# Optional - Data defaults
DEFAULT_TIMEFRAME=1h
DEFAULT_LOOKBACK=500

# Optional - Redis caching
REDIS_URL=redis://localhost:6379

# Optional - Development
DEBUG=false
```

Create a `.env` file in the analytics directory:

```env
BINANCE_BASE_URL=https://api.binance.com
DEFAULT_TIMEFRAME=1h
DEFAULT_LOOKBACK=500
# REDIS_URL=redis://localhost:6379
DEBUG=true
```

## Running the Service

### Development Mode

```bash
# Navigate to the analytics directory
cd backend/analytics

# Run with auto-reload
uvicorn analytics.main:app --reload --host 0.0.0.0 --port 8001

# Or using Python module
python -m uvicorn analytics.main:app --reload --port 8001
```

### Production Mode

```bash
# Run with optimized settings
uvicorn analytics.main:app --host 0.0.0.0 --port 8001 --workers 4
```

### Using Docker

```dockerfile
# Dockerfile example
FROM python:3.11-slim

WORKDIR /app
COPY . .

RUN pip install -e .

EXPOSE 8001

CMD ["uvicorn", "analytics.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

```bash
# Build and run
docker build -t analytics-service .
docker run -p 8001:8001 -e BINANCE_BASE_URL=https://api.binance.com analytics-service
```

## API Endpoints

The service runs on `http://localhost:8001` by default.

### Health Check

```http
GET /health
```

Returns: `{"status": "ok"}`

### Service Info

```http
GET /
```

Returns service information and available endpoints.

### Price Metrics

```http
GET /metrics/price/{symbol}
```

Get 24hr price statistics for a trading pair.

**Example:**
```bash
curl http://localhost:8001/metrics/price/BTCUSDT
```

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "price": 43250.50,
  "price_change": 1250.30,
  "price_change_percent": 2.98,
  "high_24h": 44000.00,
  "low_24h": 41500.00,
  "volume_24h": 15420.50,
  "quote_volume_24h": 665000000.00
}
```

### Technical Indicators

```http
GET /metrics/technical/{symbol}?interval=1h&limit=500
```

Calculate technical indicators for a symbol.

**Parameters:**
- `symbol` - Trading pair (e.g., BTCUSDT)
- `interval` - Timeframe (1m, 5m, 15m, 1h, 4h, 1d, etc.)
- `limit` - Number of candles (max 1000)

**Example:**
```bash
curl "http://localhost:8001/metrics/technical/BTCUSDT?interval=1h&limit=100"
```

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "timestamp": "2023-12-01T15:00:00",
  "price": 43250.50,
  "indicators": {
    "sma_20": 42800.25,
    "sma_50": 42100.80,
    "ema_12": 43150.30,
    "ema_26": 42950.60,
    "bollinger": {
      "upper": 44500.20,
      "middle": 43200.10,
      "lower": 41900.00,
      "width": 2600.20,
      "position": 0.65
    },
    "rsi": 68.5,
    "macd": {
      "macd": 199.70,
      "signal": 145.30,
      "histogram": 54.40
    },
    "volatility": 0.45
  }
}
```

### Risk Metrics

```http
GET /metrics/risk/{symbol}?interval=1d&limit=365&confidence_level=0.05
```

Calculate risk metrics for a symbol.

**Parameters:**
- `symbol` - Trading pair
- `interval` - Timeframe
- `limit` - Number of periods
- `confidence_level` - VaR confidence level (default: 0.05)

**Example:**
```bash
curl "http://localhost:8001/metrics/risk/BTCUSDT?interval=1d&limit=365"
```

### Correlation Analysis

```http
GET /metrics/correlation?symbols=BTCUSDT&symbols=ETHUSDT&symbols=BNBUSDT&interval=1d&limit=100
```

Calculate correlation matrix for multiple symbols.

**Parameters:**
- `symbols` - List of trading pairs (minimum 2)
- `interval` - Timeframe
- `limit` - Number of periods

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=analytics --cov-report=html

# Run specific test file
pytest tests/test_math_ops.py

# Run with verbose output
pytest -v
```

### Code Quality

```bash
# Format code
black analytics/
isort analytics/

# Lint code
flake8 analytics/

# Type checking
mypy analytics/
```

### Pre-commit Hooks

```bash
# Install pre-commit hooks
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

## Architecture

```
backend/analytics/
├── __init__.py
├── main.py              # FastAPI application
├── core/                # Core business logic
│   ├── __init__.py
│   ├── config.py        # Configuration settings
│   ├── binance_client.py # Binance API client
│   ├── ohlcv_loader.py  # Data loading utilities
│   └── math_ops.py      # Mathematical operations
├── routers/             # API route handlers
│   ├── __init__.py
│   └── metrics.py       # Metrics endpoints
├── tests/               # Test suite
│   ├── __init__.py
│   ├── test_math_ops.py
│   └── test_metrics_routes.py
├── pyproject.toml       # Project configuration
└── README.md
```

## Performance

- **Async throughout**: All I/O operations are non-blocking
- **Connection pooling**: HTTP client reuses connections
- **Data caching**: Optional Redis integration for frequently accessed data
- **Efficient calculations**: Vectorized operations with NumPy/Pandas
- **Concurrent requests**: Handle multiple symbol requests simultaneously

## Error Handling

The service provides comprehensive error handling:

- **404**: Symbol not found or no data available
- **400**: Invalid parameters or insufficient data
- **500**: Internal server errors with detailed logging
- **422**: Validation errors for malformed requests

## Monitoring

- **Health endpoint**: `/health` for load balancer checks
- **Structured logging**: JSON logs with correlation IDs
- **Metrics**: Built-in request/response metrics
- **OpenAPI docs**: Auto-generated at `/docs` and `/redoc`

## GitHub Actions CI

The project includes automated testing with GitHub Actions. Create `.github/workflows/test.yml`:

```yaml
name: Test Analytics Service

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.11, 3.12]

    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}
    
    - name: Install dependencies
      working-directory: backend/analytics
      run: |
        python -m pip install --upgrade pip
        pip install -e ".[dev]"
    
    - name: Lint with flake8
      working-directory: backend/analytics
      run: |
        flake8 analytics/ --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 analytics/ --count --exit-zero --max-complexity=10 --max-line-length=100 --statistics
    
    - name: Format check with black
      working-directory: backend/analytics
      run: black --check analytics/
    
    - name: Import sort check
      working-directory: backend/analytics
      run: isort --check-only analytics/
    
    - name: Type check with mypy
      working-directory: backend/analytics
      run: mypy analytics/
      continue-on-error: true  # Optional for now
    
    - name: Test with pytest
      working-directory: backend/analytics
      run: |
        pytest tests/ -v --cov=analytics --cov-report=xml --cov-report=term
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: backend/analytics/coverage.xml
        flags: analytics
        name: analytics-coverage
```

### Local Development Workflow

```bash
# Install with development dependencies
pip install -e ".[dev]"

# Run tests
pytest tests/ -v

# Run tests with coverage
pytest tests/ --cov=analytics --cov-report=html

# Format code
black analytics/
isort analytics/

# Lint code
flake8 analytics/

# Type check
mypy analytics/

# Run all checks (what CI runs)
black --check analytics/ && \
isort --check-only analytics/ && \
flake8 analytics/ && \
pytest tests/ -v --cov=analytics
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run the test suite and linting locally
5. Ensure CI passes
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

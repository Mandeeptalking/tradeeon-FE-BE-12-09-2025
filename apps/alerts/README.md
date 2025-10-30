# Alert Runner System

A comprehensive background process that evaluates trading alerts, triggers notifications, and dispatches actions based on technical indicators and market conditions.

## Overview

The Alert Runner system provides:

- **Real-time Alert Evaluation**: Continuously monitors active alerts
- **Technical Indicator Support**: RSI, EMA, SMA, MACD, and more
- **Multi-timeframe Analysis**: Supports different timeframes per condition
- **Debounce Mechanism**: Prevents duplicate triggers per bar
- **Action Dispatch**: Webhooks, in-app notifications, and bot triggers
- **Row Level Security**: User-scoped data access via Supabase RLS

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Alert Runner  │    │   Alert Manager  │    │   Data Source   │
│                 │───▶│                 │───▶│                 │
│ • Main Loop     │    │ • Fetch Alerts  │    │ • OHLCV Data    │
│ • Polling       │    │ • Evaluate      │    │ • MTF Support   │
│ • Dispatch      │    │ • Log Results   │    │ • Caching       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dispatch      │    │   State Cache   │    │   Evaluator     │
│                 │    │                 │    │                 │
│ • Webhooks      │    │ • Last Fired    │    │ • Conditions    │
│ • Notifications │    │ • Indicator Memo│    │ • Operators     │
│ • Bot Triggers  │    │ • Debounce      │    │ • Comparisons   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components

### 1. Alert Runner (`runner.py`)

Main process loop that:
- Fetches active alerts from database
- Groups alerts by symbol for efficiency
- Evaluates each alert against current market data
- Dispatches actions when conditions are met
- Implements debounce to prevent duplicate triggers

### 2. Alert Manager (`alert_manager.py`)

Core evaluation engine that:
- Fetches active alerts from Supabase
- Applies only needed indicators to market data
- Handles multi-timeframe conditions
- Evaluates condition logic (AND/OR)
- Builds trigger snapshots for logging

### 3. Data Source (`datasource.py`)

Market data provider that:
- Fetches recent OHLCV candles
- Supports multiple timeframes
- Handles upsampling/downsampling
- Provides test data for development

### 4. Condition Evaluator (`backend/evaluator.py`)

Condition evaluation engine that:
- Supports indicator, price, and volume conditions
- Handles various operators (>, <, crosses_above, etc.)
- Compares indicators with values or other indicators
- Provides flexible condition matching

### 5. Dispatch System (`dispatch.py`)

Action dispatcher that:
- Sends webhook notifications
- Triggers in-app notifications
- Supports bot action triggers
- Handles async dispatch operations

### 6. State Management (`state.py`)

In-memory state that:
- Tracks last fired time per alert
- Caches indicator calculations
- Implements debounce logic
- Prevents duplicate evaluations

## Usage

### Running the Alert Runner

```bash
# Run the alert runner
python -m apps.alerts.runner

# Or run directly
python apps/alerts/runner.py
```

### Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Alert Runner Configuration
ALERT_RUNNER_POLL_MS=1000        # Polling interval in milliseconds
ALERT_MAX_ALERTS_PER_SYMBOL=200  # Maximum alerts per symbol
```

### Testing

```bash
# Run comprehensive tests
python apps/alerts/test_alert_system.py

# Test the runner
python apps/alerts/test_runner.py
```

## Alert Conditions

### Indicator Conditions

```json
{
  "id": "rsi_oversold",
  "type": "indicator",
  "indicator": "RSI",
  "component": "RSI",
  "operator": "<",
  "compareWith": "value",
  "compareValue": 30,
  "timeframe": "same",
  "settings": {"length": 14}
}
```

### Price Conditions

```json
{
  "id": "price_above_ema",
  "type": "price",
  "operator": ">",
  "compareWith": "indicator_component",
  "rhs": {
    "indicator": "EMA",
    "component": "EMA",
    "settings": {"period": 20}
  },
  "timeframe": "same"
}
```

### Volume Conditions

```json
{
  "id": "volume_spike",
  "type": "volume",
  "operator": ">",
  "compareWith": "value",
  "compareValue": 1000000,
  "timeframe": "same"
}
```

## Supported Indicators

- **RSI**: Relative Strength Index
- **EMA**: Exponential Moving Average
- **SMA**: Simple Moving Average
- **MACD**: Moving Average Convergence Divergence
- **Bollinger Bands**: Price volatility bands
- **Stochastic**: Momentum oscillator
- **ATR**: Average True Range
- **Volume**: Volume-based indicators

## Supported Operators

- **Comparison**: `>`, `<`, `>=`, `<=`, `equals`
- **Crossovers**: `crosses_above`, `crosses_below`
- **Divergence**: `divergence`, `convergence`

## Action Types

### Notify Action

```json
{
  "type": "notify"
}
```

### Webhook Action

```json
{
  "type": "webhook",
  "url": "https://api.example.com/webhook"
}
```

### Bot Action

```json
{
  "type": "bot",
  "bot_id": "uuid-of-bot"
}
```

## Multi-Timeframe Support

The system supports different timeframes for conditions:

- **Same Timeframe**: Condition uses the alert's base timeframe
- **Different Timeframe**: Condition uses a different timeframe (e.g., 1h alert with 15m condition)
- **Automatic Resampling**: Data is automatically resampled to match condition timeframes

## Debounce Mechanism

- **Per-Alert Tracking**: Each alert tracks its last fired time
- **Bar-Based Debounce**: Prevents multiple triggers per bar
- **Timestamp Comparison**: Uses precise timestamp matching
- **Memory Efficient**: In-memory state with automatic cleanup

## Error Handling

- **Graceful Degradation**: Continues running even if individual alerts fail
- **Structured Logging**: Comprehensive error logging and monitoring
- **Exception Isolation**: One failed alert doesn't affect others
- **Retry Logic**: Automatic retry for transient failures

## Performance Optimizations

- **Symbol Batching**: Groups alerts by symbol for efficient processing
- **Indicator Caching**: Caches indicator calculations to avoid recomputation
- **Selective Application**: Only applies indicators that are actually needed
- **Memory Management**: Efficient memory usage with cleanup

## Integration Points

### Supabase Integration

- **RLS Compliance**: Respects Row Level Security policies
- **Real-time Updates**: Can be extended for real-time alert updates
- **User Scoping**: All operations are user-scoped

### API Integration

- **RESTful Endpoints**: Integrates with the alerts API
- **Authentication**: Uses Supabase JWT authentication
- **Data Validation**: Validates all data with Pydantic schemas

### Frontend Integration

- **Real-time Notifications**: Can push notifications to frontend
- **WebSocket Support**: Ready for WebSocket integration
- **Event Streaming**: Can stream alert events to clients

## Monitoring and Observability

### Logging

- **Structured Logs**: JSON-formatted logs for easy parsing
- **Alert Events**: Logs all alert triggers and evaluations
- **Performance Metrics**: Tracks evaluation times and success rates
- **Error Tracking**: Comprehensive error logging and stack traces

### Metrics

- **Alert Counts**: Number of active alerts per symbol
- **Trigger Rates**: Frequency of alert triggers
- **Evaluation Times**: Performance metrics for condition evaluation
- **Error Rates**: Success/failure rates for alert processing

## Future Enhancements

### Planned Features

- **Real-time Data**: Integration with live market data streams
- **Advanced Indicators**: Support for more technical indicators
- **Machine Learning**: ML-based condition evaluation
- **Backtesting**: Historical alert performance analysis
- **Alert Templates**: Pre-built alert templates for common strategies

### Scalability Improvements

- **Distributed Processing**: Multi-instance alert processing
- **Redis Integration**: Distributed caching and state management
- **Message Queues**: Asynchronous alert processing
- **Load Balancing**: Distribute alerts across multiple runners

## Troubleshooting

### Common Issues

1. **Alerts Not Triggering**: Check condition logic and data availability
2. **Duplicate Triggers**: Verify debounce mechanism is working
3. **Performance Issues**: Monitor alert counts and evaluation times
4. **Database Errors**: Check Supabase connection and RLS policies

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Health Checks

Monitor the runner health:

```bash
# Check if runner is running
ps aux | grep alert_runner

# Check logs
tail -f logs/alert_runner.log
```

## Contributing

### Development Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

3. Run tests:
```bash
python apps/alerts/test_alert_system.py
```

### Code Style

- Follow PEP 8 guidelines
- Use type hints for all functions
- Add docstrings for all classes and methods
- Write comprehensive tests for new features

## License

This project is part of the Tradeeon trading platform and follows the same licensing terms.




# Alerts API Documentation

This document describes the Alerts API implementation for Tradeeon, providing CRUD operations for trading alerts with Supabase authentication and Row Level Security (RLS).

## Overview

The Alerts API allows users to create, manage, and monitor trading alerts based on technical indicators, price action, and volume conditions. All operations are user-scoped through Supabase authentication and RLS policies.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI       │    │   Service       │    │   Supabase      │
│   Routes        │───▶│   Layer         │───▶│   Database      │
│                 │    │                 │    │                 │
│ • POST /alerts  │    │ • create_alert  │    │ • alerts table  │
│ • GET /alerts   │    │ • list_alerts   │    │ • alerts_log    │
│ • PATCH /alerts │    │ • update_alert  │    │ • RLS policies  │
│ • DELETE /alerts│    │ • delete_alert  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Endpoints

### Authentication

All endpoints require a valid Supabase JWT token in the Authorization header:

```http
Authorization: Bearer <supabase_jwt_token>
```

### Alert Management

#### Create Alert
```http
POST /alerts
Content-Type: application/json

{
  "symbol": "BTCUSDT",
  "base_timeframe": "1m",
  "conditions": [
    {
      "id": "c1",
      "type": "indicator",
      "indicator": "RSI",
      "component": "RSI",
      "operator": "crosses_below",
      "compareWith": "value",
      "compareValue": 30,
      "timeframe": "same",
      "settings": {"length": 14}
    }
  ],
  "logic": "AND",
  "action": {"type": "notify"},
  "status": "active"
}
```

**Response:**
```json
{
  "alert_id": "uuid",
  "user_id": "uuid",
  "symbol": "BTCUSDT",
  "base_timeframe": "1m",
  "conditions": [...],
  "logic": "AND",
  "action": {"type": "notify"},
  "status": "active",
  "created_at": "2025-01-22T14:30:00Z",
  "last_triggered_at": null
}
```

#### List Alerts
```http
GET /alerts
```

**Response:**
```json
[
  {
    "alert_id": "uuid",
    "user_id": "uuid",
    "symbol": "BTCUSDT",
    ...
  }
]
```

#### Get Alert
```http
GET /alerts/{alert_id}
```

#### Update Alert
```http
PATCH /alerts/{alert_id}
Content-Type: application/json

{
  "status": "paused"
}
```

#### Delete Alert
```http
DELETE /alerts/{alert_id}
```

**Response:**
```json
{
  "ok": true
}
```

### Alert Logs

#### Get Alert Logs
```http
GET /alerts/{alert_id}/logs?limit=50&offset=0
```

**Response:**
```json
[
  {
    "id": 1,
    "alert_id": "uuid",
    "triggered_at": "2025-01-22T14:30:00Z",
    "payload": {
      "price": 45000.0,
      "rsi": 28.5,
      "volume": 1000000
    }
  }
]
```

## Data Models

### Condition Types

#### Indicator Condition
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

#### Price Condition
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

#### Volume Condition
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

### Action Types

#### Notify Action
```json
{
  "type": "notify"
}
```

#### Webhook Action
```json
{
  "type": "webhook",
  "url": "https://api.example.com/webhook"
}
```

#### Bot Action
```json
{
  "type": "bot",
  "bot_id": "uuid-of-bot"
}
```

## Security

### Row Level Security (RLS)

- **Alerts Table**: Users can only CRUD their own alerts
- **Alerts Log Table**: Users can only read logs for their own alerts
- **Policy**: `auth.uid() = user_id`

### Authentication

- **JWT Verification**: All requests validated against Supabase JWT secret
- **User Extraction**: User ID extracted from JWT payload
- **Token Validation**: Invalid tokens return 401 Unauthorized

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "detail": "Missing token"
}
```

#### 404 Not Found
```json
{
  "detail": "Alert not found"
}
```

#### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "symbol"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

## Testing

### Manual Testing

Use the provided test scripts:

```bash
# Bash script
./test_alerts_api.sh

# Python script
python test_alerts_api.py
```

### Environment Variables

Set the following environment variables:

```bash
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SUPABASE_JWT_SECRET="your-jwt-secret"
export SUPABASE_JWT_TOKEN="your-test-jwt-token"
```

### Example Test Data

```json
{
  "symbol": "BTCUSDT",
  "base_timeframe": "1h",
  "conditions": [
    {
      "id": "macd_bullish",
      "type": "indicator",
      "indicator": "MACD",
      "component": "MACD Line",
      "operator": "crosses_above",
      "compareWith": "indicator_component",
      "rhs": {
        "indicator": "MACD",
        "component": "Signal Line"
      },
      "timeframe": "same"
    },
    {
      "id": "volume_confirmation",
      "type": "volume",
      "operator": ">",
      "compareWith": "value",
      "compareValue": 500000,
      "timeframe": "same"
    }
  ],
  "logic": "AND",
  "action": {"type": "notify"},
  "status": "active"
}
```

## Dependencies

### Required Packages

- `fastapi>=0.104.1` - Web framework
- `supabase>=2.0.0` - Supabase client
- `pyjwt>=2.8.0` - JWT token handling
- `pydantic>=2.0.0` - Data validation

### Installation

```bash
pip install -e .
```

## File Structure

```
apps/api/
├── deps/
│   └── auth.py              # Authentication dependency
├── clients/
│   └── supabase_client.py   # Supabase client
├── schemas/
│   └── alerts.py            # Pydantic models
├── services/
│   └── alerts_service.py     # Business logic
├── routes/
│   └── alerts.py            # FastAPI routes
├── main.py                  # Application entry point
├── test_alerts_api.py       # Python test script
└── test_alerts_api.sh       # Bash test script
```

## Next Steps

This API is ready for integration with:

1. **Alert Runner Service** (Task #3) - Evaluates conditions and writes logs
2. **Frontend Integration** - React components for alert management
3. **Webhook Handlers** - External service integrations
4. **Bot Integration** - Automated trading execution

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Verify JWT token and secret
2. **Database Errors**: Check Supabase connection and RLS policies
3. **Validation Errors**: Ensure request payload matches Pydantic schemas
4. **Permission Errors**: Verify user owns the alert being accessed

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```




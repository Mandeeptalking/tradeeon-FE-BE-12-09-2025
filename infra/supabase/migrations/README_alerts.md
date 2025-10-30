# Alerts Schema Documentation

This document describes the alerts system implementation for Tradeeon, including database schema, shared types, and usage examples.

## Overview

The alerts system allows users to create custom trading alerts based on technical indicators, price action, and volume conditions. Alerts can trigger notifications, webhooks, or automated trading bots.

## Database Schema

### Tables

#### `public.alerts`
Master table storing user-created alerts.

| Column | Type | Description |
|--------|------|-------------|
| `alert_id` | `uuid` | Primary key, auto-generated |
| `user_id` | `uuid` | Foreign key to `auth.users(id)` |
| `symbol` | `text` | Trading pair symbol (e.g., 'BTCUSDT') |
| `base_timeframe` | `text` | Base timeframe for conditions (e.g., '1m', '1h') |
| `conditions` | `jsonb` | Array of condition objects |
| `logic` | `text` | Logical operator: 'AND' or 'OR' |
| `action` | `jsonb` | Action configuration (notify/webhook/bot) |
| `status` | `text` | Alert status: 'active' or 'paused' |
| `created_at` | `timestamptz` | Creation timestamp |
| `last_triggered_at` | `timestamptz` | Last trigger timestamp |

#### `public.alerts_log`
Log table storing alert trigger events.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `bigserial` | Primary key, auto-increment |
| `alert_id` | `uuid` | Foreign key to `alerts(alert_id)` |
| `triggered_at` | `timestamptz` | Trigger timestamp |
| `payload` | `jsonb` | Snapshot of market data at trigger time |

### Indexes

- `alerts_user_idx`: Index on `user_id` for user queries
- `alerts_symbol_idx`: Index on `symbol` for symbol-based queries
- `alerts_log_alert_idx`: Index on `alert_id` for log queries

### Row Level Security (RLS)

#### Alerts Table
- **Policy**: `alerts_owner_rw`
- **Access**: Users can only CRUD their own alerts
- **Rule**: `auth.uid() = user_id`

#### Alerts Log Table
- **Policy**: `alerts_log_owner_r`
- **Access**: Users can only read logs for their own alerts
- **Rule**: Exists check on alerts table for ownership

## Shared Types

### TypeScript (Zod Schemas)

Located in `shared/contracts/alerts.ts`:

```typescript
// Core types
export type TCondition = z.infer<typeof Condition>;
export type TAction = z.infer<typeof Action>;
export type TAlertCreate = z.infer<typeof AlertCreate>;

// Example usage
const alertData: TAlertCreate = {
  symbol: "BTCUSDT",
  base_timeframe: "1h",
  conditions: [
    {
      id: "rsi_oversold",
      type: "indicator",
      indicator: "RSI",
      component: "RSI",
      operator: "<",
      compareWith: "value",
      compareValue: 30,
      timeframe: "same"
    }
  ],
  logic: "AND",
  action: { type: "notify" },
  status: "active"
};
```

### Python Dataclasses

Located in `backend/shared/contracts/alerts.py`:

```python
from backend.shared.contracts.alerts import AlertCreate, Condition, ActionNotify

# Example usage
alert = AlertCreate(
    symbol="BTCUSDT",
    base_timeframe="1h",
    conditions=[
        Condition(
            id="rsi_oversold",
            type="indicator",
            operator="<",
            compareWith="value",
            compareValue=30.0,
            indicator="RSI",
            component="RSI",
            timeframe="same"
        )
    ],
    logic="AND",
    action=ActionNotify(),
    status="active"
)
```

## Condition Types

### Indicator Conditions
Compare technical indicators with values or other indicators.

```typescript
{
  id: "macd_bullish",
  type: "indicator",
  indicator: "MACD",
  component: "MACD Line",
  operator: "crosses_above",
  compareWith: "indicator_component",
  rhs: {
    indicator: "MACD",
    component: "Signal Line"
  },
  timeframe: "same"
}
```

### Price Conditions
Compare price levels or movements.

```typescript
{
  id: "price_above_ema",
  type: "price",
  operator: ">",
  compareWith: "indicator_component",
  rhs: {
    indicator: "EMA",
    component: "EMA",
    settings: { period: 20 }
  },
  timeframe: "same"
}
```

### Volume Conditions
Compare volume levels or patterns.

```typescript
{
  id: "volume_spike",
  type: "volume",
  operator: ">",
  compareWith: "value",
  compareValue: 1000000,
  timeframe: "same"
}
```

## Action Types

### Notify Action
Send notification to user.

```typescript
{
  type: "notify"
}
```

### Webhook Action
Send HTTP POST to external URL.

```typescript
{
  type: "webhook",
  url: "https://api.example.com/webhook"
}
```

### Bot Action (Future)
Trigger automated trading bot.

```typescript
{
  type: "bot",
  bot_id: "uuid-of-bot"
}
```

## Usage Examples

### Creating an Alert

```typescript
import { AlertCreate } from '../shared/contracts/alerts';

const rsiOversoldAlert: AlertCreate = {
  symbol: "BTCUSDT",
  base_timeframe: "1h",
  conditions: [
    {
      id: "rsi_oversold",
      type: "indicator",
      indicator: "RSI",
      component: "RSI",
      operator: "<",
      compareWith: "value",
      compareValue: 30,
      timeframe: "same"
    },
    {
      id: "volume_confirmation",
      type: "volume",
      operator: ">",
      compareWith: "value",
      compareValue: 500000,
      timeframe: "same"
    }
  ],
  logic: "AND",
  action: { type: "notify" },
  status: "active"
};
```

### Querying User Alerts

```sql
-- Get all active alerts for a user
SELECT * FROM public.alerts 
WHERE user_id = auth.uid() 
AND status = 'active';

-- Get alert logs for a specific alert
SELECT al.*, a.symbol 
FROM public.alerts_log al
JOIN public.alerts a ON al.alert_id = a.alert_id
WHERE a.user_id = auth.uid()
AND a.alert_id = $1
ORDER BY al.triggered_at DESC;
```

## Migration Files

1. **`01_alerts.sql`**: Creates the alerts table with RLS
2. **`02_alerts_log.sql`**: Creates the alerts_log table with RLS
3. **`test_alerts_migrations.sql`**: Test queries to verify schema

## Testing

Run the test migration file in Supabase SQL editor to verify:
- Tables exist with correct structure
- Indexes are created
- RLS is enabled
- Policies are in place

## Security Considerations

- All tables have RLS enabled
- Users can only access their own data
- Foreign key constraints ensure data integrity
- JSONB fields are validated by application layer using Zod schemas




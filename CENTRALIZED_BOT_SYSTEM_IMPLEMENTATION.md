# Centralized Bot System - Implementation Guide

## 🚀 Quick Start

### Step 1: Run Database Migration

```bash
# Connect to Supabase SQL Editor and run:
# infra/supabase/migrations/06_condition_registry.sql
```

This creates:
- `condition_registry` - Stores all unique conditions
- `user_condition_subscriptions` - Maps users/bots to conditions
- `condition_evaluation_cache` - Caches indicator calculations
- `condition_triggers` - Logs all condition triggers

### Step 2: Start Backend API

The condition registry API is now available at:
- `POST /conditions/register` - Register a condition
- `POST /conditions/subscribe` - Subscribe bot to condition
- `GET /conditions/{condition_id}/status` - Get condition status
- `GET /conditions/user/subscriptions` - Get user's subscriptions

### Step 3: Integrate with Bots

When creating a bot, register its conditions:

```python
# Example: DCA Bot with RSI condition
condition = {
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "indicator": "RSI",
    "operator": "crosses_below",
    "value": 30,
    "period": 14
}

# Register condition
response = await client.post("/conditions/register", json=condition)
condition_id = response.json()["condition_id"]

# Subscribe bot to condition
subscription = {
    "bot_id": "dca_bot_123",
    "condition_id": condition_id,
    "bot_type": "dca",
    "bot_config": {
        "baseOrderSize": 100,
        "dcaRules": {...}
    }
}
await client.post("/conditions/subscribe", json=subscription)
```

---

## 🔄 How It Works

### 1. Condition Registration Flow

```
User creates bot → Bot registers conditions → System normalizes & hashes → Stores in registry
```

**Example**:
- User A creates DCA Bot with "RSI < 30"
- User B creates Grid Bot with "RSI < 30"
- Both get same `condition_id` (hash) → **Shared evaluation!**

### 2. Condition Evaluation Flow

```
Centralized Evaluator → Fetches market data once → Calculates indicators once → Evaluates all conditions → Publishes triggers
```

**Optimization**:
- 1000 users with same condition = 1 evaluation
- 1000 users with different conditions on same symbol = 1 data fetch + 1 indicator calc per unique indicator

### 3. Bot Execution Flow

```
Condition triggered → Event published → All subscribed bots notified → Each bot executes its strategy
```

**Example**:
- RSI crosses below 30
- Event: `condition.{hash}.triggered`
- DCA Bot receives → Places DCA buy order
- Grid Bot receives → Places grid buy order
- Trend Bot receives → Enters long position

---

## 📊 Cost Savings Example

### Before (Without Centralization)
```
1000 users × 5 conditions = 5000 evaluations
Each evaluation:
  - Market data: 100ms
  - Indicator calc: 50ms
  - Condition check: 10ms
Total: 5000 × 160ms = 800 seconds
```

### After (With Centralization)
```
Unique conditions: ~500
Each evaluation:
  - Market data: 100ms (shared)
  - Indicator calc: 50ms (shared)
  - Condition check: 10ms × 500 = 5s
Total: 5.15 seconds
```

**Savings: 99.36% reduction** 🎉

---

## 🔧 Integration Examples

### DCA Bot Integration

```python
# In DCA Bot creation
async def create_dca_bot(bot_config):
    # Extract conditions from bot config
    conditions = extract_conditions(bot_config)
    
    # Register each condition
    condition_ids = []
    for condition in conditions:
        result = await register_condition(condition)
        condition_ids.append(result["condition_id"])
    
    # Subscribe bot to conditions
    for condition_id in condition_ids:
        await subscribe_bot(
            bot_id=bot_config["bot_id"],
            condition_id=condition_id,
            bot_type="dca",
            bot_config=bot_config
        )
    
    return condition_ids
```

### Grid Bot Integration

```python
# Grid Bot with multiple conditions
conditions = [
    {"indicator": "RSI", "operator": "<", "value": 30},  # Buy condition
    {"indicator": "RSI", "operator": ">", "value": 70},  # Sell condition
]

for condition in conditions:
    condition_id = await register_condition(condition)
    await subscribe_bot(bot_id, condition_id, "grid", bot_config)
```

### Trend Following Bot Integration

```python
# Trend Bot with MACD crossover
condition = {
    "indicator": "MACD",
    "operator": "crosses_above",
    "component": "histogram"
}

condition_id = await register_condition(condition)
await subscribe_bot(bot_id, condition_id, "trend", bot_config)
```

---

## 🎯 Next Steps

### Phase 1: Basic Integration (Current)
- ✅ Condition Registry API
- ✅ Database Schema
- ✅ Condition Normalization
- ✅ Subscription Management

### Phase 2: Evaluation Engine (Next)
- [ ] Centralized Condition Evaluator service
- [ ] Event bus integration (Redis/RabbitMQ)
- [ ] Bot notification system
- [ ] Performance monitoring

### Phase 3: Bot Execution (Future)
- [ ] DCA Bot integration
- [ ] Grid Bot integration
- [ ] Trend Bot integration
- [ ] Market Making Bot integration

### Phase 4: Optimization (Future)
- [ ] Result caching
- [ ] Batch evaluation
- [ ] Horizontal scaling
- [ ] Load balancing

---

## 📈 Monitoring

### Key Metrics to Track

1. **Condition Registry**
   - Total unique conditions
   - Conditions per symbol/timeframe
   - Most popular conditions

2. **Subscriptions**
   - Total active subscriptions
   - Subscribers per condition
   - Average conditions per user

3. **Evaluation**
   - Evaluations per second
   - Cache hit rate
   - Average evaluation time

4. **Cost Savings**
   - Redundant evaluations avoided
   - Compute time saved
   - Cost reduction percentage

---

## 🔒 Security Considerations

1. **User Isolation**: Users can only subscribe their own bots
2. **Condition Privacy**: Conditions are public (for sharing), but bot configs are private
3. **Rate Limiting**: Prevent abuse of condition registry
4. **Validation**: Validate all condition inputs

---

## 🐛 Troubleshooting

### Condition Not Triggering
1. Check condition is registered: `GET /conditions/{condition_id}/status`
2. Check subscription is active: `GET /conditions/user/subscriptions`
3. Check evaluation logs
4. Verify market data is available

### Performance Issues
1. Check evaluation cache hit rate
2. Monitor database query performance
3. Check event bus queue depth
4. Review indicator calculation time

---

## 📚 API Reference

See `CENTRALIZED_BOT_SYSTEM_DESIGN.md` for full API documentation.

---

**Last Updated**: 2025-01-11
**Status**: Phase 1 Complete - Ready for Integration


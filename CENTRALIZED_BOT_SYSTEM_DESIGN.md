# Centralized Bot Orchestration System Design

## 🎯 Overview

A centralized system that evaluates trading conditions once and distributes alerts to all users with matching conditions, dramatically reducing computational costs and improving efficiency.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Centralized Condition Engine                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Condition Evaluator (Single Instance)                    │  │
│  │  - Evaluates all unique conditions                       │  │
│  │  - Caches results                                         │  │
│  │  - Publishes to event bus                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Event Bus / Message Queue                                │  │
│  │  - Redis Pub/Sub or RabbitMQ                              │  │
│  │  - Topics: condition.{symbol}.{condition_hash}            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
└─────────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  User Bot 1  │  │  User Bot 2  │  │  User Bot N  │
│  (DCA Bot)   │  │  (Grid Bot)  │  │  (Trend Bot) │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🔑 Key Concepts

### 1. Condition Normalization
All conditions are normalized into a standard format:
```json
{
  "condition_id": "hash_of_condition",
  "symbol": "BTCUSDT",
  "indicator": "RSI",
  "timeframe": "1h",
  "operator": "crosses_below",
  "value": 30,
  "period": 14
}
```

### 2. Condition Hashing
Conditions are hashed to create unique identifiers:
- Same condition = Same hash = Shared evaluation
- Example: `RSI(14) crosses below 30 on BTCUSDT 1h` → `hash_abc123`

### 3. User-Condition Mapping
Users subscribe to conditions:
```
User A → [hash_abc123, hash_def456]
User B → [hash_abc123, hash_ghi789]  // Shares hash_abc123 with User A
User C → [hash_def456, hash_jkl012]
```

### 4. Event-Driven Architecture
When condition is met:
1. Condition Engine evaluates once
2. Publishes event: `condition.triggered.{hash_abc123}`
3. All subscribed users receive notification
4. Each user's bot executes their specific strategy

---

## 📊 System Components

### 1. Condition Registry Service
**Purpose**: Register and normalize all trading conditions

**Responsibilities**:
- Normalize conditions from different bot types
- Generate condition hashes
- Store condition metadata
- Track condition subscriptions

**Database Schema**:
```sql
CREATE TABLE condition_registry (
    condition_id VARCHAR(64) PRIMARY KEY,  -- Hash of condition
    condition_type VARCHAR(50),            -- 'RSI', 'MACD', 'Price', etc.
    symbol VARCHAR(20),
    timeframe VARCHAR(10),
    indicator_config JSONB,               -- Full condition config
    created_at TIMESTAMP DEFAULT NOW(),
    last_evaluated_at TIMESTAMP,
    evaluation_count BIGINT DEFAULT 0
);

CREATE TABLE user_condition_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    bot_id VARCHAR(100),                  -- User's bot ID
    condition_id VARCHAR(64) REFERENCES condition_registry(condition_id),
    bot_type VARCHAR(50),                  -- 'dca', 'grid', 'trend', etc.
    bot_config JSONB,                     -- Bot-specific config
    created_at TIMESTAMP DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_condition_symbol_timeframe ON condition_registry(symbol, timeframe);
CREATE INDEX idx_user_subscriptions_user ON user_condition_subscriptions(user_id, active);
CREATE INDEX idx_user_subscriptions_condition ON user_condition_subscriptions(condition_id, active);
```

### 2. Condition Evaluator Engine
**Purpose**: Evaluate all unique conditions efficiently

**Responsibilities**:
- Fetch market data once per symbol/timeframe
- Evaluate all conditions for that symbol/timeframe
- Cache results
- Publish events when conditions are met

**Optimization Strategies**:
1. **Batch Evaluation**: Evaluate all conditions for a symbol/timeframe together
2. **Caching**: Cache indicator values (RSI, MACD, etc.) for reuse
3. **Incremental Updates**: Only re-evaluate when new candle arrives
4. **Parallel Processing**: Evaluate different symbols in parallel

**Example Flow**:
```python
# Pseudo-code
async def evaluate_conditions_for_symbol(symbol: str, timeframe: str):
    # Fetch market data once
    candles = await market_data.get_klines(symbol, timeframe, limit=200)
    
    # Calculate indicators once
    rsi = calculate_rsi(candles, period=14)
    macd = calculate_macd(candles)
    ema_20 = calculate_ema(candles, period=20)
    
    # Get all conditions for this symbol/timeframe
    conditions = await get_conditions(symbol, timeframe)
    
    # Evaluate each condition
    for condition in conditions:
        result = evaluate_condition(condition, {
            'rsi': rsi,
            'macd': macd,
            'ema_20': ema_20,
            'price': candles[-1].close
        })
        
        if result.triggered:
            # Publish event - all subscribed users will receive
            await event_bus.publish(f"condition.{condition.condition_id}", {
                'condition_id': condition.condition_id,
                'symbol': symbol,
                'timeframe': timeframe,
                'triggered_at': datetime.now(),
                'trigger_value': result.value
            })
```

### 3. Event Bus / Message Queue
**Purpose**: Distribute condition triggers to subscribed users

**Technology Options**:
- **Redis Pub/Sub**: Lightweight, fast, good for real-time
- **RabbitMQ**: More features, better for complex routing
- **Apache Kafka**: For high-throughput scenarios

**Topic Structure**:
```
condition.{condition_id}           # Specific condition
condition.{symbol}.{timeframe}     # All conditions for symbol/timeframe
user.{user_id}.bot.{bot_id}        # User-specific bot events
```

### 4. Bot Execution Engine
**Purpose**: Execute bot-specific logic when conditions are met

**Responsibilities**:
- Listen for condition triggers
- Execute bot-specific strategy
- Place orders (paper or live)
- Update bot state

**Bot Types Supported**:
1. **DCA Bot**: Triggers DCA buy orders
2. **Grid Bot**: Triggers grid order placement
3. **Trend Following Bot**: Triggers trend entry/exit
4. **Market Making Bot**: Triggers market making orders
5. **Arbitrage Bot**: Triggers arbitrage opportunities

---

## 🔄 Workflow Examples

### Example 1: RSI Condition Shared by Multiple Users

**Setup**:
- User A: DCA Bot with condition "RSI < 30"
- User B: Grid Bot with condition "RSI < 30"
- User C: Trend Bot with condition "RSI < 30"

**Flow**:
1. Condition Registry normalizes all three → Same hash `abc123`
2. Condition Evaluator evaluates RSI once for BTCUSDT 1h
3. When RSI crosses below 30:
   - Event published: `condition.abc123`
   - User A's DCA Bot receives → Places DCA buy order
   - User B's Grid Bot receives → Places grid buy order
   - User C's Trend Bot receives → Enters long position

**Cost Savings**: 3 evaluations → 1 evaluation (66% reduction)

### Example 2: Multiple Conditions on Same Symbol

**Setup**:
- User A: RSI < 30 on BTCUSDT 1h
- User B: RSI < 30 on BTCUSDT 1h
- User C: MACD crossover on BTCUSDT 1h
- User D: EMA cross on BTCUSDT 1h

**Flow**:
1. Fetch BTCUSDT 1h candles once
2. Calculate RSI, MACD, EMA once
3. Evaluate all 4 conditions using cached indicators
4. Publish events for triggered conditions

**Cost Savings**: 4× data fetch + 4× indicator calc → 1× data fetch + 1× indicator calc (75% reduction)

---

## 💾 Database Design

### Core Tables

```sql
-- Condition Registry
CREATE TABLE condition_registry (
    condition_id VARCHAR(64) PRIMARY KEY,
    condition_type VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    indicator_config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_evaluated_at TIMESTAMP,
    evaluation_count BIGINT DEFAULT 0,
    last_triggered_at TIMESTAMP,
    trigger_count BIGINT DEFAULT 0
);

-- User Subscriptions
CREATE TABLE user_condition_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bot_id VARCHAR(100) NOT NULL,
    condition_id VARCHAR(64) REFERENCES condition_registry(condition_id),
    bot_type VARCHAR(50) NOT NULL,
    bot_config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP
);

-- Condition Evaluation Cache
CREATE TABLE condition_evaluation_cache (
    condition_id VARCHAR(64) REFERENCES condition_registry(condition_id),
    symbol VARCHAR(20),
    timeframe VARCHAR(10),
    candle_time TIMESTAMP,
    indicator_values JSONB,  -- Cached indicator values
    evaluated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (condition_id, candle_time)
);

-- Condition Trigger Log
CREATE TABLE condition_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condition_id VARCHAR(64) REFERENCES condition_registry(condition_id),
    symbol VARCHAR(20),
    timeframe VARCHAR(10),
    triggered_at TIMESTAMP DEFAULT NOW(),
    trigger_value JSONB,
    subscribers_count INTEGER,
    processed BOOLEAN DEFAULT FALSE
);
```

---

## 🚀 Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

1. **Condition Registry Service**
   - [ ] Create condition normalization logic
   - [ ] Implement condition hashing
   - [ ] Build subscription management API
   - [ ] Create database schema

2. **Condition Evaluator**
   - [ ] Build market data fetcher
   - [ ] Implement indicator calculator
   - [ ] Create condition evaluation engine
   - [ ] Add caching layer

3. **Event Bus**
   - [ ] Set up Redis/RabbitMQ
   - [ ] Implement pub/sub system
   - [ ] Create event publishers
   - [ ] Create event subscribers

### Phase 2: Bot Integration (Week 3-4)

1. **DCA Bot Integration**
   - [ ] Subscribe DCA bot conditions
   - [ ] Handle condition triggers
   - [ ] Execute DCA logic

2. **Other Bot Types**
   - [ ] Grid Bot integration
   - [ ] Trend Following Bot integration
   - [ ] Market Making Bot integration

### Phase 3: Optimization (Week 5-6)

1. **Performance Optimization**
   - [ ] Implement batch evaluation
   - [ ] Add result caching
   - [ ] Optimize database queries
   - [ ] Add monitoring

2. **Scalability**
   - [ ] Horizontal scaling support
   - [ ] Load balancing
   - [ ] Auto-scaling rules

### Phase 4: Monitoring & Analytics (Week 7-8)

1. **Metrics & Monitoring**
   - [ ] Condition evaluation metrics
   - [ ] Cost savings tracking
   - [ ] Performance monitoring
   - [ ] Alert system

2. **Analytics Dashboard**
   - [ ] Condition usage statistics
   - [ ] Cost savings visualization
   - [ ] System health dashboard

---

## 📈 Cost Savings Calculation

### Current System (Without Centralization)
```
1000 users × 5 conditions each = 5000 condition evaluations
Each evaluation:
  - Market data fetch: 100ms
  - Indicator calculation: 50ms
  - Condition check: 10ms
Total: 5000 × 160ms = 800 seconds per cycle
```

### Centralized System
```
Unique conditions: ~500 (many users share same conditions)
Each evaluation:
  - Market data fetch: 100ms (shared)
  - Indicator calculation: 50ms (shared)
  - Condition check: 10ms × 500 = 5000ms
Total: 100ms + 50ms + 5000ms = 5.15 seconds per cycle
```

**Savings**: 800s → 5.15s = **99.36% reduction** 🎉

---

## 🔒 Security & Privacy

### Data Isolation
- User bot configs stored separately
- Condition triggers don't expose user data
- Each user's bot executes independently

### Access Control
- Users can only subscribe to conditions for their bots
- Bot configs are user-specific
- No cross-user data leakage

---

## 🎯 Benefits

1. **Cost Reduction**: 99%+ reduction in redundant computations
2. **Performance**: Faster condition evaluation (shared cache)
3. **Scalability**: Can handle millions of users efficiently
4. **Consistency**: All users get same condition evaluation
5. **Real-time**: Event-driven architecture for instant alerts

---

## 🔄 Migration Strategy

### Step 1: Parallel Running
- Run centralized system alongside current system
- Gradually migrate bots to centralized system
- Compare results for validation

### Step 2: Gradual Migration
- Migrate DCA bots first (most common)
- Then Grid bots
- Then other bot types

### Step 3: Full Migration
- Shut down old system
- All bots use centralized system
- Monitor performance

---

## 📝 API Design

### Condition Registry API

```python
# Register a condition
POST /api/conditions/register
{
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "indicator": "RSI",
    "operator": "crosses_below",
    "value": 30,
    "period": 14
}
Response: {
    "condition_id": "abc123...",
    "status": "registered"
}

# Subscribe bot to condition
POST /api/conditions/subscribe
{
    "user_id": "user_123",
    "bot_id": "bot_456",
    "bot_type": "dca",
    "condition_id": "abc123...",
    "bot_config": {...}
}

# Get condition status
GET /api/conditions/{condition_id}/status

# Unsubscribe
DELETE /api/conditions/subscribe/{subscription_id}
```

### Bot Execution API

```python
# Bot listens for events
WebSocket: ws://api/conditions/stream?user_id=user_123

# Event format
{
    "event_type": "condition_triggered",
    "condition_id": "abc123...",
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "triggered_at": "2025-01-11T10:00:00Z",
    "trigger_value": {...},
    "bot_config": {...}  # User's bot config
}
```

---

## 🧪 Testing Strategy

1. **Unit Tests**: Condition normalization, hashing, evaluation
2. **Integration Tests**: End-to-end condition trigger flow
3. **Load Tests**: 1000+ concurrent users, 10000+ conditions
4. **Performance Tests**: Measure cost savings
5. **Chaos Tests**: System resilience under failure

---

## 📊 Monitoring & Metrics

### Key Metrics
- Condition evaluation count
- Unique conditions count
- Subscribers per condition
- Cost savings percentage
- Event processing latency
- System throughput

### Alerts
- High condition evaluation latency
- Event bus queue depth
- Database connection issues
- Condition evaluation failures

---

**Last Updated**: 2025-01-11
**Status**: Design Phase
**Next Steps**: Begin Phase 1 Implementation


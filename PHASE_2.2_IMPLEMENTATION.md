# Phase 2.2: Event Bus Setup - Redis Pub/Sub

## ✅ STATUS: IMPLEMENTED

**Date**: 2025-11-17  
**Implementation**: Complete

---

## 📋 What Was Implemented

### 1. Event Bus Module ✅
**File**: `apps/bots/event_bus.py`

**Features**:
- Redis pub/sub implementation
- Publish condition trigger events
- Subscribe to condition channels
- Pattern-based subscriptions (e.g., `condition.*`)
- Automatic reconnection handling
- Async/await support

### 2. Integration with Evaluator ✅
**Modified**: `apps/bots/condition_evaluator.py`
- Publishes events when conditions trigger
- Channel format: `condition.{condition_id}`

### 3. Integration with Service Runner ✅
**Modified**: `apps/bots/run_condition_evaluator.py`
- Initializes event bus on startup
- Connects to Redis automatically
- Graceful shutdown with cleanup

---

## 🚀 Setup Instructions

### 1. Install Redis

**Option A: Docker (Recommended)**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Option B: Local Installation**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Windows
# Download from: https://github.com/microsoftarchive/redis/releases
```

### 2. Install Python Redis Library

```bash
pip install redis
```

Or add to `apps/api/pyproject.toml`:
```toml
dependencies = [
    ...
    "redis>=5.0.0",
]
```

### 3. Configure Redis URL

Set environment variable:
```bash
export REDIS_URL="redis://localhost:6379"
```

Or in `.env` file:
```
REDIS_URL=redis://localhost:6379
```

### 4. Start Redis

```bash
# Docker
docker start redis

# Local
redis-server
```

---

## 🔄 How It Works

### Event Flow:

1. **Condition Triggers**
   ```
   Evaluator detects condition met
   ↓
   Creates trigger event
   ↓
   Publishes to Redis channel: condition.{condition_id}
   ```

2. **Event Publishing**
   ```python
   await event_bus.publish(
       channel=f"condition.{condition_id}",
       event={
           "condition_id": "...",
           "symbol": "BTCUSDT",
           "triggered_at": "...",
           ...
       }
   )
   ```

3. **Bot Subscription**
   ```python
   await event_bus.subscribe(
       channel=f"condition.{condition_id}",
       callback=handle_trigger
   )
   ```

### Channel Naming:

- **Specific Condition**: `condition.{condition_id}`
  - Example: `condition.187efde11d740283`
  
- **Pattern Subscription**: `condition.*`
  - Subscribe to all condition triggers

---

## 📊 Event Structure

### Trigger Event Format:
```json
{
  "condition_id": "187efde11d740283",
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "triggered_at": "2025-11-17T18:00:00",
  "trigger_value": {
    "price": 45000.0,
    "volume": 1234.56
  },
  "subscribers_count": 5,
  "published_at": "2025-11-17T18:00:00",
  "channel": "condition.187efde11d740283"
}
```

---

## 🧪 Testing

### Test Event Bus:

```python
import asyncio
from apps.bots.event_bus import create_event_bus

async def test_event_bus():
    # Create event bus
    event_bus = await create_event_bus()
    
    if not event_bus:
        print("Redis not available")
        return
    
    # Subscribe to all conditions
    async def handle_trigger(event):
        print(f"Trigger received: {event}")
    
    await event_bus.psubscribe("condition.*", handle_trigger)
    
    # Start listening
    await event_bus.start_listening()

asyncio.run(test_event_bus())
```

### Test Publishing:

```python
import asyncio
from apps.bots.event_bus import create_event_bus

async def test_publish():
    event_bus = await create_event_bus()
    
    if event_bus:
        await event_bus.publish(
            "condition.test123",
            {"test": "data"}
        )
        print("Event published!")

asyncio.run(test_publish())
```

---

## 🔍 Monitoring

### Check Redis Connection:

```bash
redis-cli ping
# Should return: PONG
```

### Monitor Events:

```bash
# Subscribe to all condition channels
redis-cli PSUBSCRIBE "condition.*"
```

### Check Subscribers:

```python
# Get subscriber count for a channel
subscribers = await event_bus.get_channel_subscribers_count("condition.123")
```

---

## ✅ Integration Checklist

- [x] Event bus module created
- [x] Redis pub/sub implemented
- [x] Publish function implemented
- [x] Subscribe function implemented
- [x] Pattern subscription implemented
- [x] Integrated with evaluator
- [x] Integrated with service runner
- [x] Error handling implemented
- [x] Logging implemented
- [x] Graceful shutdown implemented

---

## 🐛 Troubleshooting

### Issue: Redis Connection Failed

**Error**: `Failed to connect to Redis`

**Solutions**:
1. Check Redis is running: `redis-cli ping`
2. Check Redis URL: `echo $REDIS_URL`
3. Check firewall/network access
4. Try: `redis://localhost:6379`

### Issue: Events Not Publishing

**Check**:
1. Event bus connected: Check logs for "Event bus connected"
2. Redis running: `redis-cli ping`
3. Channel name correct: `condition.{condition_id}`
4. Check logs for publish errors

### Issue: Subscribers Not Receiving Events

**Check**:
1. Subscribed to correct channel
2. Listening loop running: `event_bus.start_listening()`
3. Callback function is async
4. Check Redis pubsub: `redis-cli PUBSUB CHANNELS "condition.*"`

---

## 📝 Next Steps

### Phase 2.3: Bot Notification System
- Create bot notification handler
- Subscribe bots to condition channels
- Route triggers to bot executors
- Execute bot actions

---

## 📊 Status

**Phase 2.2**: ✅ **COMPLETE**

Event bus is implemented and ready. Next: Phase 2.3 - Bot Notification System

---

**Implemented**: 2025-11-17  
**Status**: ✅ COMPLETE  
**Next**: Phase 2.3 - Bot Notification System



# How to Verify Bot Endpoints Are Working

## Quick Verification

### Option 1: Automated Test Script (Recommended)

Run the comprehensive test script:

```bash
# Set your auth token
export SUPABASE_JWT_TOKEN="your_jwt_token_here"

# Set API base URL (default: http://localhost:8000)
export API_BASE_URL="https://api.tradeeon.com"  # For production

# Run tests
python3 scripts/test_bot_endpoints.py
```

The script will:
- ✅ Test authentication requirement
- ✅ Create a test bot
- ✅ Start bot in paper mode
- ✅ Get bot status (both endpoint paths)
- ✅ Get bot positions
- ✅ Get bot orders
- ✅ Get bot P&L
- ✅ Pause bot
- ✅ Resume bot
- ✅ Stop bot
- ✅ Test error cases

---

### Option 2: Manual Testing with curl

#### 1. Test Authentication (Should Fail)

```bash
curl -X GET "http://localhost:8000/api/bots/dca-bots/test_bot/status"
# Should return 401 Unauthorized
```

#### 2. Create a Bot

```bash
curl -X POST "http://localhost:8000/api/bots/dca-bots" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "botName": "Test Bot",
    "direction": "long",
    "pair": "BTCUSDT",
    "selectedPairs": ["BTCUSDT"],
    "baseOrderSize": 100,
    "conditionConfig": {
      "mode": "simple",
      "conditionType": "Indicator",
      "condition": {
        "indicator": "RSI",
        "component": "rsi",
        "operator": "crosses_below",
        "value": 30,
        "timeframe": "1h",
        "period": 14
      }
    }
  }'
# Save the bot_id from response
```

#### 3. Start Bot in Paper Mode

```bash
BOT_ID="dca_bot_1234567890"  # Replace with actual bot_id

curl -X POST "http://localhost:8000/api/bots/dca-bots/${BOT_ID}/start-paper" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "initial_balance": 10000,
    "interval_seconds": 60,
    "use_live_data": true
  }'
```

#### 4. Get Bot Status

```bash
# Test first endpoint path
curl -X GET "http://localhost:8000/api/bots/dca-bots/${BOT_ID}/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test second endpoint path (frontend compatibility)
curl -X GET "http://localhost:8000/api/bots/dca-bots/status/${BOT_ID}" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 5. Get Bot Positions

```bash
curl -X GET "http://localhost:8000/api/bots/dca-bots/${BOT_ID}/positions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 6. Get Bot Orders

```bash
curl -X GET "http://localhost:8000/api/bots/dca-bots/${BOT_ID}/orders?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 7. Get Bot P&L

```bash
curl -X GET "http://localhost:8000/api/bots/dca-bots/${BOT_ID}/pnl" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 8. Pause Bot

```bash
curl -X POST "http://localhost:8000/api/bots/dca-bots/${BOT_ID}/pause" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 9. Resume Bot

```bash
curl -X POST "http://localhost:8000/api/bots/dca-bots/${BOT_ID}/resume" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 10. Stop Bot

```bash
curl -X POST "http://localhost:8000/api/bots/dca-bots/${BOT_ID}/stop" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Option 3: Test from Frontend

1. **Login** to the frontend
2. **Navigate** to the DCA Bot page
3. **Create a bot** with test configuration
4. **Start bot** in paper mode
5. **Check bot status** - should show running status, balance, P&L, positions
6. **Test pause/resume** - pause button should pause bot, resume should resume
7. **Test stop** - stop button should stop bot

---

## Expected Responses

### Success Response Format

All successful endpoints return:
```json
{
  "success": true,
  "bot_id": "dca_bot_1234567890",
  "status": "running",  // or "paused", "stopped", "inactive"
  // ... additional fields depending on endpoint
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

Or HTTP status with detail:
```json
{
  "detail": "Error message"
}
```

---

## Common Issues

### 1. Connection Error

**Error**: `Could not connect to http://localhost:8000`

**Solution**:
- Check if backend is running: `docker ps | grep backend`
- Check backend logs: `docker logs tradeeon-backend`
- Verify API_BASE_URL is correct

### 2. Authentication Error

**Error**: `401 Unauthorized`

**Solution**:
- Verify JWT token is valid
- Check token hasn't expired
- Ensure `Authorization: Bearer <token>` header is included

### 3. Bot Not Found

**Error**: `404 Bot not found`

**Solution**:
- Verify bot_id is correct
- Check bot belongs to user (test with correct auth token)
- Verify bot exists in database

### 4. Bot Not Running

**Error**: `Bot is not running. Cannot pause/resume.`

**Solution**:
- Start bot first: `POST /api/bots/dca-bots/{bot_id}/start-paper`
- Wait a moment for bot to initialize
- Check bot status: `GET /api/bots/dca-bots/{bot_id}/status`

---

## Verification Checklist

### Basic Functionality
- [ ] Authentication is required (401 without token)
- [ ] Bot creation works
- [ ] Bot start works (paper mode)
- [ ] Bot status endpoint works (both paths)
- [ ] Bot positions endpoint works
- [ ] Bot orders endpoint works
- [ ] Bot P&L endpoint works
- [ ] Bot pause works
- [ ] Bot resume works
- [ ] Bot stop works

### Error Handling
- [ ] Nonexistent bot returns 404
- [ ] Invalid bot_id returns 404
- [ ] Pausing non-running bot returns error
- [ ] Resuming non-running bot returns error

### Data Accuracy
- [ ] Status shows correct bot state
- [ ] Positions show actual paper trading positions
- [ ] Orders show actual order history
- [ ] P&L calculations are correct
- [ ] Balance matches paper trading balance

---

## Quick Test Commands (Lightsail)

```bash
# On Lightsail, test from server
cd ~/tradeeon-FE-BE-12-09-2025

# Get your JWT token (from browser dev tools or Supabase)
export SUPABASE_JWT_TOKEN="your_token_here"
export API_BASE_URL="http://localhost:8000"

# Run test script
python3 scripts/test_bot_endpoints.py
```

---

## Production Testing

For production testing:

```bash
export API_BASE_URL="https://api.tradeeon.com"
export SUPABASE_JWT_TOKEN="your_production_token"

python3 scripts/test_bot_endpoints.py
```

---

**Use the automated test script for comprehensive verification!** 🎯


# Phase 1.2 Testing Guide - Condition Registry API

## 🎯 Overview

This guide will walk you through testing the Condition Registry API endpoints to verify everything works correctly.

---

## 📋 Prerequisites

### 1. Database Migration ✅
- **Status**: Already completed (you confirmed migration was run)
- **Tables Created**:
  - `condition_registry`
  - `user_condition_subscriptions`
  - `condition_evaluation_cache`
  - `condition_triggers`

### 2. Backend Environment Variables
Make sure your backend has these environment variables set in `apps/api/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

### 3. Python Dependencies
Ensure all dependencies are installed:

```bash
cd apps/api
pip install -e .
```

Required packages:
- `fastapi`
- `uvicorn`
- `supabase`
- `pyjwt`
- `requests` (for test script)

---

## 🚀 Step-by-Step Testing

### Step 1: Start the Backend API

**Option A: Using uvicorn directly**
```bash
# Navigate to API directory
cd apps/api

# Start the server
uvicorn main:app --reload --port 8000
```

**Option B: Using Python module**
```bash
cd apps/api
python -m uvicorn main:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
✅ Supabase client initialized successfully
✅ Database connection verified successfully
```

**Keep this terminal open** - the server needs to keep running.

---

### Step 2: Verify Backend is Running

Open a **new terminal** and test the health endpoint:

```bash
# Test health endpoint
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "database": "connected"
}
```

If you see this, the backend is running correctly! ✅

---

### Step 3: Run the Test Script

**Option A: Run All Tests (Recommended)**

```bash
# From project root
python scripts/test_condition_registry.py
```

**Option B: Run with Custom API URL**

```bash
# If backend is running on different port/URL
export API_BASE_URL="http://localhost:8000"
python scripts/test_condition_registry.py
```

**Option C: Run with Authentication (Full Testing)**

```bash
# Set auth token (get from Supabase dashboard or frontend)
export SUPABASE_JWT_TOKEN="your-jwt-token-here"
python scripts/test_condition_registry.py
```

---

## 📊 What to Expect

### Test Output Example:

```
🚀 Condition Registry API Tests
==================================================
API Base URL: http://localhost:8000
Make sure backend is running on http://localhost:8000

✅ Authentication token found

🧪 Test 1: Register Condition
==================================================
✅ Condition registered successfully!
   Condition ID: a1b2c3d4e5f6g7h8
   Status: registered

🧪 Test 2: Register Price Range Condition
==================================================
✅ Price condition registered successfully!
   Condition ID: x9y8z7w6v5u4t3s2

🧪 Test 3: Subscribe Bot to Condition
==================================================
✅ Bot subscribed successfully!
   Subscription ID: 123e4567-e89b-12d3-a456-426614174000

🧪 Test 4: Get Condition Status
==================================================
✅ Condition status retrieved!
   Condition: {
     "condition_id": "a1b2c3d4e5f6g7h8",
     "condition_type": "indicator",
     "symbol": "BTCUSDT",
     ...
   }
   Subscriber Count: 1

🧪 Test 5: Get User Subscriptions
==================================================
✅ User subscriptions retrieved!
   Count: 1
   Subscriptions: [...]

🧪 Test 6: Get Registry Statistics
==================================================
✅ Statistics retrieved!
   Total Conditions: 2
   Total Subscriptions: 1
   Avg Subscribers/Condition: 0.50

🧪 Test 7: Condition Deduplication
==================================================
   Registering condition first time...
   First registration: ID=a1b2c3d4e5f6g7h8, Status=registered
   Registering same condition second time...
   Second registration: ID=a1b2c3d4e5f6g7h8, Status=existing
✅ Deduplication works! Same ID: a1b2c3d4e5f6g7h8
   ✅ Status correctly shows 'existing' on second registration

==================================================
✅ Tests completed!

Next Steps:
1. Verify database tables are created
2. Check condition_registry table has entries
3. Check user_condition_subscriptions table (if auth tests passed)
4. Review test results above
5. Proceed to DCA Bot integration (Phase 1.3)
```

---

## 🧪 Manual Testing (Alternative)

If you prefer to test manually or want to test specific endpoints:

### Test 1: Register a Condition

```bash
curl -X POST http://localhost:8000/conditions/register \
  -H "Content-Type: application/json" \
  -d '{
    "type": "indicator",
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "indicator": "RSI",
    "operator": "crosses_below",
    "value": 30,
    "period": 14
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "condition_id": "a1b2c3d4e5f6g7h8",
  "status": "registered",
  "condition": {
    "condition_id": "a1b2c3d4e5f6g7h8",
    "condition_type": "indicator",
    "symbol": "BTCUSDT",
    ...
  }
}
```

### Test 2: Register Same Condition Again (Deduplication)

Run the same command again. You should get:

```json
{
  "success": true,
  "condition_id": "a1b2c3d4e5f6g7h8",
  "status": "existing",
  "condition": {...}
}
```

**Note**: Same `condition_id` but `status` is now `"existing"` ✅

### Test 3: Get Condition Status

```bash
curl http://localhost:8000/conditions/a1b2c3d4e5f6g7h8/status
```

**Expected Response:**
```json
{
  "success": true,
  "condition": {...},
  "subscriber_count": 0,
  "status": "inactive"
}
```

### Test 4: Get Registry Statistics

```bash
curl http://localhost:8000/conditions/stats
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "total_conditions": 1,
    "total_subscriptions": 0,
    "avg_subscribers_per_condition": 0
  }
}
```

### Test 5: Subscribe Bot (Requires Auth)

```bash
curl -X POST http://localhost:8000/conditions/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "bot_id": "test_bot_1",
    "condition_id": "a1b2c3d4e5f6g7h8",
    "bot_type": "dca",
    "bot_config": {
      "baseOrderSize": 100
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "subscription_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "subscribed",
  "subscription": {...}
}
```

---

## ✅ Success Criteria

### All Tests Should Pass:

1. ✅ **Test 1**: Condition registration works
2. ✅ **Test 2**: Price condition registration works
3. ✅ **Test 3**: Bot subscription works (if auth token provided)
4. ✅ **Test 4**: Condition status retrieval works
5. ✅ **Test 5**: User subscriptions retrieval works (if auth token provided)
6. ✅ **Test 6**: Statistics endpoint works
7. ✅ **Test 7**: Deduplication works (same condition = same ID)

### Database Verification:

After running tests, verify in Supabase:

```sql
-- Check conditions were created
SELECT * FROM condition_registry;

-- Check subscriptions (if auth tests passed)
SELECT * FROM user_condition_subscriptions;

-- Check stats
SELECT 
  COUNT(*) as total_conditions,
  (SELECT COUNT(*) FROM user_condition_subscriptions WHERE active = true) as total_subscriptions
FROM condition_registry;
```

---

## 🐛 Troubleshooting

### Issue 1: Backend Won't Start

**Error**: `ModuleNotFoundError: No module named 'apps'`

**Solution**:
```bash
# Make sure you're in the apps/api directory
cd apps/api
uvicorn main:app --reload --port 8000
```

---

### Issue 2: Database Connection Failed

**Error**: `❌ Database connection failed - Supabase client is None`

**Solution**:
1. Check `.env` file exists in `apps/api/`
2. Verify environment variables are set:
   ```bash
   # In apps/api/.env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-key
   ```
3. Restart the backend server

---

### Issue 3: Test Script Can't Connect

**Error**: `Connection refused` or `Failed to connect`

**Solution**:
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check if port 8000 is available
3. Try different port: `export API_BASE_URL="http://localhost:8001"`

---

### Issue 4: Auth Tests Fail

**Error**: `401 Unauthorized` or `Missing token`

**Solution**:
1. Get a valid JWT token from Supabase:
   - Sign in via frontend
   - Get token from browser localStorage or network tab
2. Set environment variable:
   ```bash
   export SUPABASE_JWT_TOKEN="your-token-here"
   ```
3. Re-run tests

**Note**: Auth tests will be skipped if token is not set (this is OK for basic testing)

---

### Issue 5: Condition ID Mismatch

**Error**: Different IDs for same condition

**Solution**:
- Check that condition normalization is working
- Verify all fields match exactly (symbol, timeframe, indicator, etc.)
- Check logs for normalization output

---

## 📝 Test Checklist

Before proceeding to Phase 1.3, verify:

- [ ] Backend starts without errors
- [ ] Health endpoint returns `{"status": "ok"}`
- [ ] Test script runs successfully
- [ ] At least 5 tests pass (Tests 1, 2, 4, 6, 7)
- [ ] Condition registration works
- [ ] Deduplication works (same condition = same ID)
- [ ] Database has entries in `condition_registry` table
- [ ] (Optional) Auth tests pass if token provided

---

## 🎯 Next Steps After Testing

Once all tests pass:

1. ✅ **Phase 1.2 Complete** - Condition Registry API tested
2. ➡️ **Phase 1.3** - Integrate DCA Bot with condition registry
3. ➡️ **Phase 2** - Set up centralized evaluator service

---

## 💡 Quick Test Commands

**One-liner to test everything:**

```bash
# Terminal 1: Start backend
cd apps/api && uvicorn main:app --reload --port 8000

# Terminal 2: Run tests
cd ../.. && python scripts/test_condition_registry.py
```

**Verify database:**
```bash
# In Supabase SQL Editor
SELECT COUNT(*) FROM condition_registry;
```

---

## 📞 Need Help?

If tests fail:
1. Check backend logs for errors
2. Verify database migration was run
3. Check environment variables
4. Review error messages in test output
5. Check `PHASE_1.2_STATUS.md` for known issues

---

**Ready to test?** Follow the steps above and let me know the results! 🚀



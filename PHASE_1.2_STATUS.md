# Phase 1.2: Test Condition Registry API - Status Report

## ✅ What's Complete

### 1. API Implementation ✅
- **File**: `apps/api/routers/condition_registry.py`
- **Status**: Fully implemented with all endpoints
- **Endpoints**:
  - `POST /conditions/register` - ✅ No auth required
  - `POST /conditions/subscribe` - ⚠️ **Requires auth**
  - `DELETE /conditions/subscribe/{id}` - ⚠️ **Requires auth**
  - `GET /conditions/{id}/status` - ✅ No auth required
  - `GET /conditions/user/subscriptions` - ⚠️ **Requires auth**
  - `GET /conditions/stats` - ✅ No auth required

### 2. API Integration ✅
- **File**: `apps/api/main.py`
- **Status**: Router is imported and included
- **Line 14**: `from apps.api.routers import ..., condition_registry`
- **Line 57**: `app.include_router(condition_registry.router, tags=["conditions"])`

### 3. Test Script ✅
- **File**: `scripts/test_condition_registry.py`
- **Status**: Created but needs authentication support

### 4. Database Migration ✅
- **File**: `infra/supabase/migrations/06_condition_registry.sql`
- **Status**: Migration has been run (confirmed by user)

---

## ⚠️ What's Pending

### Issue 1: Test Script Missing Authentication 🔴

**Problem**: The test script doesn't include authentication headers for endpoints that require auth.

**Affected Tests**:
- `test_subscribe_bot()` - Line 113-117 (no auth header)
- `test_get_user_subscriptions()` - Line 163-166 (no auth header)

**Solution Needed**: Add authentication support to test script.

---

### Issue 2: Test Script Needs Environment Variable Support 🔴

**Problem**: Test script has hardcoded values that should be configurable.

**Current**:
```python
API_BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test_user_123"  # Not used
```

**Needed**:
- Support for `SUPABASE_JWT_TOKEN` environment variable
- Support for custom API base URL
- Better error handling

---

### Issue 3: Missing Test for Deduplication 🟡

**Problem**: Test script doesn't verify that registering the same condition twice returns the same `condition_id`.

**Needed**: Add test to verify deduplication works correctly.

---

## 🔧 Required Fixes

### Fix 1: Update Test Script with Authentication

**File**: `scripts/test_condition_registry.py`

**Changes Needed**:
1. Add support for `SUPABASE_JWT_TOKEN` environment variable
2. Add auth headers to authenticated endpoints
3. Add test for deduplication
4. Add better error messages

### Fix 2: Create Test Helper Function

**Add helper function**:
```python
def get_auth_headers():
    """Get authentication headers for API requests."""
    token = os.getenv("SUPABASE_JWT_TOKEN")
    if not token:
        print("⚠️  Warning: SUPABASE_JWT_TOKEN not set. Auth tests will fail.")
        return {}
    return {"Authorization": f"Bearer {token}"}
```

---

## 📋 Testing Checklist

### Tests That Will Work (No Auth Required):
- [x] `POST /conditions/register` - Register RSI condition
- [x] `POST /conditions/register` - Register price condition
- [x] `GET /conditions/{id}/status` - Get condition status
- [x] `GET /conditions/stats` - Get registry statistics

### Tests That Need Auth:
- [ ] `POST /conditions/subscribe` - Subscribe bot to condition
- [ ] `GET /conditions/user/subscriptions` - Get user subscriptions
- [ ] `DELETE /conditions/subscribe/{id}` - Unsubscribe

### Additional Tests Needed:
- [ ] Test deduplication (register same condition twice)
- [ ] Test invalid condition format
- [ ] Test condition not found errors
- [ ] Test subscription already exists

---

## 🚀 Next Steps

### Step 1: Fix Test Script
1. Add authentication support
2. Add environment variable support
3. Add deduplication test
4. Add error handling tests

### Step 2: Run Tests
1. Start backend: `cd apps/api && uvicorn main:app --reload --port 8000`
2. Set environment variable: `export SUPABASE_JWT_TOKEN="your-token"`
3. Run test script: `python scripts/test_condition_registry.py`

### Step 3: Verify Results
1. Check all tests pass
2. Verify database has entries
3. Check logs for any errors

---

## 📝 Code Changes Required

### File: `scripts/test_condition_registry.py`

**Add imports**:
```python
import os
```

**Add helper function**:
```python
def get_auth_headers():
    """Get authentication headers."""
    token = os.getenv("SUPABASE_JWT_TOKEN")
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}
```

**Update `test_subscribe_bot()`**:
```python
def test_subscribe_bot(condition_id: str, bot_id: str = "test_dca_bot_1"):
    """Test subscribing a bot to a condition."""
    print("\n🧪 Test 3: Subscribe Bot to Condition")
    print("=" * 50)
    
    subscription = {
        "bot_id": bot_id,
        "condition_id": condition_id,
        "bot_type": "dca",
        "bot_config": {
            "baseOrderSize": 100,
            "dcaRules": {
                "maxDcaPerPosition": 5
            }
        }
    }
    
    headers = {
        "Content-Type": "application/json",
        **get_auth_headers()
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/conditions/subscribe",
            json=subscription,
            headers=headers
        )
        # ... rest of function
```

**Update `test_get_user_subscriptions()`**:
```python
def test_get_user_subscriptions():
    """Test getting user's subscriptions."""
    print("\n🧪 Test 5: Get User Subscriptions")
    print("=" * 50)
    
    headers = {
        "Content-Type": "application/json",
        **get_auth_headers()
    }
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/conditions/user/subscriptions",
            headers=headers
        )
        # ... rest of function
```

**Add deduplication test**:
```python
def test_deduplication():
    """Test that registering the same condition twice returns same ID."""
    print("\n🧪 Test 7: Condition Deduplication")
    print("=" * 50)
    
    condition = {
        "type": "indicator",
        "symbol": "BTCUSDT",
        "timeframe": "1h",
        "indicator": "RSI",
        "operator": "crosses_below",
        "value": 30,
        "period": 14
    }
    
    # Register first time
    response1 = requests.post(
        f"{API_BASE_URL}/conditions/register",
        json=condition,
        headers={"Content-Type": "application/json"}
    )
    
    if response1.status_code != 200:
        print(f"❌ First registration failed: {response1.status_code}")
        return None
    
    condition_id_1 = response1.json().get('condition_id')
    
    # Register second time (should return same ID)
    response2 = requests.post(
        f"{API_BASE_URL}/conditions/register",
        json=condition,
        headers={"Content-Type": "application/json"}
    )
    
    if response2.status_code != 200:
        print(f"❌ Second registration failed: {response2.status_code}")
        return None
    
    condition_id_2 = response2.json().get('condition_id')
    
    if condition_id_1 == condition_id_2:
        print(f"✅ Deduplication works! Same ID: {condition_id_1}")
        return condition_id_1
    else:
        print(f"❌ Deduplication failed! IDs differ: {condition_id_1} vs {condition_id_2}")
        return None
```

---

## ✅ Summary

**Status**: Phase 1.2 is **80% complete**

**What Works**:
- ✅ API endpoints implemented
- ✅ API integrated into main app
- ✅ Test script created
- ✅ Database migration complete

**What Needs Fixing**:
- 🔴 Test script missing authentication
- 🔴 Test script needs environment variable support
- 🟡 Missing deduplication test

**Estimated Time to Complete**: 15-20 minutes

**Priority**: High (needed before proceeding to Phase 1.3)



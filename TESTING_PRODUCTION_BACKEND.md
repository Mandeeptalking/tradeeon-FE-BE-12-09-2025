# Testing Against Production Backend (AWS)

## ✅ Backend Status

**Production API URL**: `https://api.tradeeon.com`
**Status**: ✅ Running and responding
**Health Check**: `{"status":"ok","timestamp":1763380724,"database":"connected"}`

---

## 🧪 Updated Test Script

The test script now defaults to production URL:
- **Default**: `https://api.tradeeon.com` (AWS Lightsail)
- **Override**: Set `API_BASE_URL` environment variable for local testing

---

## 🚀 How to Test

### Option 1: Test Against Production (Default)
```bash
python scripts/test_condition_registry.py
```

### Option 2: Test Against Local Backend
```bash
# Set environment variable to override
export API_BASE_URL="http://localhost:8000"
python scripts/test_condition_registry.py
```

---

## ⚠️ Important Notes

1. **Production Testing**: Tests will run against live production backend
2. **Database**: Will create real entries in production database
3. **Auth Required**: Some tests require authentication token
4. **Rate Limiting**: Production API has rate limits (60 read, 10 write per minute)

---

## 🔐 Authentication

For full testing (including auth-required endpoints):

```bash
# Get JWT token from Supabase or frontend
export SUPABASE_JWT_TOKEN="your-jwt-token-here"
python scripts/test_condition_registry.py
```

Without token, auth tests will be skipped automatically.

---

## ✅ Expected Results

When testing against production:
- Tests 1, 2, 4, 6, 7 should pass (no auth required)
- Tests 3, 5 will be skipped if no auth token
- All tests will create real database entries

---

## 📝 Notes

- Backend is hosted on **AWS Lightsail**
- API URL: `https://api.tradeeon.com`
- Database: Supabase PostgreSQL
- All tests run against production by default



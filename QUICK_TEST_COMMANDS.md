# Quick Test Commands - Phase 1.2

## 🚀 Fastest Way to Test

### Step 1: Start Backend (Terminal 1)
```bash
cd apps/api
uvicorn main:app --reload --port 8000
```

### Step 2: Run Tests (Terminal 2)
```bash
# From project root
python scripts/test_condition_registry.py
```

---

## 🔍 Quick Verification

### Check Backend is Running
```bash
curl http://localhost:8000/health
```

### Check API Endpoints
```bash
# Register condition
curl -X POST http://localhost:8000/conditions/register \
  -H "Content-Type: application/json" \
  -d '{"type":"indicator","symbol":"BTCUSDT","timeframe":"1h","indicator":"RSI","operator":"crosses_below","value":30,"period":14}'

# Get stats
curl http://localhost:8000/conditions/stats
```

---

## ✅ Success Indicators

- Backend shows: `✅ Database connection verified successfully`
- Health check returns: `{"status":"ok","database":"connected"}`
- Test script shows: `✅ Tests completed!`
- At least 5 tests pass

---

## 🐛 Quick Fixes

**Backend won't start?**
```bash
cd apps/api
pip install -e .
uvicorn main:app --reload --port 8000
```

**Tests fail to connect?**
```bash
# Check backend is running
curl http://localhost:8000/health
```

**Database errors?**
- Check `.env` file in `apps/api/`
- Verify Supabase credentials
- Restart backend

---

That's it! 🎉



# Phase 2.1 Testing Guide - Condition Evaluator Service

## 🧪 Testing Overview

This guide helps you test Phase 2.1 - the Centralized Condition Evaluator Service.

---

## 📋 Prerequisites

### 1. Environment Setup
```bash
# Ensure Supabase credentials are set
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Optional: Set API URL for test condition creation
export API_BASE_URL="https://api.tradeeon.com"
```

### 2. Dependencies
```bash
# Ensure all Python dependencies are installed
cd apps/bots
pip install -r requirements.txt  # If requirements file exists
```

---

## 🧪 Test Suite

### Automated Test Script

Run the comprehensive test suite:
```bash
python scripts/test_condition_evaluator.py
```

**Tests Included**:
1. ✅ Supabase Connection
2. ✅ Market Data Service
3. ✅ Condition Discovery
4. ✅ Evaluator Initialization
5. ✅ Active Symbols Discovery
6. ✅ Condition Evaluation
7. ✅ Test Condition Creation

---

## 🔍 Manual Testing Steps

### Step 1: Verify Dependencies

```bash
# Check Python version (3.8+)
python --version

# Check if required modules can be imported
python -c "from apps.api.clients.supabase_client import supabase; print('OK' if supabase else 'FAIL')"
```

### Step 2: Test Supabase Connection

```python
from apps.api.clients.supabase_client import supabase

# Check connection
if supabase:
    result = supabase.table("condition_registry").select("condition_id").limit(1).execute()
    print(f"Connected! Found {len(result.data)} conditions")
else:
    print("Supabase not connected")
```

### Step 3: Create Test Condition

**Option A: Via API** (if backend is running)
```bash
curl -X POST https://api.tradeeon.com/conditions/register \
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

**Option B: Via DCA Bot Creation** (recommended)
- Create a DCA bot via frontend with RSI condition
- Condition will be automatically registered

### Step 4: Start Evaluator Service

```bash
cd apps/bots
python run_condition_evaluator.py
```

**Expected Output**:
```
======================================================================
Starting Centralized Condition Evaluator Service
======================================================================
✅ Supabase client initialized successfully
Centralized Condition Evaluator initialized
Evaluation interval: 60 seconds
Timeframes: ['1m', '5m', '15m', '1h']
======================================================================
Starting evaluation loop for timeframes: ['1m', '5m', '15m', '1h']
Discovered 1 active symbols from conditions
Fetching market data for BTCUSDT 1h (shared by all conditions)
Evaluating 1 conditions for BTCUSDT 1h using shared market data
...
```

### Step 5: Monitor Logs

**Watch log file**:
```bash
tail -f apps/bots/condition_evaluator.log
```

**Check console output** for:
- Condition discovery
- Market data fetching
- Condition evaluation
- Trigger events (if conditions met)

### Step 6: Verify Database Updates

**Check condition triggers**:
```sql
SELECT * FROM condition_triggers 
ORDER BY triggered_at DESC 
LIMIT 10;
```

**Check condition stats**:
```sql
SELECT 
    condition_id,
    symbol,
    timeframe,
    trigger_count,
    last_triggered_at,
    last_evaluated_at
FROM condition_registry
WHERE trigger_count > 0
ORDER BY last_triggered_at DESC;
```

---

## ✅ Success Criteria

### Service Should:
- ✅ Start without errors
- ✅ Connect to Supabase successfully
- ✅ Discover active conditions
- ✅ Fetch market data
- ✅ Evaluate conditions
- ✅ Log evaluation results
- ✅ Update database stats

### Expected Behavior:
- Service runs continuously
- Evaluates conditions every 60 seconds (default)
- Logs evaluation results
- Updates `last_evaluated_at` in condition_registry
- Creates entries in `condition_triggers` when conditions met

---

## 🐛 Troubleshooting

### Issue: Service won't start

**Error**: `Supabase client not initialized`

**Solution**:
```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Set them if missing
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-key"
```

### Issue: No conditions found

**Error**: `Discovered 0 active symbols from conditions`

**Solution**:
1. Create a DCA bot with conditions via frontend
2. Or register a condition via API:
   ```bash
   curl -X POST https://api.tradeeon.com/conditions/register \
     -H "Content-Type: application/json" \
     -d '{"type": "indicator", "symbol": "BTCUSDT", "timeframe": "1h", "indicator": "RSI", "operator": "crosses_below", "value": 30}'
   ```

### Issue: Market data fetch fails

**Error**: `Error fetching klines for BTCUSDT`

**Solution**:
- Check internet connection
- Verify Binance API is accessible
- Check symbol format (should be BTCUSDT, not BTC/USDT)

### Issue: Evaluation errors

**Error**: `Error evaluating condition`

**Solution**:
- Check condition format in database
- Verify indicator calculation logic
- Check logs for detailed error messages

---

## 📊 Monitoring

### Key Metrics to Watch:

1. **Evaluation Frequency**
   - Should evaluate every 60 seconds (default)
   - Check logs for evaluation cycles

2. **Conditions Evaluated**
   - Should match number of active conditions
   - Check `condition_registry` table

3. **Triggers Generated**
   - Should create entries in `condition_triggers` when conditions met
   - Check `trigger_count` in `condition_registry`

4. **Performance**
   - Evaluation should complete within a few seconds
   - Watch for timeout errors

---

## 🎯 Next Steps After Testing

Once Phase 2.1 is verified working:

1. **Phase 2.2**: Set up Event Bus (Redis/RabbitMQ)
2. **Phase 2.3**: Implement Bot Notification System

---

## 📝 Test Checklist

- [ ] Supabase connection working
- [ ] Market data service working
- [ ] Condition discovery working
- [ ] Evaluator initialization successful
- [ ] Active symbols discovery working
- [ ] Condition evaluation working
- [ ] Database updates happening
- [ ] Logs being generated
- [ ] Service runs continuously
- [ ] No errors in logs

---

**Ready to Test**: Run `python scripts/test_condition_evaluator.py` to start!



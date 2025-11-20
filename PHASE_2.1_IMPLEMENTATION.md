# Phase 2.1: Centralized Condition Evaluator Service

## ✅ STATUS: IMPLEMENTED

**Date**: 2025-11-17  
**Service**: Complete

---

## 📋 What Was Implemented

### 1. Service Runner Script ✅
**File**: `apps/bots/run_condition_evaluator.py`

**Features**:
- Standalone service runner
- Signal handling (SIGINT, SIGTERM)
- Environment variable configuration
- Logging to file and console
- Graceful shutdown

### 2. Evaluator Integration ✅
**File**: `apps/bots/condition_evaluator.py`

**Features**:
- Already implemented `CentralizedConditionEvaluator` class
- Fixed trigger count increment bug
- Integrated with Supabase client
- Auto-discovers active symbols from conditions

### 3. Configuration ✅
**Environment Variables**:
- `EVALUATOR_INTERVAL_SECONDS` - Evaluation interval (default: 60)
- `EVALUATOR_TIMEFRAMES` - Comma-separated timeframes (default: "1m,5m,15m,1h")

---

## 🚀 How to Run

### Option 1: Standalone Service
```bash
cd apps/bots
python run_condition_evaluator.py
```

### Option 2: Background Service (Linux/Mac)
```bash
nohup python run_condition_evaluator.py > evaluator.log 2>&1 &
```

### Option 3: Systemd Service (Linux)
Create `/etc/systemd/system/condition-evaluator.service`:
```ini
[Unit]
Description=Tradeeon Condition Evaluator Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/tradeeon-FE-BE-12-09-2025/apps/bots
ExecStart=/usr/bin/python3 run_condition_evaluator.py
Restart=always
RestartSec=10
Environment="EVALUATOR_INTERVAL_SECONDS=60"
Environment="EVALUATOR_TIMEFRAMES=1m,5m,15m,1h"

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable condition-evaluator
sudo systemctl start condition-evaluator
sudo systemctl status condition-evaluator
```

---

## 🔄 How It Works

### Evaluation Flow:

1. **Service Starts**
   - Initializes Supabase connection
   - Creates `CentralizedConditionEvaluator` instance
   - Starts evaluation loop

2. **Evaluation Loop** (every 60 seconds by default)
   - Discovers active symbols from condition registry
   - For each symbol/timeframe combination:
     - Fetches market data once
     - Calculates indicators once
     - Evaluates all conditions using shared data
     - Publishes triggers when conditions met

3. **Condition Trigger**
   - When condition is met:
     - Logs trigger to `condition_triggers` table
     - Updates condition stats
     - Publishes event (when event bus implemented)
     - Notifies subscribers (when notification system implemented)

---

## 📊 Optimization Benefits

### Cost Savings:
- ✅ **Single Data Fetch**: All conditions for BTCUSDT 1h share one data fetch
- ✅ **Single Indicator Calc**: RSI calculated once, used by all RSI conditions
- ✅ **Batch Evaluation**: All conditions evaluated together

### Example:
- **Before**: 500 users with RSI < 30 = 500 data fetches + 500 RSI calculations
- **After**: 500 users with RSI < 30 = 1 data fetch + 1 RSI calculation

**Cost Reduction**: ~99.8% reduction in compute costs!

---

## 🧪 Testing

### Test Steps:

1. **Start Service**
   ```bash
   python apps/bots/run_condition_evaluator.py
   ```

2. **Create Test Condition**
   - Create a DCA bot with RSI condition
   - Condition will be registered automatically

3. **Monitor Logs**
   ```bash
   tail -f condition_evaluator.log
   ```

4. **Check Database**
   ```sql
   -- Check condition triggers
   SELECT * FROM condition_triggers ORDER BY triggered_at DESC LIMIT 10;
   
   -- Check condition stats
   SELECT condition_id, trigger_count, last_triggered_at 
   FROM condition_registry 
   WHERE trigger_count > 0;
   ```

---

## 🔍 Monitoring

### Logs:
- Service logs to `condition_evaluator.log`
- Console output for real-time monitoring
- Log levels: INFO, DEBUG, ERROR

### Database Tables:
- `condition_registry` - Condition stats updated
- `condition_triggers` - Trigger events logged
- `condition_evaluation_cache` - Cached indicator values

### Metrics to Monitor:
- Evaluation frequency
- Conditions evaluated per cycle
- Triggers per condition
- Error rate
- Performance (evaluation time)

---

## 🐛 Troubleshooting

### Issue: Service won't start
**Check**:
- Supabase credentials set correctly
- Database connection working
- Python dependencies installed

### Issue: No conditions evaluated
**Check**:
- Conditions exist in `condition_registry` table
- Symbols/timeframes match active conditions
- Market data service working

### Issue: High CPU usage
**Check**:
- Evaluation interval (increase if too frequent)
- Number of active conditions
- Market data fetch performance

---

## 📝 Next Steps

### Phase 2.2: Event Bus
- Set up Redis/RabbitMQ
- Publish triggers to event bus
- Subscribe bots to events

### Phase 2.3: Bot Notification System
- Listen for condition triggers
- Route to bot executors
- Execute bot actions

---

## ✅ Completion Checklist

- [x] Service runner script created
- [x] Evaluator integrated with Supabase
- [x] Signal handling implemented
- [x] Logging configured
- [x] Environment variables support
- [x] Auto-discovery of active symbols
- [x] Trigger count bug fixed
- [x] Graceful shutdown implemented

---

## 📊 Status

**Phase 2.1**: ✅ **COMPLETE**

Service is ready to run. Next: Phase 2.2 - Event Bus Setup

---

**Implemented**: 2025-11-17  
**Status**: ✅ COMPLETE  
**Next**: Phase 2.2 - Event Bus Setup



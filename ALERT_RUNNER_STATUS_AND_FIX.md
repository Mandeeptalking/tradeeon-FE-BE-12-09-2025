# Alert Runner Status & Fix Guide

## 🔍 Current Status (From Lightsail)

### ✅ Backend API: **WORKING**
```bash
curl https://api.tradeeon.com/health
# Response: {"status":"ok","timestamp":1763532568,"database":"connected"}
```
**Status**: ✅ **HEALTHY**

### ❌ Alert Runner: **NOT RUNNING**
```bash
ps aux | grep alert_runner
# Only shows grep process - alert runner is NOT running
```
**Status**: ❌ **NEEDS TO BE STARTED**

---

## 🚀 Quick Fix: Start Alert Runner

### Option 1: Quick Start (Recommended for Now)

**On Lightsail, run**:
```bash
cd ~/tradeeon-FE-BE-12-09-2025

# Pull latest code (if scripts were just added)
git pull origin main

# Make script executable
chmod +x start-alert-runner-lightsail.sh

# Start alert runner
./start-alert-runner-lightsail.sh
```

**Verify it's running**:
```bash
ps aux | grep alert_runner
# Should show python process (not just grep)

tail -f logs/alert-runner.log
# Should see polling messages
```

---

### Option 2: Systemd Service (Recommended for Production)

**On Lightsail, run**:
```bash
cd ~/tradeeon-FE-BE-12-09-2025

# Pull latest code
git pull origin main

# Make script executable
chmod +x setup-alert-runner-service.sh

# Setup as systemd service
./setup-alert-runner-service.sh
```

**This will**:
- Create systemd service
- Enable auto-start on boot
- Start the service
- Configure auto-restart on failure

**Manage service**:
```bash
sudo systemctl status alert-runner
sudo systemctl restart alert-runner
sudo journalctl -u alert-runner -f
```

---

### Option 3: Manual Start (For Testing)

```bash
cd ~/tradeeon-FE-BE-12-09-2025

# Load environment variables
source .env

# Start in background
nohup python3 -m apps.alerts.runner > logs/alert-runner.log 2>&1 &

# Verify
ps aux | grep alert_runner
tail -f logs/alert-runner.log
```

---

## ✅ After Starting: Verify It's Working

### 1. Check Process
```bash
ps aux | grep alert_runner
# Should show: python3 -m apps.alerts.runner
```

### 2. Check Logs
```bash
tail -f logs/alert-runner.log
# Should see:
# - "Fetching active alerts..."
# - "Processing alerts for symbol: ..."
# - Alert evaluations
```

### 3. Test Alert Creation
```bash
# Create test alert (requires auth token)
curl -X POST https://api.tradeeon.com/alerts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "base_timeframe": "1h",
    "conditions": [{
      "type": "indicator",
      "indicator": "RSI",
      "operator": "<",
      "compareValue": 30
    }],
    "action": {"type": "notify"}
  }'
```

### 4. Verify Alert Processing
```bash
# Check logs for alert processing
tail -f logs/alert-runner.log | grep -i "alert\|trigger"
```

---

## 🔧 Troubleshooting

### If Alert Runner Won't Start

**Check Python**:
```bash
python3 --version
# Should be 3.11+
```

**Check Dependencies**:
```bash
pip3 list | grep -E "supabase|pandas|numpy|ta-lib"
```

**Check Environment Variables**:
```bash
cat .env | grep -E "SUPABASE|ALERT"
# Should have all required variables
```

**Check Logs for Errors**:
```bash
cat logs/alert-runner.log
# Look for error messages
```

### Common Issues

1. **Missing Dependencies**:
   ```bash
   pip3 install -r requirements.txt
   ```

2. **Environment Variables Not Set**:
   ```bash
   # Check .env file exists
   ls -la .env
   
   # Load manually
   export SUPABASE_URL=...
   export SUPABASE_SERVICE_ROLE_KEY=...
   ```

3. **Database Connection Failed**:
   - Verify Supabase URL and keys
   - Check network connectivity
   - Verify RLS policies

---

## 📋 Complete Verification Checklist

After starting alert runner:

- [ ] Process is running (`ps aux | grep alert_runner`)
- [ ] Logs show polling activity
- [ ] No errors in logs
- [ ] Can create alert via API
- [ ] Alert appears in database
- [ ] Alert runner processes alert (check logs)
- [ ] Alert triggers when condition met
- [ ] Notification sent (if configured)

---

## 🎯 Summary

**Current Status**:
- ✅ Backend API: **WORKING**
- ❌ Alert Runner: **NOT RUNNING** (needs to be started)

**Action Required**:
1. Start alert runner using one of the methods above
2. Verify it's running
3. Test end-to-end alert flow

**Estimated Time**: 5-10 minutes to start and verify

---

**Next Step**: Run `./start-alert-runner-lightsail.sh` on Lightsail to start the alert runner.


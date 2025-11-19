# Quick Start: Alert Runner on Lightsail

## 🚨 Current Status

**Alert Runner**: ❌ **NOT RUNNING**  
**Backend API**: ✅ **WORKING** (health check passed)

---

## 🚀 Quick Start (Choose One Method)

### Method 1: Simple Background Process (Quick)

```bash
# Navigate to project directory
cd ~/tradeeon-FE-BE-12-09-2025

# Make script executable
chmod +x start-alert-runner-lightsail.sh

# Start alert runner
./start-alert-runner-lightsail.sh
```

**This will**:
- Check if already running
- Load environment variables
- Start in background
- Log to `logs/alert-runner.log`

**To check status**:
```bash
ps aux | grep alert_runner
tail -f logs/alert-runner.log
```

**To stop**:
```bash
pkill -f 'apps.alerts.runner'
```

---

### Method 2: Systemd Service (Recommended for Production)

```bash
# Navigate to project directory
cd ~/tradeeon-FE-BE-12-09-2025

# Make script executable
chmod +x setup-alert-runner-service.sh

# Setup service
./setup-alert-runner-service.sh
```

**This will**:
- Create systemd service
- Enable auto-start on boot
- Start the service
- Configure automatic restart on failure

**Service commands**:
```bash
# Start
sudo systemctl start alert-runner

# Stop
sudo systemctl stop alert-runner

# Restart
sudo systemctl restart alert-runner

# Status
sudo systemctl status alert-runner

# View logs
sudo journalctl -u alert-runner -f
# or
tail -f logs/alert-runner.log
```

---

### Method 3: Manual Start (For Testing)

```bash
# Navigate to project directory
cd ~/tradeeon-FE-BE-12-09-2025

# Load environment variables
source .env  # or export them manually

# Start in background
nohup python3 -m apps.alerts.runner > logs/alert-runner.log 2>&1 &

# Check if started
ps aux | grep alert_runner

# View logs
tail -f logs/alert-runner.log
```

---

## ✅ Verify It's Running

```bash
# Check process
ps aux | grep alert_runner
# Should show python process (not just grep)

# Check logs
tail -f logs/alert-runner.log
# Should see polling messages and alert evaluations

# Check systemd (if using service)
sudo systemctl status alert-runner
# Should show "active (running)"
```

**Expected Log Output**:
```
INFO: Fetching active alerts...
INFO: Processing alerts for symbol: BTCUSDT
INFO: Alert evaluation complete
```

---

## 🧪 Test Alert System

After starting the alert runner:

```bash
# Make test script executable
chmod +x test-alert-system-end-to-end.sh

# Run test (requires AUTH_TOKEN)
export AUTH_TOKEN='your-jwt-token-here'
./test-alert-system-end-to-end.sh
```

**Or test manually**:
```bash
# 1. Create test alert
curl -X POST https://api.tradeeon.com/alerts \
  -H "Authorization: Bearer $AUTH_TOKEN" \
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

# 2. Check logs
tail -f logs/alert-runner.log

# 3. Wait for condition to trigger
# 4. Check notifications
```

---

## 🔧 Troubleshooting

### Alert Runner Not Starting

**Check Python**:
```bash
python3 --version
# Should be 3.11+

which python3
```

**Check Dependencies**:
```bash
pip3 list | grep -E "supabase|pandas|numpy"
```

**Check Environment Variables**:
```bash
cat .env | grep -E "SUPABASE|ALERT"
# Should have:
# SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
# SUPABASE_JWT_SECRET=...
```

**Check Logs for Errors**:
```bash
tail -50 logs/alert-runner.log
# Look for error messages
```

### Alert Runner Crashes

**Check Error Logs**:
```bash
tail -f logs/alert-runner-error.log
# or
sudo journalctl -u alert-runner -f
```

**Common Issues**:
- Missing environment variables
- Database connection failed
- Missing dependencies
- Import errors

---

## 📋 Environment Variables Required

Make sure `.env` file has:
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
SUPABASE_JWT_SECRET=your-jwt-secret
ALERT_RUNNER_POLL_MS=1000
ALERT_MAX_ALERTS_PER_SYMBOL=200
```

---

## 🎯 Next Steps After Starting

1. ✅ Verify it's running: `ps aux | grep alert_runner`
2. ✅ Check logs: `tail -f logs/alert-runner.log`
3. ✅ Test alert creation via API
4. ✅ Verify alert processing in logs
5. ✅ Test end-to-end flow

---

**Recommended**: Use **Method 2 (systemd service)** for production - it ensures the alert runner:
- Starts automatically on boot
- Restarts if it crashes
- Runs in the background
- Logs properly


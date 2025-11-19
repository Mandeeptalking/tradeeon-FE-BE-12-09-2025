# Start Alert Runner - Direct Commands for Lightsail

## 🚀 Quick Start (Run These Commands on Lightsail)

The script is in the root directory. If you haven't pulled the latest code yet, you can either:

### Option 1: Pull Latest Code First

```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
chmod +x start-alert-runner-lightsail.sh
./start-alert-runner-lightsail.sh
```

### Option 2: Start Manually (No Git Pull Needed)

If the script isn't there yet, you can start it manually:

```bash
cd ~/tradeeon-FE-BE-12-09-2025

# Load environment variables
source .env

# Create logs directory
mkdir -p logs

# Start alert runner
nohup python3 -m apps.alerts.runner > logs/alert-runner.log 2>&1 &

# Verify it started
ps aux | grep alert_runner

# Check logs
tail -f logs/alert-runner.log
```

### Option 3: One-Line Command

```bash
cd ~/tradeeon-FE-BE-12-09-2025 && source .env && mkdir -p logs && nohup python3 -m apps.alerts.runner > logs/alert-runner.log 2>&1 & sleep 2 && ps aux | grep alert_runner
```

---

## ✅ Verify It's Running

After starting, verify:

```bash
# Check process
ps aux | grep alert_runner
# Should show: python3 -m apps.alerts.runner (not just grep)

# Check logs
tail -f logs/alert-runner.log
# Should see polling messages like:
# INFO: Fetching active alerts...
# INFO: Processing alerts...
```

---

## 🔧 If It Fails to Start

**Check Python**:
```bash
python3 --version
# Should be 3.11+
```

**Check Dependencies**:
```bash
pip3 list | grep -E "supabase|pandas|numpy"
```

**Check Environment Variables**:
```bash
cat .env | grep -E "SUPABASE|ALERT"
```

**Check Error Logs**:
```bash
cat logs/alert-runner.log
# Look for error messages
```

---

## 📋 Complete Command Sequence

**Copy and paste this entire block**:

```bash
cd ~/tradeeon-FE-BE-12-09-2025
source .env
mkdir -p logs
nohup python3 -m apps.alerts.runner > logs/alert-runner.log 2>&1 &
sleep 2
ps aux | grep alert_runner
echo ""
echo "✅ Check logs: tail -f logs/alert-runner.log"
```

---

**This will start the alert runner immediately without needing the script file!**


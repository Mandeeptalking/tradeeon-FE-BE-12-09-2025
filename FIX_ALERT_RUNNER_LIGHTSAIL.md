# Fix Alert Runner on Lightsail - Step by Step

## 🔴 Issues Found

1. **Missing Dependency**: `prometheus_client` module not installed
2. **Git Conflict**: Local changes blocking git pull

---

## 🚀 Quick Fix (Run on Lightsail)

### Step 1: Install Missing Dependency

```bash
cd ~/tradeeon-FE-BE-12-09-2025
pip3 install prometheus-client
```

**Or install all requirements**:
```bash
pip3 install -r requirements.txt
```

---

### Step 2: Resolve Git Conflict

**Option A: Stash Local Changes (Recommended)**
```bash
cd ~/tradeeon-FE-BE-12-09-2025
git stash
git pull origin main
git stash pop  # Reapply your changes if needed
```

**Option B: Commit Local Changes**
```bash
cd ~/tradeeon-FE-BE-12-09-2025
git add scripts/start_phase2_services.sh
git commit -m "Local changes to start_phase2_services.sh"
git pull origin main
```

**Option C: Discard Local Changes (If not needed)**
```bash
cd ~/tradeeon-FE-BE-12-09-2025
git checkout -- scripts/start_phase2_services.sh
git pull origin main
```

---

### Step 3: Start Alert Runner Again

After fixing dependencies and git:

```bash
cd ~/tradeeon-FE-BE-12-09-2025
source .env
nohup python3 -m apps.alerts.runner > logs/alert-runner.log 2>&1 &
sleep 2
ps aux | grep alert_runner
tail -f logs/alert-runner.log
```

---

## ✅ Complete Fix Sequence

**Copy and paste this entire block**:

```bash
# Step 1: Install missing dependency
cd ~/tradeeon-FE-BE-12-09-2025
pip3 install prometheus-client

# Step 2: Resolve git conflict (stash local changes)
git stash
git pull origin main

# Step 3: Start alert runner
source .env
mkdir -p logs
nohup python3 -m apps.alerts.runner > logs/alert-runner.log 2>&1 &
sleep 2

# Step 4: Verify
ps aux | grep alert_runner
echo ""
echo "Checking logs..."
tail -20 logs/alert-runner.log
```

---

## 🔍 If Still Fails

**Check for other missing dependencies**:
```bash
# Try importing the module
python3 -c "from apps.alerts.runner import main; print('OK')"
```

**Check error logs**:
```bash
cat logs/alert-runner.log
# Look for ModuleNotFoundError or ImportError
```

**Install all dependencies**:
```bash
pip3 install -r requirements.txt
```

---

## 📋 Alternative: Make Metrics Optional

If prometheus_client is not needed, we can make it optional. But for now, just install it:

```bash
pip3 install prometheus-client
```

---

**Run the fix sequence above and let me know the result!**


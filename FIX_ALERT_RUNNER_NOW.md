# Fix Alert Runner - Immediate Steps for Lightsail

## 🔴 Issues Found

1. **Missing Module**: `prometheus_client` not installed
2. **Git Conflict**: Local changes blocking pull

---

## ✅ Complete Fix (Copy & Paste All)

**Run this entire block on Lightsail**:

```bash
# Step 1: Install missing dependency
cd ~/tradeeon-FE-BE-12-09-2025
pip3 install prometheus-client

# Step 2: Resolve git conflict (stash local changes)
git stash
git pull origin main

# Step 3: Install all dependencies (to be safe)
pip3 install -r requirements.txt

# Step 4: Start alert runner
source .env
mkdir -p logs
nohup python3 -m apps.alerts.runner > logs/alert-runner.log 2>&1 &
sleep 3

# Step 5: Verify it's running
ps aux | grep alert_runner
echo ""
echo "=== Checking logs ==="
tail -30 logs/alert-runner.log
```

---

## 🔍 What to Look For

**If successful, you should see**:
- ✅ Python process running (not just grep)
- ✅ Logs showing "Fetching active alerts..." or similar
- ✅ No error messages

**If it fails again**:
- Check the error in `logs/alert-runner.log`
- Look for other missing modules
- Run: `pip3 install -r requirements.txt`

---

## 📋 Alternative: If Git Stash Doesn't Work

**If git stash fails, use this**:

```bash
# Option 1: Discard local changes (if not important)
cd ~/tradeeon-FE-BE-12-09-2025
git checkout -- scripts/start_phase2_services.sh
git pull origin main

# Then continue with steps 3-5 above
```

---

**Run the complete fix sequence above and share the output!**


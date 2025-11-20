# Commit and Push Missing Files

## Issue: Files exist locally but not in git

The files `run_condition_evaluator.py` and `run_bot_notifier.py` need to be committed and pushed to git.

---

## Steps to Fix:

### 1. Check what needs to be committed:
```bash
git status apps/bots/
```

### 2. Add the files:
```bash
git add apps/bots/run_condition_evaluator.py
git add apps/bots/run_bot_notifier.py
git add apps/bots/bot_notifier.py
git add apps/bots/event_bus.py
```

### 3. Commit:
```bash
git commit -m "Add Phase 2.3: Bot notification system and service runners"
```

### 4. Push:
```bash
git push origin main
```

### 5. On Lightsail, pull again:
```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
ls -la apps/bots/run_*.py
```

---

## Complete Sequence:

**On your local machine:**
```bash
git add apps/bots/run_condition_evaluator.py apps/bots/run_bot_notifier.py apps/bots/bot_notifier.py
git commit -m "Add Phase 2.3 bot notification system"
git push origin main
```

**Then on Lightsail:**
```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
ls -la apps/bots/run_*.py
```



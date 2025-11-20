# Progress Check Guide

## Quick Status Check

Run this on Lightsail to check current progress:

```bash
cd ~/tradeeon-FE-BE-12-09-2025
wget -O check_progress.sh https://raw.githubusercontent.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/main/check_progress.sh
chmod +x check_progress.sh
./check_progress.sh
```

## Manual Check Commands

### 1. Check Services Are Running
```bash
ps aux | grep -E "(condition_evaluator|bot_notifier)" | grep -v grep
```

### 2. Check Logs
```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
tail -n 30 evaluator.log
tail -n 30 notifier.log
```

### 3. Check for Errors
```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
grep -i "error\|failed\|exception" evaluator.log | tail -n 5
grep -i "error\|failed\|exception" notifier.log | tail -n 5
```

### 4. Check Success Indicators
```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
grep -i "event bus connected\|starting\|initialized" evaluator.log
grep -i "event bus connected\|initialized\|listening" notifier.log
```

## Expected Success Output

### Services Running:
```
ubuntu  12345  0.1  0.8  python3 run_condition_evaluator.py
ubuntu  12346  0.1  0.7  python3 run_bot_notifier.py
```

### Logs Should Show:
- `✅ Event bus connected to Redis: redis://localhost:6379`
- `Starting Centralized Condition Evaluator Service...`
- `Bot notifier initialized successfully`
- `Subscribed to condition triggers (pattern: condition.*)`

## If Services Are Not Running

Run the complete fix:
```bash
cd ~/tradeeon-FE-BE-12-09-2025
./fix_everything.sh
```

## Current Status Checklist

- [ ] Redis installed and running
- [ ] All Python dependencies installed
- [ ] Files exist (run_condition_evaluator.py, run_bot_notifier.py, etc.)
- [ ] Condition Evaluator service running
- [ ] Bot Notifier service running
- [ ] No errors in logs
- [ ] Success indicators in logs



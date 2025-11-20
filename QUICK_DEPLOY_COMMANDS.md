# Quick Deploy Commands for Lightsail

## One-Line Commands

### Install Redis
```bash
sudo apt-get update && sudo apt-get install -y redis-server && sudo systemctl start redis-server && sudo systemctl enable redis-server && pip install redis>=5.0.0 && redis-cli ping
```

### Start Services (Background)
```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots && nohup python run_condition_evaluator.py > evaluator.log 2>&1 & nohup python run_bot_notifier.py > notifier.log 2>&1 &
```

### Check Services Status
```bash
ps aux | grep -E "(condition_evaluator|bot_notifier)" | grep -v grep
```

### View Logs
```bash
tail -f ~/tradeeon-FE-BE-12-09-2025/apps/bots/evaluator.log
tail -f ~/tradeeon-FE-BE-12-09-2025/apps/bots/notifier.log
```

### Stop Services
```bash
pkill -f run_condition_evaluator && pkill -f run_bot_notifier
```

### Restart Services
```bash
pkill -f run_condition_evaluator && pkill -f run_bot_notifier && sleep 2 && cd ~/tradeeon-FE-BE-12-09-2025/apps/bots && nohup python run_condition_evaluator.py > evaluator.log 2>&1 & nohup python run_bot_notifier.py > notifier.log 2>&1 &
```

---

## Full Deployment Script

Save as `deploy_phase2.sh`:

```bash
#!/bin/bash
set -e

echo "=== Deploying Phase 2: Centralized Bot System ==="

# 1. Install Redis
echo "Installing Redis..."
sudo apt-get update -y
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
pip install redis>=5.0.0

# 2. Verify Redis
echo "Verifying Redis..."
redis-cli ping || { echo "Redis failed to start!"; exit 1; }

# 3. Install Python dependencies
echo "Installing Python dependencies..."
cd ~/tradeeon-FE-BE-12-09-2025/apps/api
pip install -e .

# 4. Stop existing services
echo "Stopping existing services..."
pkill -f run_condition_evaluator || true
pkill -f run_bot_notifier || true
sleep 2

# 5. Start services
echo "Starting services..."
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
nohup python run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python run_bot_notifier.py > notifier.log 2>&1 &

# 6. Wait and verify
sleep 3
if ps aux | grep -q "[r]un_condition_evaluator" && ps aux | grep -q "[r]un_bot_notifier"; then
    echo "✅ Services started successfully!"
    echo "Evaluator PID: $(pgrep -f run_condition_evaluator)"
    echo "Notifier PID: $(pgrep -f run_bot_notifier)"
else
    echo "❌ Services failed to start. Check logs:"
    tail -n 20 evaluator.log
    tail -n 20 notifier.log
    exit 1
fi

echo "=== Deployment Complete ==="
```

Make executable and run:
```bash
chmod +x deploy_phase2.sh
./deploy_phase2.sh
```



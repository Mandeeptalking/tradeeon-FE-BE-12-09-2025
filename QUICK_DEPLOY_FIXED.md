# Quick Deploy Commands (FIXED for Lightsail)

## ✅ Corrected Commands (Use pip3 and python3)

```bash
# 1. Verify Redis (should already be running)
redis-cli ping

# 2. Install Redis Python library
pip3 install redis>=5.0.0

# 3. Install API dependencies  
cd ~/tradeeon-FE-BE-12-09-2025/apps/api
pip3 install -e .

# 4. Start services
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots
nohup python3 run_condition_evaluator.py > evaluator.log 2>&1 &
nohup python3 run_bot_notifier.py > notifier.log 2>&1 &

# 5. Verify services are running
ps aux | grep -E "(condition_evaluator|bot_notifier)"

# 6. Check logs
tail -f evaluator.log
tail -f notifier.log
```

---

## If pip3 not found:

```bash
sudo apt install python3-pip
```

Then retry the commands above.



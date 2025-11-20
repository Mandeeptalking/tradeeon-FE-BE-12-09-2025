# Diagnose Service Issues

## Services may have crashed immediately

Since log files don't exist, the services likely crashed on startup due to missing dependencies.

---

## Step 1: Check if processes are still running

```bash
ps aux | grep -E "(condition_evaluator|bot_notifier)" | grep -v grep
```

If nothing shows, the processes crashed.

---

## Step 2: Check redirected logs

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Check the redirected logs
cat evaluator.log
cat notifier.log

# Or check if they exist
ls -la *.log
```

---

## Step 3: Try running services directly to see errors

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Run evaluator directly (will show errors)
python3 run_condition_evaluator.py

# If it fails, you'll see the error message
```

---

## Step 4: Install dependencies first

```bash
# Install pip3
sudo apt install python3-pip -y

# Install Redis
pip3 install redis>=5.0.0

# Install API dependencies
cd ~/tradeeon-FE-BE-12-09-2025/apps/api
pip3 install -e .
```

---

## Step 5: Test import manually

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/bots

# Test if redis can be imported
python3 -c "import redis; print('Redis OK')"

# Test if event_bus can be imported
python3 -c "from event_bus import EventBus; print('EventBus OK')"
```



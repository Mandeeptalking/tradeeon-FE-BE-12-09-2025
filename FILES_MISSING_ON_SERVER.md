# Files Missing on Server

## Issue: Files don't exist on Lightsail server

The files `run_condition_evaluator.py` and `run_bot_notifier.py` are missing on the server.

---

## Solution: Pull latest code from Git

```bash
cd ~/tradeeon-FE-BE-12-09-2025

# Check current branch
git branch

# Pull latest changes
git pull origin main

# Or if you're on a different branch:
git pull origin <your-branch-name>

# Verify files exist
ls -la apps/bots/run_*.py
```

---

## If files still don't exist after git pull:

The files might not be committed yet. Check:

```bash
# Check if files exist locally
git status
git ls-files | grep run_condition_evaluator
git ls-files | grep run_bot_notifier
```

---

## Alternative: Create files manually

If the files aren't in git yet, you can create them manually on the server or copy them from your local machine.



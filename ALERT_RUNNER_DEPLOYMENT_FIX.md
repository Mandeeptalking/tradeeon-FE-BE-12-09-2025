# Alert Runner Deployment Fix

## 🔴 Issue Identified

The alert runner workflow was trying to deploy to **AWS ECS**, but the backend is actually deployed on **AWS Lightsail**, not ECS!

## ✅ Fix Applied

**Disabled ECS deployment workflows** for alert runner (same as backend):

1. **`.github/workflows/deploy-all.yml`**: Set condition to `if: false && ...` so alert runner deployment is skipped
2. **`.github/workflows/deploy-alert-runner.yml`**: Changed to manual trigger only (`workflow_dispatch`)

## 🚀 Correct Deployment Method

The alert runner should run on **Lightsail**, just like:
- Backend API
- Condition Evaluator (`run_condition_evaluator.py`)
- Bot Notifier (`run_bot_notifier.py`)

### How to Run Alert Runner on Lightsail

Same pattern as the other services:

```bash
# SSH into Lightsail
ssh ubuntu@your-lightsail-ip

# Navigate to project
cd ~/tradeeon-FE-BE-12-09-2025/apps/alerts

# Run alert runner (as background process)
nohup python3 -m apps.alerts.runner > alert_runner.log 2>&1 &

# Or using systemd service (recommended for production)
# Create service file: /etc/systemd/system/tradeeon-alert-runner.service
```

### Create Systemd Service (Recommended)

Create `/etc/systemd/system/tradeeon-alert-runner.service`:

```ini
[Unit]
Description=Tradeeon Alert Runner
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/tradeeon-FE-BE-12-09-2025
Environment="PYTHONPATH=/home/ubuntu/tradeeon-FE-BE-12-09-2025"
ExecStart=/usr/bin/python3 -m apps.alerts.runner
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tradeeon-alert-runner
sudo systemctl start tradeeon-alert-runner
sudo systemctl status tradeeon-alert-runner
```

## 📝 Summary

- ❌ **Wrong**: Deploying alert runner to ECS via Docker
- ✅ **Correct**: Running alert runner on Lightsail as a Python process (same as backend)

The workflows are now disabled, so they won't try to deploy to ECS anymore. You can manually deploy the alert runner on Lightsail following the same pattern as your other services.


# Rebuild and Deploy Backend - Fixed Imports

## ✅ Fixed Issues
1. ✅ Changed imports to absolute paths (`apps.api.*`)
2. ✅ Added `PYTHONPATH=/app` to Dockerfile
3. ✅ Created `apps/api/__init__.py` if missing

## 🔄 Rebuild Steps (in CloudShell)

### Step 1: Upload Fixed Files

You need to upload the updated files to CloudShell:
- `apps/api/main.py` (fixed imports)
- `Dockerfile` (added PYTHONPATH)

**Option A: Upload individual files via CloudShell Actions → Upload**

**Option B: Re-create ZIP with fixed files locally, then upload:**

```powershell
# Run this locally
Compress-Archive -Path apps,backend,shared,requirements.txt,Dockerfile -DestinationPath tradeeon-fixed.zip -Force
```

Then upload `tradeeon-fixed.zip` to CloudShell and extract it.

### Step 2: In CloudShell - Rebuild Docker Image

```bash
# Login to ECR (if not already logged in)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 531604848081.dkr.ecr.us-east-1.amazonaws.com

# Build with fixed code
docker build -t tradeeon-backend:latest .

# Tag and push
docker tag tradeeon-backend:latest 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest
docker push 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest
```

### Step 3: Force ECS to Use New Image

```bash
# Force new deployment (ECS will pull the new image)
aws ecs update-service --cluster tradeeon-cluster --service tradeeon-backend-service --force-new-deployment --region us-east-1
```

### Step 4: Monitor Deployment

Wait 2-3 minutes, then check status:

```powershell
# Run locally
.\monitor-backend-deployment.ps1
```

Or in CloudShell:
```bash
aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service --region us-east-1 --query "services[0].{status:status,running:runningCount,desired:desiredCount}"

# Test backend
curl http://tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com/health
```

---

## 🎯 What Was Fixed

**Before:**
```python
from binance_client import BinanceClient  # ❌ Can't find module
```

**After:**
```python
from apps.api.binance_client import BinanceClient  # ✅ Works with PYTHONPATH=/app
```

The Dockerfile now sets `ENV PYTHONPATH=/app` so Python can find the `apps` package.



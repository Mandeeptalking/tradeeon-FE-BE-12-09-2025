# Manual Alert Runner Deployment - Step by Step

## ✅ This will work immediately - same approach as backend

### Step 1: Open AWS CloudShell
1. Go to: https://console.aws.amazon.com/cloudshell
2. Or click the CloudShell icon in AWS Console (top right)

### Step 2: Upload Your Project

**Upload the ZIP file:**
1. In CloudShell, click "Actions" → "Upload file"
2. Upload this file: **`alert-runner-deploy-*.zip`** (or delete existing `alert-runner-deploy.zip` first)
3. Wait for upload to complete (70 MB - may take 1-2 minutes)
4. Extract it: `unzip -o alert-runner-deploy-*.zip`
5. Make script executable: `chmod +x deploy-alert-runner-complete.sh`

### Step 3: Run Complete Deployment Script

**EASIEST WAY - Run the complete script:**
```bash
bash deploy-alert-runner-complete.sh
```

This single command will do everything automatically!

---

**OR manually run these commands one by one:**

```bash
# Navigate to project root (where Dockerfile.alert-runner is)
cd tradeeon-FE-BE-12-09-2025

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 531604848081.dkr.ecr.us-east-1.amazonaws.com

# Verify Dockerfile exists
ls -la Dockerfile.alert-runner

# Verify required directories exist
ls -la apps/ backend/ shared/

# Clean up any nested directories (if they exist)
rm -rf apps/apps apps/backend 2>/dev/null || true

# Build Docker image
docker build -f Dockerfile.alert-runner -t tradeeon-alert-runner:latest .

# Tag for ECR
docker tag tradeeon-alert-runner:latest 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-alert-runner:latest

# Push to ECR
docker push 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-alert-runner:latest

# Verify image is in ECR
aws ecr describe-images --repository-name tradeeon-alert-runner --region us-east-1 --query "imageDetails[0]"
```

### Step 4: Check ECS Service Status

Once image is pushed, ECS will automatically start the service. Check status:

```bash
# Check ECS service
aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-alert-runner-service --region us-east-1 --query "services[0].{status:status,running:runningCount,desired:desiredCount}"

# Check running tasks
aws ecs list-tasks --cluster tradeeon-cluster --service-name tradeeon-alert-runner-service --region us-east-1

# View logs
aws logs tail /ecs/tradeeon-alert-runner --follow --region us-east-1
```

---

## ⏱️ Time: ~5-10 minutes total

## 🎯 Why This Works
- ✅ Direct Docker build (no ZIP extraction issues)
- ✅ Full file system access
- ✅ Immediate feedback
- ✅ Same process as backend deployment

---

**The service is already created and waiting for the image! Once you push the image, it will automatically start.**


# CloudShell Upload Guide - Simple Steps

## ✅ ZIP File Created

A ZIP file has been created: `tradeeon-cloudshell.zip`

## 📤 Upload Steps

### Step 1: Open AWS CloudShell
- Go to: **https://console.aws.amazon.com/cloudshell**
- Or click the CloudShell icon (top right) in AWS Console

### Step 2: Upload the ZIP File
1. In CloudShell, click **"Actions"** button (top right)
2. Click **"Upload file"**
3. Select `tradeeon-cloudshell.zip` from your local machine
4. Wait for upload to complete

### Step 3: Extract and Deploy

Once uploaded, run these commands in CloudShell:

```bash
# Extract the ZIP
unzip tradeeon-cloudshell.zip

# Navigate to the extracted folder (it will create a folder with the project files)
cd tradeeon-cloudshell

# Verify files are there
ls -la
ls -la apps/ backend/ shared/

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 531604848081.dkr.ecr.us-east-1.amazonaws.com

# Build Docker image
docker build -t tradeeon-backend:latest .

# Tag for ECR
docker tag tradeeon-backend:latest 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest

# Push to ECR
docker push 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest

# Verify image is in ECR
aws ecr describe-images --repository-name tradeeon-backend --region us-east-1 --query "imageDetails[0]"

# Check ECS service (should auto-start)
aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service --region us-east-1 --query "services[0].{status:status,running:runningCount,desired:desiredCount}"

# Test backend
curl http://tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com/health
```

## ⏱️ Time: ~10 minutes

## ✅ After Deployment

Once the image is pushed, run locally:
```powershell
.\monitor-backend-deployment.ps1
```

Then update frontend:
```powershell
.\update-frontend-api.ps1
```

---

**Note:** CloudShell has a file size limit. If the ZIP is too large (>250MB), you may need to exclude `node_modules` or other large folders. But for Docker build, we only need `apps/`, `backend/`, `shared/`, `requirements.txt`, and `Dockerfile` - which should be small.



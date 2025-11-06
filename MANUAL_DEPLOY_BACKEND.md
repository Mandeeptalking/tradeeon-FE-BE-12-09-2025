# Manual Backend Deployment - Step by Step

## ✅ This will work immediately - bypasses CodeBuild

### Step 1: Open AWS CloudShell
1. Go to: https://console.aws.amazon.com/cloudshell
2. Or click the CloudShell icon in AWS Console (top right)

### Step 2: Upload Your Project

**Option A: Using Git (if your repo is online)**
```bash
git clone <your-repo-url>
cd tradeeon-FE-BE-12-09-2025
```

**Option B: Using CloudShell Upload**
1. Click "Actions" → "Upload file"
2. Upload the entire project folder OR create a ZIP and upload it
3. If ZIP, extract it: `unzip your-project.zip`

### Step 3: Build and Push Docker Image

Copy and paste ALL these commands one by one:

```bash
# Navigate to project root (where Dockerfile is)
cd tradeeon-FE-BE-12-09-2025

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 531604848081.dkr.ecr.us-east-1.amazonaws.com

# Verify Dockerfile exists
ls -la Dockerfile

# Verify required directories exist
ls -la apps/ backend/ shared/

# Build Docker image
docker build -t tradeeon-backend:latest .

# Tag for ECR
docker tag tradeeon-backend:latest 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest

# Push to ECR
docker push 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest

# Verify image is in ECR
aws ecr describe-images --repository-name tradeeon-backend --region us-east-1 --query "imageDetails[0]"
```

### Step 4: Check ECS Service Status

Once image is pushed, ECS will automatically start the service. Check status:

```bash
# Check ECS service
aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service --region us-east-1 --query "services[0].{status:status,running:runningCount,desired:desiredCount}"

# Check running tasks
aws ecs list-tasks --cluster tradeeon-cluster --service-name tradeeon-backend-service --region us-east-1
```

### Step 5: Test Backend

```bash
# Get ALB URL
aws elbv2 describe-load-balancers --region us-east-1 --query "LoadBalancers[?contains(LoadBalancerName, 'tradeeon')].DNSName" --output text

# Test health endpoint (replace with your ALB DNS)
curl http://tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com/health
```

---

## ⏱️ Time: ~5-10 minutes total

## 🎯 Why This Works
- ✅ Direct Docker build (no ZIP extraction issues)
- ✅ Full file system access
- ✅ Immediate feedback
- ✅ No CodeBuild overhead

---

**After this works, you can update the frontend API URL to point to your ALB!**



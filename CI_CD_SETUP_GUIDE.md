# CI/CD Setup Guide - Automated Deployments

## 🚀 Fast Deployment Options

Instead of manual CloudShell deployments (which take 10-15 minutes), you now have **3 automated options**:

---

## Option 1: GitHub Actions (Recommended - Zero Manual Work)

**Time: ~5-7 minutes (automatic)**

### Setup (One-time)

1. **Add AWS credentials to GitHub Secrets:**
   - Go to: `Settings → Secrets and variables → Actions`
   - Add these secrets:
     - `AWS_ACCESS_KEY_ID` - Your AWS access key
     - `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
     - `CLOUDFRONT_DISTRIBUTION_ID` - Your CloudFront distribution ID (optional, for frontend)

2. **Get CloudFront Distribution ID:**
   ```powershell
   aws cloudfront list-distributions --region us-east-1 --query "DistributionList.Items[?Comment=='Tradeeon Frontend'].Id" --output text
   ```

### How It Works

- **Push to main branch** → Automatically deploys
- **Manual trigger** → Go to Actions tab → Run workflow

### Workflows Created

1. **`.github/workflows/deploy-backend.yml`**
   - Deploys when backend code changes
   - Builds Docker image
   - Pushes to ECR
   - Updates ECS service

2. **`.github/workflows/deploy-alert-runner.yml`**
   - Deploys when alert runner code changes
   - Builds Docker image
   - Pushes to ECR
   - Updates ECS service

3. **`.github/workflows/deploy-frontend.yml`**
   - Deploys when frontend code changes
   - Builds React app
   - Syncs to S3
   - Invalidates CloudFront cache

---

## Option 2: Local Docker + AWS CLI (Fast Manual)

**Time: ~3-5 minutes**

### Quick Deploy Script

Create `quick-deploy.ps1`:

```powershell
# Quick Deploy Script
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("backend", "alert-runner", "both")]
    [string]$Service = "both"
)

$region = "us-east-1"
$accountId = "531604848081"

# Login to ECR
aws ecr get-login-password --region $region | docker login --username AWS --password-stdin "$accountId.dkr.ecr.$region.amazonaws.com"

if ($Service -eq "backend" -or $Service -eq "both") {
    Write-Host "Deploying backend..." -ForegroundColor Cyan
    docker build -t tradeeon-backend:latest .
    docker tag tradeeon-backend:latest "$accountId.dkr.ecr.$region.amazonaws.com/tradeeon-backend:latest"
    docker push "$accountId.dkr.ecr.$region.amazonaws.com/tradeeon-backend:latest"
    aws ecs update-service --cluster tradeeon-cluster --service tradeeon-backend-service --force-new-deployment --region $region
}

if ($Service -eq "alert-runner" -or $Service -eq "both") {
    Write-Host "Deploying alert runner..." -ForegroundColor Cyan
    docker build -f Dockerfile.alert-runner -t tradeeon-alert-runner:latest .
    docker tag tradeeon-alert-runner:latest "$accountId.dkr.ecr.$region.amazonaws.com/tradeeon-alert-runner:latest"
    docker push "$accountId.dkr.ecr.$region.amazonaws.com/tradeeon-alert-runner:latest"
    aws ecs update-service --cluster tradeeon-cluster --service tradeeon-alert-runner-service --force-new-deployment --region $region
}

Write-Host "✅ Deployment complete!" -ForegroundColor Green
```

### Usage

```powershell
# Deploy both
.\quick-deploy.ps1

# Deploy only backend
.\quick-deploy.ps1 -Service backend

# Deploy only alert runner
.\quick-deploy.ps1 -Service alert-runner
```

**Requirements:**
- Docker Desktop running
- AWS CLI configured
- Enough disk space

---

## Option 3: GitHub Actions with Manual Trigger

**Time: ~5-7 minutes (one click)**

If you don't want automatic deployments:

1. Keep workflows but remove `push` trigger
2. Only use `workflow_dispatch` (manual trigger)
3. Go to GitHub Actions tab → Select workflow → Run workflow

---

## Comparison

| Method | Time | Manual Steps | Automation |
|--------|------|--------------|------------|
| **CloudShell (Current)** | 10-15 min | Upload ZIP, extract, run commands | None |
| **GitHub Actions (Auto)** | 5-7 min | Push to git | Full |
| **GitHub Actions (Manual)** | 5-7 min | Click "Run workflow" | Full |
| **Local Docker Script** | 3-5 min | Run script | Semi |

---

## Recommended Setup

### For Development:
- Use **Local Docker Script** (fastest, immediate feedback)

### For Production:
- Use **GitHub Actions** (automatic, tracks deployments)

---

## Setup Steps

### 1. Create AWS IAM User for CI/CD

```powershell
# Create IAM user for GitHub Actions
aws iam create-user --user-name github-actions-deployer

# Attach policies
aws iam attach-user-policy --user-name github-actions-deployer --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess
aws iam attach-user-policy --user-name github-actions-deployer --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
aws iam attach-user-policy --user-name github-actions-deployer --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-user-policy --user-name github-actions-deployer --policy-arn arn:aws:iam::aws:policy/CloudFrontFullAccess

# Create access key
aws iam create-access-key --user-name github-actions-deployer
```

### 2. Add to GitHub Secrets

Copy the access key and secret to GitHub:
- Repository → Settings → Secrets and variables → Actions
- Add `AWS_ACCESS_KEY_ID`
- Add `AWS_SECRET_ACCESS_KEY`

### 3. Get CloudFront Distribution ID

```powershell
aws cloudfront list-distributions --region us-east-1 --query "DistributionList.Items[?Comment=='Tradeeon Frontend'].Id" --output text
```

Add to GitHub Secrets as `CLOUDFRONT_DISTRIBUTION_ID`

---

## Testing

### Test GitHub Actions:
1. Make a small change to backend code
2. Commit and push to main
3. Check Actions tab - should auto-deploy

### Test Local Script:
```powershell
.\quick-deploy.ps1 -Service backend
```

---

## Benefits

✅ **5x faster** than CloudShell  
✅ **Zero manual steps** (with GitHub Actions)  
✅ **Automatic deployments** on push  
✅ **Track deployments** in GitHub Actions  
✅ **Rollback easy** - just revert commit  
✅ **No CloudShell needed**

---

## Troubleshooting

### GitHub Actions fails:
- Check AWS credentials in Secrets
- Verify IAM permissions
- Check workflow logs

### Local script fails:
- Ensure Docker Desktop is running
- Check AWS CLI is configured
- Verify you have disk space

---

**Next: Choose your preferred method and set it up!**



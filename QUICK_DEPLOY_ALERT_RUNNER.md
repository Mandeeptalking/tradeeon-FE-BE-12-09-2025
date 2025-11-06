# Quick Deploy Alert Runner - CloudShell

## ✅ Already Done (Locally)
- ✅ ECR repository created: `tradeeon-alert-runner`
- ✅ CloudWatch log group created: `/ecs/tradeeon-alert-runner`

## Step 1: Open AWS CloudShell
1. Go to: https://console.aws.amazon.com/cloudshell
2. Or click CloudShell icon in AWS Console (top right)

## Step 2: Upload Project Files

**Option A: Upload ZIP (Recommended)**
1. Create a ZIP file with these directories/files:
   - `apps/` (directory)
   - `backend/` (directory)
   - `shared/` (directory)
   - `requirements.txt`
   - `Dockerfile.alert-runner`
2. In CloudShell: Click "Actions" → "Upload file"
3. Upload the ZIP file
4. Extract: `unzip your-file.zip`

**Option B: Manual Upload**
1. Upload each file/directory individually via CloudShell upload

## Step 3: Build and Push Docker Image

Copy and paste these commands one by one in CloudShell:

```bash
# Navigate to project directory
cd tradeeon-FE-BE-12-09-2025  # or whatever your directory is named

# Verify files exist
ls -la Dockerfile.alert-runner
ls -la apps/ backend/ shared/ requirements.txt

# Clean up any nested directories (if they exist)
rm -rf apps/apps apps/backend 2>/dev/null || true

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 531604848081.dkr.ecr.us-east-1.amazonaws.com

# Build Docker image
docker build -f Dockerfile.alert-runner -t tradeeon-alert-runner:latest .

# Tag for ECR
docker tag tradeeon-alert-runner:latest 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-alert-runner:latest

# Push to ECR
docker push 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-alert-runner:latest

# Verify image is in ECR
aws ecr describe-images --repository-name tradeeon-alert-runner --region us-east-1 --query "imageDetails[0]"
```

## Step 4: Deploy ECS Service (Run Locally)

After the image is pushed, run this locally in PowerShell:

```powershell
.\deploy-alert-runner.ps1
```

Or manually:

```powershell
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition-alert-runner.json --region us-east-1

# Get VPC and subnet info
$vpcId = aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region us-east-1 --query "Vpcs[0].VpcId" --output text
$subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --region us-east-1 --query "Subnets[0:2].SubnetId" --output text
$subnetArray = $subnets -split "`t"

# Get security group (same as backend)
$sg = aws ec2 describe-security-groups --filters "Name=tag:Name,Values=tradeeon-backend-sg" --region us-east-1 --query "SecurityGroups[0].GroupId" --output text

# Create ECS service
aws ecs create-service `
    --cluster tradeeon-cluster `
    --service-name tradeeon-alert-runner-service `
    --task-definition tradeeon-alert-runner `
    --desired-count 1 `
    --launch-type FARGATE `
    --network-configuration "awsvpcConfiguration={subnets=[$($subnetArray[0]),$($subnetArray[1])],securityGroups=[$sg],assignPublicIp=ENABLED}" `
    --region us-east-1
```

## Step 5: Verify Deployment

```powershell
# Check service status
aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-alert-runner-service --region us-east-1

# Check running tasks
aws ecs list-tasks --cluster tradeeon-cluster --service-name tradeeon-alert-runner-service --region us-east-1

# View logs
aws logs tail /ecs/tradeeon-alert-runner --follow --region us-east-1
```

## Troubleshooting

### Build fails with "permission denied"
```bash
chmod -R 755 apps/ backend/ shared/
chmod 644 requirements.txt Dockerfile.alert-runner
```

### Build fails with "no space left"
```bash
docker system prune -a --volumes -f
```

### Image not found when creating service
- Wait a few seconds after push
- Verify image exists: `aws ecr describe-images --repository-name tradeeon-alert-runner --region us-east-1`

### Service fails to start
- Check CloudWatch logs: `/ecs/tradeeon-alert-runner`
- Verify environment variables in task definition
- Check security group allows outbound traffic



# Deploy Alert Runner - Step by Step

## Overview

The Alert Runner continuously evaluates trading alerts and triggers actions. It runs as a separate ECS service.

## Prerequisites

- ✅ Backend API is deployed and running
- ✅ Supabase database is configured
- ✅ ECS cluster exists (`tradeeon-cluster`)
- ✅ IAM roles configured

## Step 1: Prepare Files for CloudShell

Upload these files to CloudShell:
- `apps/` (directory)
- `backend/` (directory)  
- `shared/` (directory)
- `requirements.txt`
- `Dockerfile.alert-runner`

## Step 2: Build Docker Image in CloudShell

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 531604848081.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository (if not exists)
aws ecr create-repository --repository-name tradeeon-alert-runner --region us-east-1 2>/dev/null || echo "Repository exists"

# Build image
docker build -f Dockerfile.alert-runner -t tradeeon-alert-runner:latest .

# Tag for ECR
docker tag tradeeon-alert-runner:latest 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-alert-runner:latest

# Push to ECR
docker push 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-alert-runner:latest
```

## Step 3: Deploy ECS Service (Run Locally)

```powershell
# Run the deployment script
.\deploy-alert-runner.ps1
```

Or manually:

```powershell
# Create CloudWatch log group
aws logs create-log-group --log-group-name /ecs/tradeeon-alert-runner --region us-east-1

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

## Step 4: Verify Deployment

```powershell
# Check service status
aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-alert-runner-service --region us-east-1

# Check running tasks
aws ecs list-tasks --cluster tradeeon-cluster --service-name tradeeon-alert-runner-service --region us-east-1

# View logs
aws logs tail /ecs/tradeeon-alert-runner --follow --region us-east-1
```

## Step 5: Test Alert System

1. Create an alert via the frontend or API
2. Check logs to see if it's being evaluated
3. Verify alerts are triggering correctly

## Troubleshooting

### Service not starting
- Check CloudWatch logs for errors
- Verify environment variables are set correctly
- Check ECS task definition

### Alerts not triggering
- Verify alert status is "active"
- Check condition logic
- Review logs for evaluation errors

### Import errors
- Ensure all imports use absolute paths (`apps.alerts.*`)
- Verify PYTHONPATH is set correctly

## Next Steps

Once alert runner is deployed:
- Monitor logs for evaluation activity
- Test creating and triggering alerts
- Set up CloudWatch alarms for alert runner health



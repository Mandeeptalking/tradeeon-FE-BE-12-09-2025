# Manual Backend Deployment via CloudShell
# This script provides the exact commands to copy-paste into AWS CloudShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MANUAL BACKEND DEPLOYMENT GUIDE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Open AWS CloudShell" -ForegroundColor Yellow
Write-Host "  URL: https://console.aws.amazon.com/cloudshell" -ForegroundColor Gray
Write-Host "  Or click CloudShell icon in AWS Console (top right)" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 2: In CloudShell, run these commands:" -ForegroundColor Yellow
Write-Host ""

Write-Host "# Upload your project first:" -ForegroundColor Cyan
Write-Host "# Option A: If using git:" -ForegroundColor Gray
Write-Host "git clone <your-repo-url>" -ForegroundColor White
Write-Host "cd tradeeon-FE-BE-12-09-2025" -ForegroundColor White
Write-Host ""
Write-Host "# Option B: Click Actions > Upload file in CloudShell" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COPY-PASTE THESE COMMANDS:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$commands = @"
# Navigate to project root
cd tradeeon-FE-BE-12-09-2025

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 531604848081.dkr.ecr.us-east-1.amazonaws.com

# Verify files exist
ls -la Dockerfile
ls -la apps/ backend/ shared/

# Build Docker image
docker build -t tradeeon-backend:latest .

# Tag for ECR
docker tag tradeeon-backend:latest 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest

# Push to ECR
docker push 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest

# Verify image is in ECR
aws ecr describe-images --repository-name tradeeon-backend --region us-east-1 --query "imageDetails[0]"

# Check ECS service status
aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service --region us-east-1 --query "services[0].{status:status,running:runningCount,desired:desiredCount}"

# Test backend (get ALB URL first)
ALB_URL=$(aws elbv2 describe-load-balancers --region us-east-1 --query "LoadBalancers[?contains(LoadBalancerName, 'tradeeon')].DNSName" --output text)
curl http://`$ALB_URL/health
"@

Write-Host $commands -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AFTER DEPLOYMENT:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Once image is pushed, run this locally to check status:" -ForegroundColor Yellow
Write-Host "  .\monitor-backend-deployment.ps1" -ForegroundColor White
Write-Host ""

Write-Host "Then update frontend API URL:" -ForegroundColor Yellow
Write-Host "  .\update-frontend-api.ps1" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  This will take ~5-10 minutes" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green


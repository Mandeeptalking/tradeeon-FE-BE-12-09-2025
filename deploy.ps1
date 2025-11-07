# Tradeeon Deployment Script (PowerShell)
param(
    [string]$AWS_REGION = "us-east-1",
    [string]$ECS_CLUSTER = "tradeeon-cluster",
    [string]$SERVICE_NAME = "tradeeon-backend",
    [string]$ECR_REPO = "tradeeon-backend"
)

$ErrorActionPreference = "Stop"

Write-Host "`n🚀 Starting Tradeeon Deployment...`n" -ForegroundColor Cyan

# Get AWS Account ID
$AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
Write-Host "AWS Account: $AWS_ACCOUNT_ID" -ForegroundColor Yellow
Write-Host "Region: $AWS_REGION`n" -ForegroundColor Yellow

# Step 1: Build frontend
Write-Host "Step 1: Building Frontend..." -ForegroundColor Yellow
Set-Location apps\frontend
npm install
npm run build
Write-Host "✅ Frontend built successfully`n" -ForegroundColor Green
Set-Location ..\..

# Step 2: Deploy frontend to S3
Write-Host "Step 2: Deploying Frontend to S3..." -ForegroundColor Yellow
aws s3 sync apps\frontend\dist s3://tradeeon-frontend-prod --delete
Write-Host "✅ Frontend deployed to S3`n" -ForegroundColor Green

# Step 3: Invalidate CloudFront cache
Write-Host "Step 3: Invalidating CloudFront..." -ForegroundColor Yellow
$CLOUDFRONT_ID = aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?DomainName=='tradeeon-frontend-prod.s3.amazonaws.com']].Id" --output text
if ($CLOUDFRONT_ID) {
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
    Write-Host "✅ CloudFront cache invalidated`n" -ForegroundColor Green
}

# Step 4: Login to ECR
Write-Host "Step 4: Logging in to ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
Write-Host "✅ Logged in to ECR`n" -ForegroundColor Green

# Step 5: Build Docker image
Write-Host "Step 5: Building Docker image..." -ForegroundColor Yellow
docker build -t "$ECR_REPO`:latest" .
docker tag "$ECR_REPO`:latest" "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO`:latest"
Write-Host "✅ Docker image built`n" -ForegroundColor Green

# Step 6: Push to ECR
Write-Host "Step 6: Pushing to ECR..." -ForegroundColor Yellow
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO`:latest"
Write-Host "✅ Image pushed to ECR`n" -ForegroundColor Green

# Step 7: Update task definition
Write-Host "Step 7: Updating task definition..." -ForegroundColor Yellow
$taskDef = Get-Content task-definition.json -Raw
$taskDef = $taskDef -replace '<ACCOUNT_ID>', $AWS_ACCOUNT_ID
$taskDef = $taskDef -replace '<AWS_REGION>', $AWS_REGION
$taskDef | Set-Content task-definition.json
aws ecs register-task-definition --cli-input-json file://task-definition.json | Out-Null
Write-Host "✅ Task definition updated`n" -ForegroundColor Green

# Step 8: Update ECS service
Write-Host "Step 8: Updating ECS service..." -ForegroundColor Yellow
aws ecs update-service `
    --cluster $ECS_CLUSTER `
    --service $SERVICE_NAME `
    --force-new-deployment `
    --region $AWS_REGION | Out-Null

Write-Host "✅ Deployment initiated!`n" -ForegroundColor Green
Write-Host "Waiting for service to stabilize...`n" -ForegroundColor Yellow

# Step 9: Wait for service to stabilize
aws ecs wait services-stable `
    --cluster $ECS_CLUSTER `
    --services $SERVICE_NAME `
    --region $AWS_REGION

Write-Host "`n🎉 Deployment complete!`n" -ForegroundColor Green

# Get service status
Write-Host "Service Status:" -ForegroundColor Yellow
aws ecs describe-services `
    --cluster $ECS_CLUSTER `
    --services $SERVICE_NAME `
    --region $AWS_REGION `
    --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'

Write-Host "`n✅ Tradeeon is now live!`n" -ForegroundColor Green




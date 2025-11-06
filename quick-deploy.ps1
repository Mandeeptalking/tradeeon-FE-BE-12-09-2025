# Quick Deploy Script - Fast Local Deployment
# Usage: .\quick-deploy.ps1 [backend|alert-runner|both]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("backend", "alert-runner", "both")]
    [string]$Service = "both"
)

$region = "us-east-1"
$accountId = "531604848081"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  QUICK DEPLOY - $Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Docker is running" -ForegroundColor Green

# Login to ECR
Write-Host ""
Write-Host "Logging into ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $region | docker login --username AWS --password-stdin "$accountId.dkr.ecr.$region.amazonaws.com" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to login to ECR" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Logged into ECR" -ForegroundColor Green

# Deploy Backend
if ($Service -eq "backend" -or $Service -eq "both") {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  DEPLOYING BACKEND" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Building Docker image..." -ForegroundColor Yellow
    docker build -t tradeeon-backend:latest . 2>&1 | ForEach-Object {
        if ($_ -match "ERROR|error|failed") {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match "Step|Layer|Cached") {
            Write-Host $_ -ForegroundColor Gray
        }
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Docker build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Image built" -ForegroundColor Green
    
    Write-Host "Tagging image..." -ForegroundColor Yellow
    docker tag tradeeon-backend:latest "$accountId.dkr.ecr.$region.amazonaws.com/tradeeon-backend:latest"
    Write-Host "[OK] Image tagged" -ForegroundColor Green
    
    Write-Host "Pushing to ECR (this may take 5-10 minutes)..." -ForegroundColor Yellow
    docker push "$accountId.dkr.ecr.$region.amazonaws.com/tradeeon-backend:latest" 2>&1 | ForEach-Object {
        if ($_ -match "error|failed") {
            Write-Host $_ -ForegroundColor Red
        } else {
            Write-Host $_ -ForegroundColor Gray
        }
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Docker push failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Image pushed" -ForegroundColor Green
    
    Write-Host "Updating ECS service..." -ForegroundColor Yellow
    aws ecs update-service --cluster tradeeon-cluster --service tradeeon-backend-service --force-new-deployment --region $region | Out-Null
    Write-Host "[OK] Service update triggered" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Backend deployment complete!" -ForegroundColor Green
}

# Deploy Alert Runner
if ($Service -eq "alert-runner" -or $Service -eq "both") {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  DEPLOYING ALERT RUNNER" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Building Docker image..." -ForegroundColor Yellow
    docker build -f Dockerfile.alert-runner -t tradeeon-alert-runner:latest . 2>&1 | ForEach-Object {
        if ($_ -match "ERROR|error|failed") {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match "Step|Layer|Cached") {
            Write-Host $_ -ForegroundColor Gray
        }
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Docker build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Image built" -ForegroundColor Green
    
    Write-Host "Tagging image..." -ForegroundColor Yellow
    docker tag tradeeon-alert-runner:latest "$accountId.dkr.ecr.$region.amazonaws.com/tradeeon-alert-runner:latest"
    Write-Host "[OK] Image tagged" -ForegroundColor Green
    
    Write-Host "Pushing to ECR (this may take 5-10 minutes)..." -ForegroundColor Yellow
    docker push "$accountId.dkr.ecr.$region.amazonaws.com/tradeeon-alert-runner:latest" 2>&1 | ForEach-Object {
        if ($_ -match "error|failed") {
            Write-Host $_ -ForegroundColor Red
        } else {
            Write-Host $_ -ForegroundColor Gray
        }
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Docker push failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Image pushed" -ForegroundColor Green
    
    Write-Host "Updating ECS service..." -ForegroundColor Yellow
    aws ecs update-service --cluster tradeeon-cluster --service tradeeon-alert-runner-service --force-new-deployment --region $region | Out-Null
    Write-Host "[OK] Service update triggered" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Alert Runner deployment complete!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ALL DEPLOYMENTS COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Monitor deployments:" -ForegroundColor Yellow
Write-Host "  aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service tradeeon-alert-runner-service --region $region" -ForegroundColor White
Write-Host ""



# Fully Automated Backend Deployment
# This script does everything automatically!

Write-Host "🚀 Starting Fully Automated Backend Deployment..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Create S3 bucket for source code (if needed)
Write-Host "📦 Step 1: Preparing source code..." -ForegroundColor Yellow
$sourceBucket = "tradeeon-build-source"
$bucketExists = aws s3 ls "s3://$sourceBucket" 2>$null

if (-not $bucketExists) {
    Write-Host "   Creating S3 bucket for source code..." -ForegroundColor Gray
    aws s3 mb "s3://$sourceBucket" --region us-east-1 | Out-Null
}

# Step 2: Create IAM role for CodeBuild (if needed)
Write-Host "`n🔐 Step 2: Setting up IAM permissions..." -ForegroundColor Yellow
$roleName = "codebuild-tradeeon-backend-role"

try {
    $roleExists = aws iam get-role --role-name $roleName 2>$null
    if ($roleExists) {
        Write-Host "   IAM role already exists" -ForegroundColor Gray
    }
} catch {
    Write-Host "   Creating IAM role for CodeBuild..." -ForegroundColor Gray
    
    # Trust policy
    $trustPolicy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Effect = "Allow"
                Principal = @{
                    Service = "codebuild.amazonaws.com"
                }
                Action = "sts:AssumeRole"
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $trustPolicy | Out-File -FilePath "codebuild-trust-policy.json" -Encoding UTF8
    
    # Create role
    aws iam create-role --role-name $roleName --assume-role-policy-document file://codebuild-trust-policy.json | Out-Null
    
    # Attach policies
    aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess | Out-Null
    aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser | Out-Null
    aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess | Out-Null
    
    Write-Host "   ✅ IAM role created" -ForegroundColor Green
}

# Step 3: Package source code
Write-Host "`n📦 Step 3: Packaging source code..." -ForegroundColor Yellow
$zipFile = "tradeeon-source.zip"

# Create zip (exclude node_modules, .git, etc.)
Write-Host "   Creating zip file..." -ForegroundColor Gray
Compress-Archive -Path "apps", "backend", "shared", "infra", "requirements.txt", "Dockerfile", "buildspec.yml" -DestinationPath $zipFile -Force -ErrorAction SilentlyContinue

if (-not (Test-Path $zipFile)) {
    # Fallback: zip everything except large dirs
    $exclude = @("node_modules", ".git", "dist", "__pycache__", "*.pyc")
    Get-ChildItem -Exclude $exclude | Compress-Archive -DestinationPath $zipFile -Force
}

Write-Host "   ✅ Source packaged" -ForegroundColor Green

# Step 4: Upload to S3
Write-Host "`n📤 Step 4: Uploading source to S3..." -ForegroundColor Yellow
aws s3 cp $zipFile "s3://$sourceBucket/$zipFile" --region us-east-1 | Out-Null
Write-Host "   ✅ Source uploaded" -ForegroundColor Green

# Step 5: Create/Update CodeBuild project
Write-Host "`n🏗️ Step 5: Creating CodeBuild project..." -ForegroundColor Yellow

$codebuildConfig = @{
    name = "tradeeon-backend-build"
    description = "Build and push Tradeeon backend Docker image"
    source = @{
        type = "S3"
        location = "tradeeon-build-source/$zipFile"
    }
    artifacts = @{
        type = "NO_ARTIFACTS"
    }
    environment = @{
        type = "LINUX_CONTAINER"
        image = "aws/codebuild/standard:7.0"
        computeType = "BUILD_GENERAL1_SMALL"
        privilegedMode = $true
        environmentVariables = @(
            @{ name = "AWS_DEFAULT_REGION"; value = "us-east-1" }
            @{ name = "AWS_ACCOUNT_ID"; value = "531604848081" }
            @{ name = "IMAGE_REPO_NAME"; value = "tradeeon-backend" }
        )
    }
    serviceRole = "arn:aws:iam::531604848081:role/$roleName"
    timeoutInMinutes = 20
} | ConvertTo-Json -Depth 10

$codebuildConfig | Out-File -FilePath "codebuild-config.json" -Encoding UTF8

# Check if project exists
$projectExists = aws codebuild list-projects --query "projects[?contains(@, 'tradeeon-backend-build')]" --output text 2>$null

if ($projectExists) {
    Write-Host "   Updating existing CodeBuild project..." -ForegroundColor Gray
    aws codebuild update-project --cli-input-json file://codebuild-config.json --region us-east-1 | Out-Null
} else {
    Write-Host "   Creating new CodeBuild project..." -ForegroundColor Gray
    aws codebuild create-project --cli-input-json file://codebuild-config.json --region us-east-1 | Out-Null
}

Write-Host "   ✅ CodeBuild project ready" -ForegroundColor Green

# Step 6: Start build
Write-Host "`n🔨 Step 6: Starting Docker image build..." -ForegroundColor Yellow
Write-Host "   This will take 5-10 minutes..." -ForegroundColor Gray

$buildId = aws codebuild start-build --project-name tradeeon-backend-build --region us-east-1 --query "build.id" --output text

Write-Host "   Build ID: $buildId" -ForegroundColor Cyan
Write-Host "   Monitoring build progress..." -ForegroundColor Gray

# Monitor build
$maxWait = 600 # 10 minutes
$elapsed = 0
$interval = 10

while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds $interval
    $elapsed += $interval
    
    $buildStatus = aws codebuild batch-get-builds --ids $buildId --region us-east-1 --query "builds[0].buildStatus" --output text
    
    if ($buildStatus -eq "SUCCEEDED") {
        Write-Host "   ✅ Build completed successfully!" -ForegroundColor Green
        break
    } elseif ($buildStatus -eq "FAILED" -or $buildStatus -eq "FAULT" -or $buildStatus -eq "TIMED_OUT") {
        Write-Host "   ❌ Build failed with status: $buildStatus" -ForegroundColor Red
        Write-Host "   Check logs: aws codebuild batch-get-builds --ids $buildId --region us-east-1" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "   Build status: $buildStatus - $elapsed seconds elapsed" -ForegroundColor Gray
    }
}

if ($buildStatus -ne "SUCCEEDED") {
    Write-Host "   ⏱️ Build is taking longer than expected. Check status manually:" -ForegroundColor Yellow
    Write-Host "   aws codebuild batch-get-builds --ids $buildId --region us-east-1" -ForegroundColor Gray
    Write-Host "   Continuing with deployment anyway..." -ForegroundColor Yellow
}

# Step 7: Verify image exists
Write-Host "`n🔍 Step 7: Verifying Docker image..." -ForegroundColor Yellow
$imageExists = aws ecr describe-images --repository-name tradeeon-backend --region us-east-1 --query "imageDetails[0].imageTags[?contains(@, 'latest')]" --output text 2>$null

if ($imageExists) {
    Write-Host "   ✅ Docker image found in ECR" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Image not found. Build may still be in progress." -ForegroundColor Yellow
    Write-Host "   Waiting 30 seconds and checking again..." -ForegroundColor Gray
    Start-Sleep -Seconds 30
    $imageExists = aws ecr describe-images --repository-name tradeeon-backend --region us-east-1 --query "imageDetails[0].imageTags[?contains(@, 'latest')]" --output text 2>$null
    if (-not $imageExists) {
        Write-Host "   ❌ Image still not found. Please check build logs." -ForegroundColor Red
        exit 1
    }
}

# Step 8: Create ECS Service
Write-Host "`n🚀 Step 8: Creating ECS Service..." -ForegroundColor Yellow

# Check if service already exists
$serviceExists = aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service --region us-east-1 --query "services[0].serviceName" --output text 2>$null

if ($serviceExists -eq "tradeeon-backend-service") {
    Write-Host "   Service already exists. Updating..." -ForegroundColor Gray
    aws ecs update-service --cluster tradeeon-cluster --service tradeeon-backend-service --task-definition tradeeon-backend:2 --force-new-deployment --region us-east-1 | Out-Null
    Write-Host "   ✅ Service updated and restarting..." -ForegroundColor Green
} else {
    Write-Host "   Creating new service..." -ForegroundColor Gray
    aws ecs create-service `
        --cluster tradeeon-cluster `
        --service-name tradeeon-backend-service `
        --task-definition tradeeon-backend:2 `
        --desired-count 1 `
        --launch-type FARGATE `
        --network-configuration "awsvpcConfiguration={subnets=[subnet-09d44422a715d0b1e,subnet-0658ce2b1169c0360],securityGroups=[sg-0722b6ede48aab4ed],assignPublicIp=ENABLED}" `
        --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:531604848081:targetgroup/tradeeon-backend-tg/af73a38364aa1f96,containerName=tradeeon-backend,containerPort=8000" `
        --region us-east-1 | Out-Null
    Write-Host "   ✅ Service created!" -ForegroundColor Green
}

Write-Host ""
Write-Host "⏱️ Waiting for service to start (this takes 2-3 minutes)..." -ForegroundColor Yellow

$maxWait = 180
$elapsed = 0

while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds 15
    $elapsed += 15
    
    $service = aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service --region us-east-1 --query "services[0]" --output json | ConvertFrom-Json
    
    if ($service.runningCount -ge 1) {
        Write-Host "   ✅ Service is running! ($($service.runningCount) tasks running)" -ForegroundColor Green
        break
    } else {
        Write-Host "   Status: $($service.status) | Running: $($service.runningCount)/$($service.desiredCount) - $elapsed seconds" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🎉 Backend Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend URL: http://tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test the backend:" -ForegroundColor Yellow
Write-Host "  curl http://tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com/health" -ForegroundColor Gray
Write-Host ""
Write-Host "Next step: Run .\update-frontend-api.ps1 to connect frontend to backend" -ForegroundColor Yellow


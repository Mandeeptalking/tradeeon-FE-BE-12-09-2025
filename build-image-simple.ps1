# Simple Docker Image Build via CodeBuild
# This creates a working CodeBuild project and builds the image

Write-Host "Building Docker Image via AWS CodeBuild..." -ForegroundColor Cyan

# Step 1: Create S3 bucket
Write-Host ""
Write-Host "Step 1: Creating S3 bucket for source..." -ForegroundColor Yellow
$bucket = "tradeeon-build-source"
aws s3 mb "s3://$bucket" --region us-east-1 2>$null | Out-Null

# Step 2: Package source
Write-Host ""
Write-Host "Step 2: Packaging source code..." -ForegroundColor Yellow
$zipFile = "tradeeon-source-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"

# Get items to include
$items = @()
if (Test-Path "apps") { $items += "apps" }
if (Test-Path "backend") { $items += "backend" }
if (Test-Path "shared") { $items += "shared" }
if (Test-Path "infra") { $items += "infra" }
if (Test-Path "requirements.txt") { $items += "requirements.txt" }
if (Test-Path "Dockerfile") { $items += "Dockerfile" }
if (Test-Path "buildspec.yml") { $items += "buildspec.yml" }

Compress-Archive -Path $items -DestinationPath $zipFile -Force
Write-Host "[OK] Created: $zipFile" -ForegroundColor Green

# Step 3: Upload to S3
Write-Host ""
Write-Host "Step 3: Uploading to S3..." -ForegroundColor Yellow
aws s3 cp $zipFile "s3://$bucket/$zipFile" --region us-east-1
Write-Host "[OK] Uploaded" -ForegroundColor Green

# Step 4: Create IAM role (if needed)
Write-Host ""
Write-Host "Step 4: Setting up IAM role..." -ForegroundColor Yellow
$roleName = "codebuild-tradeeon-backend-role"

try {
    aws iam get-role --role-name $roleName 2>$null | Out-Null
    Write-Host "[OK] Role exists" -ForegroundColor Green
} catch {
    Write-Host "Creating IAM role..." -ForegroundColor Gray
    
    # Create trust policy
    $trustPolicy = '{
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "codebuild.amazonaws.com"},
            "Action": "sts:AssumeRole"
        }]
    }'
    $trustPolicy | Out-File -FilePath "trust-policy.json" -Encoding UTF8 -NoNewline
    
    aws iam create-role --role-name $roleName --assume-role-policy-document file://trust-policy.json | Out-Null
    aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess | Out-Null
    aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser | Out-Null
    aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess | Out-Null
    
    Write-Host "[OK] Role created" -ForegroundColor Green
}

# Wait a moment for IAM propagation
Start-Sleep -Seconds 5

# Step 5: Create CodeBuild project
Write-Host ""
Write-Host "Step 5: Creating CodeBuild project..." -ForegroundColor Yellow

$projectConfig = @"
{
  "name": "tradeeon-backend-build",
  "description": "Build Tradeeon backend Docker image",
  "source": {
    "type": "S3",
    "location": "$bucket/$zipFile"
  },
  "artifacts": {
    "type": "NO_ARTIFACTS"
  },
  "environment": {
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/standard:7.0",
    "computeType": "BUILD_GENERAL1_SMALL",
    "privilegedMode": true,
    "environmentVariables": [
      {"name": "AWS_DEFAULT_REGION", "value": "us-east-1"},
      {"name": "AWS_ACCOUNT_ID", "value": "531604848081"},
      {"name": "IMAGE_REPO_NAME", "value": "tradeeon-backend"}
    ]
  },
  "serviceRole": "arn:aws:iam::531604848081:role/$roleName",
  "timeoutInMinutes": 20
}
"@

$projectConfig | Out-File -FilePath "codebuild-project.json" -Encoding UTF8 -NoNewline

# Check if project exists
$existing = aws codebuild list-projects --query "projects" --output json | ConvertFrom-Json

if ($existing -contains "tradeeon-backend-build") {
    Write-Host "Updating existing project..." -ForegroundColor Gray
    aws codebuild update-project --cli-input-json file://codebuild-project.json --region us-east-1 | Out-Null
} else {
    Write-Host "Creating new project..." -ForegroundColor Gray
    aws codebuild create-project --cli-input-json file://codebuild-project.json --region us-east-1 | Out-Null
}

Write-Host "[OK] Project ready" -ForegroundColor Green

# Step 6: Start build
Write-Host ""
Write-Host "Step 6: Starting build (this takes 5-10 minutes)..." -ForegroundColor Yellow
$buildId = aws codebuild start-build --project-name tradeeon-backend-build --region us-east-1 --query "build.id" --output text

Write-Host "Build ID: $buildId" -ForegroundColor Cyan
Write-Host "`nMonitoring build... (Press Ctrl+C to stop monitoring, build will continue)" -ForegroundColor Gray

# Monitor build
$maxWait = 600
$elapsed = 0

while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds 10
    $elapsed += 10
    
    $build = aws codebuild batch-get-builds --ids $buildId --region us-east-1 --query "builds[0]" --output json | ConvertFrom-Json
    $status = $build.buildStatus
    
    Write-Host "[$($elapsed)s] Status: $status" -ForegroundColor $(if ($status -eq "SUCCEEDED") { "Green" } elseif ($status -match "FAIL|FAULT") { "Red" } else { "Yellow" })
    
    if ($status -eq "SUCCEEDED") {
        Write-Host ""
        Write-Host "[OK] Build completed successfully!" -ForegroundColor Green
        break
    } elseif ($status -match "FAIL|FAULT|TIMED_OUT") {
        Write-Host ""
        Write-Host "[FAIL] Build failed!" -ForegroundColor Red
        Write-Host "Check logs: https://console.aws.amazon.com/codesuite/codebuild/projects/tradeeon-backend-build/build/$buildId" -ForegroundColor Yellow
        exit 1
    }
}

if ($status -ne "SUCCEEDED") {
    Write-Host ""
    Write-Host "Build still in progress. Check status:" -ForegroundColor Yellow
    Write-Host "aws codebuild batch-get-builds --ids $buildId --region us-east-1" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done! Image should be in ECR now." -ForegroundColor Green
Write-Host "Verify: aws ecr describe-images --repository-name tradeeon-backend --region us-east-1" -ForegroundColor Cyan


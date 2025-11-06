# Monitor Backend Deployment Status
# Checks build status, image availability, and ECS service

Write-Host "Monitoring Backend Deployment..." -ForegroundColor Cyan
Write-Host ""

$buildComplete = $false
$imageExists = $false
$serviceRunning = $false

# Step 1: Check CodeBuild status
Write-Host "Step 1: Checking Docker image build status..." -ForegroundColor Yellow

$buildId = aws codebuild list-builds-for-project --project-name tradeeon-backend-build --region us-east-1 --max-items 1 --query "ids[0]" --output text 2>$null

if ($buildId) {
    $buildStatus = aws codebuild batch-get-builds --ids $buildId --region us-east-1 --query "builds[0].buildStatus" --output text 2>$null
    
    if ($buildStatus -eq "SUCCEEDED") {
        Write-Host "   [OK] Build completed successfully!" -ForegroundColor Green
        $buildComplete = $true
    } elseif ($buildStatus -match "FAIL|FAULT|TIMED_OUT") {
        Write-Host "   [FAIL] Build failed: $buildStatus" -ForegroundColor Red
        Write-Host "   Check logs: https://console.aws.amazon.com/codesuite/codebuild/projects/tradeeon-backend-build/build/$buildId" -ForegroundColor Yellow
    } elseif ($buildStatus -eq "IN_PROGRESS") {
        Write-Host "   [IN PROGRESS] Build in progress: $buildStatus" -ForegroundColor Yellow
        Write-Host "   Build ID: $buildId" -ForegroundColor Gray
    } else {
        Write-Host "   Status: $buildStatus" -ForegroundColor Gray
    }
} else {
    Write-Host "   [WARNING] No build found. Run build-image-simple.ps1 first." -ForegroundColor Yellow
}

# Step 2: Check if image exists in ECR
Write-Host "`nStep 2: Checking Docker image in ECR..." -ForegroundColor Yellow

$images = aws ecr describe-images --repository-name tradeeon-backend --region us-east-1 --query "imageDetails[?contains(imageTags, 'latest')]" --output json 2>$null | ConvertFrom-Json

if ($images -and $images.Count -gt 0) {
    Write-Host "   [OK] Docker image found in ECR!" -ForegroundColor Green
    $imagePushed = $images[0].imagePushedAt
    Write-Host "   Pushed at: $imagePushed" -ForegroundColor Gray
    $imageExists = $true
} else {
    Write-Host "   [WAIT] Image not found yet. Build may still be in progress." -ForegroundColor Yellow
}

# Step 3: Check ECS service status
Write-Host "`nStep 3: Checking ECS service status..." -ForegroundColor Yellow

try {
    $service = aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service --region us-east-1 --query "services[0]" --output json 2>$null | ConvertFrom-Json
    
    if ($service) {
        Write-Host "   Service Status: $($service.status)" -ForegroundColor $(if ($service.status -eq "ACTIVE") { "Green" } else { "Yellow" })
        Write-Host "   Running Tasks: $($service.runningCount)/$($service.desiredCount)" -ForegroundColor $(if ($service.runningCount -ge 1) { "Green" } else { "Yellow" })
        
        if ($service.runningCount -ge 1) {
            $serviceRunning = $true
            Write-Host "   [OK] Service is running!" -ForegroundColor Green
        } else {
            Write-Host "   [WAIT] Service is starting..." -ForegroundColor Yellow
            
            # Check recent events
            if ($service.events.Count -gt 0) {
                Write-Host "`n   Recent events:" -ForegroundColor Gray
                $service.events[0..2] | ForEach-Object {
                    Write-Host "   - $($_.message)" -ForegroundColor Gray
                }
            }
        }
    } else {
        Write-Host "   [WARNING] Service not found. Run deploy-backend-service.ps1 first." -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [WARNING] Could not check service status" -ForegroundColor Yellow
}

# Step 4: Test backend endpoint
Write-Host "`nStep 4: Testing backend endpoint..." -ForegroundColor Yellow

$backendUrl = "http://tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com/health"

try {
    $response = Invoke-WebRequest -Uri $backendUrl -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   [OK] Backend is responding!" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   [WAIT] Backend not responding yet (this is normal if service just started)" -ForegroundColor Yellow
    Write-Host "   URL: $backendUrl" -ForegroundColor Gray
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Write-Host "Build Status:     " -NoNewline -ForegroundColor Gray
Write-Host $(if ($buildComplete) { "[OK] Complete" } else { "[WAIT] In Progress" }) -ForegroundColor $(if ($buildComplete) { "Green" } else { "Yellow" })

Write-Host "Docker Image:      " -NoNewline -ForegroundColor Gray
Write-Host $(if ($imageExists) { "[OK] Available" } else { "[WAIT] Not Found" }) -ForegroundColor $(if ($imageExists) { "Green" } else { "Yellow" })

Write-Host "ECS Service:       " -NoNewline -ForegroundColor Gray
Write-Host $(if ($serviceRunning) { "[OK] Running" } else { "[WAIT] Starting" }) -ForegroundColor $(if ($serviceRunning) { "Green" } else { "Yellow" })

Write-Host "`nBackend URL: $backendUrl" -ForegroundColor Cyan

if ($buildComplete -and $imageExists -and $serviceRunning) {
    Write-Host "`n[SUCCESS] Backend is fully deployed and running!" -ForegroundColor Green
    Write-Host "`nNext step: Run .\update-frontend-api.ps1 to connect frontend" -ForegroundColor Yellow
} else {
    Write-Host "`n[WAIT] Deployment in progress. Run this script again in a few minutes." -ForegroundColor Yellow
}

Write-Host "`nTo check again, run: .\monitor-backend-deployment.ps1" -ForegroundColor Gray


# Deploy Frontend with Auth Routing Fix
# This script rebuilds and redeploys the frontend with the authentication fix

$bucketName = "tradeeon-frontend"
$cfId = "EMF4IMNT9637C"
$region = "us-east-1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY FRONTEND - AUTH FIX" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build frontend
Write-Host "Step 1: Building frontend..." -ForegroundColor Yellow
Set-Location apps/frontend

try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Build successful!" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Build error: $_" -ForegroundColor Red
    exit 1
}

Set-Location ../..

# Step 2: Deploy to S3
Write-Host ""
Write-Host "Step 2: Deploying to S3..." -ForegroundColor Yellow
try {
    aws s3 sync apps/frontend/dist/ "s3://$bucketName/" --delete --region $region
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] S3 deployment failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] S3 deployment successful!" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] S3 deployment error: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Invalidate CloudFront cache
Write-Host ""
Write-Host "Step 3: Invalidating CloudFront cache..." -ForegroundColor Yellow
try {
    $invalidation = aws cloudfront create-invalidation `
        --distribution-id $cfId `
        --paths "/*" `
        --region $region `
        --output json | ConvertFrom-Json
    
    Write-Host "[OK] Cache invalidation created!" -ForegroundColor Green
    Write-Host "  Invalidation ID: $($invalidation.Invalidation.Id)" -ForegroundColor White
    Write-Host "  Status: $($invalidation.Invalidation.Status)" -ForegroundColor White
} catch {
    Write-Host "[WARNING] Cache invalidation failed: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Frontend built and deployed" -ForegroundColor Green
Write-Host "  CloudFront cache invalidated" -ForegroundColor Green
Write-Host ""
Write-Host "The fix includes:" -ForegroundColor Yellow
Write-Host "  - Auth initialization before route check" -ForegroundColor White
Write-Host "  - Loading spinner during auth check" -ForegroundColor White
Write-Host "  - Route preservation on refresh" -ForegroundColor White
Write-Host ""
Write-Host "Wait 5-10 minutes for CloudFront to propagate, then test:" -ForegroundColor Cyan
Write-Host "  https://www.tradeeon.com/app/dca-bot" -ForegroundColor White
Write-Host "  Refresh the page - should stay on the same page!" -ForegroundColor Green
Write-Host ""


# Complete SPA Routing Fix
# This script fixes all potential SPA routing issues

$region = "us-east-1"
$bucketName = "tradeeon-frontend"
$cfId = "EMF4IMNT9637C"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMPLETE SPA ROUTING FIX" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify index.html exists
Write-Host "Step 1: Checking index.html in S3..." -ForegroundColor Yellow
$indexExists = aws s3 ls "s3://$bucketName/index.html" --region $region 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] index.html exists in S3" -ForegroundColor Green
} else {
    Write-Host "[ERROR] index.html not found in S3 root!" -ForegroundColor Red
    Write-Host "   You need to rebuild and redeploy the frontend" -ForegroundColor Yellow
    exit 1
}

# Step 2: Get current CloudFront config
Write-Host ""
Write-Host "Step 2: Getting CloudFront configuration..." -ForegroundColor Yellow
$configFile = "cloudfront-config-update.json"
aws cloudfront get-distribution-config --id $cfId --region $region --query "DistributionConfig" --output json > $configFile

if (-not (Test-Path $configFile)) {
    Write-Host "[ERROR] Failed to get CloudFront config" -ForegroundColor Red
    exit 1
}

$config = Get-Content $configFile -Raw | ConvertFrom-Json

# Step 3: Check and add custom error responses
Write-Host ""
Write-Host "Step 3: Configuring custom error responses..." -ForegroundColor Yellow

# Ensure CustomErrorResponses exists
if (-not $config.CustomErrorResponses) {
    $config.CustomErrorResponses = @{
        Quantity = 0
        Items = @()
    }
}

# Check what's already configured
$existing403 = $config.CustomErrorResponses.Items | Where-Object { $_.ErrorCode -eq 403 }
$existing404 = $config.CustomErrorResponses.Items | Where-Object { $_.ErrorCode -eq 404 }

$items = @()

# Add 404 if not exists
if (-not $existing404) {
    Write-Host "  Adding 404 error response..." -ForegroundColor White
    $items += @{
        ErrorCode = 404
        ResponsePagePath = "/index.html"
        ResponseCode = "200"
        ErrorCachingMinTTL = 300
    }
} else {
    Write-Host "  [OK] 404 already configured" -ForegroundColor Green
    $items += $existing404
}

# Add 403 if not exists
if (-not $existing403) {
    Write-Host "  Adding 403 error response..." -ForegroundColor White
    $items += @{
        ErrorCode = 403
        ResponsePagePath = "/index.html"
        ResponseCode = "200"
        ErrorCachingMinTTL = 300
    }
} else {
    Write-Host "  [OK] 403 already configured" -ForegroundColor Green
    $items += $existing403
}

# Update config
$config.CustomErrorResponses.Quantity = $items.Count
$config.CustomErrorResponses.Items = $items

# Step 4: Ensure DefaultRootObject is set
if (-not $config.DefaultRootObject) {
    Write-Host ""
    Write-Host "  Setting DefaultRootObject to index.html..." -ForegroundColor White
    $config.DefaultRootObject = "index.html"
}

# Step 5: Save updated config
Write-Host ""
Write-Host "Step 4: Saving updated configuration..." -ForegroundColor Yellow
$config | ConvertTo-Json -Depth 10 | Out-File $configFile -Encoding utf8 -NoNewline

# Step 6: Get ETag and update
Write-Host ""
Write-Host "Step 5: Getting ETag..." -ForegroundColor Yellow
$etag = aws cloudfront get-distribution-config --id $cfId --region $region --query "ETag" --output text

Write-Host ""
Write-Host "Step 6: Updating CloudFront distribution..." -ForegroundColor Yellow
Write-Host "  This may take a moment..." -ForegroundColor Gray

try {
    $result = aws cloudfront update-distribution `
        --id $cfId `
        --if-match $etag `
        --distribution-config file://$configFile `
        --region $region `
        --output json | ConvertFrom-Json
    
    if ($result) {
        Write-Host "[OK] CloudFront distribution update initiated!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Distribution Status:" -ForegroundColor Cyan
        Write-Host "  Status: $($result.Distribution.Status)" -ForegroundColor White
        Write-Host "  Last Modified: $($result.Distribution.LastModifiedTime)" -ForegroundColor White
    }
} catch {
    Write-Host "[ERROR] Failed to update CloudFront" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to update manually via AWS Console:" -ForegroundColor Yellow
    Write-Host "  https://console.aws.amazon.com/cloudfront/v3/home#/distributions/$cfId/error-pages" -ForegroundColor White
    exit 1
}

# Step 7: Create CloudFront invalidation
Write-Host ""
Write-Host "Step 7: Creating CloudFront cache invalidation..." -ForegroundColor Yellow
try {
    $invalidation = aws cloudfront create-invalidation `
        --distribution-id $cfId `
        --paths "/*" `
        --region $region `
        --output json | ConvertFrom-Json
    
    Write-Host "[OK] Cache invalidation created" -ForegroundColor Green
    Write-Host "  Invalidation ID: $($invalidation.Invalidation.Id)" -ForegroundColor White
    Write-Host "  Status: $($invalidation.Invalidation.Status)" -ForegroundColor White
} catch {
    Write-Host "[WARNING] Cache invalidation failed (may need manual invalidation)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  FIX APPLIED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Custom error responses configured (403 and 404)" -ForegroundColor Green
Write-Host "  DefaultRootObject set to index.html" -ForegroundColor Green
Write-Host "  Cache invalidation created" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Wait 15-20 minutes for CloudFront to deploy" -ForegroundColor White
Write-Host "  2. Clear your browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "  3. Test routes:" -ForegroundColor White
Write-Host "     - https://www.tradeeon.com/app" -ForegroundColor Gray
Write-Host "     - https://www.tradeeon.com/app/bots" -ForegroundColor Gray
Write-Host "     - Refresh should work now!" -ForegroundColor Green
Write-Host ""
Write-Host "Monitor deployment:" -ForegroundColor Cyan
Write-Host "  aws cloudfront get-distribution --id $cfId --region $region --query 'Distribution.Status' --output text" -ForegroundColor White
Write-Host ""


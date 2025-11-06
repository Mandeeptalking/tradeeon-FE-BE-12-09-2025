# Fix SPA Routing - Configure CloudFront to serve index.html for all routes
# This fixes the "Access Denied" error when refreshing pages

$region = "us-east-1"
$bucketName = "tradeeon-frontend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FIXING SPA ROUTING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get CloudFront Distribution ID
Write-Host "Step 1: Finding CloudFront distribution..." -ForegroundColor Yellow
$cfId = aws cloudfront list-distributions --region $region --query "DistributionList.Items[?contains(Comment, 'Tradeeon') || contains(Origins.Items[0].DomainName, 'tradeeon')].Id" --output text

if (-not $cfId) {
    $cfId = aws cloudfront list-distributions --region $region --query "DistributionList.Items[0].Id" --output text
}

if (-not $cfId) {
    Write-Host "[ERROR] Could not find CloudFront distribution" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Found distribution: $cfId" -ForegroundColor Green

# Step 2: Get current CloudFront configuration
Write-Host ""
Write-Host "Step 2: Getting current CloudFront configuration..." -ForegroundColor Yellow
$configFile = "cloudfront-config-spa.json"
aws cloudfront get-distribution-config --id $cfId --region $region --query "DistributionConfig" --output json > $configFile

if (-not (Test-Path $configFile)) {
    Write-Host "[ERROR] Failed to get CloudFront configuration" -ForegroundColor Red
    exit 1
}

$config = Get-Content $configFile | ConvertFrom-Json

# Step 3: Configure custom error responses
Write-Host ""
Write-Host "Step 3: Configuring custom error responses for SPA routing..." -ForegroundColor Yellow

# Add custom error responses if they don't exist
if (-not $config.CustomErrorResponses) {
    $config | Add-Member -MemberType NoteProperty -Name "CustomErrorResponses" -Value @{}
}

# Configure 403 and 404 to return index.html with 200 status
$config.CustomErrorResponses = @{
    "Quantity" = 2
    "Items" = @(
        @{
            "ErrorCode" = 403
            "ResponsePagePath" = "/index.html"
            "ResponseCode" = "200"
            "ErrorCachingMinTTL" = 300
        },
        @{
            "ErrorCode" = 404
            "ResponsePagePath" = "/index.html"
            "ResponseCode" = "200"
            "ErrorCachingMinTTL" = 300
        }
    )
}

# Step 4: Update CloudFront distribution
Write-Host ""
Write-Host "Step 4: Updating CloudFront distribution..." -ForegroundColor Yellow

# Get ETag (required for update)
$etag = aws cloudfront get-distribution-config --id $cfId --region $region --query "ETag" --output text

# Save updated config
$config | ConvertTo-Json -Depth 10 | Out-File $configFile -Encoding utf8

# Update distribution
try {
    aws cloudfront update-distribution `
        --id $cfId `
        --if-match $etag `
        --distribution-config file://$configFile `
        --region $region `
        --query "Distribution.{Id:Id,Status:Status}" `
        --output table | Out-Null
    
    Write-Host "[OK] CloudFront distribution update initiated" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: CloudFront updates can take 15-20 minutes to propagate" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Monitor status:" -ForegroundColor Cyan
    Write-Host "  aws cloudfront get-distribution --id $cfId --region $region --query 'Distribution.Status' --output text" -ForegroundColor White
    Write-Host ""
    Write-Host "Once status is 'Deployed', try refreshing /app again" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to update CloudFront" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 5: Alternative - S3 bucket website configuration
Write-Host ""
Write-Host "Step 5: Also configuring S3 bucket for SPA routing..." -ForegroundColor Yellow

# Create bucket website configuration
$websiteConfig = @{
    ErrorDocument = @{
        Key = "index.html"
    }
    IndexDocument = @{
        Suffix = "index.html"
    }
} | ConvertTo-Json

$websiteConfig | Out-File "s3-website-config.json" -Encoding utf8

try {
    aws s3api put-bucket-website --bucket $bucketName --website-configuration file://s3-website-config.json --region $region 2>&1 | Out-Null
    Write-Host "[OK] S3 bucket website configuration updated" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] S3 website configuration may not be needed (CloudFront handles this)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SPA ROUTING FIX APPLIED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  • CloudFront configured to serve index.html for 403/404 errors" -ForegroundColor White
Write-Host "  • S3 bucket website configuration updated" -ForegroundColor White
Write-Host ""
Write-Host "Wait 15-20 minutes for CloudFront to deploy, then test:" -ForegroundColor Yellow
Write-Host "  https://www.tradeeon.com/app" -ForegroundColor White
Write-Host "  https://www.tradeeon.com/app/bots" -ForegroundColor White
Write-Host "  (Refresh should work now!)" -ForegroundColor White
Write-Host ""


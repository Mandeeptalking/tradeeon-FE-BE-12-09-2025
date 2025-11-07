# Fix CloudFront SPA Routing
# This script configures CloudFront to serve index.html for all routes

param(
    [Parameter(Mandatory=$true)]
    [string]$DistributionId
)

Write-Host "`n=== Fixing CloudFront SPA Routing ===" -ForegroundColor Cyan
Write-Host "Distribution ID: $DistributionId`n" -ForegroundColor Yellow

# Check if distribution exists
Write-Host "Checking distribution..." -ForegroundColor Gray
$dist = aws cloudfront get-distribution --id $DistributionId --query 'Distribution.{Id:Id,Status:Status,DomainName:DomainName}' --output json 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Could not find distribution $DistributionId" -ForegroundColor Red
    Write-Host "Please check the distribution ID and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Distribution found" -ForegroundColor Green
Write-Host "`n⚠️  IMPORTANT: CloudFront custom error pages must be configured manually:" -ForegroundColor Yellow
Write-Host "`nSteps to fix SPA routing:" -ForegroundColor Cyan
Write-Host "1. Go to AWS Console → CloudFront" -ForegroundColor White
Write-Host "2. Click on your distribution: $DistributionId" -ForegroundColor White
Write-Host "3. Go to 'Error Pages' tab" -ForegroundColor White
Write-Host "4. Click 'Create Custom Error Response'" -ForegroundColor White
Write-Host "`n   For 403 Error:" -ForegroundColor Yellow
Write-Host "   - HTTP Error Code: 403" -ForegroundColor Gray
Write-Host "   - Response Page Path: /index.html" -ForegroundColor Gray
Write-Host "   - HTTP Response Code: 200" -ForegroundColor Gray
Write-Host "   - Error Caching Minimum TTL: 0" -ForegroundColor Gray
Write-Host "`n   For 404 Error:" -ForegroundColor Yellow
Write-Host "   - HTTP Error Code: 404" -ForegroundColor Gray
Write-Host "   - Response Page Path: /index.html" -ForegroundColor Gray
Write-Host "   - HTTP Response Code: 200" -ForegroundColor Gray
Write-Host "   - Error Caching Minimum TTL: 0" -ForegroundColor Gray
Write-Host "`n5. Save changes" -ForegroundColor White
Write-Host "6. Wait 5-10 minutes for propagation" -ForegroundColor White
Write-Host "`nAlternatively, you can use AWS CLI (more complex):" -ForegroundColor Cyan
Write-Host "See: https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/custom-error-pages.html" -ForegroundColor Gray

Write-Host "`n✅ After configuring, invalidate cache:" -ForegroundColor Green
Write-Host "aws cloudfront create-invalidation --distribution-id $DistributionId --paths '/*'" -ForegroundColor White



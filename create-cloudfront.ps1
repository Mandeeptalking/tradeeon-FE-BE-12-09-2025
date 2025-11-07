# Create CloudFront distribution
# This reads JSON and passes it directly to AWS CLI

Write-Host "Creating CloudFront distribution...`n" -ForegroundColor Yellow

$absPath = (Resolve-Path cloudfront-simple.json).Path
Write-Host "Using config: $absPath`n" -ForegroundColor Cyan

# Get the JSON content
$jsonContent = Get-Content $absPath -Raw

# Create distribution using pipe
$jsonContent | aws cloudfront create-distribution --distribution-config - --output json

Write-Host "`nDone! Check the output above for Distribution ID." -ForegroundColor Green




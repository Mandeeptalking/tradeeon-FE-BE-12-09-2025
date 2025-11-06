# Update Frontend to Point to Backend API
# Run this AFTER backend is running and accessible

Write-Host "Updating frontend API URL..." -ForegroundColor Cyan

$backendUrl = "http://tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com"

# Create/update frontend .env file
$envFile = "apps/frontend/.env"
$envContent = @"
VITE_API_URL=$backendUrl
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTQzMDUsImV4cCI6MjA3Mjk5MDMwNX0.LF1iumCNB4EPJxAJSeTx04V0Tp7SlL7HBfsJVb3RmLU
"@

Set-Content -Path $envFile -Value $envContent
Write-Host "[OK] Created $envFile" -ForegroundColor Green

# Rebuild frontend
Write-Host "`nBuilding frontend..." -ForegroundColor Cyan
Set-Location apps/frontend
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Frontend built successfully!" -ForegroundColor Green
    
    # Deploy to S3
    Write-Host "`nDeploying to S3..." -ForegroundColor Cyan
    Set-Location ../..
    aws s3 sync apps/frontend/dist/ s3://tradeeon-frontend/ --delete
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Deployed to S3!" -ForegroundColor Green
        
        # Invalidate CloudFront cache
        Write-Host "`nInvalidating CloudFront cache..." -ForegroundColor Cyan
        aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*" | Out-Null
        
        Write-Host "[OK] Cache invalidation started!" -ForegroundColor Green
        Write-Host "`n[SUCCESS] Frontend updated! Changes will be live in 1-2 minutes." -ForegroundColor Green
        Write-Host "Visit: https://www.tradeeon.com" -ForegroundColor Cyan
    } else {
        Write-Host "[FAIL] Failed to deploy to S3" -ForegroundColor Red
    }
} else {
    Write-Host "[FAIL] Frontend build failed" -ForegroundColor Red
    Set-Location ../..
}


# Quick Deploy Script - Run this to manually deploy frontend
# Prerequisites: AWS CLI configured, Node.js installed

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Quick Frontend Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Install from: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

# Check AWS CLI
try {
    $awsVersion = aws --version
    Write-Host "✅ AWS CLI: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Install from: https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 1: Navigate to frontend
Write-Host "Step 1: Navigating to frontend directory..." -ForegroundColor Yellow
Set-Location apps/frontend

if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found. Are you in the right directory?" -ForegroundColor Red
    exit 1
}

Write-Host "✅ In frontend directory" -ForegroundColor Green
Write-Host ""

# Step 2: Install dependencies
Write-Host "Step 2: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 3: Build
Write-Host "Step 3: Building frontend..." -ForegroundColor Yellow
Write-Host "Note: This may take a few minutes..." -ForegroundColor Gray

# Check for environment variables
$env:VITE_API_URL = if ($env:VITE_API_URL) { $env:VITE_API_URL } else { "https://api.tradeeon.com" }
$env:VITE_SUPABASE_URL = if ($env:VITE_SUPABASE_URL) { $env:VITE_SUPABASE_URL } else { "" }
$env:VITE_SUPABASE_ANON_KEY = if ($env:VITE_SUPABASE_ANON_KEY) { $env:VITE_SUPABASE_ANON_KEY } else { "" }

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "dist/index.html")) {
    Write-Host "❌ Build output missing (dist/index.html not found)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy to S3
Write-Host "Step 4: Deploying to S3..." -ForegroundColor Yellow
Write-Host "Bucket: tradeeon-frontend" -ForegroundColor Gray
Write-Host "Region: ap-southeast-1" -ForegroundColor Gray

aws s3 sync dist/ s3://tradeeon-frontend/ --delete --region ap-southeast-1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ S3 sync failed" -ForegroundColor Red
    Write-Host "Check AWS credentials: aws configure" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Files uploaded to S3" -ForegroundColor Green
Write-Host ""

# Step 5: Invalidate CloudFront
Write-Host "Step 5: Invalidating CloudFront cache..." -ForegroundColor Yellow
Write-Host "Distribution ID: EMF4IMNT9637C" -ForegroundColor Gray

aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ CloudFront invalidation failed (but S3 upload succeeded)" -ForegroundColor Yellow
    Write-Host "You can invalidate manually later" -ForegroundColor Gray
} else {
    Write-Host "✅ CloudFront cache invalidated" -ForegroundColor Green
}

Write-Host ""

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Wait 2-5 minutes for CloudFront to update" -ForegroundColor Gray
Write-Host "2. Test website: https://www.tradeeon.com" -ForegroundColor Gray
Write-Host "3. If DNS error persists, check Route53 records" -ForegroundColor Gray
Write-Host ""
Write-Host "To verify deployment:" -ForegroundColor Yellow
Write-Host "  aws s3 ls s3://tradeeon-frontend/ --region ap-southeast-1" -ForegroundColor Gray
Write-Host ""


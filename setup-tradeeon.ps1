# Tradeeon Setup Script - Quick Start
# Run this script to set up everything

Write-Host "`n🚀 Tradeeon Setup Script`n" -ForegroundColor Cyan

# Configuration
$S3_BUCKET = "www-tradeeon-prod"
$CLOUDFRONT_DIST_ID = "E5ZVJZFGZMV8V"
$REGION = "us-east-1"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  S3 Bucket: $S3_BUCKET" -ForegroundColor White
Write-Host "  CloudFront ID: $CLOUDFRONT_DIST_ID" -ForegroundColor White
Write-Host "  Region: $REGION`n" -ForegroundColor White

# Step 1: Create S3 bucket
Write-Host "Step 1: Creating S3 bucket..." -ForegroundColor Yellow
aws s3 mb s3://$S3_BUCKET --region $REGION
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create bucket. It might already exist." -ForegroundColor Red
} else {
    Write-Host "✅ Bucket created successfully`n" -ForegroundColor Green
}

# Step 2: Enable website hosting
Write-Host "Step 2: Enabling website hosting..." -ForegroundColor Yellow
aws s3 website s3://$S3_BUCKET --index-document index.html --error-document index.html
Write-Host "✅ Website hosting enabled`n" -ForegroundColor Green

# Step 3: Configure bucket policy
Write-Host "Step 3: Configuring bucket policy..." -ForegroundColor Yellow
$BUCKET_POLICY = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Sid = "PublicReadGetObject"
            Effect = "Allow"
            Principal = "*"
            Action = "s3:GetObject"
            Resource = "arn:aws:s3:::$S3_BUCKET/*"
        }
    )
} | ConvertTo-Json -Depth 10

$BUCKET_POLICY | Out-File -FilePath "bucket-policy.json" -Encoding UTF8
aws s3api put-bucket-policy --bucket $S3_BUCKET --policy file://bucket-policy.json
Remove-Item "bucket-policy.json"
Write-Host "✅ Bucket policy configured`n" -ForegroundColor Green

# Step 4: Remove public access block
Write-Host "Step 4: Configuring public access..." -ForegroundColor Yellow
aws s3api put-public-access-block `
    --bucket $S3_BUCKET `
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
Write-Host "✅ Public access configured`n" -ForegroundColor Green

# Step 5: Build frontend
Write-Host "Step 5: Building frontend..." -ForegroundColor Yellow
Set-Location apps\frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing dependencies..." -ForegroundColor Gray
    npm install
}

Write-Host "  Building..." -ForegroundColor Gray
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}

Write-Host "✅ Frontend built successfully`n" -ForegroundColor Green
Set-Location ..\..

# Step 6: Upload to S3
Write-Host "Step 6: Uploading files to S3..." -ForegroundColor Yellow
aws s3 sync apps\frontend\dist s3://$S3_BUCKET `
    --delete `
    --cache-control "max-age=31536000,immutable" `
    --exclude "index.html"

aws s3 cp apps\frontend\dist\index.html s3://$S3_BUCKET\index.html `
    --cache-control "max-age=0,no-cache,no-store,must-revalidate"

Write-Host "✅ Files uploaded to S3`n" -ForegroundColor Green

# Step 7: Invalid CloudFront cache
Write-Host "Step 7: Invalidating CloudFront cache..." -ForegroundColor Yellow
aws cloudfront create-invalidation `
    --distribution-id $CLOUDFRONT_DIST_ID `
    --paths "/*"
Write-Host "✅ Cache invalidation started`n" -ForegroundColor Green

# Step 8: Check deployment
Write-Host "Step 8: Checking deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$bucketExists = aws s3 ls s3://$S3_BUCKET
if ($bucketExists) {
    Write-Host "✅ S3 bucket has files" -ForegroundColor Green
} else {
    Write-Host "❌ S3 bucket is empty!" -ForegroundColor Red
}

Write-Host "`n✅ Setup complete!`n" -ForegroundColor Green

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update CloudFront origin to point to: www-tradeeon-prod.s3.amazonaws.com" -ForegroundColor White
Write-Host "  2. Wait 15 minutes for CloudFront to deploy" -ForegroundColor White
Write-Host "  3. Test: https://www.tradeeon.com" -ForegroundColor White
Write-Host "  4. Deploy backend: .\deploy.ps1`n" -ForegroundColor White

Write-Host "Your CloudFront distribution: https://console.aws.amazon.com/cloudfront/v4/home" -ForegroundColor Cyan
Write-Host "Distribution ID: $CLOUDFRONT_DIST_ID`n" -ForegroundColor Cyan

Write-Host "🎉 You're almost live! 🚀`n" -ForegroundColor Green


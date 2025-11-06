# Setup GitHub Actions - One-Time Configuration
# This script helps you set up GitHub Actions for automatic deployments

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GITHUB ACTIONS SETUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will help you set up automatic deployments." -ForegroundColor Yellow
Write-Host ""

# Step 1: Create IAM User
Write-Host "Step 1: Creating IAM user for GitHub Actions..." -ForegroundColor Yellow
$userName = "github-actions-deployer"
$userExists = aws iam get-user --user-name $userName 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[INFO] User '$userName' already exists" -ForegroundColor Yellow
    $createNew = Read-Host "Do you want to create a new access key? (y/n)"
    if ($createNew -ne "y") {
        Write-Host "Skipping user creation..." -ForegroundColor Yellow
    } else {
        Write-Host "Creating new access key..." -ForegroundColor Yellow
        $accessKey = aws iam create-access-key --user-name $userName --output json | ConvertFrom-Json
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  SAVE THESE CREDENTIALS!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "AWS_ACCESS_KEY_ID: $($accessKey.AccessKey.AccessKeyId)" -ForegroundColor White
        Write-Host "AWS_SECRET_ACCESS_KEY: $($accessKey.AccessKey.SecretAccessKey)" -ForegroundColor White
        Write-Host ""
        Write-Host "Add these to GitHub Secrets!" -ForegroundColor Yellow
    }
} else {
    Write-Host "Creating IAM user..." -ForegroundColor Yellow
    aws iam create-user --user-name $userName | Out-Null
    
    Write-Host "Attaching policies..." -ForegroundColor Yellow
    aws iam attach-user-policy --user-name $userName --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess
    aws iam attach-user-policy --user-name $userName --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
    aws iam attach-user-policy --user-name $userName --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
    aws iam attach-user-policy --user-name $userName --policy-arn arn:aws:iam::aws:policy/CloudFrontFullAccess
    
    Write-Host "Creating access key..." -ForegroundColor Yellow
    $accessKey = aws iam create-access-key --user-name $userName --output json | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SAVE THESE CREDENTIALS!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "AWS_ACCESS_KEY_ID: $($accessKey.AccessKey.AccessKeyId)" -ForegroundColor White
    Write-Host "AWS_SECRET_ACCESS_KEY: $($accessKey.AccessKey.SecretAccessKey)" -ForegroundColor White
    Write-Host ""
}

# Step 2: Get CloudFront Distribution ID
Write-Host ""
Write-Host "Step 2: Getting CloudFront Distribution ID..." -ForegroundColor Yellow
$cfId = aws cloudfront list-distributions --region us-east-1 --query "DistributionList.Items[?Comment=='Tradeeon Frontend'].Id" --output text 2>$null

if ($cfId) {
    Write-Host "[OK] CloudFront Distribution ID: $cfId" -ForegroundColor Green
    Write-Host "Add this to GitHub Secrets as: CLOUDFRONT_DISTRIBUTION_ID" -ForegroundColor Yellow
} else {
    Write-Host "[WARNING] Could not find CloudFront distribution" -ForegroundColor Yellow
    Write-Host "You can find it manually in AWS Console" -ForegroundColor White
}

# Step 3: Instructions
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to GitHub: https://github.com/your-username/your-repo" -ForegroundColor White
Write-Host "2. Settings → Secrets and variables → Actions" -ForegroundColor White
Write-Host "3. Add these secrets:" -ForegroundColor Yellow
Write-Host "   • AWS_ACCESS_KEY_ID: (from above)" -ForegroundColor White
Write-Host "   • AWS_SECRET_ACCESS_KEY: (from above)" -ForegroundColor White
Write-Host "   • CLOUDFRONT_DISTRIBUTION_ID: $cfId" -ForegroundColor White
Write-Host ""
Write-Host "4. Commit and push the workflows:" -ForegroundColor Yellow
Write-Host "   git add .github/workflows/" -ForegroundColor Gray
Write-Host "   git commit -m 'Add CI/CD workflows'" -ForegroundColor Gray
Write-Host "   git push" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Make a test change and push - it will deploy automatically!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green



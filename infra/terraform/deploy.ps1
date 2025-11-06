# Tradeeon Backend - Terraform Deployment Script
# This script automates the deployment process

param(
    [switch]$SkipZoneId,
    [switch]$SkipPlan
)

Write-Host "`n=== TRADEEON BACKEND TERRAFORM DEPLOYMENT ===" -ForegroundColor Cyan
Write-Host "`nThis script will:" -ForegroundColor Yellow
Write-Host "  1. Get Route 53 Zone ID (if not skipped)" -ForegroundColor White
Write-Host "  2. Initialize Terraform" -ForegroundColor White
Write-Host "  3. Review plan (if not skipped)" -ForegroundColor White
Write-Host "  4. Apply configuration" -ForegroundColor White
Write-Host "  5. Show outputs" -ForegroundColor White

# Check if we're in the right directory
if (-not (Test-Path "main.tf")) {
    Write-Host "`n❌ Error: main.tf not found!" -ForegroundColor Red
    Write-Host "Please run this script from infra/terraform directory" -ForegroundColor Yellow
    exit 1
}

# Step 1: Get Route 53 Zone ID
if (-not $SkipZoneId) {
    Write-Host "`n[1/5] Getting Route 53 Zone ID..." -ForegroundColor Cyan
    if (Test-Path "get-route53-zone-id.ps1") {
        & .\get-route53-zone-id.ps1
    } else {
        Write-Host "⚠️  Script not found. Please get Zone ID manually." -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[1/5] Skipping Route 53 Zone ID fetch" -ForegroundColor Gray
}

# Verify terraform.tfvars exists
if (-not (Test-Path "terraform.tfvars")) {
    Write-Host "`n❌ Error: terraform.tfvars not found!" -ForegroundColor Red
    Write-Host "Please create terraform.tfvars first" -ForegroundColor Yellow
    exit 1
}

# Check if Route 53 Zone ID is still placeholder
$tfvarsContent = Get-Content "terraform.tfvars" -Raw
if ($tfvarsContent -match 'route53_zone_id = "<your Route53 Hosted Zone ID') {
    Write-Host "`n⚠️  Route 53 Zone ID not set!" -ForegroundColor Yellow
    Write-Host "Please update terraform.tfvars with your Zone ID" -ForegroundColor Yellow
    Write-Host "Or run: .\get-route53-zone-id.ps1" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Step 2: Initialize Terraform
Write-Host "`n[2/5] Initializing Terraform..." -ForegroundColor Cyan
terraform init
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Terraform init failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Plan
if (-not $SkipPlan) {
    Write-Host "`n[3/5] Running Terraform plan..." -ForegroundColor Cyan
    Write-Host "Review the plan carefully before proceeding!" -ForegroundColor Yellow
    terraform plan
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Terraform plan failed!" -ForegroundColor Red
        exit 1
    }
    
    $continue = Read-Host "`nProceed with apply? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "Deployment cancelled." -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host "`n[3/5] Skipping plan (use -SkipPlan to skip)" -ForegroundColor Gray
}

# Step 4: Apply
Write-Host "`n[4/5] Applying Terraform configuration..." -ForegroundColor Cyan
Write-Host "This will create all AWS resources. This may take 5-10 minutes..." -ForegroundColor Yellow
terraform apply -auto-approve
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Terraform apply failed!" -ForegroundColor Red
    exit 1
}

# Step 5: Show outputs
Write-Host "`n[5/5] Deployment complete! Showing outputs..." -ForegroundColor Green
Write-Host "`n=== TERRAFORM OUTPUTS ===" -ForegroundColor Cyan
terraform output

Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Yellow
Write-Host "1. Test API endpoint:" -ForegroundColor White
Write-Host "   curl https://api.tradeeon.com/health" -ForegroundColor Gray
Write-Host "`n2. Check ECS service:" -ForegroundColor White
Write-Host "   aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service" -ForegroundColor Gray
Write-Host "`n3. Get task public IPs (for Binance whitelist):" -ForegroundColor White
Write-Host "   See DEPLOY_STEPS.md Step 7" -ForegroundColor Gray
Write-Host "`n4. Monitor logs:" -ForegroundColor White
Write-Host "   aws logs tail /ecs/tradeeon-backend --follow" -ForegroundColor Gray

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green


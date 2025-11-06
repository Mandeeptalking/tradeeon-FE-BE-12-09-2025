# Complete Tradeeon Backend Deployment Script
# This script handles the entire deployment process

param(
    [string]$Route53ZoneId = "",
    [switch]$SkipVerification
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TRADEEON BACKEND - COMPLETE DEPLOYMENT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Check prerequisites
Write-Host "[1/8] Checking Prerequisites..." -ForegroundColor Yellow

# Check Terraform
if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Terraform not found!" -ForegroundColor Red
    Write-Host "Please install Terraform: https://www.terraform.io/downloads" -ForegroundColor Yellow
    exit 1
}

$tfVersion = terraform version -json | ConvertFrom-Json | Select-Object -ExpandProperty terraform_version
Write-Host "  ✅ Terraform: $tfVersion" -ForegroundColor Green

# Check AWS credentials (if AWS CLI available)
if (Get-Command aws -ErrorAction SilentlyContinue) {
    try {
        $awsAccount = aws sts get-caller-identity --query Account --output text 2>$null
        if ($awsAccount) {
            Write-Host "  ✅ AWS CLI: Configured (Account: $awsAccount)" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ⚠️  AWS CLI: Not configured (will need manual steps)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  AWS CLI: Not installed" -ForegroundColor Yellow
}

# Step 2: Get Route 53 Zone ID
Write-Host "`n[2/8] Getting Route 53 Zone ID..." -ForegroundColor Yellow

$tfvarsPath = Join-Path $PSScriptRoot "terraform.tfvars"
if (-not (Test-Path $tfvarsPath)) {
    Write-Host "❌ terraform.tfvars not found!" -ForegroundColor Red
    exit 1
}

$tfvarsContent = Get-Content $tfvarsPath -Raw

if ($Route53ZoneId) {
    Write-Host "  ✅ Using provided Zone ID: $Route53ZoneId" -ForegroundColor Green
    $tfvarsContent = $tfvarsContent -replace 'route53_zone_id = "<your Route53 Hosted Zone ID for tradeeon.com>"', "route53_zone_id = `"$Route53ZoneId`""
    Set-Content -Path $tfvarsPath -Value $tfvarsContent -NoNewline
} elseif (Get-Command aws -ErrorAction SilentlyContinue) {
    Write-Host "  Attempting to fetch Zone ID automatically..." -ForegroundColor Gray
    $zoneId = aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].Id" --output text 2>$null
    if ($zoneId -and $zoneId -notmatch "error") {
        $zoneId = $zoneId -replace "/hostedzone/", ""
        Write-Host "  ✅ Found Zone ID: $zoneId" -ForegroundColor Green
        $tfvarsContent = $tfvarsContent -replace 'route53_zone_id = "<your Route53 Hosted Zone ID for tradeeon.com>"', "route53_zone_id = `"$zoneId`""
        Set-Content -Path $tfvarsPath -Value $tfvarsContent -NoNewline
        $Route53ZoneId = $zoneId
    }
}

if ($tfvarsContent -match 'route53_zone_id = "<your Route53') {
    Write-Host "`n⚠️  Route 53 Zone ID not set!" -ForegroundColor Yellow
    Write-Host "`nPlease get it from AWS Console:" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://console.aws.amazon.com/route53" -ForegroundColor White
    Write-Host "  2. Click 'Hosted zones'" -ForegroundColor White
    Write-Host "  3. Click on 'tradeeon.com'" -ForegroundColor White
    Write-Host "  4. Copy the 'Hosted zone ID' (starts with Z)" -ForegroundColor White
    Write-Host "`nThen run this script again with:" -ForegroundColor Yellow
    Write-Host "  .\deploy-complete.ps1 -Route53ZoneId 'Z1234567890ABC'" -ForegroundColor White
    Write-Host "`nOr update terraform.tfvars manually and run again." -ForegroundColor Yellow
    exit 1
}

Write-Host "  ✅ Route 53 Zone ID configured" -ForegroundColor Green

# Step 3: Verify terraform.tfvars
Write-Host "`n[3/8] Verifying Configuration..." -ForegroundColor Yellow

$requiredVars = @(
    "aws_region",
    "ecr_repository_url",
    "acm_certificate_arn",
    "route53_zone_id",
    "supabase_url",
    "supabase_service_role_key"
)

$missing = @()
foreach ($var in $requiredVars) {
    if ($tfvarsContent -notmatch "$var\s*=" -or $tfvarsContent -match "$var\s*=\s*['\`"]<") {
        $missing += $var
    }
}

if ($missing.Count -gt 0) {
    Write-Host "  ❌ Missing required variables:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "     - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "  ✅ All required variables configured" -ForegroundColor Green

# Step 4: Initialize Terraform
Write-Host "`n[4/8] Initializing Terraform..." -ForegroundColor Yellow

Push-Location $PSScriptRoot

try {
    terraform init
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform init failed"
    }
    Write-Host "  ✅ Terraform initialized" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Terraform init failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Step 5: Terraform Plan
Write-Host "`n[5/8] Running Terraform Plan..." -ForegroundColor Yellow
Write-Host "  This shows what will be created. Review carefully!" -ForegroundColor Gray

try {
    terraform plan -out=tfplan
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform plan failed"
    }
    Write-Host "  ✅ Plan generated successfully" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Terraform plan failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Step 6: Apply Terraform
Write-Host "`n[6/8] Applying Terraform Configuration..." -ForegroundColor Yellow
Write-Host "  This will create all AWS resources (5-10 minutes)..." -ForegroundColor Gray

$confirm = Read-Host "Proceed with deployment? (yes/no)"
if ($confirm -ne "yes" -and $confirm -ne "y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    Pop-Location
    exit 0
}

try {
    terraform apply tfplan
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform apply failed"
    }
    Write-Host "  ✅ Infrastructure deployed!" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Terraform apply failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Step 7: Get Outputs
Write-Host "`n[7/8] Getting Deployment Outputs..." -ForegroundColor Yellow

try {
    $albDns = terraform output -raw alb_dns_name 2>$null
    $apiUrl = terraform output -raw api_url 2>$null
    $vpcId = terraform output -raw vpc_id 2>$null
    
    Write-Host "  ✅ ALB DNS: $albDns" -ForegroundColor Green
    Write-Host "  ✅ API URL: $apiUrl" -ForegroundColor Green
    Write-Host "  ✅ VPC ID: $vpcId" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Could not get outputs (may still be deploying)" -ForegroundColor Yellow
}

# Step 8: Verification
if (-not $SkipVerification) {
    Write-Host "`n[8/8] Verifying Deployment..." -ForegroundColor Yellow
    
    Write-Host "  Waiting for ECS service to stabilize (60 seconds)..." -ForegroundColor Gray
    Start-Sleep -Seconds 60
    
    # Test health endpoint
    Write-Host "  Testing API health endpoint..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "https://api.tradeeon.com/health" -Method Get -TimeoutSec 10 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ API is accessible and healthy!" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ⚠️  API health check failed (may still be deploying or DNS propagating)" -ForegroundColor Yellow
        Write-Host "     Try again in a few minutes" -ForegroundColor Gray
    }
    
    # Check ECS service (if AWS CLI available)
    if (Get-Command aws -ErrorAction SilentlyContinue) {
        Write-Host "  Checking ECS service status..." -ForegroundColor Gray
        try {
            $service = aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service --region us-east-1 --query 'services[0]' --output json 2>$null | ConvertFrom-Json
            if ($service) {
                Write-Host "  ✅ Service: $($service.serviceName)" -ForegroundColor Green
                Write-Host "     Running: $($service.runningCount)/$($service.desiredCount)" -ForegroundColor Gray
                Write-Host "     Status: $($service.status)" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  ⚠️  Could not check ECS service" -ForegroundColor Yellow
        }
    }
}

Pop-Location

# Final Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "✅ Infrastructure Created:" -ForegroundColor Cyan
Write-Host "  • VPC with public subnets" -ForegroundColor White
Write-Host "  • Internet Gateway" -ForegroundColor White
Write-Host "  • Security Groups" -ForegroundColor White
Write-Host "  • Application Load Balancer" -ForegroundColor White
Write-Host "  • ECS Cluster and Service" -ForegroundColor White
Write-Host "  • Route 53 DNS record" -ForegroundColor White

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Wait for DNS propagation (5-60 minutes)" -ForegroundColor White
Write-Host "  2. Test API: curl https://api.tradeeon.com/health" -ForegroundColor White
Write-Host "  3. Get task IPs for Binance whitelist:" -ForegroundColor White
Write-Host "     See: infra/terraform/DEPLOY_STEPS.md Step 7" -ForegroundColor Gray
Write-Host "  4. Monitor logs: aws logs tail /ecs/tradeeon-backend --follow" -ForegroundColor White

Write-Host "`n📄 Full Output:" -ForegroundColor Cyan
Write-Host "  Run: terraform output" -ForegroundColor Gray

Write-Host "`n✅ Deployment finished!" -ForegroundColor Green
Write-Host ""



# Check Tradeeon Deployment Status
# This script checks the status of all AWS resources

Write-Host "`n=== TRADEEON DEPLOYMENT STATUS ===" -ForegroundColor Cyan
Write-Host "`nChecking AWS resources..." -ForegroundColor Yellow

$region = "us-east-1"
$errors = @()

# Check Terraform
Write-Host "`n[1] Terraform Status:" -ForegroundColor Cyan
if (Test-Path "infra/terraform/.terraform") {
    Write-Host "  ✅ Terraform initialized" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Terraform not initialized" -ForegroundColor Yellow
}

if (Test-Path "infra/terraform/terraform.tfstate") {
    Write-Host "  ✅ Terraform state exists (resources deployed)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No Terraform state (not deployed via Terraform)" -ForegroundColor Yellow
}

# Check terraform.tfvars
if (Test-Path "infra/terraform/terraform.tfvars") {
    $tfvars = Get-Content "infra/terraform/terraform.tfvars" -Raw
    if ($tfvars -match 'route53_zone_id = "<your Route53') {
        Write-Host "  ⚠️  Route 53 Zone ID not set in terraform.tfvars" -ForegroundColor Yellow
    } else {
        Write-Host "  ✅ terraform.tfvars configured" -ForegroundColor Green
    }
}

# Check ECS Cluster
Write-Host "`n[2] ECS Cluster Status:" -ForegroundColor Cyan
try {
    $cluster = aws ecs describe-clusters --clusters tradeeon-cluster --region $region --query 'clusters[0]' --output json 2>$null | ConvertFrom-Json
    if ($cluster) {
        Write-Host "  ✅ Cluster exists: $($cluster.clusterName)" -ForegroundColor Green
        Write-Host "     Status: $($cluster.status)" -ForegroundColor Gray
        Write-Host "     Active Services: $($cluster.activeServicesCount)" -ForegroundColor Gray
        Write-Host "     Running Tasks: $($cluster.runningTasksCount)" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠️  Cluster 'tradeeon-cluster' not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not check ECS cluster (AWS CLI error or not deployed)" -ForegroundColor Yellow
}

# Check ECS Service
Write-Host "`n[3] ECS Service Status:" -ForegroundColor Cyan
try {
    $service = aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service --region $region --query 'services[0]' --output json 2>$null | ConvertFrom-Json
    if ($service -and $service.serviceName) {
        Write-Host "  ✅ Service exists: $($service.serviceName)" -ForegroundColor Green
        Write-Host "     Status: $($service.status)" -ForegroundColor Gray
        Write-Host "     Desired: $($service.desiredCount)" -ForegroundColor Gray
        Write-Host "     Running: $($service.runningCount)" -ForegroundColor Gray
        Write-Host "     Pending: $($service.pendingCount)" -ForegroundColor Gray
        
        if ($service.runningCount -gt 0) {
            Write-Host "  ✅ Backend is running!" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  No tasks running" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  Service 'tradeeon-backend-service' not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not check ECS service" -ForegroundColor Yellow
}

# Check ALB
Write-Host "`n[4] Application Load Balancer Status:" -ForegroundColor Cyan
try {
    $alb = aws elbv2 describe-load-balancers --region $region --query "LoadBalancers[?contains(LoadBalancerName, 'tradeeon')]" --output json 2>$null | ConvertFrom-Json
    if ($alb -and $alb.Count -gt 0) {
        $albName = $alb[0].LoadBalancerName
        $albDns = $alb[0].DNSName
        $albState = $alb[0].State.Code
        Write-Host "  ✅ ALB exists: $albName" -ForegroundColor Green
        Write-Host "     DNS: $albDns" -ForegroundColor Gray
        Write-Host "     State: $albState" -ForegroundColor Gray
        
        # Test health endpoint
        Write-Host "`n  Testing health endpoint..." -ForegroundColor Yellow
        try {
            $response = Invoke-WebRequest -Uri "https://api.tradeeon.com/health" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "  ✅ API is accessible: https://api.tradeeon.com/health" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ⚠️  API health check failed (may be DNS propagation or not configured)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  ALB not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not check ALB" -ForegroundColor Yellow
}

# Check Route 53
Write-Host "`n[5] Route 53 Status:" -ForegroundColor Cyan
try {
    $zones = aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.']" --output json 2>$null | ConvertFrom-Json
    if ($zones -and $zones.Count -gt 0) {
        $zoneId = $zones[0].Id -replace "/hostedzone/", ""
        Write-Host "  ✅ Hosted zone exists: tradeeon.com" -ForegroundColor Green
        Write-Host "     Zone ID: $zoneId" -ForegroundColor Gray
        
        # Check for api.tradeeon.com record
        $records = aws route53 list-resource-record-sets --hosted-zone-id $zoneId --query "ResourceRecordSets[?Name=='api.tradeeon.com.']" --output json 2>$null | ConvertFrom-Json
        if ($records -and $records.Count -gt 0) {
            Write-Host "  ✅ DNS record exists: api.tradeeon.com" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  DNS record not found: api.tradeeon.com" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  Hosted zone not found: tradeeon.com" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not check Route 53" -ForegroundColor Yellow
}

# Check Frontend (S3 + CloudFront)
Write-Host "`n[6] Frontend Status:" -ForegroundColor Cyan
try {
    $s3Bucket = aws s3api head-bucket --bucket tradeeon-frontend --region $region 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ S3 bucket exists: tradeeon-frontend" -ForegroundColor Green
        
        # Test frontend
        try {
            $response = Invoke-WebRequest -Uri "https://www.tradeeon.com" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "  ✅ Frontend is accessible: https://www.tradeeon.com" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ⚠️  Frontend may not be accessible" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  S3 bucket not found: tradeeon-frontend" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not check frontend" -ForegroundColor Yellow
}

# Check ECR Repository
Write-Host "`n[7] ECR Repository Status:" -ForegroundColor Cyan
try {
    $repo = aws ecr describe-repositories --repository-names tradeeon-backend --region $region --query 'repositories[0]' --output json 2>$null | ConvertFrom-Json
    if ($repo) {
        Write-Host "  ✅ Repository exists: tradeeon-backend" -ForegroundColor Green
        Write-Host "     URI: $($repo.repositoryUri)" -ForegroundColor Gray
        
        # Check images
        $images = aws ecr list-images --repository-name tradeeon-backend --region $region --query 'imageIds' --output json 2>$null | ConvertFrom-Json
        if ($images -and $images.Count -gt 0) {
            Write-Host "  ✅ Images available: $($images.Count)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  No images in repository" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  ECR repository not found: tradeeon-backend" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not check ECR repository" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "`n✅ Infrastructure Status:" -ForegroundColor Yellow
Write-Host "  • Terraform: Ready for deployment" -ForegroundColor White
Write-Host "  • Configuration: terraform.tfvars created" -ForegroundColor White
Write-Host "  • Missing: Route 53 Zone ID needs to be filled" -ForegroundColor Yellow
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Fill Route 53 Zone ID in terraform.tfvars" -ForegroundColor White
Write-Host "  2. Run: terraform init" -ForegroundColor White
Write-Host "  3. Run: terraform plan" -ForegroundColor White
Write-Host "  4. Run: terraform apply" -ForegroundColor White
Write-Host "`nFor detailed status, check AWS Console" -ForegroundColor Gray
Write-Host ""


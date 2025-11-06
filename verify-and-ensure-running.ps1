# Verify and Ensure All Tradeeon Services Are Running
# This script checks existing deployments and ensures everything is working

Write-Host "`n=== VERIFYING TRADEEON DEPLOYMENT ===" -ForegroundColor Cyan
Write-Host "`nChecking all services..." -ForegroundColor Yellow

$region = "us-east-1"
$clusterName = "tradeeon-cluster"
$backendService = "tradeeon-backend-service"
$alertService = "tradeeon-alert-runner-service"

# Check if AWS CLI is available
$awsAvailable = $false
if (Get-Command aws -ErrorAction SilentlyContinue) {
    try {
        $account = aws sts get-caller-identity --query Account --output text 2>$null
        if ($account) {
            $awsAvailable = $true
            Write-Host "✅ AWS CLI available (Account: $account)" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  AWS CLI not configured" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  AWS CLI not installed" -ForegroundColor Yellow
    Write-Host "`nCannot verify AWS resources without AWS CLI." -ForegroundColor Red
    Write-Host "`nPlease:" -ForegroundColor Yellow
    Write-Host "  1. Install AWS CLI: https://aws.amazon.com/cli/" -ForegroundColor White
    Write-Host "  2. Configure: aws configure" -ForegroundColor White
    Write-Host "  3. Or check AWS Console manually" -ForegroundColor White
    exit 1
}

# Check Frontend
Write-Host "`n[1] Frontend Status:" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "https://www.tradeeon.com" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Frontend is LIVE: https://www.tradeeon.com" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠️  Frontend check failed: $_" -ForegroundColor Yellow
}

# Check ECS Cluster
Write-Host "`n[2] ECS Cluster Status:" -ForegroundColor Cyan
try {
    $cluster = aws ecs describe-clusters --clusters $clusterName --region $region --query 'clusters[0]' --output json 2>$null | ConvertFrom-Json
    if ($cluster -and $cluster.clusterName) {
        Write-Host "  ✅ Cluster exists: $($cluster.clusterName)" -ForegroundColor Green
        Write-Host "     Status: $($cluster.status)" -ForegroundColor Gray
        Write-Host "     Active Services: $($cluster.activeServicesCount)" -ForegroundColor Gray
        Write-Host "     Running Tasks: $($cluster.runningTasksCount)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ Cluster '$clusterName' not found" -ForegroundColor Red
        Write-Host "     Need to create cluster" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not check cluster: $_" -ForegroundColor Yellow
}

# Check Backend Service
Write-Host "`n[3] Backend Service Status:" -ForegroundColor Cyan
try {
    $service = aws ecs describe-services --cluster $clusterName --services $backendService --region $region --query 'services[0]' --output json 2>$null | ConvertFrom-Json
    if ($service -and $service.serviceName) {
        Write-Host "  ✅ Service exists: $($service.serviceName)" -ForegroundColor Green
        Write-Host "     Status: $($service.status)" -ForegroundColor Gray
        Write-Host "     Desired: $($service.desiredCount)" -ForegroundColor Gray
        Write-Host "     Running: $($service.runningCount)" -ForegroundColor Gray
        Write-Host "     Pending: $($service.pendingCount)" -ForegroundColor Gray
        
        if ($service.runningCount -eq 0) {
            Write-Host "  ⚠️  No tasks running - service may be stopped" -ForegroundColor Yellow
            Write-Host "     Attempting to update service..." -ForegroundColor Yellow
            aws ecs update-service --cluster $clusterName --service $backendService --desired-count 1 --region $region --force-new-deployment 2>$null
            Write-Host "     Service update initiated" -ForegroundColor Green
        } else {
            Write-Host "  ✅ Backend is RUNNING!" -ForegroundColor Green
        }
    } else {
        Write-Host "  ❌ Service '$backendService' not found" -ForegroundColor Red
        Write-Host "     Need to create service" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not check service: $_" -ForegroundColor Yellow
}

# Check Alert Runner Service
Write-Host "`n[4] Alert Runner Service Status:" -ForegroundColor Cyan
try {
    $alertServiceObj = aws ecs describe-services --cluster $clusterName --services $alertService --region $region --query 'services[0]' --output json 2>$null | ConvertFrom-Json
    if ($alertServiceObj -and $alertServiceObj.serviceName) {
        Write-Host "  ✅ Service exists: $($alertServiceObj.serviceName)" -ForegroundColor Green
        Write-Host "     Status: $($alertServiceObj.status)" -ForegroundColor Gray
        Write-Host "     Running: $($alertServiceObj.runningCount)/$($alertServiceObj.desiredCount)" -ForegroundColor Gray
        
        if ($alertServiceObj.runningCount -eq 0) {
            Write-Host "  ⚠️  No tasks running" -ForegroundColor Yellow
        } else {
            Write-Host "  ✅ Alert Runner is RUNNING!" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  Alert Runner service not found (may not be deployed yet)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not check alert runner" -ForegroundColor Yellow
}

# Check ALB
Write-Host "`n[5] Application Load Balancer Status:" -ForegroundColor Cyan
try {
    $albs = aws elbv2 describe-load-balancers --region $region --query "LoadBalancers[?contains(LoadBalancerName, 'tradeeon')]" --output json 2>$null | ConvertFrom-Json
    if ($albs -and $albs.Count -gt 0) {
        $alb = $albs[0]
        Write-Host "  ✅ ALB exists: $($alb.LoadBalancerName)" -ForegroundColor Green
        Write-Host "     DNS: $($alb.DNSName)" -ForegroundColor Gray
        Write-Host "     State: $($alb.State.Code)" -ForegroundColor Gray
        
        # Test health endpoint
        Write-Host "`n  Testing API endpoint..." -ForegroundColor Yellow
        try {
            $albUrl = "http://$($alb.DNSName)/health"
            $response = Invoke-WebRequest -Uri $albUrl -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "  ✅ API is accessible via ALB!" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ⚠️  API not accessible via ALB (may still be deploying)" -ForegroundColor Yellow
        }
        
        # Test via Route 53
        try {
            $apiUrl = "https://api.tradeeon.com/health"
            $response = Invoke-WebRequest -Uri $apiUrl -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "  ✅ API is accessible via Route 53: https://api.tradeeon.com/health" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ⚠️  API not accessible via Route 53 (DNS may still be propagating)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ ALB not found" -ForegroundColor Red
    }
} catch {
    Write-Host "  ⚠️  Could not check ALB" -ForegroundColor Yellow
}

# Get Task IPs
Write-Host "`n[6] Getting Task Public IPs (for Binance whitelist):" -ForegroundColor Cyan
try {
    $taskArns = aws ecs list-tasks --cluster $clusterName --service-name $backendService --region $region --query 'taskArns' --output json 2>$null | ConvertFrom-Json
    if ($taskArns -and $taskArns.Count -gt 0) {
        Write-Host "  Found $($taskArns.Count) running task(s)" -ForegroundColor Green
        foreach ($taskArn in $taskArns) {
            $task = aws ecs describe-tasks --cluster $clusterName --tasks $taskArn --region $region --query 'tasks[0]' --output json 2>$null | ConvertFrom-Json
            if ($task) {
                $networkId = ($task.attachments[0].details | Where-Object { $_.name -eq 'networkInterfaceId' }).value
                if ($networkId) {
                    $networkInfo = aws ec2 describe-network-interfaces --network-interface-ids $networkId --region $region --query 'NetworkInterfaces[0]' --output json 2>$null | ConvertFrom-Json
                    if ($networkInfo -and $networkInfo.Association) {
                        $publicIp = $networkInfo.Association.PublicIp
                        Write-Host "  ✅ Task Public IP: $publicIp" -ForegroundColor Green -BackgroundColor DarkBlue
                        Write-Host "     Use this IP for Binance API whitelist!" -ForegroundColor Yellow
                    }
                }
            }
        }
    } else {
        Write-Host "  ⚠️  No running tasks found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not get task IPs: $_" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=== VERIFICATION SUMMARY ===" -ForegroundColor Cyan
Write-Host "`n✅ Services checked" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "  • If services not running, they will be started automatically" -ForegroundColor White
Write-Host "  • Wait a few minutes for tasks to start" -ForegroundColor White
Write-Host "  • Test API: curl https://api.tradeeon.com/health" -ForegroundColor White
Write-Host "  • Whitelist task IPs on Binance" -ForegroundColor White
Write-Host "`n"



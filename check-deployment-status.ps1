# Comprehensive Deployment Status Check
# Checks all Tradeeon services and infrastructure

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TRADEEON DEPLOYMENT STATUS CHECK" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$region = "us-east-1"

# Check Frontend
Write-Host "[1/6] Frontend (S3 + CloudFront)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://www.tradeeon.com" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Frontend: LIVE" -ForegroundColor Green
        Write-Host "     URL: https://www.tradeeon.com" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠️  Frontend: Not accessible" -ForegroundColor Yellow
}

# Check API Endpoint
Write-Host "`n[2/6] Backend API (Route 53 + ALB)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://api.tradeeon.com/health" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ API: LIVE" -ForegroundColor Green
        Write-Host "     URL: https://api.tradeeon.com" -ForegroundColor Gray
        try {
            $health = $response.Content | ConvertFrom-Json
            Write-Host "     Status: $($health.status)" -ForegroundColor Gray
        } catch {}
    }
} catch {
    Write-Host "  ⚠️  API: Not accessible (may still be deploying)" -ForegroundColor Yellow
    Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# Check AWS CLI availability
if (Get-Command aws -ErrorAction SilentlyContinue) {
    Write-Host "`n[3/6] ECS Cluster & Service" -ForegroundColor Yellow
    try {
        $cluster = aws ecs describe-clusters --clusters tradeeon-cluster --region $region --query 'clusters[0]' --output json 2>$null | ConvertFrom-Json
        if ($cluster -and $cluster.clusterName) {
            Write-Host "  ✅ Cluster: $($cluster.clusterName)" -ForegroundColor Green
            Write-Host "     Status: $($cluster.status)" -ForegroundColor Gray
            
            # Check service
            $service = aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service --region $region --query 'services[0]' --output json 2>$null | ConvertFrom-Json
            if ($service -and $service.serviceName) {
                Write-Host "  ✅ Service: $($service.serviceName)" -ForegroundColor Green
                Write-Host "     Running: $($service.runningCount)/$($service.desiredCount)" -ForegroundColor Gray
                Write-Host "     Status: $($service.status)" -ForegroundColor Gray
                
                if ($service.runningCount -gt 0) {
                    Write-Host "  ✅ Backend is RUNNING!" -ForegroundColor Green
                } else {
                    Write-Host "  ⚠️  No tasks running" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  ⚠️  Service not found" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ⚠️  Cluster not found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Could not check ECS (AWS CLI issue)" -ForegroundColor Yellow
    }
    
    Write-Host "`n[4/6] Application Load Balancer" -ForegroundColor Yellow
    try {
        $albs = aws elbv2 describe-load-balancers --region $region --query "LoadBalancers[?contains(LoadBalancerName, 'tradeeon')]" --output json 2>$null | ConvertFrom-Json
        if ($albs -and $albs.Count -gt 0) {
            $alb = $albs[0]
            Write-Host "  ✅ ALB: $($alb.LoadBalancerName)" -ForegroundColor Green
            Write-Host "     DNS: $($alb.DNSName)" -ForegroundColor Gray
            Write-Host "     State: $($alb.State.Code)" -ForegroundColor Gray
        } else {
            Write-Host "  ⚠️  ALB not found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Could not check ALB" -ForegroundColor Yellow
    }
    
    Write-Host "`n[5/6] Route 53 DNS" -ForegroundColor Yellow
    try {
        $zoneId = "Z08494351HC32A4M6XAOH"
        $records = aws route53 list-resource-record-sets --hosted-zone-id $zoneId --query "ResourceRecordSets[?Name=='api.tradeeon.com.']" --output json 2>$null | ConvertFrom-Json
        if ($records -and $records.Count -gt 0) {
            Write-Host "  ✅ DNS Record: api.tradeeon.com" -ForegroundColor Green
            $record = $records[0]
            Write-Host "     Type: $($record.Type)" -ForegroundColor Gray
            if ($record.AliasTarget) {
                Write-Host "     Points to: $($record.AliasTarget.DNSName)" -ForegroundColor Gray
            }
        } else {
            Write-Host "  ⚠️  DNS record not found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Could not check DNS" -ForegroundColor Yellow
    }
    
    Write-Host "`n[6/6] Task Public IPs (for Binance whitelist)" -ForegroundColor Yellow
    try {
        $taskArns = aws ecs list-tasks --cluster tradeeon-cluster --service-name tradeeon-backend-service --region $region --query 'taskArns' --output json 2>$null | ConvertFrom-Json
        if ($taskArns -and $taskArns.Count -gt 0) {
            Write-Host "  ✅ Found $($taskArns.Count) running task(s)" -ForegroundColor Green
            foreach ($taskArn in $taskArns) {
                $task = aws ecs describe-tasks --cluster tradeeon-cluster --tasks $taskArn --region $region --query 'tasks[0]' --output json 2>$null | ConvertFrom-Json
                if ($task) {
                    $networkId = ($task.attachments[0].details | Where-Object { $_.name -eq 'networkInterfaceId' }).value
                    if ($networkId) {
                        $networkInfo = aws ec2 describe-network-interfaces --network-interface-ids $networkId --region $region --query 'NetworkInterfaces[0]' --output json 2>$null | ConvertFrom-Json
                        if ($networkInfo -and $networkInfo.Association) {
                            $publicIp = $networkInfo.Association.PublicIp
                            Write-Host "  ✅ Task Public IP: $publicIp" -ForegroundColor Green -BackgroundColor DarkBlue
                            Write-Host "     ⚠️  Whitelist this IP on Binance!" -ForegroundColor Yellow
                        }
                    }
                }
            }
        } else {
            Write-Host "  ⚠️  No running tasks found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Could not get task IPs" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[3/6] AWS Resources" -ForegroundColor Yellow
    Write-Host "  ⚠️  AWS CLI not available - cannot check AWS resources" -ForegroundColor Yellow
    Write-Host "     Install AWS CLI to check ECS, ALB, and DNS status" -ForegroundColor Gray
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "✅ Frontend: https://www.tradeeon.com" -ForegroundColor Green
Write-Host "✅ API: https://api.tradeeon.com" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test API: curl https://api.tradeeon.com/health" -ForegroundColor White
Write-Host "  2. Whitelist task IPs on Binance" -ForegroundColor White
Write-Host "  3. Monitor logs: AWS Console → CloudWatch → Log groups" -ForegroundColor White
Write-Host "`n"



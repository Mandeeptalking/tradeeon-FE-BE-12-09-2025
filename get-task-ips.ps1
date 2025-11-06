# Get ECS Task Public IPs for Binance Whitelist
# This script gets all running task public IPs

$cluster = "tradeeon-cluster"
$service = "tradeeon-backend-service"
$region = "us-east-1"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  GETTING TASK PUBLIC IPs" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if AWS CLI is available
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI not found!" -ForegroundColor Red
    Write-Host "Please install AWS CLI first:" -ForegroundColor Yellow
    Write-Host "  https://aws.amazon.com/cli/" -ForegroundColor White
    exit 1
}

Write-Host "Getting tasks for service: $service" -ForegroundColor Yellow
Write-Host "Cluster: $cluster" -ForegroundColor Gray
Write-Host "Region: $region`n" -ForegroundColor Gray

try {
    # List tasks
    $taskArnsJson = aws ecs list-tasks --cluster $cluster --service-name $service --region $region --query 'taskArns' --output json 2>$null
    if (-not $taskArnsJson) {
        Write-Host "❌ Could not list tasks. Check:" -ForegroundColor Red
        Write-Host "  • AWS credentials configured" -ForegroundColor Yellow
        Write-Host "  • Cluster name: $cluster" -ForegroundColor Yellow
        Write-Host "  • Service name: $service" -ForegroundColor Yellow
        exit 1
    }
    
    $taskArns = $taskArnsJson | ConvertFrom-Json
    
    if ($taskArns.Count -eq 0) {
        Write-Host "⚠️  No running tasks found!" -ForegroundColor Yellow
        Write-Host "The service may not be running or tasks haven't started yet." -ForegroundColor Gray
        exit 0
    }
    
    Write-Host "✅ Found $($taskArns.Count) running task(s)`n" -ForegroundColor Green
    
    $ips = @()
    
    foreach ($taskArn in $taskArns) {
        Write-Host "Processing task: $($taskArn.Split('/')[-1])" -ForegroundColor Cyan
        
        # Get task details
        $taskJson = aws ecs describe-tasks --cluster $cluster --tasks $taskArn --region $region --query 'tasks[0]' --output json 2>$null
        if (-not $taskJson) {
            Write-Host "  ⚠️  Could not get task details" -ForegroundColor Yellow
            continue
        }
        
        $task = $taskJson | ConvertFrom-Json
        
        # Get network interface ID
        $eniId = $null
        if ($task.attachments -and $task.attachments.Count -gt 0) {
            foreach ($detail in $task.attachments[0].details) {
                if ($detail.name -eq 'networkInterfaceId') {
                    $eniId = $detail.value
                    break
                }
            }
        }
        
        if (-not $eniId) {
            Write-Host "  ⚠️  Could not find network interface ID" -ForegroundColor Yellow
            continue
        }
        
        # Get network interface details
        $eniJson = aws ec2 describe-network-interfaces --network-interface-ids $eniId --region $region --query 'NetworkInterfaces[0]' --output json 2>$null
        if (-not $eniJson) {
            Write-Host "  ⚠️  Could not get network interface details" -ForegroundColor Yellow
            continue
        }
        
        $eni = $eniJson | ConvertFrom-Json
        
        if ($eni.Association -and $eni.Association.PublicIp) {
            $publicIp = $eni.Association.PublicIp
            Write-Host "  ✅ Public IP: $publicIp" -ForegroundColor Green -BackgroundColor DarkBlue
            $ips += $publicIp
        } else {
            Write-Host "  ⚠️  Task has no public IP" -ForegroundColor Yellow
        }
    }
    
    if ($ips.Count -gt 0) {
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "  IPs TO WHITELIST ON BINANCE" -ForegroundColor Green
        Write-Host "========================================`n" -ForegroundColor Green
        
        foreach ($ip in $ips) {
            Write-Host "  $ip" -ForegroundColor White -BackgroundColor DarkBlue
        }
        
        Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
        Write-Host "  1. Go to: https://www.binance.com/en/my/settings/api-management" -ForegroundColor White
        Write-Host "  2. Edit your API key" -ForegroundColor White
        Write-Host "  3. Enable 'Restrict access to trusted IPs only'" -ForegroundColor White
        Write-Host "  4. Add ALL the IPs above" -ForegroundColor White
        Write-Host "  5. Save and verify`n" -ForegroundColor White
    } else {
        Write-Host "`n⚠️  No public IPs found!" -ForegroundColor Yellow
        Write-Host "Tasks may not have public IPs assigned." -ForegroundColor Gray
    }
    
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    Write-Host "`nMake sure:" -ForegroundColor Yellow
    Write-Host "  • AWS CLI is configured (aws configure)" -ForegroundColor White
    Write-Host "  • You have permissions to access ECS and EC2" -ForegroundColor White
    Write-Host "  • Cluster and service names are correct" -ForegroundColor White
}

Write-Host ""


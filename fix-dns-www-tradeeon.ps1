# Fix DNS for www.tradeeon.com - PowerShell Script
# This script creates/updates the Route53 A record pointing to CloudFront

param(
    [string]$CloudFrontDistributionId = "EMF4IMNT9637C",
    [string]$HostedZoneName = "tradeeon.com"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Fix DNS for www.tradeeon.com" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get CloudFront Distribution Domain
Write-Host "1. Getting CloudFront distribution domain..." -ForegroundColor Yellow
try {
    $cfDistribution = aws cloudfront get-distribution --id $CloudFrontDistributionId --output json | ConvertFrom-Json
    $cfDomain = $cfDistribution.Distribution.DomainName
    Write-Host "   [OK] CloudFront Domain: $cfDomain" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] Could not get CloudFront distribution" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Get Hosted Zone ID
Write-Host ""
Write-Host "2. Getting Route53 hosted zone ID..." -ForegroundColor Yellow
try {
    $zones = aws route53 list-hosted-zones --output json | ConvertFrom-Json
    $hostedZone = $zones.HostedZones | Where-Object { $_.Name -eq "$HostedZoneName." }
    
    if (-not $hostedZone) {
        Write-Host "   [FAIL] Hosted zone not found for $HostedZoneName" -ForegroundColor Red
        exit 1
    }
    
    $hostedZoneId = $hostedZone.Id -replace '/hostedzone/', ''
    Write-Host "   [OK] Hosted Zone ID: $hostedZoneId" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] Could not get hosted zone" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Check if www record exists
Write-Host ""
Write-Host "3. Checking existing www.tradeeon.com record..." -ForegroundColor Yellow
try {
    $records = aws route53 list-resource-record-sets --hosted-zone-id $hostedZoneId --output json | ConvertFrom-Json
    $wwwRecord = $records.ResourceRecordSets | Where-Object { 
        $_.Name -eq "www.tradeeon.com." -or $_.Name -eq "www.tradeeon.com"
    }
    
    if ($wwwRecord) {
        Write-Host "   [INFO] Existing record found:" -ForegroundColor Yellow
        Write-Host "   Name: $($wwwRecord.Name)" -ForegroundColor Gray
        Write-Host "   Type: $($wwwRecord.Type)" -ForegroundColor Gray
        if ($wwwRecord.AliasTarget) {
            Write-Host "   Current Target: $($wwwRecord.AliasTarget.DNSName)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   [INFO] No existing www record found (will create new)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [WARN] Could not check existing records" -ForegroundColor Yellow
}

# Step 4: Create/Update DNS Record
Write-Host ""
Write-Host "4. Creating/Updating Route53 A record..." -ForegroundColor Yellow

$changeBatch = @{
    Changes = @(
        @{
            Action = "UPSERT"
            ResourceRecordSet = @{
                Name = "www.tradeeon.com"
                Type = "A"
                AliasTarget = @{
                    HostedZoneId = "Z2FDTNDATAQYW2"  # CloudFront hosted zone ID
                    DNSName = $cfDomain
                    EvaluateTargetHealth = $false
                }
            }
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $changeBatch | Out-File -FilePath "route53-change-batch.json" -Encoding UTF8
    $result = aws route53 change-resource-record-sets --hosted-zone-id $hostedZoneId --change-batch file://route53-change-batch.json --output json | ConvertFrom-Json
    
    Write-Host "   [OK] DNS record created/updated successfully!" -ForegroundColor Green
    Write-Host "   Change ID: $($result.ChangeInfo.Id)" -ForegroundColor Gray
    Write-Host "   Status: $($result.ChangeInfo.Status)" -ForegroundColor Gray
    
    # Cleanup temp file
    Remove-Item "route53-change-batch.json" -ErrorAction SilentlyContinue
} catch {
    Write-Host "   [FAIL] Could not create/update DNS record" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Remove-Item "route53-change-batch.json" -ErrorAction SilentlyContinue
    exit 1
}

# Step 5: Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ DNS record created/updated for www.tradeeon.com" -ForegroundColor Green
Write-Host "   Points to: $cfDomain" -ForegroundColor Gray
Write-Host ""
Write-Host "⏱️  DNS Propagation:" -ForegroundColor Yellow
Write-Host "   - Minimum: 5-15 minutes" -ForegroundColor Gray
Write-Host "   - Typical: 30-60 minutes" -ForegroundColor Gray
Write-Host "   - Maximum: 24-48 hours (rare)" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 Verify DNS propagation:" -ForegroundColor Yellow
Write-Host "   https://dnschecker.org/#A/www.tradeeon.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "🧪 Test website:" -ForegroundColor Yellow
Write-Host "   https://www.tradeeon.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan


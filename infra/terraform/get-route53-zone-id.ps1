# Get Route 53 Hosted Zone ID for tradeeon.com
# Run this script to automatically get the Zone ID

Write-Host "`n=== Getting Route 53 Zone ID ===" -ForegroundColor Cyan

try {
    # Check if AWS CLI is available
    $awsVersion = aws --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI not found"
    }
    
    Write-Host "`nFetching Route 53 hosted zones..." -ForegroundColor Yellow
    
    # Get the Zone ID for tradeeon.com
    $zoneId = aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].Id" --output text 2>&1
    
    if ($zoneId -and $zoneId -notmatch "Error") {
        # Remove the /hostedzone/ prefix if present
        $zoneId = $zoneId -replace "/hostedzone/", ""
        
        Write-Host "`n✅ Found Route 53 Zone ID:" -ForegroundColor Green
        Write-Host "   $zoneId" -ForegroundColor White -BackgroundColor DarkBlue
        
        # Update terraform.tfvars
        $tfvarsPath = Join-Path $PSScriptRoot "terraform.tfvars"
        if (Test-Path $tfvarsPath) {
            $content = Get-Content $tfvarsPath -Raw
            $content = $content -replace 'route53_zone_id = "<your Route53 Hosted Zone ID for tradeeon.com>"', "route53_zone_id = `"$zoneId`""
            Set-Content -Path $tfvarsPath -Value $content -NoNewline
            
            Write-Host "`n✅ Updated terraform.tfvars with Zone ID!" -ForegroundColor Green
        } else {
            Write-Host "`n⚠️  terraform.tfvars not found. Please manually update:" -ForegroundColor Yellow
            Write-Host "   route53_zone_id = `"$zoneId`"" -ForegroundColor White
        }
    } else {
        Write-Host "`n❌ Could not find Route 53 hosted zone for tradeeon.com" -ForegroundColor Red
        Write-Host "`nPlease get it manually:" -ForegroundColor Yellow
        Write-Host "  1. AWS Console → Route 53 → Hosted zones" -ForegroundColor White
        Write-Host "  2. Click on 'tradeeon.com'" -ForegroundColor White
        Write-Host "  3. Copy the 'Hosted zone ID' (starts with Z)" -ForegroundColor White
        Write-Host "  4. Update terraform.tfvars" -ForegroundColor White
    }
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    Write-Host "`nAWS CLI is not installed or not configured." -ForegroundColor Yellow
    Write-Host "`nPlease get Route 53 Zone ID manually:" -ForegroundColor Yellow
    Write-Host "  1. AWS Console → Route 53 → Hosted zones" -ForegroundColor White
    Write-Host "  2. Click on 'tradeeon.com'" -ForegroundColor White
    Write-Host "  3. Copy the 'Hosted zone ID' (starts with Z)" -ForegroundColor White
    Write-Host "  4. Update terraform.tfvars manually" -ForegroundColor White
}

Write-Host "`n"



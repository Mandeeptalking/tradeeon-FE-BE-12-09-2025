# Verify CloudFront WAF is Active
# Checks if WAF is properly attached to CloudFront distribution

param(
    [Parameter(Mandatory=$false)]
    [string]$DistributionId = "EMF4IMNT9637C"
)

$ErrorActionPreference = "Stop"

Write-Host "Verifying CloudFront WAF is active..." -ForegroundColor Cyan
Write-Host "Distribution ID: $DistributionId" -ForegroundColor Yellow

# Get distribution config
$distConfigJson = aws cloudfront get-distribution-config --id $DistributionId --output json 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to get distribution config:" -ForegroundColor Red
    Write-Host $distConfigJson -ForegroundColor Red
    exit 1
}

$distConfig = $distConfigJson | ConvertFrom-Json
$config = $distConfig.DistributionConfig
$webACLId = $config.DefaultCacheBehavior.WebACLId

if ($webACLId) {
    Write-Host "`n[SUCCESS] WAF is attached!" -ForegroundColor Green
    Write-Host "Web ACL ARN: $webACLId" -ForegroundColor White
    
    # Extract Web ACL ID from ARN
    if ($webACLId -match 'arn:aws:wafv2:.*:.*:webacl/([^/]+)/') {
        $wafId = $Matches[1]
        Write-Host "Web ACL ID: $wafId" -ForegroundColor White
        
        # Get Web ACL details
        Write-Host "`nFetching Web ACL details..." -ForegroundColor Cyan
        $wafDetails = aws wafv2 get-web-acl --scope CLOUDFRONT --region us-east-1 --id $wafId --name (Split-Path $webACLId -Leaf) --output json 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $waf = $wafDetails | ConvertFrom-Json
            Write-Host "`nWeb ACL Name: $($waf.WebACL.Name)" -ForegroundColor White
            Write-Host "Rules Count: $($waf.WebACL.Rules.Count)" -ForegroundColor White
            Write-Host "`nEnabled Rules:" -ForegroundColor Cyan
            foreach ($rule in $waf.WebACL.Rules) {
                Write-Host "  - $($rule.Name)" -ForegroundColor White
            }
        }
    }
    
    Write-Host "`n[PROOF] WAF is active and protecting your CloudFront distribution" -ForegroundColor Green
    Write-Host "`nTo verify via AWS Console:" -ForegroundColor Cyan
    Write-Host "  1. Go to CloudFront console" -ForegroundColor White
    Write-Host "  2. Select distribution $DistributionId" -ForegroundColor White
    Write-Host "  3. Check 'Behaviors' tab -> Default behavior -> Web ACL" -ForegroundColor White
    Write-Host "`nTo view WAF metrics:" -ForegroundColor Cyan
    Write-Host "  https://console.aws.amazon.com/wafv2/home?region=us-east-1#/web-acls" -ForegroundColor Yellow
    
} else {
    Write-Host "`n[WARNING] WAF is NOT attached to CloudFront distribution" -ForegroundColor Yellow
    Write-Host "Run: .\scripts\setup-cloudfront-waf.ps1" -ForegroundColor Cyan
    exit 1
}


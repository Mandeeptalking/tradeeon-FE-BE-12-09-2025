# CloudFront Security Headers Setup Script (Simplified)
# Adds HSTS and other security headers to CloudFront distribution

param(
    [Parameter(Mandatory=$false)]
    [string]$DistributionId = "EMF4IMNT9637C",
    
    [Parameter(Mandatory=$false)]
    [string]$PolicyName = "TradeeonSecurityHeadersPolicy"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$policyJsonFile = Join-Path $scriptDir "cloudfront-security-headers-policy.json"
# Convert to forward slashes for AWS CLI
$policyJsonFile = $policyJsonFile -replace '\\', '/'

Write-Host "Setting up CloudFront Security Headers..." -ForegroundColor Cyan
Write-Host "Distribution ID: $DistributionId" -ForegroundColor Yellow

# Step 1: Check if policy exists, create or update
Write-Host "`nStep 1: Creating/Updating Response Headers Policy..." -ForegroundColor Cyan

$existingPolicyIdRaw = aws cloudfront list-response-headers-policies --type custom --query "ResponseHeadersPolicyList.Items[?Name=='$PolicyName'].Id" --output text 2>$null
$existingPolicyId = if ($existingPolicyIdRaw -and $existingPolicyIdRaw.Trim() -ne "" -and $existingPolicyIdRaw.Trim() -ne "None") { 
    $existingPolicyIdRaw.Trim() 
} else { 
    $null 
}

if ($existingPolicyId -and $existingPolicyId.Length -gt 0) {
    Write-Host "Policy '$PolicyName' already exists (ID: $existingPolicyId). Updating..." -ForegroundColor Yellow
    
    $updateResult = aws cloudfront update-response-headers-policy `
        --id $existingPolicyId `
        --response-headers-policy-config "file://$policyJsonFile" `
        --output json 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Policy updated!" -ForegroundColor Green
        $policyId = $existingPolicyId
    } else {
        Write-Host "[ERROR] Failed to update policy. Creating new one..." -ForegroundColor Yellow
        $existingPolicyId = $null
    }
}

if (-not $existingPolicyId) {
    Write-Host "Creating new Response Headers Policy..." -ForegroundColor Yellow
    
    $createResult = aws cloudfront create-response-headers-policy `
        --response-headers-policy-config "file://$policyJsonFile" `
        --output json 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $policyId = ($createResult | ConvertFrom-Json).ResponseHeadersPolicy.Id
        Write-Host "[SUCCESS] Policy created! ID: $policyId" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to create policy:" -ForegroundColor Red
        Write-Host "Exit Code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Output: $createResult" -ForegroundColor Red
        Write-Host "Policy file path: $policyJsonFile" -ForegroundColor Yellow
        Write-Host "Policy file exists: $(Test-Path ($policyJsonFile -replace '/', '\'))" -ForegroundColor Yellow
        exit 1
    }
}

# Step 2: Get distribution config
Write-Host "`nStep 2: Getting CloudFront distribution config..." -ForegroundColor Cyan

$distConfigJson = aws cloudfront get-distribution-config --id $DistributionId --output json 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to get distribution config:" -ForegroundColor Red
    Write-Host $distConfigJson -ForegroundColor Red
    exit 1
}

$distConfig = $distConfigJson | ConvertFrom-Json
$etag = $distConfig.ETag
$config = $distConfig.DistributionConfig

Write-Host "[SUCCESS] Got config (ETag: $etag)" -ForegroundColor Green

# Step 3: Update distribution
Write-Host "`nStep 3: Updating CloudFront distribution..." -ForegroundColor Cyan

# Add/update ResponseHeadersPolicyId
if (-not $config.DefaultCacheBehavior.PSObject.Properties['ResponseHeadersPolicyId']) {
    $config.DefaultCacheBehavior | Add-Member -MemberType NoteProperty -Name "ResponseHeadersPolicyId" -Value $policyId -Force
} else {
    $config.DefaultCacheBehavior.ResponseHeadersPolicyId = $policyId
}

# Save config to temp file
$tempConfigFile = [System.IO.Path]::GetTempFileName()
$config | ConvertTo-Json -Depth 20 -Compress | Set-Content $tempConfigFile
$tempConfigFileForAws = $tempConfigFile -replace '\\', '/'

# Update distribution
$updateResult = aws cloudfront update-distribution `
    --id $DistributionId `
    --if-match $etag `
    --distribution-config "file://$tempConfigFileForAws" `
    --output json 2>&1

# Clean up temp file
Remove-Item $tempConfigFile -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Distribution updated!" -ForegroundColor Green
    Write-Host "`n[NOTE] CloudFront changes take 5-15 minutes to propagate globally" -ForegroundColor Yellow
    Write-Host "Check status: aws cloudfront get-distribution --id $DistributionId --query 'Distribution.Status' --output text" -ForegroundColor Cyan
} else {
    Write-Host "[ERROR] Failed to update distribution:" -ForegroundColor Red
    Write-Host $updateResult -ForegroundColor Red
    exit 1
}

# Step 4: Summary
Write-Host "`n[SUCCESS] Security headers setup complete!" -ForegroundColor Green
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "  - HSTS: Enabled (max-age=31536000, includeSubdomains, preload)" -ForegroundColor White
Write-Host "  - X-Content-Type-Options: nosniff" -ForegroundColor White
Write-Host "  - X-Frame-Options: DENY" -ForegroundColor White
Write-Host "  - Referrer-Policy: strict-origin-when-cross-origin" -ForegroundColor White
Write-Host "  - Content-Security-Policy: Configured" -ForegroundColor White
Write-Host "  - Permissions-Policy: Configured" -ForegroundColor White
Write-Host "`nTest headers: https://securityheaders.com/?q=https://www.tradeeon.com" -ForegroundColor Cyan


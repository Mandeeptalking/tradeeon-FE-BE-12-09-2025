# CloudFront Security Headers Setup Script
# Adds HSTS and other security headers to CloudFront distribution

param(
    [Parameter(Mandatory=$true)]
    [string]$DistributionId = "EMF4IMNT9637C",
    
    [Parameter(Mandatory=$false)]
    [string]$PolicyName = "TradeeonSecurityHeadersPolicy"
)

Write-Host "Setting up CloudFront Security Headers..." -ForegroundColor Cyan
Write-Host "Distribution ID: $DistributionId" -ForegroundColor Yellow

# Step 1: Create Response Headers Policy
Write-Host "`nStep 1: Creating Response Headers Policy..." -ForegroundColor Cyan

$policyConfig = @{
    ResponseHeadersPolicyConfig = @{
        Name = $PolicyName
        Comment = "Security headers for Tradeeon frontend - HSTS, CSP, X-Frame-Options, etc."
        SecurityHeadersConfig = @{
            StrictTransportSecurity = @{
                Override = $true
                AccessControlMaxAgeSec = 31536000  # 1 year
                IncludeSubdomains = $true
                Preload = $true
            }
            ContentTypeOptions = @{
                Override = $true
            }
            FrameOptions = @{
                Override = $true
                FrameOption = "DENY"
            }
            ReferrerPolicy = @{
                Override = $true
                ReferrerPolicy = "strict-origin-when-cross-origin"
            }
            ContentSecurityPolicy = @{
                Override = $true
                ContentSecurityPolicy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.tradeeon.com https://*.binance.com wss://*.binance.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
            }
            XSSProtection = @{
                Override = $true
                ModeBlock = $true
                Protection = $true
                ReportUri = ""
            }
        }
        CustomHeadersConfig = @{
            Items = @(
                @{
                    Header = "Permissions-Policy"
                    Value = "geolocation=(), microphone=(), camera=()"
                    Override = $true
                }
            )
        }
    }
} | ConvertTo-Json -Depth 10

try {
    Write-Host "Creating response headers policy..." -ForegroundColor Yellow
    
    # Check if policy already exists
    $existingPolicies = aws cloudfront list-response-headers-policies --type custom --query "ResponseHeadersPolicyList.Items[?Name=='$PolicyName'].Id" --output text 2>$null
    
    if ($existingPolicies) {
        Write-Host "Policy '$PolicyName' already exists. Updating..." -ForegroundColor Yellow
        $policyId = $existingPolicies.Trim()
        
        # Get current policy config
        $currentPolicy = aws cloudfront get-response-headers-policy --id $policyId --output json | ConvertFrom-Json
        
        # Update policy
        $updateResult = aws cloudfront update-response-headers-policy `
            --id $policyId `
            --response-headers-policy-config "$policyConfig" `
            --output json
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Policy updated successfully!" -ForegroundColor Green
            $policyId = ($updateResult | ConvertFrom-Json).ResponseHeadersPolicy.Id
        } else {
            Write-Host "[ERROR] Failed to update policy" -ForegroundColor Red
            exit 1
        }
    } else {
        # Create new policy
        $createResult = aws cloudfront create-response-headers-policy `
            --response-headers-policy-config "$policyConfig" `
            --output json
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Policy created successfully!" -ForegroundColor Green
            $policyId = ($createResult | ConvertFrom-Json).ResponseHeadersPolicy.Id
        } else {
            Write-Host "[ERROR] Failed to create policy" -ForegroundColor Red
            Write-Host "Error: $createResult" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host "Policy ID: $policyId" -ForegroundColor Cyan
    
} catch {
    Write-Host "[ERROR] Error creating/updating policy: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Get current distribution config
Write-Host "`nStep 2: Getting current CloudFront distribution config..." -ForegroundColor Cyan

try {
    $distConfig = aws cloudfront get-distribution-config --id $DistributionId --output json | ConvertFrom-Json
    
    if (-not $distConfig) {
        Write-Host "[ERROR] Failed to get distribution config" -ForegroundColor Red
        exit 1
    }
    
    $etag = $distConfig.ETag
    $config = $distConfig.DistributionConfig
    
    Write-Host "[SUCCESS] Got distribution config (ETag: $etag)" -ForegroundColor Green
    
} catch {
    Write-Host "[ERROR] Error getting distribution config: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Update distribution with response headers policy
Write-Host "`nStep 3: Updating CloudFront distribution with security headers policy..." -ForegroundColor Cyan

try {
    # Add response headers policy to default cache behavior
    if (-not $config.DefaultCacheBehavior.ResponseHeadersPolicyId) {
        $config.DefaultCacheBehavior | Add-Member -MemberType NoteProperty -Name "ResponseHeadersPolicyId" -Value $policyId -Force
        Write-Host "[SUCCESS] Added ResponseHeadersPolicyId to default cache behavior" -ForegroundColor Green
    } else {
        $config.DefaultCacheBehavior.ResponseHeadersPolicyId = $policyId
        Write-Host "[SUCCESS] Updated ResponseHeadersPolicyId in default cache behavior" -ForegroundColor Green
    }
    
    # Also update ordered cache behaviors if they exist
    if ($config.CacheBehaviors.Items) {
        foreach ($behavior in $config.CacheBehaviors.Items) {
            if (-not $behavior.ResponseHeadersPolicyId) {
                $behavior | Add-Member -MemberType NoteProperty -Name "ResponseHeadersPolicyId" -Value $policyId -Force
            } else {
                $behavior.ResponseHeadersPolicyId = $policyId
            }
        }
        Write-Host "[SUCCESS] Updated ResponseHeadersPolicyId in ordered cache behaviors" -ForegroundColor Green
    }
    
    # Convert config back to JSON
    $updatedConfigJson = $config | ConvertTo-Json -Depth 10 -Compress
    
    # Update distribution
    Write-Host "Updating CloudFront distribution..." -ForegroundColor Yellow
    
    $updateResult = aws cloudfront update-distribution `
        --id $DistributionId `
        --if-match $etag `
        --distribution-config "$updatedConfigJson" `
        --output json
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Distribution updated successfully!" -ForegroundColor Green
        Write-Host "`n[NOTE] CloudFront changes take 5-15 minutes to propagate globally" -ForegroundColor Yellow
        Write-Host "You can check status with: aws cloudfront get-distribution --id $DistributionId" -ForegroundColor Cyan
    } else {
        Write-Host "[ERROR] Failed to update distribution" -ForegroundColor Red
        Write-Host "Error: $updateResult" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "[ERROR] Error updating distribution: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Verify
Write-Host "`nStep 4: Verifying configuration..." -ForegroundColor Cyan

Start-Sleep -Seconds 2

try {
    $verifyDist = aws cloudfront get-distribution --id $DistributionId --output json | ConvertFrom-Json
    $verifyPolicyId = $verifyDist.Distribution.DistributionConfig.DefaultCacheBehavior.ResponseHeadersPolicyId
    
    if ($verifyPolicyId -eq $policyId) {
        Write-Host "[SUCCESS] Verification successful!" -ForegroundColor Green
        Write-Host "Response Headers Policy ID: $verifyPolicyId" -ForegroundColor Cyan
    } else {
        Write-Host "[WARNING] Policy ID mismatch. May need to wait for propagation." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "[WARNING] Could not verify (this is OK, changes may still be propagating)" -ForegroundColor Yellow
}

Write-Host "`n[SUCCESS] Security headers setup complete!" -ForegroundColor Green
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "  - HSTS: Enabled (max-age=31536000, includeSubdomains, preload)" -ForegroundColor White
Write-Host "  - X-Content-Type-Options: nosniff" -ForegroundColor White
Write-Host "  - X-Frame-Options: DENY" -ForegroundColor White
Write-Host "  - Referrer-Policy: strict-origin-when-cross-origin" -ForegroundColor White
Write-Host "  - Content-Security-Policy: Configured" -ForegroundColor White
Write-Host "  - Permissions-Policy: Configured" -ForegroundColor White
Write-Host "`nTest your headers at: https://securityheaders.com/?q=https://www.tradeeon.com" -ForegroundColor Cyan


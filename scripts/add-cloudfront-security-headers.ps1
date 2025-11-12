# PowerShell script to add security headers to CloudFront distribution
# This adds HSTS and other security headers via CloudFront Response Headers Policy

$ErrorActionPreference = "Stop"

$DISTRIBUTION_ID = "EMF4IMNT9637C"
$REGION = "ap-southeast-1"
$POLICY_NAME = "tradeeon-security-headers-policy"
$POLICY_DESCRIPTION = "Security headers for Tradeeon frontend (HSTS, CSP, etc.)"

Write-Host "Adding security headers to CloudFront distribution: $DISTRIBUTION_ID" -ForegroundColor Cyan

# Step 1: Check if policy already exists
Write-Host "Checking for existing Response Headers Policy..." -ForegroundColor Yellow

try {
    $existingPolicies = aws cloudfront list-response-headers-policies --query "ResponseHeadersPolicyList.Items[?Name=='$POLICY_NAME'].Id" --output text --region $REGION 2>$null
    $POLICY_ID = $existingPolicies.Trim()
    
    if ($POLICY_ID) {
        Write-Host "Policy '$POLICY_NAME' already exists with ID: $POLICY_ID" -ForegroundColor Yellow
        Write-Host "Updating existing policy..." -ForegroundColor Yellow
        
        # Update existing policy
        $updateJson = @{
            Name = $POLICY_NAME
            Comment = $POLICY_DESCRIPTION
            SecurityHeadersConfig = @{
                StrictTransportSecurity = @{
                    Override = $true
                    AccessControlMaxAgeSec = 31536000
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
            }
        } | ConvertTo-Json -Depth 10 -Compress
        
        $updateResult = aws cloudfront update-response-headers-policy --id $POLICY_ID --response-headers-policy-config $updateJson --region $REGION 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to update policy. Creating new one..." -ForegroundColor Red
            $POLICY_ID = $null
        } else {
            Write-Host "Policy updated successfully" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "No existing policy found, will create new one" -ForegroundColor Gray
    $POLICY_ID = $null
}

# Step 2: Create new policy if it doesn't exist
if (-not $POLICY_ID) {
    Write-Host "Creating new Response Headers Policy..." -ForegroundColor Yellow
    
    $policyJson = @{
        Name = $POLICY_NAME
        Comment = $POLICY_DESCRIPTION
        SecurityHeadersConfig = @{
            StrictTransportSecurity = @{
                Override = $true
                AccessControlMaxAgeSec = 31536000
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
        }
    } | ConvertTo-Json -Depth 10 -Compress
    
    $createResult = aws cloudfront create-response-headers-policy --response-headers-policy-config $policyJson --region $REGION 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create policy:" -ForegroundColor Red
        Write-Host $createResult -ForegroundColor Red
        exit 1
    }
    
    # Extract policy ID from output
    $POLICY_ID = ($createResult | ConvertFrom-Json).ResponseHeadersPolicy.Id
    Write-Host "Policy created with ID: $POLICY_ID" -ForegroundColor Green
}

# Step 3: Get current distribution config
Write-Host "Fetching current CloudFront distribution config..." -ForegroundColor Yellow

$configOutput = aws cloudfront get-distribution-config --id $DISTRIBUTION_ID --region $REGION 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to get distribution config:" -ForegroundColor Red
    Write-Host $configOutput -ForegroundColor Red
    exit 1
}

$configJson = $configOutput | ConvertFrom-Json
$ETAG = $configJson.ETag
$distributionConfig = $configJson.DistributionConfig

# Step 4: Update distribution config to use the Response Headers Policy
Write-Host "Updating distribution config..." -ForegroundColor Yellow

# Update the default cache behavior
$distributionConfig.DefaultCacheBehavior.ResponseHeadersPolicyId = $POLICY_ID
$distributionConfig.Comment = "Tradeeon Frontend with Security Headers"

# Convert back to JSON
$updatedConfigJson = $distributionConfig | ConvertTo-Json -Depth 20 -Compress

# Step 5: Apply the updated config
Write-Host "Applying updated configuration..." -ForegroundColor Yellow

$updateOutput = aws cloudfront update-distribution --id $DISTRIBUTION_ID --distribution-config $updatedConfigJson --if-match $ETAG --region $REGION 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update distribution:" -ForegroundColor Red
    Write-Host $updateOutput -ForegroundColor Red
    exit 1
}

$updateResult = $updateOutput | ConvertFrom-Json
$NEW_ETAG = $updateResult.ETag
$STATUS = $updateResult.Distribution.Status

Write-Host ""
Write-Host "Security headers successfully added!" -ForegroundColor Green
Write-Host "Distribution Status: $STATUS" -ForegroundColor Cyan
Write-Host "ETag: $NEW_ETAG" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: CloudFront distribution changes take 5-15 minutes to deploy." -ForegroundColor Yellow
Write-Host "You can check status with:" -ForegroundColor Gray
Write-Host "aws cloudfront get-distribution --id $DISTRIBUTION_ID --region $REGION | ConvertFrom-Json | Select-Object -ExpandProperty Distribution | Select-Object Status" -ForegroundColor Gray
Write-Host ""
Write-Host "Security headers added:" -ForegroundColor Green
Write-Host "  - Strict-Transport-Security (HSTS): max-age=31536000; includeSubDomains; preload" -ForegroundColor Green
Write-Host "  - X-Content-Type-Options: nosniff" -ForegroundColor Green
Write-Host "  - X-Frame-Options: DENY" -ForegroundColor Green
Write-Host "  - Referrer-Policy: strict-origin-when-cross-origin" -ForegroundColor Green
Write-Host "  - Content-Security-Policy: (configured)" -ForegroundColor Green
Write-Host ""

# CloudFront WAF Setup Script
# Creates and attaches AWS WAF to CloudFront distribution

param(
    [Parameter(Mandatory=$false)]
    [string]$DistributionId = "EMF4IMNT9637C",
    
    [Parameter(Mandatory=$false)]
    [string]$WebACLName = "TradeeonCloudFrontWAF",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"  # WAF must be in us-east-1 for CloudFront
)

$ErrorActionPreference = "Stop"

Write-Host "Setting up CloudFront WAF..." -ForegroundColor Cyan
Write-Host "Distribution ID: $DistributionId" -ForegroundColor Yellow
Write-Host "Region: $Region (WAF for CloudFront must be in us-east-1)" -ForegroundColor Yellow

# Step 1: Check if Web ACL exists
Write-Host "`nStep 1: Checking for existing Web ACL..." -ForegroundColor Cyan

$existingACL = aws wafv2 list-web-acls --scope CLOUDFRONT --region $Region --query "WebACLs[?Name=='$WebACLName']" --output json 2>$null | ConvertFrom-Json

if ($existingACL -and $existingACL.Count -gt 0) {
    $webACLId = $existingACL[0].Id
    $webACLArn = $existingACL[0].ARN
    Write-Host "Web ACL '$WebACLName' already exists (ID: $webACLId)" -ForegroundColor Yellow
    Write-Host "ARN: $webACLArn" -ForegroundColor Green
} else {
    Write-Host "Creating new Web ACL..." -ForegroundColor Yellow
    
    # Step 2: Create Web ACL with AWS Managed Rules
    $wafConfig = @{
        Name = $WebACLName
        Scope = "CLOUDFRONT"
        DefaultAction = @{
            Allow = @{}
        }
        Description = "WAF for Tradeeon CloudFront distribution - protects against common web exploits"
        Rules = @(
            @{
                Name = "AWSManagedRulesCommonRuleSet"
                Priority = 0
                Statement = @{
                    ManagedRuleGroupStatement = @{
                        VendorName = "AWS"
                        Name = "AWSManagedRulesCommonRuleSet"
                    }
                }
                OverrideAction = @{
                    None = @{}
                }
                VisibilityConfig = @{
                    SampledRequestsEnabled = $true
                    CloudWatchMetricsEnabled = $true
                    MetricName = "CommonRuleSetMetric"
                }
            },
            @{
                Name = "AWSManagedRulesKnownBadInputsRuleSet"
                Priority = 1
                Statement = @{
                    ManagedRuleGroupStatement = @{
                        VendorName = "AWS"
                        Name = "AWSManagedRulesKnownBadInputsRuleSet"
                    }
                }
                OverrideAction = @{
                    None = @{}
                }
                VisibilityConfig = @{
                    SampledRequestsEnabled = $true
                    CloudWatchMetricsEnabled = $true
                    MetricName = "KnownBadInputsMetric"
                }
            },
            @{
                Name = "AWSManagedRulesLinuxRuleSet"
                Priority = 2
                Statement = @{
                    ManagedRuleGroupStatement = @{
                        VendorName = "AWS"
                        Name = "AWSManagedRulesLinuxRuleSet"
                    }
                }
                OverrideAction = @{
                    None = @{}
                }
                VisibilityConfig = @{
                    SampledRequestsEnabled = $true
                    CloudWatchMetricsEnabled = $true
                    MetricName = "LinuxRuleSetMetric"
                }
            },
            @{
                Name = "AWSManagedRulesSQLiRuleSet"
                Priority = 3
                Statement = @{
                    ManagedRuleGroupStatement = @{
                        VendorName = "AWS"
                        Name = "AWSManagedRulesSQLiRuleSet"
                    }
                }
                OverrideAction = @{
                    None = @{}
                }
                VisibilityConfig = @{
                    SampledRequestsEnabled = $true
                    CloudWatchMetricsEnabled = $true
                    MetricName = "SQLiRuleSetMetric"
                }
            },
            @{
                Name = "RateLimitRule"
                Priority = 4
                Statement = @{
                    RateBasedStatement = @{
                        Limit = 2000
                        AggregateKeyType = "IP"
                    }
                }
                Action = @{
                    Block = @{}
                }
                VisibilityConfig = @{
                    SampledRequestsEnabled = $true
                    CloudWatchMetricsEnabled = $true
                    MetricName = "RateLimitMetric"
                }
            }
        )
        VisibilityConfig = @{
            SampledRequestsEnabled = $true
            CloudWatchMetricsEnabled = $true
            MetricName = "TradeeonWAFMetric"
        }
        Tags = @(
            @{
                Key = "Name"
                Value = $WebACLName
            },
            @{
                Key = "Environment"
                Value = "Production"
            }
        )
    }
    
    $wafConfigJson = $wafConfig | ConvertTo-Json -Depth 10 -Compress
    $tempConfigFile = [System.IO.Path]::GetTempFileName()
    $wafConfigJson | Set-Content $tempConfigFile
    $tempConfigFileForAws = $tempConfigFile -replace '\\', '/'
    
    Write-Host "Creating Web ACL with AWS Managed Rules..." -ForegroundColor Yellow
    
    $createResult = aws wafv2 create-web-acl `
        --scope CLOUDFRONT `
        --region $Region `
        --cli-input-json "file://$tempConfigFileForAws" `
        --output json 2>&1
    
    Remove-Item $tempConfigFile -ErrorAction SilentlyContinue
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to create Web ACL:" -ForegroundColor Red
        Write-Host $createResult -ForegroundColor Red
        exit 1
    }
    
    $webACL = $createResult | ConvertFrom-Json
    $webACLId = $webACL.WebACL.Id
    $webACLArn = $webACL.WebACL.ARN
    
    Write-Host "[SUCCESS] Web ACL created! ID: $webACLId" -ForegroundColor Green
    Write-Host "ARN: $webACLArn" -ForegroundColor Green
}

# Step 3: Get CloudFront distribution config
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

# Step 4: Attach WAF to CloudFront distribution
Write-Host "`nStep 3: Attaching WAF to CloudFront distribution..." -ForegroundColor Cyan

# Add WebACLId to default cache behavior
if (-not $config.DefaultCacheBehavior.PSObject.Properties['WebACLId']) {
    $config.DefaultCacheBehavior | Add-Member -MemberType NoteProperty -Name "WebACLId" -Value $webACLArn -Force
} else {
    $config.DefaultCacheBehavior.WebACLId = $webACLArn
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

Remove-Item $tempConfigFile -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] WAF attached to CloudFront distribution!" -ForegroundColor Green
    Write-Host "`n[NOTE] CloudFront changes take 5-15 minutes to propagate globally" -ForegroundColor Yellow
    Write-Host "Check status: aws cloudfront get-distribution --id $DistributionId --query 'Distribution.Status' --output text" -ForegroundColor Cyan
} else {
    Write-Host "[ERROR] Failed to update distribution:" -ForegroundColor Red
    Write-Host $updateResult -ForegroundColor Red
    exit 1
}

# Step 5: Summary
Write-Host "`n[SUCCESS] CloudFront WAF setup complete!" -ForegroundColor Green
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "  - Web ACL Name: $WebACLName" -ForegroundColor White
Write-Host "  - Web ACL ID: $webACLId" -ForegroundColor White
Write-Host "  - Web ACL ARN: $webACLArn" -ForegroundColor White
Write-Host "  - Distribution ID: $DistributionId" -ForegroundColor White
Write-Host "`nAWS Managed Rules Enabled:" -ForegroundColor Cyan
Write-Host "  [OK] Common Rule Set (OWASP Top 10)" -ForegroundColor White
Write-Host "  [OK] Known Bad Inputs" -ForegroundColor White
Write-Host "  [OK] Linux Rule Set" -ForegroundColor White
Write-Host "  [OK] SQL Injection Protection" -ForegroundColor White
Write-Host "  [OK] Rate Limiting (2000 requests per IP)" -ForegroundColor White
Write-Host "`nVerify WAF is active:" -ForegroundColor Cyan
Write-Host "  aws cloudfront get-distribution --id $DistributionId --query 'Distribution.DistributionConfig.DefaultCacheBehavior.WebACLId' --output text" -ForegroundColor Yellow
Write-Host "`nView WAF metrics:" -ForegroundColor Cyan
Write-Host "  https://console.aws.amazon.com/wafv2/home?region=us-east-1#/web-acls" -ForegroundColor Yellow


# Diagnostic Script: What Broke This Morning?
# Checks CloudFront, S3, Route53, and SSL certificate status

param(
    [string]$CloudFrontDistributionId = "EMF4IMNT9637C",
    [string]$S3Bucket = "tradeeon-frontend",
    [string]$Domain = "www.tradeeon.com"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Diagnosing What Broke" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$issues = @()
$warnings = @()

# Step 1: Check CloudFront Distribution Status
Write-Host "1. Checking CloudFront Distribution..." -ForegroundColor Yellow
try {
    $cfDist = aws cloudfront get-distribution --id $CloudFrontDistributionId --output json 2>&1 | ConvertFrom-Json
    
    if ($LASTEXITCODE -ne 0) {
        $issues += "CloudFront distribution $CloudFrontDistributionId not found or inaccessible"
        Write-Host "   [FAIL] Distribution not found!" -ForegroundColor Red
    } else {
        $status = $cfDist.Distribution.Status
        $enabled = $cfDist.Distribution.DistributionConfig.Enabled
        $domain = $cfDist.Distribution.DomainName
        $aliases = $cfDist.Distribution.DistributionConfig.Aliases.Items
        
        Write-Host "   [OK] Distribution exists" -ForegroundColor Green
        Write-Host "   Status: $status" -ForegroundColor $(if ($status -eq "Deployed") { "Green" } else { "Yellow" })
        Write-Host "   Enabled: $enabled" -ForegroundColor $(if ($enabled) { "Green" } else { "Red" })
        Write-Host "   Domain: $domain" -ForegroundColor Gray
        
        if (-not $enabled) {
            $issues += "CloudFront distribution is DISABLED"
        }
        
        if ($status -ne "Deployed") {
            $warnings += "CloudFront distribution status is '$status' (not Deployed)"
        }
        
        # Check custom domain
        if ($aliases -contains $Domain -or $aliases -contains "www.tradeeon.com") {
            Write-Host "   [OK] Custom domain configured: $Domain" -ForegroundColor Green
        } else {
            $issues += "Custom domain '$Domain' NOT configured in CloudFront"
            Write-Host "   [FAIL] Custom domain '$Domain' NOT in aliases!" -ForegroundColor Red
            Write-Host "   Current aliases: $($aliases -join ', ')" -ForegroundColor Gray
        }
        
        # Check origin
        $origin = $cfDist.Distribution.DistributionConfig.Origins.Items[0]
        Write-Host "   Origin: $($origin.DomainName)" -ForegroundColor Gray
        
        if ($origin.DomainName -notlike "*$S3Bucket*") {
            $issues += "CloudFront origin doesn't match S3 bucket '$S3Bucket'"
            Write-Host "   [WARN] Origin might be wrong!" -ForegroundColor Yellow
        }
    }
} catch {
    $issues += "Error checking CloudFront: $_"
    Write-Host "   [FAIL] Error: $_" -ForegroundColor Red
}

Write-Host ""

# Step 2: Check S3 Bucket
Write-Host "2. Checking S3 Bucket..." -ForegroundColor Yellow
try {
    $bucketExists = aws s3 ls "s3://$S3Bucket" 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        $issues += "S3 bucket '$S3Bucket' not found or inaccessible"
        Write-Host "   [FAIL] Bucket not found!" -ForegroundColor Red
    } else {
        Write-Host "   [OK] Bucket exists" -ForegroundColor Green
        
        # Check for index.html
        $indexExists = aws s3 ls "s3://$S3Bucket/index.html" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] index.html exists" -ForegroundColor Green
        } else {
            $issues += "S3 bucket is missing index.html"
            Write-Host "   [FAIL] index.html missing!" -ForegroundColor Red
        }
        
        # Count files
        $fileCount = (aws s3 ls "s3://$S3Bucket" --recursive 2>&1 | Measure-Object -Line).Lines
        Write-Host "   Files: $fileCount" -ForegroundColor Gray
        
        if ($fileCount -lt 5) {
            $warnings += "S3 bucket has very few files ($fileCount) - might be empty"
        }
    }
} catch {
    $issues += "Error checking S3: $_"
    Write-Host "   [FAIL] Error: $_" -ForegroundColor Red
}

Write-Host ""

# Step 3: Check Route53 DNS Record
Write-Host "3. Checking Route53 DNS Record..." -ForegroundColor Yellow
try {
    $zones = aws route53 list-hosted-zones --output json 2>&1 | ConvertFrom-Json
    
    if ($LASTEXITCODE -ne 0) {
        $issues += "Cannot access Route53 hosted zones"
        Write-Host "   [FAIL] Cannot list hosted zones" -ForegroundColor Red
    } else {
        $zone = $zones.HostedZones | Where-Object { $_.Name -eq "tradeeon.com." }
        
        if (-not $zone) {
            $issues += "Route53 hosted zone for 'tradeeon.com' not found"
            Write-Host "   [FAIL] Hosted zone not found" -ForegroundColor Red
        } else {
            $zoneId = $zone.Id -replace '/hostedzone/', ''
            Write-Host "   [OK] Hosted zone found: $($zone.Name)" -ForegroundColor Green
            
            # Get records
            $records = aws route53 list-resource-record-sets --hosted-zone-id $zoneId --output json 2>&1 | ConvertFrom-Json
            
            $wwwRecord = $records.ResourceRecordSets | Where-Object { 
                $_.Name -eq "$Domain." -or $_.Name -eq $Domain
            }
            
            if ($wwwRecord) {
                Write-Host "   [OK] DNS record exists for $Domain" -ForegroundColor Green
                Write-Host "   Type: $($wwwRecord.Type)" -ForegroundColor Gray
                
                if ($wwwRecord.AliasTarget) {
                    $targetDomain = $wwwRecord.AliasTarget.DNSName
                    Write-Host "   Points to: $targetDomain" -ForegroundColor Gray
                    
                    # Check if it points to correct CloudFront
                    if ($targetDomain -like "*.cloudfront.net") {
                        Write-Host "   [OK] Points to CloudFront" -ForegroundColor Green
                        
                        # Get actual CloudFront domain
                        $cfDomain = (aws cloudfront get-distribution --id $CloudFrontDistributionId --query "Distribution.DomainName" --output text 2>&1)
                        if ($targetDomain -ne $cfDomain) {
                            $issues += "Route53 record points to wrong CloudFront domain. Expected: $cfDomain, Actual: $targetDomain"
                            Write-Host "   [FAIL] Points to WRONG CloudFront domain!" -ForegroundColor Red
                            Write-Host "   Expected: $cfDomain" -ForegroundColor Yellow
                            Write-Host "   Actual: $targetDomain" -ForegroundColor Yellow
                        }
                    } else {
                        $issues += "Route53 record doesn't point to CloudFront (points to: $targetDomain)"
                        Write-Host "   [FAIL] Doesn't point to CloudFront!" -ForegroundColor Red
                    }
                } else {
                    $issues += "Route53 record exists but has no AliasTarget (might be CNAME or A record without alias)"
                    Write-Host "   [WARN] Record exists but no AliasTarget" -ForegroundColor Yellow
                }
            } else {
                $issues += "Route53 DNS record for '$Domain' not found"
                Write-Host "   [FAIL] DNS record not found!" -ForegroundColor Red
            }
        }
    }
} catch {
    $issues += "Error checking Route53: $_"
    Write-Host "   [FAIL] Error: $_" -ForegroundColor Red
}

Write-Host ""

# Step 4: Check SSL Certificate
Write-Host "4. Checking SSL Certificate..." -ForegroundColor Yellow
try {
    # Check if certificate exists in us-east-1 (required for CloudFront)
    $certs = aws acm list-certificates --region us-east-1 --output json 2>&1 | ConvertFrom-Json
    
    if ($LASTEXITCODE -eq 0) {
        $domainCert = $certs.CertificateSummaryList | Where-Object { 
            $_.DomainName -eq "tradeeon.com" -or $_.DomainName -eq "*.tradeeon.com" -or 
            ($_.SubjectAlternativeNames -contains "tradeeon.com" -or $_.SubjectAlternativeNames -contains "*.tradeeon.com")
        }
        
        if ($domainCert) {
            Write-Host "   [OK] SSL certificate found" -ForegroundColor Green
            Write-Host "   Domain: $($domainCert.DomainName)" -ForegroundColor Gray
            
            # Get certificate details
            $certDetails = aws acm describe-certificate --certificate-arn $domainCert.CertificateArn --region us-east-1 --output json 2>&1 | ConvertFrom-Json
            
            if ($certDetails.Certificate.Status -eq "ISSUED") {
                Write-Host "   Status: ISSUED" -ForegroundColor Green
            } else {
                $warnings += "SSL certificate status is '$($certDetails.Certificate.Status)' (not ISSUED)"
                Write-Host "   Status: $($certDetails.Certificate.Status)" -ForegroundColor Yellow
            }
        } else {
            $warnings += "No SSL certificate found for tradeeon.com in us-east-1"
            Write-Host "   [WARN] No certificate found" -ForegroundColor Yellow
        }
    } else {
        $warnings += "Cannot check SSL certificates (might not have permissions)"
        Write-Host "   [WARN] Cannot check certificates" -ForegroundColor Yellow
    }
} catch {
    $warnings += "Error checking SSL certificate: $_"
    Write-Host "   [WARN] Error: $_" -ForegroundColor Yellow
}

Write-Host ""

# Step 5: Check Recent CloudFront Changes
Write-Host "5. Checking Recent CloudFront Changes..." -ForegroundColor Yellow
try {
    $cfConfig = aws cloudfront get-distribution-config --id $CloudFrontDistributionId --output json 2>&1 | ConvertFrom-Json
    
    if ($LASTEXITCODE -eq 0) {
        $lastModified = $cfConfig.DistributionConfig.LastModifiedTime
        Write-Host "   Last Modified: $lastModified" -ForegroundColor Gray
        
        # Check if modified today
        $modifiedDate = [DateTime]::Parse($lastModified)
        $today = Get-Date
        if ($modifiedDate.Date -eq $today.Date) {
            $warnings += "CloudFront distribution was modified TODAY ($lastModified) - this might be the cause!"
            Write-Host "   [WARN] Modified TODAY - might be the cause!" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   [WARN] Cannot check modification time" -ForegroundColor Yellow
}

Write-Host ""

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ No issues found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "If DNS still not working, try:" -ForegroundColor Yellow
    Write-Host "1. Wait 15-60 minutes for DNS propagation" -ForegroundColor Gray
    Write-Host "2. Clear browser DNS cache" -ForegroundColor Gray
    Write-Host "3. Try different DNS server (8.8.8.8)" -ForegroundColor Gray
} else {
    if ($issues.Count -gt 0) {
        Write-Host "🔴 CRITICAL ISSUES FOUND:" -ForegroundColor Red
        foreach ($issue in $issues) {
            Write-Host "   - $issue" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  WARNINGS:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   - $warning" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
    Write-Host "🔧 RECOMMENDED FIXES:" -ForegroundColor Cyan
    Write-Host ""
    
    if ($issues -like "*CloudFront distribution is DISABLED*") {
        Write-Host "1. Enable CloudFront distribution:" -ForegroundColor Yellow
        Write-Host "   - Go to CloudFront Console" -ForegroundColor Gray
        Write-Host "   - Select distribution $CloudFrontDistributionId" -ForegroundColor Gray
        Write-Host "   - Click 'Edit' → Enable distribution" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($issues -like "*Custom domain*NOT configured*") {
        Write-Host "2. Add custom domain to CloudFront:" -ForegroundColor Yellow
        Write-Host "   - CloudFront → Distribution → Settings" -ForegroundColor Gray
        Write-Host "   - Add '$Domain' to Alternate domain names (CNAMEs)" -ForegroundColor Gray
        Write-Host "   - Select SSL certificate" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($issues -like "*points to wrong CloudFront*") {
        Write-Host "3. Fix Route53 record to point to correct CloudFront:" -ForegroundColor Yellow
        Write-Host "   - Run: .\fix-dns-www-tradeeon.ps1" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($issues -like "*S3 bucket*missing index.html*") {
        Write-Host "4. Redeploy frontend:" -ForegroundColor Yellow
        Write-Host "   - Trigger GitHub Actions: deploy-frontend workflow" -ForegroundColor Gray
        Write-Host "   - Or manually: cd apps/frontend && npm run build && aws s3 sync dist/ s3://$S3Bucket/ --delete" -ForegroundColor Gray
        Write-Host ""
    }
}

Write-Host "=========================================" -ForegroundColor Cyan


# Check AWS Resources Before Deletion
Write-Host "`nChecking AWS Resources...`n" -ForegroundColor Cyan

# Check CloudFront Distribution
Write-Host "1. CloudFront Distributions:" -ForegroundColor Yellow
try {
    $allDists = aws cloudfront list-distributions --output json | ConvertFrom-Json
    $distributions = $allDists.DistributionList.Items | Where-Object { $_.Comment -like "*tradeeon*" }
    if ($distributions) {
        foreach ($dist in $distributions) {
            Write-Host "   Distribution ID: $($dist.Id)" -ForegroundColor White
            Write-Host "   Status: $($dist.Status)" -ForegroundColor White
        }
    } else {
        Write-Host "   No CloudFront distributions found" -ForegroundColor Green
    }
} catch {
    Write-Host "   Could not check CloudFront" -ForegroundColor Yellow
}

# Check S3 Buckets
Write-Host "`n2. S3 Buckets:" -ForegroundColor Yellow
try {
    $allBuckets = aws s3api list-buckets --output json | ConvertFrom-Json
    $buckets = $allBuckets.Buckets | Where-Object { $_.Name -like "*tradeeon*" }
    if ($buckets) {
        foreach ($bucket in $buckets) {
            Write-Host "   Bucket: $($bucket.Name)" -ForegroundColor White
        }
    } else {
        Write-Host "   No S3 buckets found" -ForegroundColor Green
    }
} catch {
    Write-Host "   Could not check S3" -ForegroundColor Yellow
}

# Check Route 53 Records
Write-Host "`n3. Route 53 Records:" -ForegroundColor Yellow
try {
    $allZones = aws route53 list-hosted-zones --output json | ConvertFrom-Json
    $zones = $allZones.HostedZones | Where-Object { $_.Name -like "*tradeeon*" }
    if ($zones) {
        foreach ($zone in $zones) {
            Write-Host "   Hosted Zone: $($zone.Name)" -ForegroundColor White
        }
    } else {
        Write-Host "   No Route 53 hosted zones found" -ForegroundColor Green
    }
} catch {
    Write-Host "   Could not check Route 53" -ForegroundColor Yellow
}

# Check SSL Certificates
Write-Host "`n4. SSL Certificates (ACM):" -ForegroundColor Yellow
try {
    $allCerts = aws acm list-certificates --region us-east-1 --output json | ConvertFrom-Json
    $certs = $allCerts.CertificateSummaryList | Where-Object { $_.DomainName -like "*tradeeon*" }
    if ($certs) {
        foreach ($cert in $certs) {
            Write-Host "   Certificate: $($cert.DomainName)" -ForegroundColor White
            Write-Host "   Status: $($cert.Status)" -ForegroundColor White
        }
    } else {
        Write-Host "   No SSL certificates found" -ForegroundColor Green
    }
} catch {
    Write-Host "   Could not check ACM" -ForegroundColor Yellow
}

Write-Host "`nResource check complete!`n" -ForegroundColor Green
Write-Host "Next: Follow DELETE_ALL_RESOURCES.md to delete everything`n" -ForegroundColor Cyan

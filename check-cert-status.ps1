# Check SSL Certificate Validation Status
$certArn = "arn:aws:acm:us-east-1:531604848081:certificate/51c40e7e-6064-4cb4-a231-2cda5c8dbcbf"

Write-Host "Checking certificate status..." -ForegroundColor Yellow
$status = aws acm describe-certificate --certificate-arn $certArn --region us-east-1 --query "Certificate.Status" --output text

Write-Host "Status: $status" -ForegroundColor $(if ($status -eq "ISSUED") { "Green" } else { "Yellow" })

if ($status -eq "ISSUED") {
    Write-Host "`n✅ Certificate is ready! You can now create the CloudFront distribution." -ForegroundColor Green
    Write-Host "Run: aws cloudfront create-distribution --distribution-config file://cloudfront-config.json" -ForegroundColor Cyan
} else {
    Write-Host "`n⏳ Certificate is still validating. Please wait and check again in a few minutes." -ForegroundColor Yellow
    Write-Host "DNS validation can take 5-10 minutes after DNS record propagation." -ForegroundColor Yellow
}



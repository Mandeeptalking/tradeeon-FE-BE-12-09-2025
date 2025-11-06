# Wait for SSL Certificate Validation
$certArn = "arn:aws:acm:us-east-1:531604848081:certificate/51c40e7e-6064-4cb4-a231-2cda5c8dbcbf"
$maxWaitMinutes = 15
$checkInterval = 30 # seconds

Write-Host "`n🔍 Monitoring SSL Certificate Validation..." -ForegroundColor Cyan
Write-Host "Certificate ARN: $certArn" -ForegroundColor Gray
Write-Host "Checking every $checkInterval seconds (max wait: $maxWaitMinutes minutes)`n" -ForegroundColor Gray

$startTime = Get-Date
$endTime = $startTime.AddMinutes($maxWaitMinutes)
$iteration = 0

while ($true) {
    $iteration++
    $status = aws acm describe-certificate --certificate-arn $certArn --region us-east-1 --query "Certificate.Status" --output text 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $elapsed = (Get-Date) - $startTime
        $elapsedMinutes = [math]::Round($elapsed.TotalMinutes, 1)
        
        Write-Host "[$iteration] Status: $status (Elapsed: $elapsedMinutes min)" -ForegroundColor $(if ($status -eq "ISSUED") { "Green" } else { "Yellow" })
        
        if ($status -eq "ISSUED") {
            Write-Host "`n✅ SUCCESS! Certificate is validated and ready!" -ForegroundColor Green
            Write-Host "`nYou can now proceed with:" -ForegroundColor Cyan
            Write-Host "1. Create CloudFront distribution" -ForegroundColor White
            Write-Host "2. Deploy backend to AWS" -ForegroundColor White
            break
        }
        
        if ($status -eq "FAILED") {
            Write-Host "`n❌ Certificate validation failed!" -ForegroundColor Red
            Write-Host "Please check DNS records in Route53." -ForegroundColor Yellow
            break
        }
        
        if ((Get-Date) -gt $endTime) {
            Write-Host "`n⏱️  Maximum wait time reached." -ForegroundColor Yellow
            Write-Host "Certificate may still be validating. Please check manually later." -ForegroundColor Yellow
            break
        }
    } else {
        Write-Host "[$iteration] Error checking status. Retrying..." -ForegroundColor Red
    }
    
    Write-Host "Waiting $checkInterval seconds before next check...`n" -ForegroundColor Gray
    Start-Sleep -Seconds $checkInterval
}

Write-Host "`nTo check status manually, run:" -ForegroundColor Cyan
Write-Host "aws acm describe-certificate --certificate-arn $certArn --region us-east-1 --query 'Certificate.Status' --output text" -ForegroundColor Gray



# Setup CloudFront Distribution for Tradeeon via PowerShell
# Run this from the project root directory

Write-Host "`n=== Setting up CloudFront Distribution ===`n" -ForegroundColor Yellow

$BUCKET_NAME = "www-tradeeon-prod"
$ORIGIN_DOMAIN = "$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"

Write-Host "Creating CloudFront config..." -ForegroundColor Cyan

# Create JSON manually
$json = @"
{
  "CallerReference": "tradeeon-s3-$(Get-Date -Format 'yyyyMMddHHmmss')",
  "Comment": "Tradeeon frontend distribution",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-tradeeon-prod",
        "DomainName": "$ORIGIN_DOMAIN",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 3,
            "Items": ["TLSv1", "TLSv1.1", "TLSv1.2"]
          }
        },
        "ConnectionAttempts": 3,
        "ConnectionTimeout": 10
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-tradeeon-prod",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      },
      "Headers": {
        "Quantity": 0
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "PriceClass": "PriceClass_100",
  "DefaultRootObject": "index.html",
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 10
      },
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 10
      }
    ]
  },
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": true
  }
}
"@

$json | Out-File -FilePath "cloudfront-config.json" -Encoding utf8 -NoNewline

Write-Host "`nCreating CloudFront distribution..." -ForegroundColor Cyan
Write-Host "This takes 10-15 minutes...`n" -ForegroundColor Yellow

# Create distribution
try {
    $result = aws cloudfront create-distribution --distribution-config file://cloudfront-config.json --output json 2>&1 | Out-String
    $distObj = $result | ConvertFrom-Json
    
    $DISTRIBUTION_ID = $distObj.Distribution.Id
    $DOMAIN = $distObj.Distribution.DomainName
    $STATUS = $distObj.Distribution.Status
    
    Write-Host "`n✅ Distribution created!`n" -ForegroundColor Green
    Write-Host "Distribution ID: $DISTRIBUTION_ID" -ForegroundColor White
    Write-Host "Domain: https://$DOMAIN" -ForegroundColor White
    Write-Host "Status: $STATUS`n" -ForegroundColor Yellow
    
    Write-Host "✅ Save this Distribution ID for Route 53 DNS setup!`n" -ForegroundColor Cyan
    
    # Save to file for later reference
    @{
        DistributionId = $DISTRIBUTION_ID
        Domain = $DOMAIN
        Origin = $ORIGIN_DOMAIN
        CreatedAt = Get-Date
    } | ConvertTo-Json | Out-File -FilePath "cloudfront-info.json"
    
    Write-Host "Distribution info saved to: cloudfront-info.json`n" -ForegroundColor Gray
    
    Write-Host "⏳ Distribution is being deployed..." -ForegroundColor Yellow
    Write-Host "This takes 10-15 minutes. Check status with:" -ForegroundColor Gray
    Write-Host "aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.Status' --output text`n" -ForegroundColor Gray
    
} catch {
    Write-Host "`n❌ Error creating distribution:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`nCheck the error above and try again.`n" -ForegroundColor Yellow
}

# Cleanup
Remove-Item "cloudfront-config.json" -ErrorAction SilentlyContinue

Write-Host "`n✅ Setup script complete!`n" -ForegroundColor Green


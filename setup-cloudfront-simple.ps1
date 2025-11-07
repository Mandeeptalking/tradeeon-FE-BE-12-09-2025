# Simple CloudFront Setup
# Creates the JSON and shows you the command to run

Write-Host "`n=== CloudFront Setup ===`n" -ForegroundColor Yellow

$BUCKET_NAME = "www-tradeeon-prod"
$ORIGIN_DOMAIN = "$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"

# Create JSON config
$json = @"
{
  "CallerReference": "tradeeon-$(Get-Date -UFormat '%Y%m%d%H%M%S')",
  "Comment": "Tradeeon frontend",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-tradeeon",
        "DomainName": "$ORIGIN_DOMAIN",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-tradeeon",
    "ViewerProtocolPolicy": "redirect-to-https"
  },
  "DefaultRootObject": "index.html"
}
"@

$json | Out-File -FilePath "cloudfront-simple.json" -Encoding utf8 -NoNewline

Write-Host "✅ Config created: cloudfront-simple.json`n" -ForegroundColor Green

Write-Host "Run this command in YOUR PowerShell:`n" -ForegroundColor Yellow
Write-Host "aws cloudfront create-distribution --distribution-config file://cloudfront-simple.json --output json > cloudfront-result.json`n" -ForegroundColor Green

Write-Host "Then check the result with:`n" -ForegroundColor Cyan
Write-Host "Get-Content cloudfront-result.json | ConvertFrom-Json | Select-Object -ExpandProperty Distribution | Select-Object Id, DomainName, Status`n" -ForegroundColor Gray




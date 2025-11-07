#!/usr/bin/env pwsh
# Fix S3 bucket permissions for static website hosting

Write-Host "`n=== Fixing S3 Bucket Permissions ===`n" -ForegroundColor Yellow

# Apply bucket policy for public read access
$policy = @'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::www-tradeeon-prod/*"
    }
  ]
}
'@

Write-Host "Applying bucket policy..." -ForegroundColor Cyan
aws s3api put-bucket-policy --bucket www-tradeeon-prod --policy $policy

Write-Host "`n✅ Permissions fixed!" -ForegroundColor Green
Write-Host "`nTest your website at:" -ForegroundColor Yellow
Write-Host "http://www-tradeeon-prod.s3-website-us-east-1.amazonaws.com`n" -ForegroundColor White




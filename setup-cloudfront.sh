#!/bin/bash
# Setup CloudFront Distribution for Tradeeon

set -e

echo "=== Setting up CloudFront Distribution ==="
echo ""

BUCKET_NAME="www-tradeeon-prod"
ORIGIN_DOMAIN="${BUCKET_NAME}.s3-website-us-east-1.amazonaws.com"

# Create CloudFront distribution configuration
cat > cloudfront-config.json << 'EOF'
{
  "CallerReference": "tradeeon-s3-$(date +%s)",
  "Comment": "Tradeeon frontend distribution",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-tradeeon-prod",
        "DomainName": "ORIGIN_DOMAIN_PLACEHOLDER",
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
  "Enabled": true,
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
EOF

# Replace placeholder with actual domain
sed "s|ORIGIN_DOMAIN_PLACEHOLDER|${ORIGIN_DOMAIN}|g" cloudfront-config.json > cloudfront-config-final.json

echo "✅ Configuration created"
echo ""

# Create CloudFront distribution
echo "Creating CloudFront distribution (this takes 10-15 minutes)..."
echo ""

DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config-final.json \
  --query 'Distribution.Id' \
  --output text)

echo ""
echo "✅ Distribution created!"
echo ""
echo "Distribution ID: $DISTRIBUTION_ID"
echo ""
echo "Save this ID - you'll need it for Route 53 DNS setup"
echo ""

# Get distribution domain
echo "Getting distribution domain..."
DOMAIN=$(aws cloudfront get-distribution \
  --id "$DISTRIBUTION_ID" \
  --query 'Distribution.DomainName' \
  --output text)

echo ""
echo "✅ CloudFront Domain: https://$DOMAIN"
echo ""
echo "⏳ Distribution is being deployed..."
echo "This takes 10-15 minutes. Check status with:"
echo "aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.Status' --output text"
echo ""

# Cleanup
rm cloudfront-config.json cloudfront-config-final.json

echo "✅ Setup complete! Distribution ID saved above."
echo ""


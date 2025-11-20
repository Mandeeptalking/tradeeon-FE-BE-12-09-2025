#!/bin/bash
# Fix DNS for www.tradeeon.com - Bash Script
# This script creates/updates the Route53 A record pointing to CloudFront

set -e

CLOUDFRONT_ID="EMF4IMNT9637C"
HOSTED_ZONE_NAME="tradeeon.com"

echo "========================================="
echo "Fix DNS for www.tradeeon.com"
echo "========================================="
echo ""

# Step 1: Get CloudFront Distribution Domain
echo "1. Getting CloudFront distribution domain..."
CF_DOMAIN=$(aws cloudfront get-distribution --id $CLOUDFRONT_ID --query "Distribution.DomainName" --output text 2>/dev/null)

if [ -z "$CF_DOMAIN" ]; then
    echo "   [FAIL] Could not get CloudFront distribution"
    exit 1
fi

echo "   [OK] CloudFront Domain: $CF_DOMAIN"

# Step 2: Get Hosted Zone ID
echo ""
echo "2. Getting Route53 hosted zone ID..."
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='$HOSTED_ZONE_NAME.'].[Id]" --output text 2>/dev/null | cut -d'/' -f3)

if [ -z "$HOSTED_ZONE_ID" ]; then
    echo "   [FAIL] Hosted zone not found for $HOSTED_ZONE_NAME"
    exit 1
fi

echo "   [OK] Hosted Zone ID: $HOSTED_ZONE_ID"

# Step 3: Check if www record exists
echo ""
echo "3. Checking existing www.tradeeon.com record..."
WWW_RECORD=$(aws route53 list-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --query "ResourceRecordSets[?Name=='www.tradeeon.com.' || Name=='www.tradeeon.com']" --output json 2>/dev/null || echo "[]")

if [ "$WWW_RECORD" != "[]" ]; then
    echo "   [INFO] Existing record found:"
    echo "$WWW_RECORD" | jq -r '.[0] | "   Name: \(.Name)\n   Type: \(.Type)\n   Target: \(.AliasTarget.DNSName // "N/A")"' 2>/dev/null || echo "   (check manually)"
else
    echo "   [INFO] No existing www record found (will create new)"
fi

# Step 4: Create/Update DNS Record
echo ""
echo "4. Creating/Updating Route53 A record..."

CHANGE_BATCH=$(cat <<EOF
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "www.tradeeon.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "$CF_DOMAIN",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
EOF
)

echo "$CHANGE_BATCH" > /tmp/route53-change-batch.json

CHANGE_RESULT=$(aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file:///tmp/route53-change-batch.json \
  --output json 2>&1)

if [ $? -eq 0 ]; then
    CHANGE_ID=$(echo "$CHANGE_RESULT" | jq -r '.ChangeInfo.Id' 2>/dev/null || echo "N/A")
    CHANGE_STATUS=$(echo "$CHANGE_RESULT" | jq -r '.ChangeInfo.Status' 2>/dev/null || echo "N/A")
    
    echo "   [OK] DNS record created/updated successfully!"
    echo "   Change ID: $CHANGE_ID"
    echo "   Status: $CHANGE_STATUS"
else
    echo "   [FAIL] Could not create/update DNS record"
    echo "   Error: $CHANGE_RESULT"
    rm -f /tmp/route53-change-batch.json
    exit 1
fi

rm -f /tmp/route53-change-batch.json

# Step 5: Summary
echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "✅ DNS record created/updated for www.tradeeon.com"
echo "   Points to: $CF_DOMAIN"
echo ""
echo "⏱️  DNS Propagation:"
echo "   - Minimum: 5-15 minutes"
echo "   - Typical: 30-60 minutes"
echo "   - Maximum: 24-48 hours (rare)"
echo ""
echo "🔍 Verify DNS propagation:"
echo "   https://dnschecker.org/#A/www.tradeeon.com"
echo ""
echo "🧪 Test website:"
echo "   https://www.tradeeon.com"
echo ""
echo "========================================="


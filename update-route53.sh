#!/bin/bash
# Update Route 53 DNS Record for api.tradeeon.com
# Run this in AWS CloudShell

STATIC_IP="18.136.45.140"
ZONE_ID="Z08494351HC32A4M6XAOH"

echo "Updating Route 53 DNS record..."
echo "Pointing api.tradeeon.com to $STATIC_IP"

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.tradeeon.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$STATIC_IP'"}]
      }
    }]
  }'

echo ""
echo "✅ DNS record updated!"
echo "Wait 5-10 minutes for DNS propagation"
echo "Test with: curl http://api.tradeeon.com/health"


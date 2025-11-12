#!/bin/bash
# Script to add security headers to CloudFront distribution
# This adds HSTS and other security headers via CloudFront Response Headers Policy

set -e

DISTRIBUTION_ID="EMF4IMNT9637C"
REGION="ap-southeast-1"

echo "🔒 Adding security headers to CloudFront distribution: $DISTRIBUTION_ID"

# Step 1: Create Response Headers Policy with security headers
echo "📝 Creating Response Headers Policy..."

POLICY_NAME="tradeeon-security-headers-policy"
POLICY_DESCRIPTION="Security headers for Tradeeon frontend (HSTS, CSP, etc.)"

# Check if policy already exists
EXISTING_POLICY=$(aws cloudfront list-response-headers-policies \
  --query "ResponseHeadersPolicyList.Items[?Name=='$POLICY_NAME'].Id" \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_POLICY" ]; then
  echo "⚠️  Policy '$POLICY_NAME' already exists with ID: $EXISTING_POLICY"
  POLICY_ID=$EXISTING_POLICY
  echo "🔄 Updating existing policy..."
  
  # Update existing policy
  aws cloudfront update-response-headers-policy \
    --id "$POLICY_ID" \
    --response-headers-policy-config '{
      "Name": "'"$POLICY_NAME"'",
      "Comment": "'"$POLICY_DESCRIPTION"'",
      "SecurityHeadersConfig": {
        "StrictTransportSecurity": {
          "Override": true,
          "AccessControlMaxAgeSec": 31536000,
          "IncludeSubdomains": true,
          "Preload": true
        },
        "ContentTypeOptions": {
          "Override": true
        },
        "FrameOptions": {
          "Override": true,
          "FrameOption": "DENY"
        },
        "ReferrerPolicy": {
          "Override": true,
          "ReferrerPolicy": "strict-origin-when-cross-origin"
        },
        "ContentSecurityPolicy": {
          "Override": true,
          "ContentSecurityPolicy": "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\'' '\''unsafe-eval'\''; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data: https:; font-src '\''self'\'' data:; connect-src '\''self'\'' https://*.supabase.co https://api.tradeeon.com https://*.binance.com wss://*.binance.com; frame-ancestors '\''none'\''; base-uri '\''self'\''; form-action '\''self'\''; upgrade-insecure-requests;"
        }
      }
    }' \
    --region "$REGION" || {
      echo "❌ Failed to update policy. Trying to create new one..."
      EXISTING_POLICY=""
    }
else
  echo "✨ Creating new Response Headers Policy..."
  
  # Create new policy
  POLICY_OUTPUT=$(aws cloudfront create-response-headers-policy \
    --response-headers-policy-config '{
      "Name": "'"$POLICY_NAME"'",
      "Comment": "'"$POLICY_DESCRIPTION"'",
      "SecurityHeadersConfig": {
        "StrictTransportSecurity": {
          "Override": true,
          "AccessControlMaxAgeSec": 31536000,
          "IncludeSubdomains": true,
          "Preload": true
        },
        "ContentTypeOptions": {
          "Override": true
        },
        "FrameOptions": {
          "Override": true,
          "FrameOption": "DENY"
        },
        "ReferrerPolicy": {
          "Override": true,
          "ReferrerPolicy": "strict-origin-when-cross-origin"
        },
        "ContentSecurityPolicy": {
          "Override": true,
          "ContentSecurityPolicy": "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\'' '\''unsafe-eval'\''; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data: https:; font-src '\''self'\'' data:; connect-src '\''self'\'' https://*.supabase.co https://api.tradeeon.com https://*.binance.com wss://*.binance.com; frame-ancestors '\''none'\''; base-uri '\''self'\''; form-action '\''self'\''; upgrade-insecure-requests;"
        }
      }
    }' \
    --region "$REGION" 2>&1)
  
  if [ $? -eq 0 ]; then
    POLICY_ID=$(echo "$POLICY_OUTPUT" | grep -oP '"Id":\s*"\K[^"]+' | head -1)
    echo "✅ Policy created with ID: $POLICY_ID"
  else
    echo "❌ Failed to create policy:"
    echo "$POLICY_OUTPUT"
    exit 1
  fi
fi

# Step 2: Get current distribution config
echo "📥 Fetching current CloudFront distribution config..."
aws cloudfront get-distribution-config \
  --id "$DISTRIBUTION_ID" \
  --region "$REGION" > /tmp/cloudfront-config.json

ETAG=$(jq -r '.ETag' /tmp/cloudfront-config.json)
CONFIG=$(jq -r '.DistributionConfig' /tmp/cloudfront-config.json)

# Step 3: Update distribution config to use the Response Headers Policy
echo "🔄 Updating distribution config..."

# Update the default cache behavior to include the response headers policy
UPDATED_CONFIG=$(echo "$CONFIG" | jq --arg POLICY_ID "$POLICY_ID" '
  .DefaultCacheBehavior.ResponseHeadersPolicyId = $POLICY_ID |
  .Comment = "Tradeeon Frontend with Security Headers"
')

# Step 4: Apply the updated config
echo "🚀 Applying updated configuration..."
aws cloudfront update-distribution \
  --id "$DISTRIBUTION_ID" \
  --distribution-config "$UPDATED_CONFIG" \
  --if-match "$ETAG" \
  --region "$REGION" > /tmp/cloudfront-update-result.json

NEW_ETAG=$(jq -r '.ETag' /tmp/cloudfront-update-result.json)
STATUS=$(jq -r '.Distribution.Status' /tmp/cloudfront-update-result.json)

echo ""
echo "✅ Security headers successfully added!"
echo "📊 Distribution Status: $STATUS"
echo "🏷️  ETag: $NEW_ETAG"
echo ""
echo "⏳ Note: CloudFront distribution changes take 5-15 minutes to deploy."
echo "   You can check status with:"
echo "   aws cloudfront get-distribution --id $DISTRIBUTION_ID --region $REGION | jq '.Distribution.Status'"
echo ""
echo "🔒 Security headers added:"
echo "   ✅ Strict-Transport-Security (HSTS): max-age=31536000; includeSubDomains; preload"
echo "   ✅ X-Content-Type-Options: nosniff"
echo "   ✅ X-Frame-Options: DENY"
echo "   ✅ Referrer-Policy: strict-origin-when-cross-origin"
echo "   ✅ Content-Security-Policy: (configured)"
echo ""


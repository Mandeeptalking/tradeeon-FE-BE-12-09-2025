#!/bin/bash
# CloudFront Security Headers Setup Script
# Adds HSTS and other security headers to CloudFront distribution

DISTRIBUTION_ID="${1:-EMF4IMNT9637C}"
POLICY_NAME="${2:-TradeeonSecurityHeadersPolicy}"

echo "🔒 Setting up CloudFront Security Headers..."
echo "Distribution ID: $DISTRIBUTION_ID"

# Step 1: Create Response Headers Policy
echo ""
echo "📝 Step 1: Creating Response Headers Policy..."

POLICY_CONFIG='{
  "ResponseHeadersPolicyConfig": {
    "Name": "'"$POLICY_NAME"'",
    "Comment": "Security headers for Tradeeon frontend - HSTS, CSP, X-Frame-Options, etc.",
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
      },
      "XSSProtection": {
        "Override": true,
        "ModeBlock": true,
        "Protection": true,
        "ReportUri": ""
      }
    },
    "CustomHeadersConfig": {
      "Items": [
        {
          "Header": "Permissions-Policy",
          "Value": "geolocation=(), microphone=(), camera=()",
          "Override": true
        }
      ]
    }
  }
}'

# Check if policy already exists
EXISTING_POLICY=$(aws cloudfront list-response-headers-policies --type custom --query "ResponseHeadersPolicyList.Items[?Name=='$POLICY_NAME'].Id" --output text 2>/dev/null | xargs)

if [ -n "$EXISTING_POLICY" ]; then
    echo "⚠️  Policy '$POLICY_NAME' already exists. Updating..."
    POLICY_ID="$EXISTING_POLICY"
    
    UPDATE_RESULT=$(aws cloudfront update-response-headers-policy \
        --id "$POLICY_ID" \
        --response-headers-policy-config "$POLICY_CONFIG" \
        --output json 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✅ Policy updated successfully!"
        POLICY_ID=$(echo "$UPDATE_RESULT" | jq -r '.ResponseHeadersPolicy.Id')
    else
        echo "❌ Failed to update policy"
        echo "$UPDATE_RESULT"
        exit 1
    fi
else
    CREATE_RESULT=$(aws cloudfront create-response-headers-policy \
        --response-headers-policy-config "$POLICY_CONFIG" \
        --output json 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✅ Policy created successfully!"
        POLICY_ID=$(echo "$CREATE_RESULT" | jq -r '.ResponseHeadersPolicy.Id')
    else
        echo "❌ Failed to create policy"
        echo "$CREATE_RESULT"
        exit 1
    fi
fi

echo "Policy ID: $POLICY_ID"

# Step 2: Get current distribution config
echo ""
echo "📝 Step 2: Getting current CloudFront distribution config..."

DIST_CONFIG=$(aws cloudfront get-distribution-config --id "$DISTRIBUTION_ID" --output json)
ETAG=$(echo "$DIST_CONFIG" | jq -r '.ETag')
CONFIG=$(echo "$DIST_CONFIG" | jq '.DistributionConfig')

if [ -z "$ETAG" ] || [ "$ETAG" = "null" ]; then
    echo "❌ Failed to get distribution config"
    exit 1
fi

echo "✅ Got distribution config (ETag: $ETAG)"

# Step 3: Update distribution with response headers policy
echo ""
echo "📝 Step 3: Updating CloudFront distribution with security headers policy..."

# Update default cache behavior
UPDATED_CONFIG=$(echo "$CONFIG" | jq --arg policyId "$POLICY_ID" \
    '.DefaultCacheBehavior.ResponseHeadersPolicyId = $policyId')

# Also update ordered cache behaviors if they exist
UPDATED_CONFIG=$(echo "$UPDATED_CONFIG" | jq --arg policyId "$POLICY_ID" \
    'if .CacheBehaviors.Items then .CacheBehaviors.Items[]?.ResponseHeadersPolicyId = $policyId else . end')

# Update distribution
echo "Updating CloudFront distribution..."

UPDATE_RESULT=$(aws cloudfront update-distribution \
    --id "$DISTRIBUTION_ID" \
    --if-match "$ETAG" \
    --distribution-config "$(echo "$UPDATED_CONFIG" | jq -c .)" \
    --output json 2>&1)

if [ $? -eq 0 ]; then
    echo "✅ Distribution updated successfully!"
    echo ""
    echo "⏳ Note: CloudFront changes take 5-15 minutes to propagate globally"
    echo "You can check status with: aws cloudfront get-distribution --id $DISTRIBUTION_ID"
else
    echo "❌ Failed to update distribution"
    echo "$UPDATE_RESULT"
    exit 1
fi

# Step 4: Verify
echo ""
echo "📝 Step 4: Verifying configuration..."

sleep 2

VERIFY_DIST=$(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --output json)
VERIFY_POLICY_ID=$(echo "$VERIFY_DIST" | jq -r '.Distribution.DistributionConfig.DefaultCacheBehavior.ResponseHeadersPolicyId')

if [ "$VERIFY_POLICY_ID" = "$POLICY_ID" ]; then
    echo "✅ Verification successful!"
    echo "Response Headers Policy ID: $VERIFY_POLICY_ID"
else
    echo "⚠️  Warning: Policy ID mismatch. May need to wait for propagation."
fi

echo ""
echo "✅ Security headers setup complete!"
echo ""
echo "📋 Summary:"
echo "  - HSTS: Enabled (max-age=31536000, includeSubdomains, preload)"
echo "  - X-Content-Type-Options: nosniff"
echo "  - X-Frame-Options: DENY"
echo "  - Referrer-Policy: strict-origin-when-cross-origin"
echo "  - Content-Security-Policy: Configured"
echo "  - Permissions-Policy: Configured"
echo ""
echo "🌐 Test your headers at: https://securityheaders.com/?q=https://www.tradeeon.com"


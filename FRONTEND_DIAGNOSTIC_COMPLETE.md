# Complete Frontend Diagnostic & Fix Guide

## 🔍 Problem: DNS_PROBE_FINISHED_NXDOMAIN

**Error**: `DNS_PROBE_FINISHED_NXDOMAIN`  
**Meaning**: DNS cannot resolve `www.tradeeon.com`  
**Root Cause**: This is a **DNS/Route53 issue**, NOT a Docker or code issue

---

## ✅ What I Found

### Configuration Status

1. **Frontend Deployment Workflow**: ✅ Correct
   - File: `.github/workflows/deploy-frontend.yml`
   - S3 Bucket: `tradeeon-frontend`
   - CloudFront Distribution ID: `EMF4IMNT9637C`
   - AWS Region: `ap-southeast-1`

2. **Route53 Configuration Files**: ✅ Exist
   - File: `route53-www.json`
   - Should point `www.tradeeon.com` → CloudFront `diwxcdsala8dp.cloudfront.net`

3. **CloudFront Configuration**: ✅ Valid
   - Distribution ID: `EMF4IMNT9637C`
   - Origin: S3 bucket `tradeeon-frontend`
   - Custom domains: `tradeeon.com`, `www.tradeeon.com`
   - SSL Certificate: Configured

4. **Frontend Build**: ⚠️ Potential Issue
   - Requires `VITE_API_URL` environment variable
   - Must be HTTPS in production (throws error if not)
   - Default fallback: `https://api.tradeeon.com`

---

## 🚨 Most Likely Issues

### Issue #1: Route53 DNS Record Missing/Wrong (90% Likely)

**Problem**: `www.tradeeon.com` doesn't have an A record pointing to CloudFront.

**Check**:
```bash
# On Lightsail or any machine with AWS CLI
aws route53 list-hosted-zones | grep -i tradeeon

# Get hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].[Id]" --output text | cut -d'/' -f3)

# Check for www record
aws route53 list-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --query "ResourceRecordSets[?Name=='www.tradeeon.com.' || Name=='www.tradeeon.com']" --output json
```

**Fix**: Create/Update Route53 A record:
```bash
# Get CloudFront domain name
CF_DOMAIN=$(aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.DomainName" --output text)

# Update Route53 record
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.tradeeon.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "'"$CF_DOMAIN"'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

---

### Issue #2: CloudFront Distribution Not Deployed (5% Likely)

**Problem**: CloudFront distribution exists but is not in "Deployed" state.

**Check**:
```bash
aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.Status" --output text
```

**Fix**: Wait for deployment or check CloudFront console for errors.

---

### Issue #3: S3 Bucket Empty/Missing Files (5% Likely)

**Problem**: Frontend files not deployed to S3, or bucket is empty.

**Check**:
```bash
# Check if bucket exists and has files
aws s3 ls s3://tradeeon-frontend/

# Check for index.html (required)
aws s3 ls s3://tradeeon-frontend/index.html

# List all files
aws s3 ls s3://tradeeon-frontend/ --recursive | head -20
```

**Fix**: Trigger frontend deployment:
1. Go to GitHub Actions: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions/workflows/deploy-frontend.yml
2. Click "Run workflow" → Run workflow
3. Or manually deploy (see below)

---

### Issue #4: Frontend Build Failing (Rare)

**Problem**: Build fails if `VITE_API_URL` is missing or not HTTPS.

**Check**: GitHub Actions logs for frontend deployment

**Fix**: Ensure GitHub Secrets have:
- `VITE_API_URL` = `https://api.tradeeon.com`
- `VITE_SUPABASE_URL` = (your Supabase URL)
- `VITE_SUPABASE_ANON_KEY` = (your Supabase anon key)

---

## 🔧 Complete Fix Script

Run this on Lightsail or any machine with AWS CLI configured:

```bash
#!/bin/bash
# Complete Frontend Fix Script

set -e

echo "========================================="
echo "Frontend Diagnostic & Fix Script"
echo "========================================="

CLOUDFRONT_ID="EMF4IMNT9637C"
S3_BUCKET="tradeeon-frontend"

echo ""
echo "1. Checking CloudFront Distribution..."
echo ""

# Check CloudFront
if aws cloudfront get-distribution --id $CLOUDFRONT_ID &> /dev/null; then
    STATUS=$(aws cloudfront get-distribution --id $CLOUDFRONT_ID --query "Distribution.Status" --output text)
    DOMAIN=$(aws cloudfront get-distribution --id $CLOUDFRONT_ID --query "Distribution.DomainName" --output text)
    
    echo "[OK] CloudFront distribution exists"
    echo "   Status: $STATUS"
    echo "   Domain: $DOMAIN"
    
    if [ "$STATUS" != "Deployed" ]; then
        echo "[WARN] CloudFront is not deployed yet. Status: $STATUS"
        echo "   This might take 15-20 minutes to deploy"
    fi
else
    echo "[FAIL] CloudFront distribution not found: $CLOUDFRONT_ID"
    exit 1
fi

echo ""
echo "2. Checking S3 Bucket..."
echo ""

# Check S3
if aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
    FILE_COUNT=$(aws s3 ls "s3://$S3_BUCKET" --recursive | wc -l)
    echo "[OK] S3 bucket exists: $S3_BUCKET"
    echo "   Files: $FILE_COUNT"
    
    if aws s3 ls "s3://$S3_BUCKET/index.html" &> /dev/null; then
        echo "[OK] index.html exists"
    else
        echo "[FAIL] index.html missing - frontend not deployed"
        echo "   Run: Trigger GitHub Actions deployment"
        exit 1
    fi
else
    echo "[FAIL] S3 bucket not found: $S3_BUCKET"
    exit 1
fi

echo ""
echo "3. Checking Route53 DNS Records..."
echo ""

# Check Route53
HOSTED_ZONES=$(aws route53 list-hosted-zones --query "HostedZones[?contains(Name, 'tradeeon')]" --output json)

if [ "$HOSTED_ZONES" != "[]" ]; then
    echo "[OK] Route53 hosted zones found"
    
    # Get hosted zone ID
    HOSTED_ZONE_ID=$(echo "$HOSTED_ZONES" | jq -r '.[0].Id' | cut -d'/' -f3)
    ZONE_NAME=$(echo "$HOSTED_ZONES" | jq -r '.[0].Name')
    echo "   Zone: $ZONE_NAME ($HOSTED_ZONE_ID)"
    
    # Check www record
    WWW_RECORD=$(aws route53 list-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --query "ResourceRecordSets[?Name=='www.tradeeon.com.' || Name=='www.tradeeon.com']" --output json)
    
    if [ "$WWW_RECORD" != "[]" ]; then
        echo "[OK] www.tradeeon.com record exists"
        echo "$WWW_RECORD" | jq '.[0] | {Name, Type, AliasTarget}'
        
        # Check if it points to CloudFront
        RECORD_DOMAIN=$(echo "$WWW_RECORD" | jq -r '.[0].AliasTarget.DNSName // ""')
        if [[ "$RECORD_DOMAIN" == *"cloudfront.net"* ]]; then
            echo "[OK] Record points to CloudFront"
        else
            echo "[WARN] Record might not point to correct CloudFront domain"
            echo "   Current: $RECORD_DOMAIN"
            echo "   Expected: $DOMAIN"
        fi
    else
        echo "[FAIL] www.tradeeon.com record NOT FOUND"
        echo ""
        echo "Creating Route53 A record..."
        
        # Create record
        aws route53 change-resource-record-sets \
          --hosted-zone-id $HOSTED_ZONE_ID \
          --change-batch "{
            \"Changes\": [{
              \"Action\": \"UPSERT\",
              \"ResourceRecordSet\": {
                \"Name\": \"www.tradeeon.com\",
                \"Type\": \"A\",
                \"AliasTarget\": {
                  \"HostedZoneId\": \"Z2FDTNDATAQYW2\",
                  \"DNSName\": \"$DOMAIN\",
                  \"EvaluateTargetHealth\": false
                }
              }
            }]
          }"
        
        echo "[OK] Route53 record created"
        echo "   DNS propagation may take 15-60 minutes"
    fi
else
    echo "[FAIL] No Route53 hosted zones found for tradeeon.com"
    echo "   You need to create a hosted zone first"
    exit 1
fi

echo ""
echo "4. Checking DNS Resolution..."
echo ""

# Check DNS resolution
if command -v nslookup &> /dev/null; then
    if nslookup www.tradeeon.com &> /dev/null; then
        echo "[OK] DNS resolution works"
        nslookup www.tradeeon.com | grep -A 2 "Name:"
    else
        echo "[WARN] DNS resolution failed (NXDOMAIN)"
        echo "   This is expected if Route53 record was just created"
        echo "   Wait 15-60 minutes for DNS propagation"
    fi
fi

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "✅ CloudFront: $STATUS"
echo "✅ S3 Bucket: $FILE_COUNT files"
echo "✅ Route53: Check output above"
echo ""
echo "Next Steps:"
echo "1. If Route53 record was created, wait 15-60 minutes"
echo "2. Check DNS propagation: https://dnschecker.org/#A/www.tradeeon.com"
echo "3. Test site: https://www.tradeeon.com"
echo ""
echo "========================================="
```

---

## 📋 Manual Fix Steps

### Step 1: Check Route53 (MOST IMPORTANT)

```bash
# List hosted zones
aws route53 list-hosted-zones | grep -i tradeeon

# Get zone ID
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].[Id]" --output text | cut -d'/' -f3)

# List records for www
aws route53 list-resource-record-sets --hosted-zone-id $ZONE_ID --query "ResourceRecordSets[?contains(Name, 'www')]" --output json
```

**If record doesn't exist**, create it:
```bash
# Get CloudFront domain
CF_DOMAIN=$(aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.DomainName" --output text)

# Create A record
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://route53-www.json
```

---

### Step 2: Verify CloudFront

```bash
aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.{Status:Status,DomainName:DomainName,Enabled:Enabled}" --output json
```

---

### Step 3: Verify S3 Bucket

```bash
aws s3 ls s3://tradeeon-frontend/
aws s3 ls s3://tradeeon-frontend/index.html
```

If empty, trigger deployment via GitHub Actions or manually:
```bash
cd apps/frontend
npm install
npm run build
aws s3 sync dist/ s3://tradeeon-frontend/ --delete
aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
```

---

## 🎯 Quick Fix (Run on Lightsail)

```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
chmod +x scripts/check_frontend_status.sh
./scripts/check_frontend_status.sh
```

---

## ⏱️ DNS Propagation Time

After fixing Route53:
- **Minimum**: 5-15 minutes
- **Typical**: 30-60 minutes  
- **Maximum**: 24-48 hours (rare)

**Check propagation**: https://dnschecker.org/#A/www.tradeeon.com

---

## ✅ Verification

Once DNS propagates:
```bash
# Test DNS
nslookup www.tradeeon.com

# Test site
curl -I https://www.tradeeon.com

# Should return 200 OK
```

---

**The issue is DNS/Route53, NOT Docker or code!** 🔍


#!/bin/bash
# Quick script to check frontend deployment status
# Run this to diagnose frontend DNS/CloudFront/S3 issues

set -e

echo "========================================="
echo "Frontend Deployment Status Check"
echo "========================================="
echo ""

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "[FAIL] AWS CLI not found. Install with: pip install awscli"
    exit 1
fi

echo "1. Checking DNS Resolution..."
echo ""

# Check DNS resolution
if command -v nslookup &> /dev/null; then
    echo "[INFO] Checking DNS for www.tradeeon.com..."
    if nslookup www.tradeeon.com &> /dev/null; then
        echo "[OK] DNS resolution works"
        nslookup www.tradeeon.com | grep -A 5 "Name:"
    else
        echo "[FAIL] DNS resolution failed (NXDOMAIN)"
        echo "   This means www.tradeeon.com cannot be resolved"
    fi
else
    echo "[WARN] nslookup not available, skipping DNS check"
fi

echo ""
echo "2. Checking CloudFront Distribution..."
echo ""

CLOUDFRONT_ID="EMF4IMNT9637C"
S3_BUCKET="tradeeon-frontend"

# Check CloudFront distribution
if aws cloudfront get-distribution --id $CLOUDFRONT_ID &> /dev/null; then
    STATUS=$(aws cloudfront get-distribution --id $CLOUDFRONT_ID --query "Distribution.Status" --output text 2>/dev/null || echo "UNKNOWN")
    DOMAIN=$(aws cloudfront get-distribution --id $CLOUDFRONT_ID --query "Distribution.DomainName" --output text 2>/dev/null || echo "UNKNOWN")
    
    if [ "$STATUS" = "Deployed" ]; then
        echo "[OK] CloudFront distribution is deployed"
        echo "   Distribution ID: $CLOUDFRONT_ID"
        echo "   Domain: $DOMAIN"
    else
        echo "[WARN] CloudFront distribution status: $STATUS"
    fi
    
    # Check origins
    ORIGIN=$(aws cloudfront get-distribution-config --id $CLOUDFRONT_ID --query "DistributionConfig.Origins.Items[0].DomainName" --output text 2>/dev/null || echo "UNKNOWN")
    echo "   Origin: $ORIGIN"
else
    echo "[FAIL] CloudFront distribution not found or access denied"
    echo "   Distribution ID: $CLOUDFRONT_ID"
fi

echo ""
echo "3. Checking S3 Bucket..."
echo ""

# Check S3 bucket
if aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
    echo "[OK] S3 bucket exists: $S3_BUCKET"
    
    # Check if bucket has files
    FILE_COUNT=$(aws s3 ls "s3://$S3_BUCKET" --recursive | wc -l || echo "0")
    echo "   Files: $FILE_COUNT"
    
    # Check for index.html
    if aws s3 ls "s3://$S3_BUCKET/index.html" &> /dev/null; then
        echo "[OK] index.html exists"
    else
        echo "[WARN] index.html not found in S3 bucket"
    fi
    
    # List first few files
    echo "   Recent files:"
    aws s3 ls "s3://$S3_BUCKET" --recursive | tail -5 | awk '{print "      " $4}'
else
    echo "[FAIL] S3 bucket not found or access denied"
    echo "   Bucket: $S3_BUCKET"
fi

echo ""
echo "4. Checking Route53 Records..."
echo ""

# Check Route53
HOSTED_ZONES=$(aws route53 list-hosted-zones --query "HostedZones[?contains(Name, 'tradeeon')].{Name:Name,Id:Id}" --output text 2>/dev/null || echo "")

if [ -n "$HOSTED_ZONES" ]; then
    echo "[OK] Route53 hosted zones found:"
    echo "$HOSTED_ZONES" | while read -r ZONE_NAME ZONE_ID; do
        ZONE_ID_SHORT=$(echo $ZONE_ID | cut -d'/' -f3)
        echo "   Zone: $ZONE_NAME ($ZONE_ID_SHORT)"
        
        # Check for www record
        WWW_RECORD=$(aws route53 list-resource-record-sets --hosted-zone-id $ZONE_ID_SHORT --query "ResourceRecordSets[?Name=='www.tradeeon.com.' || Name=='www.tradeeon.com']" --output json 2>/dev/null || echo "[]")
        
        if echo "$WWW_RECORD" | grep -q "www.tradeeon.com"; then
            echo "[OK] www.tradeeon.com record exists in $ZONE_NAME"
            echo "$WWW_RECORD" | grep -A 5 "www.tradeeon.com" || echo "   (check manually)"
        else
            echo "[FAIL] www.tradeeon.com record NOT found in $ZONE_NAME"
        fi
    done
else
    echo "[WARN] No Route53 hosted zones found for tradeeon.com"
    echo "   DNS records might not be configured"
fi

echo ""
echo "5. Checking GitHub Actions (Frontend Deployment)..."
echo ""

# Check if GitHub Actions ran recently
echo "[INFO] Check GitHub Actions manually:"
echo "   https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions/workflows/deploy-frontend.yml"
echo ""
echo "[INFO] Or check workflow file:"
echo "   .github/workflows/deploy-frontend.yml"

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "If DNS is failing (NXDOMAIN):"
echo "  1. Check Route53 records for www.tradeeon.com"
echo "  2. Ensure record points to CloudFront distribution"
echo "  3. Wait 15-60 minutes for DNS propagation"
echo ""
echo "If CloudFront is down:"
echo "  1. Check CloudFront console"
echo "  2. Verify distribution is 'Deployed'"
echo "  3. Check origin configuration"
echo ""
echo "If S3 bucket is empty:"
echo "  1. Trigger frontend deployment"
echo "  2. Manually deploy: cd apps/frontend && npm run build && aws s3 sync dist/ s3://tradeeon-frontend/ --delete"
echo ""
echo "========================================="



#!/bin/bash
# Quick deployment script for AWS CloudShell
# Copy and paste this entire script into CloudShell after uploading your dist folder

set -e

echo "=== Tradeeon Frontend Deployment ==="
echo ""

# Configuration
BUCKET_NAME="www-tradeeon-prod"
REGION="us-east-1"

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist folder not found!"
    echo "Please upload apps/frontend/dist to CloudShell first."
    echo ""
    echo "Steps:"
    echo "1. Click 'Actions' → 'Upload file' in CloudShell"
    echo "2. Upload your dist folder (or dist.zip and unzip it)"
    exit 1
fi

echo "✅ Found dist folder"
echo ""

# Sync to S3
echo "Uploading files to S3 bucket: $BUCKET_NAME..."
aws s3 sync dist s3://$BUCKET_NAME --region $REGION --delete

echo ""
echo "✅ Upload complete!"

# Set correct MIME types
echo ""
echo "Setting MIME types..."

# HTML files
aws s3 cp dist/index.html s3://$BUCKET_NAME/index.html \
    --content-type text/html \
    --region $REGION \
    --cache-control "no-cache"

echo "✅ Configured HTML files"

# List uploaded files
echo ""
echo "Verifying upload..."
aws s3 ls s3://$BUCKET_NAME/

# Get S3 website URL
echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "🌐 Your website is now live at:"
echo "   https://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo ""
echo "Next steps:"
echo "1. Test the S3 URL above"
echo "2. Set up CloudFront for CDN"
echo "3. Configure Route 53 to point to CloudFront"
echo ""




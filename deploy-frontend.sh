#!/bin/bash
# Deploy Frontend to S3 + CloudFront
# Run this from the project root directory

set -e  # Exit on error

echo "🚀 Starting Frontend Deployment..."
echo ""

# Check if we're in the right directory
if [ ! -d "apps/frontend" ]; then
  echo "❌ Error: apps/frontend directory not found"
  echo "   Please run this script from the project root directory"
  exit 1
fi

# Check if .env file exists
if [ ! -f "apps/frontend/.env" ]; then
  echo "⚠️  Warning: apps/frontend/.env file not found"
  echo "   Creating from .env.example..."
  if [ -f "apps/frontend/.env.example" ]; then
    cp apps/frontend/.env.example apps/frontend/.env
    echo "   ✅ Created .env file. Please update VITE_API_URL and other variables."
    echo "   Press Enter to continue or Ctrl+C to cancel..."
    read
  else
    echo "   ❌ .env.example not found. Please create .env manually."
    exit 1
  fi
fi

# Navigate to frontend directory
cd apps/frontend

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building frontend..."
npm run build

if [ ! -d "dist" ]; then
  echo "❌ Error: Build failed - dist directory not found"
  exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
  echo "❌ Error: AWS CLI not found"
  echo "   Please install AWS CLI: https://aws.amazon.com/cli/"
  exit 1
fi

echo "☁️  Uploading to S3 bucket: tradeeon-frontend..."
aws s3 sync dist/ s3://tradeeon-frontend/ --delete

if [ $? -ne 0 ]; then
  echo "❌ Error: S3 upload failed"
  exit 1
fi

echo ""
echo "✅ Upload successful!"
echo ""

echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id EMF4IMNT9637C \
  --paths "/*" \
  --query "Invalidation.Id" \
  --output text)

if [ $? -ne 0 ]; then
  echo "❌ Error: CloudFront invalidation failed"
  exit 1
fi

echo ""
echo "✅ Invalidation created: $INVALIDATION_ID"
echo ""
echo "🎉 Deployment complete!"
echo ""
echo "⏱️  Wait 2-3 minutes for CloudFront cache to clear"
echo "🌐 Then visit: https://www.tradeeon.com"
echo ""
echo "To check invalidation status:"
echo "  aws cloudfront list-invalidations --distribution-id EMF4IMNT9637C --max-items 1"


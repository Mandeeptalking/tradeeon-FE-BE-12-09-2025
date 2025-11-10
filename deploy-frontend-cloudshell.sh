#!/bin/bash
# Complete Frontend Deployment Script for CloudShell
# Copy and paste entire script into CloudShell

set -e  # Exit on error

echo "🚀 Starting Frontend Deployment..."
echo ""

# Step 1: Clone or update repository
echo "📦 Step 1: Setting up repository..."
cd ~
if [ -d "tradeeon-FE-BE-12-09-2025" ]; then
  echo "Repository exists, updating..."
  cd tradeeon-FE-BE-12-09-2025
  git pull
else
  echo "Cloning repository..."
  git clone https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025.git
  cd tradeeon-FE-BE-12-09-2025
fi

# Step 2: Navigate to frontend directory
cd apps/frontend
echo "✅ In frontend directory: $(pwd)"
echo ""

# Step 3: Create .env file
echo "📝 Step 2: Creating .env file..."
cat > .env << 'EOF'
VITE_API_URL=http://api.tradeeon.com
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTQzMDUsImV4cCI6MjA3Mjk5MDMwNX0.LF1iumCNB4EPJxAJSeTx04V0Tp7SlL7HBfsJVb3RmLU
EOF
echo "✅ .env file created"
echo ""

# Step 4: Install dependencies
echo "📦 Step 3: Installing dependencies..."
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "node_modules exists, skipping install..."
fi
echo ""

# Step 5: Build frontend
echo "🔨 Step 4: Building frontend..."
npm run build

if [ ! -d "dist" ]; then
  echo "❌ Error: Build failed - dist directory not found"
  exit 1
fi

echo "✅ Build successful!"
echo ""

# Step 6: Upload to S3
echo "☁️  Step 5: Uploading to S3..."
aws s3 sync dist/ s3://tradeeon-frontend/ --delete

if [ $? -ne 0 ]; then
  echo "❌ Error: S3 upload failed"
  exit 1
fi

echo "✅ Upload successful!"
echo ""

# Step 7: Invalidate CloudFront cache
echo "🔄 Step 6: Invalidating CloudFront cache..."
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


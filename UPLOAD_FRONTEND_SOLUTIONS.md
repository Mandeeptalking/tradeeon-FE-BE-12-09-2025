# Upload Frontend to S3 - Solutions

## Problem
The `dist/` folder was built on your local Windows machine, but you're trying to upload from CloudShell where it doesn't exist.

## Solution Options

### Option 1: Upload from Local Machine (Easiest)

If you have AWS CLI configured on your local machine:

```powershell
# From your local machine (PowerShell)
cd "C:\Users\DELL\Tradeeon FE-BE\tradeeon-FE-BE-12-09-2025\apps\frontend"
aws s3 sync dist/ s3://tradeeon-frontend/ --delete
aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
```

### Option 2: Build in CloudShell (Recommended)

Build the frontend directly in CloudShell:

```bash
# In CloudShell
cd ~
git clone https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025.git
cd tradeeon-FE-BE-12-09-2025/apps/frontend

# Create .env file
cat > .env << 'EOF'
VITE_API_URL=http://api.tradeeon.com
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTQzMDUsImV4cCI6MjA3Mjk5MDMwNX0.LF1iumCNB4EPJxAJSeTx04V0Tp7SlL7HBfsJVb3RmLU
EOF

# Install dependencies and build
npm install
npm run build

# Upload to S3
aws s3 sync dist/ s3://tradeeon-frontend/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id EMF4IMNT9637C \
  --paths "/*"
```

### Option 3: Upload dist folder to CloudShell

If you want to use the already-built dist folder:

1. **Compress dist folder on local machine:**
   ```powershell
   # In PowerShell on local machine
   cd "C:\Users\DELL\Tradeeon FE-BE\tradeeon-FE-BE-12-09-2025\apps\frontend"
   Compress-Archive -Path dist -DestinationPath dist.zip
   ```

2. **Upload to CloudShell:**
   - Go to CloudShell → Actions → Upload file
   - Upload `dist.zip`

3. **Extract and upload in CloudShell:**
   ```bash
   unzip dist.zip
   aws s3 sync dist/ s3://tradeeon-frontend/ --delete
   aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
   ```

## Recommended: Option 2 (Build in CloudShell)

This is the cleanest approach and ensures everything is built with the correct environment variables.


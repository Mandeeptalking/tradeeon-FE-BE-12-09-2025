# Fix GitHub Actions Frontend Deployment

## Problem
Workflow "Deploy Frontend to S3 + CloudFront #42" failed with "Invalid security token" error.

## Root Cause
AWS credentials in GitHub Secrets are invalid or expired.

## Solution

### Option 1: Update GitHub Secrets (Recommended)

1. **Go to GitHub Repository:**
   - Navigate to: `https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025`
   - Click: **Settings** → **Secrets and variables** → **Actions**

2. **Update AWS Credentials:**
   - Click on `AWS_ACCESS_KEY_ID` → **Update** → Enter new access key
   - Click on `AWS_SECRET_ACCESS_KEY` → **Update** → Enter new secret key
   
3. **Get New AWS Credentials:**
   - Go to AWS Console → IAM → Users → Your user → Security credentials
   - Create new access key
   - Copy Access Key ID and Secret Access Key

4. **Optional: Add Frontend Environment Variables:**
   - `VITE_API_URL`: `http://api.tradeeon.com`
   - `VITE_SUPABASE_URL`: `https://mgjlnmlhwuqspctanaik.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTQzMDUsImV4cCI6MjA3Mjk5MDMwNX0.LF1iumCNB4EPJxAJSeTx04V0Tp7SlL7HBfsJVb3RmLU`

5. **Re-run Workflow:**
   - Go to **Actions** tab
   - Click on "Deploy Frontend to S3 + CloudFront"
   - Click **Run workflow** → **Run workflow**

### Option 2: Deploy Manually from CloudShell

If GitHub Actions continues to fail, deploy manually:

```bash
cd ~/tradeeon-FE-BE-12-09-2025/apps/frontend

# Create .env file
cat > .env << 'EOF'
VITE_API_URL=http://api.tradeeon.com
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTQzMDUsImV4cCI6MjA3Mjk5MDMwNX0.LF1iumCNB4EPJxAJSeTx04V0Tp7SlL7HBfsJVb3RmLU
EOF

# Install dependencies
npm install

# Build frontend
npm run build

# Deploy to S3
aws s3 sync dist/ s3://tradeeon-frontend/ --delete --region ap-southeast-1

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id EMF4IMNT9637C \
  --paths "/*" \
  --region ap-southeast-1

echo "✅ Frontend deployed!"
echo "URL: https://www.tradeeon.com"
```

## Verify Deployment

After deployment, verify:
1. Visit: `https://www.tradeeon.com`
2. Open browser DevTools → Network tab
3. Check if API calls go to `http://api.tradeeon.com`
4. Verify no CORS errors

## Current Status

- ✅ Backend: Deployed on Lightsail (18.136.45.140)
- ✅ Nginx: Configured and running
- ✅ Route 53: DNS pointing to backend
- ❌ Frontend: Deployment failed (AWS credentials issue)
- ⏳ Next: Fix GitHub Secrets or deploy manually


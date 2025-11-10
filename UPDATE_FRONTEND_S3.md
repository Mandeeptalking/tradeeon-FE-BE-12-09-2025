# Update Frontend to Use New Backend URL

## ✅ Found: Frontend Origin
- **S3 Bucket:** `tradeeon-frontend`
- **CloudFront Distribution:** `EMF4IMNT9637C`
- **Domain:** `www.tradeeon.com`

## Steps to Update Frontend

### Step 1: Update Environment Variables

Create/update `.env` file in `apps/frontend/`:

```bash
cd apps/frontend
nano .env
```

**Add/Update these variables:**
```env
VITE_API_URL=http://api.tradeeon.com
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

### Step 2: Rebuild Frontend

```bash
# Make sure you're in apps/frontend directory
cd apps/frontend

# Install dependencies (if needed)
npm install

# Build for production
npm run build
```

This creates `dist/` folder with updated files.

### Step 3: Upload to S3

```bash
# Upload new build to S3 bucket
aws s3 sync dist/ s3://tradeeon-frontend/ --delete

# Verify upload
aws s3 ls s3://tradeeon-frontend/ --recursive
```

The `--delete` flag removes old files that aren't in the new build.

### Step 4: Invalidate CloudFront Cache

```bash
aws cloudfront create-invalidation \
  --distribution-id EMF4IMNT9637C \
  --paths "/*"
```

### Step 5: Verify

1. **Wait 2-3 minutes** for cache invalidation to complete
2. **Visit:** `https://www.tradeeon.com`
3. **Check browser DevTools** → Network tab
4. **Verify API calls** go to `http://api.tradeeon.com`

## Quick One-Liner (After Building)

If you've already built locally, you can upload directly:

```bash
# From apps/frontend directory
aws s3 sync dist/ s3://tradeeon-frontend/ --delete && \
aws cloudfront create-invalidation \
  --distribution-id EMF4IMNT9637C \
  --paths "/*"
```

## Troubleshooting

### If S3 sync fails:
```bash
# Check if bucket exists
aws s3 ls s3://tradeeon-frontend/

# Check bucket permissions
aws s3api get-bucket-acl --bucket tradeeon-frontend
```

### If build fails:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Check build output:
```bash
# Verify dist folder was created
ls -la dist/

# Check if index.html exists
ls -la dist/index.html
```


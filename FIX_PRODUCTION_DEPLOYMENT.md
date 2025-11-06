# Fix Production Deployment Issues

## Problem
Frontend works on `localhost:5173` but shows blank page in production.

## Root Causes

### 1. Missing Environment Variables in Build
The deployment workflow only sets `VITE_API_URL` but not Supabase variables.

**Fix Applied:**
- Added `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to build step

### 2. SPA Routing Issue
CloudFront/S3 needs to serve `index.html` for all routes (React Router uses client-side routing).

## Required Fixes

### 1. Update GitHub Secrets
Add these secrets in GitHub Settings → Secrets:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

### 2. Configure S3 Error Document
The S3 bucket needs to serve `index.html` for 404 errors:

```bash
aws s3 website s3://tradeeon-frontend \
  --index-document index.html \
  --error-document index.html
```

Or via AWS Console:
1. Go to S3 → `tradeeon-frontend` bucket
2. Properties → Static website hosting
3. Enable static website hosting
4. Index document: `index.html`
5. Error document: `index.html`

### 3. Configure CloudFront for SPA Routing

**Option A: Custom Error Response (Recommended)**
1. Go to CloudFront → Your distribution
2. Error Pages tab
3. Create Custom Error Response:
   - HTTP Error Code: `403: Forbidden`
   - Response Page Path: `/index.html`
   - HTTP Response Code: `200: OK`
4. Create another for `404: Not Found` with same settings

**Option B: Lambda@Edge Function**
Create a function to rewrite all requests to `index.html`:

```javascript
exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  
  // If request is for a file (has extension), serve as-is
  if (request.uri.match(/\.[\w]+$/)) {
    callback(null, request);
    return;
  }
  
  // Otherwise, serve index.html
  request.uri = '/index.html';
  callback(null, request);
};
```

### 4. Verify Build Output
After deployment, check:
- `dist/index.html` exists
- `dist/assets/` contains JS/CSS files
- All files are uploaded to S3

### 5. Clear CloudFront Cache
After fixing, invalidate CloudFront cache:
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

## Testing Checklist

- [ ] GitHub Secrets added (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] S3 error document set to index.html
- [ ] CloudFront custom error responses configured
- [ ] Build includes environment variables
- [ ] CloudFront cache invalidated
- [ ] Test direct URL access (e.g., `/app/connections`)
- [ ] Check browser console for errors

## Quick Fix Script

```bash
# 1. Set S3 error document
aws s3 website s3://tradeeon-frontend \
  --index-document index.html \
  --error-document index.html

# 2. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"

# 3. Rebuild and redeploy
# (Trigger GitHub Actions workflow)
```

## Common Issues

1. **Blank page on refresh** → SPA routing not configured
2. **Environment variables undefined** → Not set in build step
3. **CORS errors** → Backend CORS not configured for production domain
4. **404 on routes** → CloudFront/S3 not serving index.html for all routes


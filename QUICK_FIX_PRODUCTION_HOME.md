# Quick Fix: Production Home Page Issue

## Problem
Home page works on `localhost:5173` but shows blank in production.

## Root Cause
CloudFront is not configured for SPA (Single Page Application) routing. When users visit routes like `/app/connections`, CloudFront returns 404 instead of serving `index.html`.

## Quick Fix (5 minutes)

### Option 1: AWS Console (Easiest)

1. **Go to AWS Console → CloudFront**
2. **Click your distribution** (the one serving your frontend)
3. **Go to "Error Pages" tab**
4. **Click "Create Custom Error Response"**

   **For 403 Error:**
   - HTTP Error Code: `403: Forbidden`
   - Response Page Path: `/index.html`
   - HTTP Response Code: `200: OK`
   - Error Caching Minimum TTL: `0`

   **For 404 Error:**
   - HTTP Error Code: `404: Not Found`
   - Response Page Path: `/index.html`
   - HTTP Response Code: `200: OK`
   - Error Caching Minimum TTL: `0`

5. **Save changes**
6. **Invalidate cache:**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id YOUR_DIST_ID \
     --paths "/*"
   ```

### Option 2: Check S3 Bucket Configuration

1. **Go to S3 → Your frontend bucket**
2. **Properties → Static website hosting**
3. **Make sure:**
   - Index document: `index.html`
   - Error document: `index.html` (IMPORTANT!)

### Option 3: Verify Environment Variables

Make sure GitHub Secrets include:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

Then **rebuild and redeploy** the frontend.

---

## Testing

After fixing:
1. Visit your production URL (e.g., `https://www.tradeeon.com`)
2. Should see home page ✅
3. Refresh on any route (e.g., `/app/connections`)
4. Should still work ✅

---

## If Still Not Working

Check browser console for:
- JavaScript errors
- Failed network requests
- Missing environment variables

Share the errors and I'll help fix them!


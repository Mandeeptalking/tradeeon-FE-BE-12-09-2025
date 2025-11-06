# Fix Frontend API URL

## Issue

The frontend is trying to connect to `http://localhost:8000` instead of `https://api.tradeeon.com` because the `VITE_API_URL` environment variable is not set during build.

---

## Solution: Add GitHub Secret

### Step 1: Add VITE_API_URL Secret

1. **Go to GitHub Secrets:**
   - https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/settings/secrets/actions

2. **Click "New repository secret"**

3. **Add:**
   - **Name**: `VITE_API_URL`
   - **Value**: `https://api.tradeeon.com`
   - **Click "Add secret"**

### Step 2: Rebuild Frontend

After adding the secret, rebuild the frontend:

**Option A: Trigger Workflow**
1. Go to: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions
2. Find: "Deploy Frontend to S3 + CloudFront"
3. Click "Run workflow"
4. Select branch: `main`
5. Click "Run workflow"

**Option B: Push a Change**
1. Make a small change to frontend (or just commit)
2. Push to `main` branch
3. Workflow will auto-trigger

---

## Verification

After rebuild:

1. **Check frontend:**
   - Open https://www.tradeeon.com
   - Open browser DevTools (F12)
   - Go to Network tab
   - Try loading Connections page
   - Check if requests go to `https://api.tradeeon.com` (not localhost)

2. **Test API:**
   - Connections page should load
   - API calls should work

---

## Quick Checklist

- [ ] Add `VITE_API_URL` secret = `https://api.tradeeon.com`
- [ ] Trigger frontend deployment workflow
- [ ] Wait for deployment to complete
- [ ] Test Connections page
- [ ] Verify API calls go to correct URL

---

**Quick Link:** https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/settings/secrets/actions


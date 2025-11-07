# Complete A-Z Fix Checklist for Production Home Page

## What Changed (That Could Break Production)

### 1. Supabase Made Optional ✅
- **File**: `apps/frontend/src/lib/supabase.ts`
- **Change**: Made Supabase client optional (won't crash if env vars missing)
- **Impact**: Should be safe, but let's verify

### 2. React Import Added ✅
- **File**: `apps/frontend/src/App.tsx`
- **Change**: Added `import React, { useEffect } from 'react'`
- **Impact**: Fixed local issue, should work in production

### 3. Error Boundaries Added ✅
- **File**: `apps/frontend/src/main.tsx`
- **Change**: Wrapped app in ErrorBoundary
- **Impact**: Should catch errors, not cause them

### 4. Deployment Env Vars ✅
- **File**: `.github/workflows/deploy-frontend.yml`
- **Change**: Added `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Impact**: If missing, build might fail or app might not work

---

## Step-by-Step Fix

### Step 1: Verify GitHub Secrets

Check GitHub → Settings → Secrets → Actions:
- [ ] `VITE_API_URL` exists
- [ ] `VITE_SUPABASE_URL` exists (or set to empty string if not using)
- [ ] `VITE_SUPABASE_ANON_KEY` exists (or set to empty string if not using)
- [ ] `CLOUDFRONT_DISTRIBUTION_ID` exists

**If secrets are missing:**
- Add them (even if empty strings)
- Or update code to handle missing values better

### Step 2: Make Supabase Truly Optional

The current code should work, but let's make it bulletproof:

```typescript
// Current code warns but continues
// This should be fine, but let's ensure it doesn't break anything
```

### Step 3: Check Build Output

After deployment, verify:
- [ ] Build succeeded (check GitHub Actions logs)
- [ ] Files uploaded to S3 (check S3 bucket)
- [ ] `index.html` exists in S3
- [ ] `assets/` folder has JS/CSS files

### Step 4: Fix CloudFront SPA Routing

**This is likely the main issue!**

1. AWS Console → CloudFront → Your Distribution
2. Error Pages tab
3. Create Custom Error Response for:
   - **403**: Serve `/index.html` with 200 status
   - **404**: Serve `/index.html` with 200 status
4. Invalidate cache: `/*`

### Step 5: Test Production Build Locally

```bash
cd apps/frontend
npm run build
npm run preview
# Visit http://localhost:4173
# Does it work?
```

### Step 6: Check Browser Console in Production

Open production site → F12 → Console:
- [ ] Any red errors?
- [ ] Any failed network requests?
- [ ] What does the error say?

---

## Quick Fix: Make Everything More Robust

Let me update the code to handle missing env vars better:



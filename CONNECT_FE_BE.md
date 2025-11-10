# Connect Frontend to Backend - Complete Guide

## ✅ What We've Done

1. **Fixed hardcoded API URLs:**
   - ✅ `apps/frontend/src/lib/api/analytics.ts` - Now uses `VITE_API_URL`
   - ✅ `apps/frontend/src/lib/api.ts` - Now uses `VITE_API_URL`

2. **Created deployment files:**
   - ✅ `apps/frontend/.env.example` - Environment variables template
   - ✅ `deploy-frontend.sh` - Automated deployment script

## 📋 Next Steps to Connect FE to BE

### Step 1: Create Environment File

Create `.env` file in `apps/frontend/` directory:

```bash
cd apps/frontend
cp .env.example .env
nano .env
```

**Update these values:**
```env
VITE_API_URL=http://api.tradeeon.com
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

### Step 2: Deploy Frontend

**Option A: Use the deployment script (Recommended):**

```bash
# From project root directory
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

**Option B: Manual deployment:**

```bash
cd apps/frontend

# Install dependencies
npm install

# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://tradeeon-frontend/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id EMF4IMNT9637C \
  --paths "/*"
```

### Step 3: Verify Connection

1. **Wait 2-3 minutes** for CloudFront cache invalidation
2. **Visit:** `https://www.tradeeon.com`
3. **Open browser DevTools** → Network tab
4. **Check API calls:**
   - Should see requests to `http://api.tradeeon.com`
   - Should NOT see requests to `localhost:8000`
5. **Test a feature:**
   - Try connecting an exchange
   - Check portfolio page
   - Verify data loads correctly

## 🔍 Troubleshooting

### Frontend still using localhost:
- Check `.env` file exists in `apps/frontend/`
- Verify `VITE_API_URL=http://api.tradeeon.com` is set
- Rebuild: `npm run build`
- Clear browser cache

### API calls failing:
- Check backend is running: `curl http://api.tradeeon.com/health`
- Check CORS settings in backend
- Check browser console for errors

### CloudFront cache not clearing:
- Wait 5-10 minutes
- Check invalidation status:
  ```bash
  aws cloudfront list-invalidations \
    --distribution-id EMF4IMNT9637C \
    --max-items 1
  ```

## 📊 Summary

- ✅ **Backend:** `api.tradeeon.com` → Lightsail (18.136.45.140) - **WORKING**
- ✅ **Frontend Code:** Fixed to use environment variables
- ⏭️ **Next:** Create `.env` file and deploy

After deployment, your frontend will be connected to the backend! 🚀

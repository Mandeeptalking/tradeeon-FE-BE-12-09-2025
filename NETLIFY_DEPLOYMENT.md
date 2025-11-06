# Netlify Deployment Guide

## ✅ Deployment Readiness Assessment

**Status**: ⚠️ **PARTIALLY READY** - Frontend can be deployed, but backend requires separate hosting

---

## 📋 Overview

Your project is a **full-stack application** with:
- **Frontend**: React + Vite (deployable on Netlify ✅)
- **Backend**: Python FastAPI (cannot be deployed on Netlify ❌)

**Recommendation**: Deploy frontend on Netlify, deploy backend on a Python-friendly platform (see alternatives below).

---

## 🚀 Frontend Deployment on Netlify

### Prerequisites
- GitHub repository connected
- Netlify account (free tier works)
- Supabase credentials

### Step 1: Create `netlify.toml` Configuration

Create `netlify.toml` in your project root:

```toml
[build]
  base = "apps/frontend"
  publish = "apps/frontend/dist"
  command = "npm install && npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  VITE_API_URL = "https://your-backend-api.com"
```

### Step 2: Set Environment Variables in Netlify

Go to your Netlify site dashboard:
1. **Site settings** → **Environment variables**
2. Add these variables:

| Variable | Value | Example |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Your Supabase URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | `eyJhbGci...` |
| `VITE_API_URL` | Your backend API URL | `https://api.yourapp.com` |

### Step 3: Deploy

**Option A: Manual Deploy**

```bash
cd apps/frontend
npm run build
# Upload the dist folder to Netlify
```

**Option B: Git Integration (Recommended)**

1. Go to Netlify Dashboard
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repository
4. Configure build settings:
   - **Base directory**: `apps/frontend`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `apps/frontend/dist`
5. Add environment variables (see Step 2)
6. Click **"Deploy site"**

**Option C: Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy from frontend directory
cd apps/frontend
netlify deploy --prod
```

---

## ⚠️ Critical Issues to Address

### Issue 1: Backend API CORS

Your backend needs to allow requests from your Netlify domain.

**Update `apps/api/main.py`:**

```python
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development
        "https://your-site.netlify.app",  # Netlify production
        "https://your-custom-domain.com"  # Custom domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue 2: API URL Configuration

The frontend needs to know where your backend API is hosted.

**Create environment-specific files:**

**`apps/frontend/.env.production`:**
```bash
VITE_API_URL=https://your-backend-api.railway.app
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx
```

**`apps/frontend/.env.development`:**
```bash
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx
```

**Important**: Vite embeds environment variables at build time. Make sure to set them in Netlify before building.

### Issue 3: SPA Routing

React Router needs to handle all routes properly.

**✅ Already configured**: Your `App.tsx` uses `Navigate` for unknown routes, which is correct.

**Additional Netlify configuration** (already in netlify.toml above):
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

This ensures all routes are handled by the React app.

---

## 🐍 Backend Deployment Options

Since Netlify doesn't support Python backend, deploy it separately:

### Option 1: Railway (Recommended)

**Pros:**
- Easy Python deployment
- Automatic HTTPS
- Great for FastAPI
- Free tier available

**Steps:**
1. Go to https://railway.app
2. Connect GitHub repository
3. Select your backend directory
4. Railway auto-detects FastAPI
5. Add environment variables (`.env` values)
6. Deploy

**Railway Configuration:**
- **Build command**: `pip install -r requirements.txt`
- **Start command**: `uvicorn apps.api.main:app --host 0.0.0.0 --port $PORT`
- **Root directory**: `/` (project root)

### Option 2: Render

**Pros:**
- Similar to Railway
- Good for Python apps
- Free tier available

**Steps:**
1. Go to https://render.com
2. Create new Web Service
3. Connect repository
4. Configure:
   - **Environment**: Python 3
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `uvicorn apps.api.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy

### Option 3: AWS / Google Cloud / Azure

**Pros:**
- Full control
- Enterprise-grade

**Cons:**
- More complex setup
- Higher cost

### Option 4: Fly.io

**Pros:**
- Good for Python apps
- Global deployment
- Free tier

---

## 🔧 Required Changes

### 1. Update CORS in Backend

File: `apps/api/main.py`

```python
import os

# Get allowed origins from environment
ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Set `CORS_ORIGINS` environment variable in your backend hosting platform:
```bash
CORS_ORIGINS=http://localhost:5173,https://your-site.netlify.app,https://your-custom-domain.com
```

### 2. Create netlify.toml

File: `netlify.toml` (project root)

```toml
[build]
  base = "apps/frontend"
  publish = "apps/frontend/dist"
  command = "npm install && npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. Update Frontend API URLs

File: `apps/frontend/vite.config.ts` (already looks good)

No changes needed if using environment variables.

### 4. Test Build Locally

```bash
cd apps/frontend
npm run build
npm run preview
```

Visit http://localhost:4173 and test all functionality.

---

## ✅ Pre-Deployment Checklist

### Frontend
- [ ] `netlify.toml` created
- [ ] `.env.production` created with correct API URL
- [ ] Build command tested locally (`npm run build`)
- [ ] Preview tested locally (`npm run preview`)
- [ ] All routes work (SPA routing)
- [ ] Environment variables documented

### Backend
- [ ] Backend deployed on Railway/Render/etc.
- [ ] CORS configured for Netlify domain
- [ ] Environment variables set in backend
- [ ] Health check endpoint working: `https://your-api.com/health`
- [ ] Database connection working

### Both
- [ ] Frontend can connect to backend API
- [ ] Supabase credentials configured
- [ ] Authentication flows working
- [ ] Bot creation/execution tested
- [ ] Paper trading functional

---

## 🚀 Deployment Workflow

### Initial Deployment

1. **Deploy Backend** (Railway/Render/etc.)
   - Get backend URL: `https://api.yourapp.com`

2. **Configure Frontend**
   - Update `VITE_API_URL` with backend URL
   - Set environment variables in Netlify

3. **Deploy Frontend** (Netlify)
   - Connect GitHub
   - Configure build settings
   - Set environment variables
   - Deploy

4. **Update CORS** (Backend)
   - Add Netlify domain to allowed origins
   - Redeploy backend

### Continuous Deployment

Once configured:
- **Frontend**: Auto-deploys on push to `main` branch
- **Backend**: Auto-deploys on push to `main` branch
- Environment variables persist across deployments

---

## 🐛 Common Issues

### Issue: "Module not found" during build

**Solution**: Ensure build command includes `npm install`:

```toml
[build]
  command = "npm install && npm run build"
```

### Issue: Environment variables not working

**Solution**: 
1. Check variable names start with `VITE_`
2. Rebuild after adding variables (clear cache)
3. Check Netlify build logs

### Issue: API calls failing from frontend

**Solution**:
1. Check backend is deployed and accessible
2. Check CORS configuration
3. Check `VITE_API_URL` is correct
4. Check browser console for errors

### Issue: "Cannot GET /some-route"

**Solution**: Add redirect rule to `netlify.toml` (already included above).

### Issue: Build succeeds but site is blank

**Solution**: Check publish directory in `netlify.toml`:
```toml
publish = "apps/frontend/dist"
```

---

## 📊 Recommended Architecture

```
┌─────────────────────────────────────────┐
│           User's Browser                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Netlify (Frontend)                 │
│  - React SPA                             │
│  - Static hosting                        │
│  - HTTPS (automatic)                     │
└──────────────┬──────────────────────────┘
               │ API calls
               ▼
┌─────────────────────────────────────────┐
│   Railway/Render (Backend API)          │
│  - FastAPI                               │
│  - Bot execution                         │
│  - Business logic                        │
└──────────────┬──────────────────────────┘
               │ Database operations
               ▼
┌─────────────────────────────────────────┐
│         Supabase                        │
│  - PostgreSQL                            │
│  - RLS                                   │
│  - Auth                                  │
└─────────────────────────────────────────┘
```

---

## 💰 Cost Estimation

### Free Tier Sufficient For:
- **Netlify**: 100GB bandwidth/month (plenty for frontend)
- **Railway**: $5 credit/month (good for small apps)
- **Render**: 750 hours/month (free tier)
- **Supabase**: 500MB database, 2GB bandwidth (free tier)

**Estimated Cost**: **$0-5/month** for small-medium usage.

---

## 📚 Additional Resources

- [Netlify Docs](https://docs.netlify.com/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

---

## ✅ Summary

**Your project CAN be deployed on Netlify for the frontend**, but you need to:

1. ✅ Create `netlify.toml` configuration
2. ⚠️ Deploy backend separately (Railway/Render/etc.)
3. ⚠️ Configure CORS in backend
4. ⚠️ Set environment variables properly
5. ⚠️ Test end-to-end after deployment

**Recommendation**: Start with Railway for backend (easiest setup), then deploy frontend on Netlify.

---

**Questions?** Check the deployment checklist above and ensure all items are completed before going live!



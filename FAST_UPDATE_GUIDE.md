# Fast Update Guide - Tradeeon Deployment

## 🚀 Update Speed Comparison

### ⚡ **FASTEST: Frontend Updates** (2-3 minutes)
- **No Docker required!**
- Just build and sync to S3
- CloudFront cache invalidation

### 🐢 **SLOWEST: Backend/Alert Runner Updates** (15-30 minutes)
- Requires Docker build (5-10 min)
- Push to ECR (5-10 min)
- ECS service update (5-10 min)

---

## 📋 Update Methods (Fastest to Slowest)

### 1. **Frontend Updates** ⚡ (2-3 minutes)

**When to use:** Frontend code changes (`apps/frontend/**`)

```powershell
# Method 1: Manual (Fastest)
cd apps/frontend
npm run build
aws s3 sync dist/ s3://tradeeon-frontend/ --delete
aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"

# Method 2: Use script
.\deploy-frontend-fix.ps1
```

**Time:** 2-3 minutes (no Docker!)

---

### 2. **GitHub Actions CI/CD** 🤖 (15-20 minutes, but automated)

**When to use:** Push to GitHub, automated deployment

**Setup (one-time):**
1. Add GitHub Secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `CLOUDFRONT_DISTRIBUTION_ID`

2. Push to GitHub:
```powershell
git push origin main
```

**What happens:**
- ✅ Automatically detects what changed
- ✅ Only builds/deploys changed services
- ✅ Runs in background (you don't wait)
- ✅ Builds Docker images in GitHub's fast runners

**Time:** 15-20 minutes (but you don't wait!)

---

### 3. **Local Quick Deploy** 🔧 (15-30 minutes, manual)

**When to use:** Backend changes, need immediate deployment

```powershell
# Deploy backend only
.\quick-deploy.ps1 backend

# Deploy alert runner only
.\quick-deploy.ps1 alert-runner

# Deploy both
.\quick-deploy.ps1 both
```

**What it does:**
1. Builds Docker image locally (5-10 min)
2. Pushes to ECR (5-10 min)
3. Updates ECS service (5-10 min)

**Time:** 15-30 minutes total

**Pros:**
- ✅ Works immediately
- ✅ No GitHub setup needed

**Cons:**
- ❌ Slow (Docker build is unavoidable)
- ❌ Uses your local machine resources

---

### 4. **CloudShell Manual** 🐢 (30-45 minutes)

**When to use:** Last resort, if local Docker doesn't work

**Steps:**
1. Upload ZIP to CloudShell
2. Extract
3. Build Docker image
4. Push to ECR
5. Update service

**Time:** 30-45 minutes (very slow)

**Avoid this if possible!**

---

## ⚡ How to Speed Up Docker Builds

### Option 1: Use Docker BuildKit (Faster Layer Caching)

```powershell
# Enable BuildKit (faster)
$env:DOCKER_BUILDKIT=1
docker build -t tradeeon-backend:latest .

# Or use buildx
docker buildx build --platform linux/amd64 -t tradeeon-backend:latest .
```

**Speed improvement:** 20-30% faster

---

### Option 2: Optimize Dockerfile (Better Caching)

**Current Dockerfile already optimized:**
- Dependencies installed first (cached)
- Code copied last (changes frequently)

**Make sure `.dockerignore` is good:**
```
apps/frontend/
.git/
*.zip
cloudshell-temp/
```

---

### Option 3: Use GitHub Actions (Parallel Builds)

**Why it's faster:**
- ✅ GitHub's runners are fast
- ✅ Parallel builds (backend + alert-runner)
- ✅ Builds in background
- ✅ No local machine resources used

**Best for:** Regular updates, multiple services

---

## 🎯 Recommended Update Strategy

### **For Frontend Changes:**
```powershell
# Fast manual deploy (2-3 min)
cd apps/frontend && npm run build
aws s3 sync dist/ s3://tradeeon-frontend/ --delete
aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
```

### **For Backend Changes:**

**Option A: Use GitHub Actions (Recommended)**
```powershell
# 1. Commit changes
git add .
git commit -m "Update backend"
git push origin main

# 2. Wait 15-20 min (or go do something else)
# GitHub Actions handles everything automatically!
```

**Option B: Quick Local Deploy (If urgent)**
```powershell
# Enable BuildKit for speed
$env:DOCKER_BUILDKIT=1

# Deploy
.\quick-deploy.ps1 backend
```

---

## 📊 Update Time Comparison

| Method | Time | When to Use |
|--------|------|-------------|
| **Frontend Manual** | 2-3 min | ⚡ Frontend changes only |
| **GitHub Actions** | 15-20 min | 🤖 Regular updates, automated |
| **Local Quick Deploy** | 15-30 min | 🔧 Urgent backend updates |
| **CloudShell Manual** | 30-45 min | 🐢 Last resort |

---

## 🚀 Best Practices

### 1. **Use GitHub Actions for Regular Updates**
- ✅ Push to GitHub
- ✅ Let CI/CD handle it
- ✅ No waiting, runs in background

### 2. **Use Local Deploy for Urgent Fixes**
- ✅ Immediate deployment
- ✅ Full control
- ⚠️ Uses local resources

### 3. **Batch Changes**
- ✅ Make multiple changes at once
- ✅ Deploy once instead of multiple times
- ✅ Saves time

### 4. **Frontend = Fast, Backend = Slow**
- ✅ Frontend: 2-3 minutes (no Docker)
- ⚠️ Backend: 15-30 minutes (Docker required)

---

## 🔧 Troubleshooting Slow Builds

### Problem: Docker build is very slow

**Solutions:**
1. **Enable BuildKit:**
   ```powershell
   $env:DOCKER_BUILDKIT=1
   ```

2. **Check `.dockerignore`:**
   - Exclude large files
   - Exclude `apps/frontend/` (not needed)
   - Exclude `.git/` directory

3. **Use GitHub Actions:**
   - Faster runners
   - Parallel builds
   - No local machine impact

4. **Optimize Dockerfile:**
   - Copy dependencies first (cached)
   - Copy code last (changes frequently)

---

## 📝 Quick Reference

### Frontend Update (Fast)
```powershell
cd apps/frontend && npm run build
aws s3 sync dist/ s3://tradeeon-frontend/ --delete
aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
```

### Backend Update (Slow - Use GitHub Actions)
```powershell
git push origin main  # Wait 15-20 min
```

### Backend Update (Urgent - Local)
```powershell
$env:DOCKER_BUILDKIT=1
.\quick-deploy.ps1 backend
```

---

## 💡 Pro Tips

1. **Frontend changes are FAST** - Use manual deploy
2. **Backend changes are SLOW** - Use GitHub Actions for regular updates
3. **Enable BuildKit** - 20-30% faster Docker builds
4. **Batch changes** - Deploy multiple changes at once
5. **Monitor deployments** - Check AWS Console for status

---

**Remember:** Docker builds are inherently slow (5-10 min). Use GitHub Actions to avoid waiting!



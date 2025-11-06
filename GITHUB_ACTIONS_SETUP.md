# GitHub Actions Setup Guide

## 🎯 Key Point: **No CloudShell Needed!**

GitHub Actions runs **automatically on GitHub's servers** when you push code. You don't need CloudShell at all!

---

## ✅ How It Works

```
You (Local) → Push to GitHub → GitHub Actions (Cloud) → AWS
                    ↓
            Runs automatically!
            No CloudShell needed!
```

**When you push:**
1. Code goes to GitHub
2. GitHub Actions detects changes
3. Builds Docker images on GitHub's servers
4. Deploys to AWS automatically
5. You get notified (no waiting!)

---

## 🔧 Setup Steps (One-Time)

### Step 1: Verify GitHub Repository

Check if your repo is connected:
```powershell
git remote -v
```

Should show:
```
origin  https://github.com/YOUR_USERNAME/YOUR_REPO.git (fetch)
origin  https://github.com/YOUR_USERNAME/YOUR_REPO.git (push)
```

If not set up, add it:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

---

### Step 2: Add GitHub Secrets

Go to your GitHub repository:
1. **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:

#### Required Secrets:

| Secret Name | What It Is | How to Get |
|-------------|------------|------------|
| `AWS_ACCESS_KEY_ID` | AWS access key | AWS Console → IAM → Users → Your user → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Same as above |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront ID | `EMF4IMNT9637C` (you already have this) |
| `VITE_API_URL` | Frontend API URL | `https://api.tradeeon.com` or your backend URL |

#### How to Get AWS Credentials:

**Option A: Use Existing IAM User (Recommended)**
1. Go to AWS Console → IAM → Users
2. Find your user (or create one)
3. Go to **Security credentials** tab
4. Click **Create access key**
5. Choose **Application running outside AWS**
6. Copy the Access Key ID and Secret Access Key

**Option B: Use Script (Easier)**
```powershell
# Run this script to generate credentials
.\setup-github-actions.ps1
```

---

### Step 3: Test the Setup

1. **Make a small change:**
   ```powershell
   # Edit any file (e.g., README.md)
   # Add a comment or whitespace
   ```

2. **Commit and push:**
   ```powershell
   git add .
   git commit -m "Test GitHub Actions"
   git push origin main
   ```

3. **Check GitHub Actions:**
   - Go to your GitHub repo
   - Click **Actions** tab
   - You should see workflow running!

---

## 🚀 How to Use (Going Forward)

### For Any Update:

**1. Make your changes locally**

**2. Commit and push:**
```powershell
git add .
git commit -m "Your update message"
git push origin main
```

**3. That's it!** 
- GitHub Actions runs automatically
- Deploys to AWS
- No CloudShell needed!

---

## 📊 What Happens Automatically

### When you push:

**GitHub Actions detects what changed:**
- ✅ Backend files (`apps/api/**`, `backend/**`) → Deploys backend
- ✅ Alert runner files (`apps/alerts/**`) → Deploys alert runner
- ✅ Frontend files (`apps/frontend/**`) → Deploys frontend
- ✅ Only deploys what changed (smart!)

**Deployment process:**
1. **Backend/Alert Runner:**
   - Builds Docker image on GitHub's servers
   - Pushes to ECR
   - Updates ECS service
   - **Time: 15-20 minutes**

2. **Frontend:**
   - Builds React app
   - Syncs to S3
   - Invalidates CloudFront cache
   - **Time: 5-10 minutes**

**You don't wait!** It runs in the background.

---

## 🔍 Monitoring Deployments

### Check Status:

**Option 1: GitHub Actions Tab**
1. Go to your GitHub repo
2. Click **Actions** tab
3. See all workflow runs
4. Click on any run to see details

**Option 2: AWS Console**
- ECS → Services → Check service status
- CloudWatch → Logs → See deployment logs

---

## 🐛 Troubleshooting

### Problem: Workflow doesn't run

**Check:**
1. ✅ Secrets are set correctly
2. ✅ Code is pushed to `main` branch
3. ✅ Workflow files are in `.github/workflows/`
4. ✅ Repository has Actions enabled

**Enable Actions:**
- Go to repository **Settings** → **Actions** → **General**
- Make sure "Allow all actions" is selected

---

### Problem: Deployment fails

**Check logs:**
1. Go to **Actions** tab
2. Click on failed workflow
3. Check error messages

**Common issues:**
- ❌ Missing AWS credentials → Check secrets
- ❌ Wrong ECR repository → Check workflow file
- ❌ ECS service not found → Verify service name

---

### Problem: "No changes detected"

**This is normal!** 
- If you only changed documentation, no deployment needed
- Workflow only deploys when relevant files change

---

## 📝 Quick Reference

### Daily Workflow:

```powershell
# 1. Make changes
# ... edit files ...

# 2. Commit
git add .
git commit -m "Update feature X"

# 3. Push (triggers deployment)
git push origin main

# 4. Check status
# Go to GitHub → Actions tab
```

---

## ✅ Benefits

| Feature | Benefit |
|---------|---------|
| **Automated** | No manual steps |
| **Smart** | Only deploys what changed |
| **Fast** | GitHub's fast servers |
| **No CloudShell** | No need for CloudShell |
| **Background** | Runs while you work |
| **Monitored** | See all deployments in GitHub |

---

## 🎯 Summary

**Going Forward:**
1. ✅ Make changes locally
2. ✅ `git push origin main`
3. ✅ GitHub Actions handles everything
4. ✅ **No CloudShell needed!**

**CloudShell is only for:**
- ❌ Initial setup (one-time)
- ❌ Emergency manual deployments (rare)
- ❌ Troubleshooting (when needed)

**For regular updates: Use GitHub Actions!**

---

## 🔗 Next Steps

1. **Set up GitHub Secrets** (see Step 2 above)
2. **Test with a small change**
3. **Start using `git push` for all updates**

That's it! You're ready to use GitHub Actions! 🚀



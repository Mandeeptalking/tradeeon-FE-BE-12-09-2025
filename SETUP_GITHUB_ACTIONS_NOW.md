# Setup GitHub Actions - Quick Start

## ✅ Good News: Your Git is Already Connected!

Your repository is connected to:
```
https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025
```

**No CloudShell needed!** GitHub Actions runs on GitHub's servers.

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get AWS Credentials

**Option A: Use Existing IAM User**

If you already have AWS credentials, use those!

**Option B: Create New IAM User (Recommended)**

Run this in PowerShell:
```powershell
# Create IAM user for GitHub Actions
aws iam create-user --user-name github-actions-deployer

# Attach required policies
aws iam attach-user-policy --user-name github-actions-deployer --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess
aws iam attach-user-policy --user-name github-actions-deployer --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
aws iam attach-user-policy --user-name github-actions-deployer --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-user-policy --user-name github-actions-deployer --policy-arn arn:aws:iam::aws:policy/CloudFrontFullAccess

# Create access key
aws iam create-access-key --user-name github-actions-deployer
```

**Copy the Access Key ID and Secret Access Key!**

---

### Step 2: Add Secrets to GitHub

1. **Go to your GitHub repository:**
   ```
   https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025
   ```

2. **Navigate to Secrets:**
   - Click **Settings** (top right)
   - Click **Secrets and variables** → **Actions**
   - Click **New repository secret**

3. **Add these 4 secrets:**

   | Secret Name | Value | Notes |
   |-------------|-------|-------|
   | `AWS_ACCESS_KEY_ID` | Your AWS access key | From Step 1 |
   | `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | From Step 1 |
   | `CLOUDFRONT_DISTRIBUTION_ID` | `EMF4IMNT9637C` | You already have this |
   | `VITE_API_URL` | `https://api.tradeeon.com` | Your backend API URL |

---

### Step 3: Test It!

1. **Make a small test change:**
   ```powershell
   # Edit README.md or any file
   # Add a comment or whitespace
   ```

2. **Commit and push:**
   ```powershell
   git add .
   git commit -m "Test GitHub Actions setup"
   git push origin main
   ```

3. **Check GitHub Actions:**
   - Go to: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions
   - You should see workflow running!
   - Wait 15-20 minutes for deployment

---

## ✅ That's It!

**From now on:**
```powershell
# Make changes
# ...

# Push to GitHub
git push origin main

# GitHub Actions deploys automatically!
# No CloudShell needed!
```

---

## 📊 What Happens When You Push

1. **GitHub detects changes**
   - Backend files → Deploys backend
   - Frontend files → Deploys frontend
   - Alert runner files → Deploys alert runner

2. **GitHub Actions runs automatically**
   - Builds Docker images (on GitHub's servers)
   - Pushes to ECR
   - Updates ECS services
   - Syncs frontend to S3

3. **You get notified**
   - Check Actions tab for status
   - Green checkmark = success ✅

---

## 🎯 Summary

**No CloudShell needed!**

- ✅ GitHub Actions runs on GitHub's servers
- ✅ Just push to GitHub
- ✅ Automatic deployment
- ✅ Works in background

**CloudShell is only for:**
- ❌ Emergency manual deployments (rare)
- ❌ Troubleshooting (when needed)

**For regular updates: Use GitHub!**

---

## 🔗 Next Steps

1. ✅ Add GitHub Secrets (see Step 2)
2. ✅ Test with a push (see Step 3)
3. ✅ Start using `git push` for all updates!

**You're ready!** 🚀


# How to Check Workflow Errors

## 🔍 Steps to See Actual Errors

1. **Go to GitHub Actions:**
   https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions

2. **Click on the failed workflow** (red X icon)

3. **Click on the failed job** (e.g., "Deploy Frontend" or "Deploy Backend")

4. **Scroll down and expand the failed step**

5. **Copy the entire error message** and share it

## 🚨 Most Common Errors

### 1. Missing Secrets
**Error:** "Missing required input: AWS_ACCESS_KEY_ID"
**Fix:** Add secrets in GitHub Settings → Secrets and variables → Actions

### 2. Build Failure
**Error:** "npm ERR!" or "Build failed"
**Fix:** Check if package-lock.json is committed, test build locally

### 3. AWS Access Denied
**Error:** "AccessDenied" or "Invalid credentials"
**Fix:** Check AWS credentials in secrets

### 4. Missing AWS Resources
**Error:** "NoSuchBucket" or "ResourceNotFoundException"
**Fix:** Create missing S3 bucket, ECR repo, or ECS service

### 5. Docker Build Failure
**Error:** "COPY failed" or "file not found"
**Fix:** Check Dockerfile paths, ensure files exist

## 📋 Required Secrets Checklist

Check these in GitHub Settings → Secrets:
- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`
- ✅ `VITE_API_URL`
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ⚠️ `CLOUDFRONT_DISTRIBUTION_ID` (optional)

## 🎯 Quick Fix

**Without seeing the actual error, I can only guess. Please:**
1. Click on the failed workflow
2. Copy the error message
3. Share it with me

Then I can fix it properly!


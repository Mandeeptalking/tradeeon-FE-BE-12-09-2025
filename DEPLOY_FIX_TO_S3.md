# How to Deploy Code Changes to S3

## ✅ Quick Answer: YES, you need to commit and push to Git!

The code changes I made are **only on your local machine**. To see them on your live website, you need to:

1. **Commit** the changes to git
2. **Push** to GitHub
3. **Deploy** to S3 (automatically or manually)

---

## 🚀 Option 1: Automatic Deployment (Recommended)

You have a GitHub Actions workflow that **automatically deploys** when you push to `main` branch!

### Steps:

1. **Stage your changes:**
   ```bash
   git add apps/frontend/src/components/bots/BotCard.tsx
   git add apps/frontend/src/pages/BotsPage.tsx
   git add FIX_VIEW_LOGS_NAVIGATION.md
   git add WHY_LOGS_NOT_SHOWING.md
   git add DEPLOY_FIX_TO_S3.md
   ```

2. **Commit with a message:**
   ```bash
   git commit -m "Fix: Add debugging for View Logs navigation issue"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin main
   ```

4. **Wait for GitHub Actions:**
   - Go to: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions
   - You'll see a workflow called "Deploy Frontend to S3 + CloudFront" running
   - Wait ~3-5 minutes for it to complete
   - It will:
     - Build the frontend
     - Upload to S3 bucket: `tradeeon-frontend`
     - Invalidate CloudFront cache
   
5. **Wait 2-3 minutes** for CloudFront cache to clear

6. **Refresh your website** - changes should be live!

---

## 🔧 Option 2: Manual Deployment

If you want to deploy immediately without waiting for GitHub Actions:

### On Your Local Machine:

1. **First, commit and push the changes:**
   ```bash
   git add apps/frontend/src/components/bots/BotCard.tsx
   git add apps/frontend/src/pages/BotsPage.tsx
   git commit -m "Fix: Add debugging for View Logs navigation"
   git push origin main
   ```

2. **Build and deploy:**
   ```bash
   # From project root directory
   cd apps/frontend
   npm install  # Only needed if dependencies changed
   npm run build
   
   # Upload to S3
   aws s3 sync dist/ s3://tradeeon-frontend/ --delete
   
   # Invalidate CloudFront cache
   aws cloudfront create-invalidation \
     --distribution-id EMF4IMNT9637C \
     --paths "/*"
   ```

3. **Wait 2-3 minutes** for CloudFront cache to clear

---

## 📋 Step-by-Step Commands

Run these commands in order:

```bash
# 1. Check what files changed
git status

# 2. Stage the changed files
git add apps/frontend/src/components/bots/BotCard.tsx
git add apps/frontend/src/pages/BotsPage.tsx

# 3. Commit
git commit -m "Fix: Add debugging logs for View Logs navigation"

# 4. Push to GitHub
git push origin main

# 5. Check GitHub Actions (optional)
# Go to: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions
# Wait for "Deploy Frontend to S3 + CloudFront" workflow to complete

# 6. Wait 2-3 minutes, then refresh your website
```

---

## 🔍 How to Verify Deployment

### Check GitHub Actions:
1. Go to: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions
2. Look for latest "Deploy Frontend to S3 + CloudFront" run
3. Should show ✅ green checkmark when complete

### Check S3:
```bash
aws s3 ls s3://tradeeon-frontend/ --recursive | head -10
```

### Check CloudFront Invalidation:
```bash
aws cloudfront list-invalidations \
  --distribution-id EMF4IMNT9637C \
  --max-items 1
```

### Test the Website:
1. Open: https://www.tradeeon.com
2. Open DevTools (F12) → Console
3. Click "View Logs" on a bot
4. You should now see console logs like:
   ```
   🔍 View Logs clicked for bot: dca_bot_...
   ```

---

## ⚠️ Important Notes

### 1. GitHub Actions Only Deploys on `main` Branch
- Make sure you're pushing to `main`, not a feature branch
- The workflow triggers on pushes to `main` with changes in `apps/frontend/**`

### 2. CloudFront Cache
- After deployment, wait **2-3 minutes** for CloudFront cache to clear
- Your changes won't appear immediately due to caching
- You can force refresh with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### 3. Environment Variables
- The GitHub Actions workflow uses secrets for:
  - `VITE_API_URL`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Make sure these are set in GitHub Secrets

---

## 🐛 Troubleshooting

### GitHub Actions Fails:
- Check the workflow logs for errors
- Verify AWS credentials are set in GitHub Secrets
- Make sure S3 bucket exists: `tradeeon-frontend`

### Changes Not Appearing:
- Wait longer (CloudFront can take up to 5 minutes)
- Clear browser cache: Ctrl+Shift+Delete
- Hard refresh: Ctrl+Shift+R
- Check if CloudFront invalidation completed

### Can't Push to Git:
- Check if you have push permissions
- Make sure you're on the correct branch
- Pull latest changes first: `git pull origin main`

---

## 📝 Summary

**To see your changes live:**

```
1. git add <files>
2. git commit -m "message"
3. git push origin main
4. Wait for GitHub Actions (3-5 min)
5. Wait for CloudFront cache (2-3 min)
6. Refresh website
```

**Total time: ~5-8 minutes**

---

## 🎯 Quick Commands (Copy & Paste)

```bash
# From project root directory:
git add apps/frontend/src/components/bots/BotCard.tsx apps/frontend/src/pages/BotsPage.tsx
git commit -m "Fix: Add debugging for View Logs navigation issue"
git push origin main
```

Then check: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions

---

That's it! Once you push to GitHub, the automated workflow will handle the rest. 🚀


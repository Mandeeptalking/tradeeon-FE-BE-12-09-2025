# Quick Fix for Failed Workflows

## 🔴 Most Likely Issues (Based on Recent Failures)

### 1. Missing GitHub Secrets
**Check:** GitHub → Settings → Secrets and variables → Actions

**Required secrets:**
- `AWS_ACCESS_KEY_ID` ✅ (probably set)
- `AWS_SECRET_ACCESS_KEY` ✅ (probably set)
- `VITE_API_URL` ⚠️ (check if set)
- `VITE_SUPABASE_URL` ⚠️ (check if set)
- `VITE_SUPABASE_ANON_KEY` ⚠️ (check if set)
- `CLOUDFRONT_DISTRIBUTION_ID` ⚠️ (optional, but check)

### 2. Missing package-lock.json
**Check:** Does `apps/frontend/package-lock.json` exist?

**Fix if missing:**
```bash
cd apps/frontend
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

### 3. Build Errors
**Check:** Test build locally:
```bash
cd apps/frontend
npm ci
npm run build
```

If this fails locally, fix the errors before pushing.

### 4. AWS Resources Missing
**Check in AWS Console:**
- S3 bucket: `tradeeon-frontend` exists?
- ECR repo: `tradeeon-backend` exists?
- ECR repo: `tradeeon-alert-runner` exists?
- ECS cluster: `tradeeon-cluster` exists?
- ECS service: `tradeeon-backend-service` exists?

## 🔍 How to See Actual Errors

1. Go to GitHub → Actions tab
2. Click on failed workflow (e.g., "Deploy All Services #40")
3. Click on the failed job
4. Expand the failed step
5. **Copy the error message** - this tells you exactly what's wrong

## 📋 Common Error Messages & Fixes

### "Missing environment variable"
**Fix:** Add the missing secret in GitHub Settings

### "npm ERR! Cannot find module"
**Fix:** Run `npm install` locally and commit `package-lock.json`

### "AccessDenied" or "Invalid credentials"
**Fix:** Check AWS credentials in GitHub secrets

### "NoSuchBucket" or "ResourceNotFoundException"
**Fix:** Create the missing AWS resource

### "Build failed" or compilation errors
**Fix:** Fix the code errors locally first

## ✅ Quick Action Items

1. **Check GitHub Secrets** - Make sure all required secrets are set
2. **Test build locally** - `cd apps/frontend && npm ci && npm run build`
3. **Check package-lock.json** - Make sure it's committed
4. **View actual error** - Click on failed workflow to see specific error
5. **Fix and retry** - Based on the actual error message


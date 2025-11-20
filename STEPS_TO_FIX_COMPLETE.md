# Complete Steps to Fix the Issue

## ✅ What I've Already Done

1. ✅ **Identified the Root Cause**: 
   - Workflow uses wrong AWS region (`us-east-1` instead of `ap-southeast-1`)
   - Silent failures due to `continue-on-error: true`
   - Missing CloudFront ID secret

2. ✅ **Fixed the Workflow File**:
   - Updated `.github/workflows/deploy-all.yml`
   - Added `AWS_REGION_FRONTEND: ap-southeast-1`
   - Removed `continue-on-error: true`
   - Hardcoded CloudFront ID: `EMF4IMNT9637C`
   - Added explicit `--region` flag to S3 sync

## 🚀 Steps You Need to Complete

### Step 1: Commit and Push the Fix (REQUIRED)

```bash
# Check what changed
git status

# Add the fixed workflow file
git add .github/workflows/deploy-all.yml

# Commit with descriptive message
git commit -m "Fix: Use correct AWS region (ap-southeast-1) for frontend deployment in deploy-all workflow"

# Push to trigger deployment
git push origin main
```

**This will automatically trigger the workflow and redeploy frontend correctly.**

---

### Step 2: Verify GitHub Actions Run

1. Go to: https://github.com/YOUR_REPO/actions
2. Find the latest "Deploy All Services" workflow run
3. Check the "Deploy Frontend" job:
   - ✅ Should use region `ap-southeast-1`
   - ✅ Should successfully sync to S3
   - ✅ Should successfully invalidate CloudFront
   - ❌ If it fails, check the error logs

---

### Step 3: Manual Immediate Fix (If Website Still Down)

If you can't wait for GitHub Actions, manually deploy:

#### Option A: Using PowerShell (Windows)

```powershell
# 1. Navigate to frontend directory
cd apps/frontend

# 2. Install dependencies (if needed)
npm install

# 3. Build frontend
npm run build

# 4. Deploy to S3 (correct region)
aws s3 sync dist/ s3://tradeeon-frontend/ --delete --region ap-southeast-1

# 5. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
```

#### Option B: Using Bash (Linux/Mac/WSL)

```bash
# 1. Navigate to frontend directory
cd apps/frontend

# 2. Install dependencies (if needed)
npm install

# 3. Build frontend
npm run build

# 4. Deploy to S3 (correct region)
aws s3 sync dist/ s3://tradeeon-frontend/ --delete --region ap-southeast-1

# 5. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
```

**Prerequisites for manual deployment**:
- ✅ AWS CLI installed and configured
- ✅ Node.js 18+ installed
- ✅ npm installed
- ✅ AWS credentials with S3 and CloudFront permissions

---

### Step 4: Verify Deployment

After deployment (manual or via GitHub Actions):

```bash
# Check S3 bucket has files
aws s3 ls s3://tradeeon-frontend/ --region ap-southeast-1

# Check for index.html (required)
aws s3 ls s3://tradeeon-frontend/index.html --region ap-southeast-1

# Check CloudFront distribution status
aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.{Status:Status,Enabled:Enabled}" --output json

# Test website
curl -I https://www.tradeeon.com
# Should return: HTTP/2 200
```

---

### Step 5: Check DNS (If Still Not Working)

If website still shows DNS error after deployment:

```bash
# Check DNS resolution
nslookup www.tradeeon.com

# Should return CloudFront IP addresses
# If NXDOMAIN, check Route53 record
```

**If DNS still broken**, run:
```powershell
.\diagnose-what-broke.ps1
```

Or manually check Route53:
```bash
# Get hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].[Id]" --output text | cut -d'/' -f3)

# Check www record
aws route53 list-resource-record-sets --hosted-zone-id $ZONE_ID --query "ResourceRecordSets[?Name=='www.tradeeon.com.']" --output json
```

---

## 📋 Complete Checklist

- [ ] **Step 1**: Commit and push workflow fix
- [ ] **Step 2**: Verify GitHub Actions run succeeded
- [ ] **Step 3**: Manual deploy (if needed/urgent)
- [ ] **Step 4**: Verify S3 bucket has files
- [ ] **Step 5**: Verify CloudFront distribution is enabled
- [ ] **Step 6**: Test website: https://www.tradeeon.com
- [ ] **Step 7**: Check DNS (if still broken)
- [ ] **Step 8**: Run diagnostic script (if needed)

---

## 🔍 Troubleshooting

### If GitHub Actions Fails

1. **Check AWS Credentials**:
   - Go to: GitHub → Settings → Secrets and variables → Actions
   - Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` exist
   - Verify they have permissions for S3 and CloudFront

2. **Check Region**:
   - Verify S3 bucket is in `ap-southeast-1`
   - Verify CloudFront distribution exists

3. **Check Logs**:
   - Open failed workflow run
   - Check "Deploy Frontend" job logs
   - Look for specific error messages

### If Manual Deploy Fails

1. **AWS CLI Not Configured**:
   ```bash
   aws configure
   # Enter AWS Access Key ID
   # Enter AWS Secret Access Key
   # Default region: ap-southeast-1
   # Default output format: json
   ```

2. **Missing Permissions**:
   - Verify IAM user/role has:
     - `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `tradeeon-frontend` bucket
     - `cloudfront:CreateInvalidation` on distribution `EMF4IMNT9637C`

3. **Build Fails**:
   - Check Node.js version: `node --version` (should be 18+)
   - Check npm version: `npm --version`
   - Try: `npm install` then `npm run build`

---

## 🎯 Expected Outcome

After completing these steps:

✅ Frontend files deployed to S3 bucket `tradeeon-frontend` in `ap-southeast-1`  
✅ CloudFront cache invalidated  
✅ Website accessible at https://www.tradeeon.com  
✅ No more DNS_PROBE_FINISHED_NXDOMAIN error  

---

## 📞 Quick Reference

**Workflow File**: `.github/workflows/deploy-all.yml`  
**S3 Bucket**: `tradeeon-frontend`  
**Region**: `ap-southeast-1`  
**CloudFront ID**: `EMF4IMNT9637C`  
**Domain**: `www.tradeeon.com`  

**Standalone Frontend Workflow**: `.github/workflows/deploy-frontend.yml` (has correct region, can use as backup)

---

**Most Important Step**: **Commit and push the workflow fix** - this will automatically redeploy everything correctly!


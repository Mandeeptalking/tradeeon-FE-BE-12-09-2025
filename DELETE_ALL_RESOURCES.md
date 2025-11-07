# Delete All AWS Resources - Fresh Start

## 🗑️ Step-by-Step Cleanup Guide

Let's delete everything in the correct order to avoid dependency issues.

---

## 📝 Step 1: Delete CloudFront Distribution

**⚠️ IMPORTANT:** This must be done FIRST and takes 15-30 minutes.

### 1.1 Go to CloudFront
1. AWS Console → CloudFront
2. Find your distribution (should be `tradeeon-frontend` or ID starting with `E2...`)
3. Select it (check the box)

### 1.2 Disable Distribution
1. Click **"Disable"** button (top right)
2. Confirm the disable action
3. ⏳ **Wait 5-10 minutes** for it to disable

### 1.3 Delete Distribution
1. Once status shows **"Disabled"**
2. Select the distribution again
3. Click **"Delete"** button
4. Type `delete` to confirm
5. Click **"Delete"**
6. ⏳ **Wait 5-10 minutes** for deletion to complete

**Status:** Distribution should disappear from the list ✅

---

## 📝 Step 2: Delete S3 Bucket Contents

### 2.1 Go to S3
1. AWS Console → S3
2. Find your bucket: `www-tradeeon-prod`
3. Click on the bucket name

### 2.2 Empty Bucket
1. Click **"Empty"** button (top right)
2. Type `permanently delete` to confirm
3. Click **"Empty"**
4. ⏳ Wait for all objects to be deleted

### 2.3 Delete Bucket
1. Go back to S3 bucket list
2. Select the bucket `www-tradeeon-prod`
3. Click **"Delete"** button
4. Type the bucket name to confirm: `www-tradeeon-prod`
5. Click **"Delete bucket"**

**Status:** Bucket should disappear ✅

---

## 📝 Step 3: Delete Route 53 DNS Records

### 3.1 Go to Route 53
1. AWS Console → Route 53
2. Click **"Hosted zones"**
3. Click on **"tradeeon.com"**

### 3.2 Delete DNS Records
Look for these records and delete them:
- [ ] Any A record for `www.tradeeon.com` pointing to CloudFront
- [ ] Any CNAME records for ACM validation (if you added them)
- [ ] Any other custom records you created

**How to delete:**
1. Select the record (check the box)
2. Click **"Delete"** button
3. Click **"Delete"** to confirm

**⚠️ NOTE:** Keep the NS (Name Server) and SOA records - those are required for the hosted zone.

### 3.3 (Optional) Delete Hosted Zone
If you want to delete the entire hosted zone:
1. Select the hosted zone `tradeeon.com`
2. Click **"Delete hosted zone"**
3. Confirm deletion

**⚠️ WARNING:** This will remove all DNS records for your domain. Only do this if you're completely starting over.

---

## 📝 Step 4: Delete SSL Certificate (Optional)

### 4.1 Go to Certificate Manager
1. AWS Console → Certificate Manager
2. Find certificate with `www.tradeeon.com` or `tradeeon.com`

### 4.2 Delete Certificate
1. Select the certificate
2. Click **"Delete"** button
3. Type the certificate ARN or confirm deletion
4. Click **"Delete"**

**Status:** Certificate should disappear ✅

**⚠️ NOTE:** This is optional. If you might use it later, you can keep it.

---

## 📝 Step 5: Delete IAM Roles/Policies (If Created)

### 5.1 Check IAM
1. AWS Console → IAM
2. Check if you created any custom roles or policies for:
   - CloudFront
   - S3 bucket access
   - Any other deployment roles

If you didn't create custom IAM resources, skip this step.

---

## ✅ Verification Checklist

After deletion, verify everything is gone:

- [ ] CloudFront distribution deleted
- [ ] S3 bucket deleted
- [ ] DNS records cleaned up (except NS/SOA)
- [ ] SSL certificate deleted (optional)
- [ ] No orphaned resources

---

## 🔄 Ready for Fresh Start

Once everything is deleted, you can:
1. Start fresh with S3 bucket creation
2. Create a new CloudFront distribution
3. Set up SSL certificate properly from the beginning
4. Configure DNS records correctly

---

## 💡 Quick Delete Script (PowerShell)

If you want to try automated deletion via AWS CLI:

```powershell
# WARNING: This will delete everything! Use with caution.

Write-Host "`n⚠️  WARNING: This will delete ALL resources!`n" -ForegroundColor Red
$confirm = Read-Host "Type 'DELETE ALL' to confirm"

if ($confirm -eq "DELETE ALL") {
    Write-Host "`n🗑️  Starting deletion...`n" -ForegroundColor Yellow
    
    # Delete CloudFront Distribution (must be disabled first)
    Write-Host "1️⃣ Disabling CloudFront distribution..." -ForegroundColor Cyan
    aws cloudfront get-distribution-config --id E2GKG9WFGGVUOQ --output json > dist-config.json
    # Manual step required: Edit dist-config.json to set Enabled: false, then:
    # aws cloudfront update-distribution --id E2GKG9WFGGVUOQ --if-match <ETag> --distribution-config file://dist-config.json
    
    Write-Host "2️⃣ Emptying S3 bucket..." -ForegroundColor Cyan
    aws s3 rm s3://www-tradeeon-prod --recursive
    
    Write-Host "3️⃣ Deleting S3 bucket..." -ForegroundColor Cyan
    aws s3api delete-bucket --bucket www-tradeeon-prod --region us-east-1
    
    Write-Host "`n✅ Cleanup complete!`n" -ForegroundColor Green
} else {
    Write-Host "`n❌ Deletion cancelled.`n" -ForegroundColor Yellow
}
```

**⚠️ Note:** CloudFront deletion must be done manually via console as it requires disabling first.

---

## 🆘 Troubleshooting

### Issue: Can't delete CloudFront distribution
**Solution:** Make sure it's disabled first. Wait 15-30 minutes after disabling before deletion.

### Issue: Can't delete S3 bucket
**Solution:** 
- Make sure bucket is empty
- Check versioning - disable if enabled
- Delete bucket policies if present

### Issue: DNS records still pointing to deleted resources
**Solution:** Delete all custom DNS records in Route 53 before deleting CloudFront.

---

## 📋 Quick Reference

**Resources to Delete:**
1. ✅ CloudFront Distribution (`E2GKG9WFGGVUOQ`)
2. ✅ S3 Bucket (`www-tradeeon-prod`)
3. ✅ Route 53 DNS Records (A record for www)
4. ⚠️ SSL Certificate (optional)
5. ⚠️ Route 53 Hosted Zone (optional - only if complete reset)

**Estimated Time:** 30-60 minutes (mostly waiting for CloudFront)



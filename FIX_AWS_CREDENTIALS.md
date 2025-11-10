# Fix AWS Credentials Error

## Problem
"The security token included in the request is invalid" = AWS credentials expired or invalid

## Solution: Refresh AWS Credentials in CloudShell

### Option 1: Refresh CloudShell Session
CloudShell credentials can expire. Try:

1. **Close and reopen CloudShell:**
   - Click the "Actions" menu → "Close CloudShell"
   - Open a new CloudShell session
   - Try the command again

### Option 2: Check Current Credentials

```bash
# Check current identity
aws sts get-caller-identity

# If this fails, credentials are invalid
```

### Option 3: Use AWS Console to Verify Permissions

1. Go to **IAM** → **Users** (or **Roles**)
2. Find your user/role
3. Verify it has permissions for:
   - `s3:PutObject`
   - `s3:DeleteObject`
   - `s3:ListBucket`
   - `cloudfront:CreateInvalidation`

### Option 4: Check S3 Bucket Permissions

```bash
# Test S3 access
aws s3 ls s3://tradeeon-frontend/

# If this fails, check bucket policy
aws s3api get-bucket-policy --bucket tradeeon-frontend
```

## Quick Fix: Restart CloudShell

The easiest solution is usually to:
1. Close CloudShell completely
2. Open a new CloudShell session
3. Try the deployment again

## Alternative: Use AWS Console Upload

If CloudShell credentials keep failing, you can upload via AWS Console:

1. Go to **S3** → **tradeeon-frontend** bucket
2. Click **Upload**
3. Upload all files from `dist/` folder
4. Then invalidate CloudFront cache

## Verify Credentials Work

After refreshing, test with:

```bash
# Test S3 access
aws s3 ls s3://tradeeon-frontend/

# Test CloudFront access
aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.Status"
```

If both work, proceed with deployment.


# Fix GitHub Actions Frontend Deployment

## Problem
GitHub Actions workflow failing with: "The security token included in the request is invalid"

## Root Causes
1. **AWS credentials invalid/expired** in GitHub Secrets
2. **Wrong AWS region** - workflow was using `us-east-1` but S3/CloudFront are in `ap-southeast-1`
3. **Missing CloudFront distribution ID** secret

## ✅ Fixed in Workflow
- ✅ Changed `AWS_REGION` from `us-east-1` to `ap-southeast-1`
- ✅ Hardcoded CloudFront distribution ID: `EMF4IMNT9637C`

## Required GitHub Secrets

Go to **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**

Add/Update these secrets:

1. **`AWS_ACCESS_KEY_ID`**
   - Get from: AWS Console → IAM → Users → Your user → Security credentials
   - Create new access key if needed

2. **`AWS_SECRET_ACCESS_KEY`**
   - Get from: Same place as above (only shown once when created)

3. **`VITE_API_URL`** (Optional but recommended)
   - Value: `http://api.tradeeon.com`

4. **`VITE_SUPABASE_URL`** (Optional but recommended)
   - Value: `https://mgjlnmlhwuqspctanaik.supabase.co`

5. **`VITE_SUPABASE_ANON_KEY`** (Optional but recommended)
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTQzMDUsImV4cCI6MjA3Mjk5MDMwNX0.LF1iumCNB4EPJxAJSeTx04V0Tp7SlL7HBfsJVb3RmLU`

## IAM Permissions Required

The AWS user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::tradeeon-frontend",
        "arn:aws:s3:::tradeeon-frontend/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetDistribution"
      ],
      "Resource": "arn:aws:cloudfront::531604848081:distribution/EMF4IMNT9637C"
    }
  ]
}
```

## Steps to Fix

1. **Update GitHub Secrets:**
   - Go to repository → Settings → Secrets → Actions
   - Update `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
   - Add environment variable secrets if needed

2. **Verify IAM Permissions:**
   - Check the IAM user has S3 and CloudFront permissions
   - Create new access key if old one expired

3. **Re-run Workflow:**
   - Go to Actions tab
   - Click on failed workflow
   - Click "Re-run all jobs"

## Quick Test

After updating secrets, manually trigger the workflow:
- Go to **Actions** → **Deploy Frontend to S3 + CloudFront**
- Click **Run workflow** → **Run workflow**


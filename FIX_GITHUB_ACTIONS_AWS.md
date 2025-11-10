# Fix GitHub Actions Frontend Deployment - AWS Credentials

## Problem
GitHub Actions workflow "Build and Deploy Frontend" is failing with:
"The security token included in the request is invalid"

This means the AWS credentials in GitHub Secrets are invalid or expired.

## Solution: Update GitHub Secrets

### Step 1: Get New AWS Credentials

You need to create or update AWS credentials for GitHub Actions:

**Option A: Use Existing IAM User**
1. Go to **AWS Console** → **IAM** → **Users**
2. Find or create a user for GitHub Actions
3. Create access key:
   - Click user → **Security credentials** tab
   - Click **Create access key**
   - Choose **Application running outside AWS**
   - Copy **Access key ID** and **Secret access key**

**Option B: Create New IAM User**
1. Go to **IAM** → **Users** → **Create user**
2. Name: `github-actions-deploy`
3. Attach policies:
   - `AmazonS3FullAccess` (or custom policy for `tradeeon-frontend` bucket)
   - `CloudFrontFullAccess` (or custom policy for distribution `EMF4IMNT9637C`)
4. Create access key and copy credentials

### Step 2: Update GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Update or create these secrets:
   - `AWS_ACCESS_KEY_ID` - Your AWS access key ID
   - `AWS_SECRET_ACCESS_KEY` - Your AWS secret access key
   - `AWS_REGION` - `ap-southeast-1` (or the region where S3/CloudFront are)

### Step 3: Verify Workflow File

Check `.github/workflows/deploy-frontend.yml` uses the secrets correctly.

## Required IAM Permissions

The IAM user/role needs:

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
        "cloudfront:GetDistribution",
        "cloudfront:ListInvalidations"
      ],
      "Resource": "arn:aws:cloudfront::531604848081:distribution/EMF4IMNT9637C"
    }
  ]
}
```

## Quick Fix Steps

1. **Create/Update IAM User** with S3 and CloudFront permissions
2. **Create Access Key** for the user
3. **Update GitHub Secrets:**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (if needed)
4. **Re-run the workflow** in GitHub Actions


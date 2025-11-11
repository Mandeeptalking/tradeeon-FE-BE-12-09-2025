# Fix S3 Access Denied Error - CloudFront OAC Configuration

## ❌ Problem Identified

**Error:** `Access Denied` from S3 bucket  
**Root Cause:** CloudFront doesn't have Origin Access Control (OAC) configured to access S3 bucket.

**Current Status:**
- CloudFront Distribution: `EMF4IMNT9637C`
- S3 Bucket: `tradeeon-frontend`
- OAC: **NOT CONFIGURED** (empty `OriginAccessControlId`)

## ✅ Solution Applied

**OAC Created Successfully:**
- **OAC ID:** `E32RKEH5PEL87I`
- **Name:** `tradeeon-frontend-oac`
- **Type:** S3
- **Signing Protocol:** sigv4

## 📋 Next Steps - Update CloudFront Distribution

### Option 1: Via AWS Console (Recommended)

1. **Go to CloudFront Console:**
   - https://console.aws.amazon.com/cloudfront/
   - Find distribution: `EMF4IMNT9637C`

2. **Edit Distribution:**
   - Click on distribution ID
   - Click **"Edit"** button (top right)
   - Go to **"Origins"** tab

3. **Update Origin:**
   - Click **"Edit"** on origin `S3-tradeeon-frontend`
   - Under **"Origin access":**
     - Select **"Origin access control settings (recommended)"**
     - Choose **"tradeeon-frontend-oac"** from dropdown
   - Click **"Save changes"**

4. **Update S3 Bucket Policy:**
   - AWS will show a bucket policy
   - Copy the policy
   - Go to S3 Console → `tradeeon-frontend` bucket → Permissions → Bucket policy
   - Replace existing policy with the new one

5. **Deploy Changes:**
   - Go back to CloudFront distribution
   - Click **"Deploy"** or wait for automatic deployment
   - Wait 5-10 minutes for deployment

### Option 2: Via AWS CLI (Advanced)

**Step 1: Get Distribution Config**
```bash
aws cloudfront get-distribution-config \
  --id EMF4IMNT9637C \
  --region ap-southeast-1 \
  > cloudfront-config.json
```

**Step 2: Update Config**
Edit `cloudfront-config.json`:
- Set `Origins.Items[0].OriginAccessControlId` to `E32RKEH5PEL87I`
- Remove `S3OriginConfig` (not needed with OAC)
- Keep `CallerReference` and `ETag` from response

**Step 3: Update Distribution**
```bash
aws cloudfront update-distribution \
  --id EMF4IMNT9637C \
  --distribution-config file://cloudfront-config.json \
  --if-match <ETag from get-distribution-config> \
  --region ap-southeast-1
```

**Step 4: Update S3 Bucket Policy**
```bash
# Get the OAC ARN
OAC_ARN="arn:aws:cloudfront::531604848081:origin-access-control/E32RKEH5PEL87I"

# Create bucket policy
cat > s3-bucket-policy-oac.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tradeeon-frontend/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::531604848081:distribution/EMF4IMNT9637C"
        }
      }
    }
  ]
}
EOF

# Apply policy
aws s3api put-bucket-policy \
  --bucket tradeeon-frontend \
  --policy file://s3-bucket-policy-oac.json \
  --region ap-southeast-1
```

## ⏳ After Update

1. **Wait for CloudFront Deployment** (5-10 minutes)
2. **Test CloudFront URL:**
   - `https://diwxcdsala8dp.cloudfront.net`
   - Should serve content (not redirect to S3)
3. **Test Domain:**
   - `https://www.tradeeon.com`
   - Should serve from CloudFront

## Current Status

- ✅ OAC Created: `E32RKEH5PEL87I`
- ⏳ CloudFront Distribution: Needs update to use OAC
- ⏳ S3 Bucket Policy: Needs update to allow OAC
- 🧪 Testing: After CloudFront deployment

## Expected Result

After updating CloudFront and S3:
- ✅ CloudFront can access S3 bucket
- ✅ No more "Access Denied" errors
- ✅ Content serves from CloudFront
- ✅ No redirects to S3 bucket URL


# S3 Bucket Policy for CloudFront OAC

## What CloudFront is Asking For

CloudFront is showing a blue box with:
- **Message:** "You must allow access to CloudFront using this policy statement"
- **Button:** "Copy policy"

This is the S3 bucket policy that allows CloudFront OAC to access your S3 bucket.

## What to Do

### Option 1: Use CloudFront's Policy (Recommended)

**Steps:**
1. **Click "Copy policy"** button in the blue box
2. **Go to S3 Console:**
   - https://console.aws.amazon.com/s3/buckets/tradeeon-frontend
   - Or search for bucket: `tradeeon-frontend`
3. **Update Bucket Policy:**
   - Click **"Permissions"** tab
   - Scroll to **"Bucket policy"** section
   - Click **"Edit"**
   - **Delete** the existing policy
   - **Paste** the policy you copied from CloudFront
   - Click **"Save changes"**

### Option 2: Verify Current Policy

I already updated the S3 bucket policy earlier, but CloudFront might show a slightly different format. The policy should include:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
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
```

## Why This is Needed

- CloudFront OAC needs permission to access S3 bucket
- S3 bucket policy must explicitly allow CloudFront
- Without this policy, you'll get "Access Denied" errors

## After Updating Policy

1. **Go back to CloudFront console**
2. **Click "Save changes"** on the origin edit page
3. **Click "Deploy"** on the distribution page
4. **Wait 5-10 minutes** for deployment
5. **Test:** `https://www.tradeeon.com`

## Quick Steps Summary

1. ✅ Click "Copy policy" in CloudFront
2. ✅ Go to S3 Console → tradeeon-frontend → Permissions → Bucket policy
3. ✅ Replace existing policy with copied policy
4. ✅ Save changes
5. ✅ Go back to CloudFront → Save changes → Deploy


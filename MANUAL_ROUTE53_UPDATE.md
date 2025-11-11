# Fix Route 53 DNS to Point to CloudFront

## Problem
Accessing `https://www.tradeeon.com` redirects to `https://tradeeon-frontend.s3-ap-southeast-1.amazonaws.com/` instead of CloudFront.

## Root Cause
Route 53 DNS records point to old IP (`3.175.86.79`) instead of CloudFront distribution.

## Solution: Update Route 53 via AWS Console

### CloudFront Distribution Details
- **Distribution ID:** `EMF4IMNT9637C`
- **CloudFront Domain:** `diwxcdsala8dp.cloudfront.net`
- **CloudFront Hosted Zone ID:** `Z2FDTNDATAQYW2` (always the same for CloudFront)

### Steps to Update Route 53

1. **Go to AWS Console → Route 53**
   - URL: https://console.aws.amazon.com/route53/

2. **Select Hosted Zone**
   - Click on `tradeeon.com` hosted zone
   - Hosted Zone ID: `Z08494351HC32A4M6XAOH`

3. **Update www.tradeeon.com Record**
   - Find the record: `www.tradeeon.com` (Type: A)
   - Click **Edit**
   - Change:
     - **Record type:** A (keep as is)
     - **Route traffic to:** Alias to CloudFront distribution
     - **CloudFront distribution:** Select `diwxcdsala8dp.cloudfront.net` from dropdown
     - OR manually enter:
       - **Alias:** Yes
       - **Alias target:** `diwxcdsala8dp.cloudfront.net`
       - **Hosted zone ID:** `Z2FDTNDATAQYW2`
       - **Evaluate target health:** No
   - Click **Save changes**

4. **Update tradeeon.com Record (Apex Domain)**
   - Find the record: `tradeeon.com` (Type: A)
   - Click **Edit**
   - Change:
     - **Record type:** A (keep as is)
     - **Route traffic to:** Alias to CloudFront distribution
     - **CloudFront distribution:** Select `diwxcdsala8dp.cloudfront.net` from dropdown
     - OR manually enter:
       - **Alias:** Yes
       - **Alias target:** `diwxcdsala8dp.cloudfront.net`
       - **Hosted zone ID:** `Z2FDTNDATAQYW2`
       - **Evaluate target health:** No
   - Click **Save changes**

### Alternative: Use AWS CLI (if you have permissions)

If you can grant Route 53 permissions to your IAM user, use:

```bash
# For www.tradeeon.com
aws route53 change-resource-record-sets \
  --hosted-zone-id Z08494351HC32A4M6XAOH \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.tradeeon.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "diwxcdsala8dp.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'

# For tradeeon.com
aws route53 change-resource-record-sets \
  --hosted-zone-id Z08494351HC32A4M6XAOH \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "tradeeon.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "diwxcdsala8dp.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

### Grant IAM Permissions (Optional)

If you want to use CLI, add this policy to IAM user `Mandeep1`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets",
        "route53:ListResourceRecordSets",
        "route53:GetChange"
      ],
      "Resource": [
        "arn:aws:route53:::hostedzone/Z08494351HC32A4M6XAOH"
      ]
    }
  ]
}
```

## Verification

After updating DNS:

1. **Wait 5-10 minutes** for DNS propagation

2. **Check DNS Resolution:**
   ```bash
   nslookup www.tradeeon.com
   # Should show CloudFront IPs (not 3.175.86.79)
   ```

3. **Test URLs:**
   - https://www.tradeeon.com → Should serve from CloudFront
   - https://tradeeon.com → Should serve from CloudFront
   - Should NOT redirect to S3 bucket URL

4. **Check Browser:**
   - Open DevTools → Network tab
   - Verify requests go to CloudFront
   - Check SSL certificate is valid

## Expected Result

✅ `https://www.tradeeon.com` serves from CloudFront  
✅ `https://tradeeon.com` serves from CloudFront  
✅ No redirects to S3 bucket  
✅ Fast CDN delivery  
✅ SSL certificate works correctly

## Current Status

- ✅ CloudFront distribution configured correctly
- ✅ SSL certificate attached
- ✅ Aliases configured (tradeeon.com, www.tradeeon.com)
- ⏳ **Route 53 DNS needs manual update** (permission issue)
- ⏳ Waiting for DNS update

## Files Created

- `route53-www.json` - JSON for www subdomain update
- `route53-apex.json` - JSON for apex domain update

These files can be used if you grant Route 53 permissions later.


# Fix SPA Routing - Access Denied Error

## Problem

When you refresh pages like `/app`, `/app/bots`, etc., you get an "Access Denied" error. This happens because:

1. **CloudFront/S3 doesn't know about React routes**
2. When you refresh `/app`, S3 tries to find a file at that path
3. The file doesn't exist → Access Denied error
4. React Router never gets a chance to handle the route

## Solution

Configure CloudFront to serve `index.html` for all routes (except actual files), so React Router can handle routing client-side.

---

## Quick Fix (CloudFront Console - Recommended)

### Step 1: Open CloudFront Console
1. Go to: https://console.aws.amazon.com/cloudfront
2. Find your distribution (for tradeeon.com)
3. Click on the distribution ID

### Step 2: Configure Custom Error Responses
1. Click **"Error Pages"** tab
2. Click **"Create custom error response"**

**For 403 Error:**
- HTTP Error Code: `403`
- Response Page Path: `/index.html`
- HTTP Response Code: `200` (important!)
- Error Caching Minimum TTL: `300`

**For 404 Error:**
- HTTP Error Code: `404`
- Response Page Path: `/index.html`
- HTTP Response Code: `200` (important!)
- Error Caching Minimum TTL: `300`

3. Click **"Create custom error response"** for both
4. Wait 15-20 minutes for CloudFront to deploy

### Step 3: Test
After deployment, try:
- https://www.tradeeon.com/app (should work on refresh)
- https://www.tradeeon.com/app/bots (should work on refresh)
- https://www.tradeeon.com/app/portfolio (should work on refresh)

---

## Automated Fix (PowerShell Script)

Run the script I created:

```powershell
.\fix-spa-routing.ps1
```

This will:
1. Find your CloudFront distribution
2. Configure custom error responses automatically
3. Update the distribution

**Note:** Still takes 15-20 minutes to deploy.

---

## Alternative: Update CloudFront via AWS CLI

```powershell
# Get distribution ID
$cfId = aws cloudfront list-distributions --region us-east-1 --query "DistributionList.Items[0].Id" --output text

# Get current config
aws cloudfront get-distribution-config --id $cfId --region us-east-1 > config.json

# Edit config.json to add CustomErrorResponses (see below)

# Get ETag
$etag = aws cloudfront get-distribution-config --id $cfId --region us-east-1 --query "ETag" --output text

# Update distribution
aws cloudfront update-distribution --id $cfId --if-match $etag --distribution-config file://config.json --region us-east-1
```

### CustomErrorResponses Configuration

Add this to your CloudFront distribution config:

```json
"CustomErrorResponses": {
  "Quantity": 2,
  "Items": [
    {
      "ErrorCode": 403,
      "ResponsePagePath": "/index.html",
      "ResponseCode": "200",
      "ErrorCachingMinTTL": 300
    },
    {
      "ErrorCode": 404,
      "ResponsePagePath": "/index.html",
      "ResponseCode": "200",
      "ErrorCachingMinTTL": 300
    }
  ]
}
```

---

## How It Works

**Before Fix:**
```
User visits /app
  → CloudFront requests /app from S3
  → S3: File not found → 403 Access Denied
  → User sees error page
```

**After Fix:**
```
User visits /app
  → CloudFront requests /app from S3
  → S3: File not found → 403
  → CloudFront: Custom error response → serve /index.html with 200 status
  → index.html loads → React Router handles /app route
  → User sees correct page ✅
```

---

## Verify Fix

After CloudFront deploys (15-20 minutes):

1. **Test direct access:**
   - https://www.tradeeon.com/app
   - Should load the app page

2. **Test refresh:**
   - Navigate to https://www.tradeeon.com/app/bots
   - Refresh the page (F5)
   - Should still work (not show error)

3. **Test all routes:**
   - /app
   - /app/bots
   - /app/portfolio
   - /app/connections
   - /app/dca-bot
   - /app/settings
   - All should work on refresh!

---

## Check Deployment Status

```powershell
# Get distribution ID
$cfId = aws cloudfront list-distributions --region us-east-1 --query "DistributionList.Items[0].Id" --output text

# Check status
aws cloudfront get-distribution --id $cfId --region us-east-1 --query "Distribution.Status" --output text

# When it shows "Deployed", the fix is active
```

---

## Troubleshooting

### Still seeing errors after 20 minutes?
- Check if CloudFront status is "Deployed"
- Verify custom error responses are configured correctly
- Clear browser cache (Ctrl+Shift+Delete)
- Try incognito mode

### CloudFront update fails?
- Make sure you have the latest ETag
- Check IAM permissions for CloudFront updates
- Use the AWS Console method instead

---

## Summary

✅ **Fix:** Configure CloudFront custom error responses  
✅ **Method:** AWS Console (easiest) or PowerShell script  
✅ **Time:** 15-20 minutes for CloudFront to deploy  
✅ **Result:** All routes work on refresh!  

---

**After this fix, your SPA routing will work perfectly! 🎉**


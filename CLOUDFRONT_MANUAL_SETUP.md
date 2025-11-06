# CloudFront Manual Setup (Easiest Method)

Since we're having issues with AWS CLI and PowerShell, let's do it manually in the AWS Console (it's actually faster!).

## Step 1: Go to CloudFront

1. Open AWS Console: https://console.aws.amazon.com
2. Search "CloudFront" in the search bar
3. Click "CloudFront"

## Step 2: Create Distribution

1. Click **"Create Distribution"** button (orange button, top right)

## Step 3: Configure Origin

### Origin Domain
```
www-tradeeon-prod.s3-website-us-east-1.amazonaws.com
```
**IMPORTANT:** Use the **website endpoint** (not the bucket endpoint)!

### Origin Type
- Keep default: **S3 Origin**

### Origin Name
```
www-tradeeon-prod
```
(Or leave it as auto-generated)

### Origin Access
- Leave default settings

## Step 4: Default Cache Behavior

### Viewer Protocol Policy
Select: **Redirect HTTP to HTTPS**
(This automatically redirects all HTTP traffic to HTTPS)

### Allowed HTTP Methods
Select: **GET, HEAD, OPTIONS**

### Caching Headers and Cookies
- Keep defaults

## Step 5: Settings

### Price Class
Select: **Use only North America and Europe**
(This reduces costs - only serve from US/Europe edge locations)

### Default Root Object
```
index.html
```

### Custom SSL Certificate
- Leave as: **Default CloudFront Certificate**
(CloudFront provides free SSL automatically)

## Step 6: Create Distribution

1. Scroll down
2. Click **"Create Distribution"**
3. Wait 10-15 minutes for deployment

## Step 7: Get Your Distribution ID

After creation, you'll see:
- **Distribution ID** (e.g., `E1234567890ABC`)
- **Domain Name** (e.g., `d1234567890abc.cloudfront.net`)

**SAVE BOTH OF THESE!**

## Step 8: Configure Error Pages

1. Click on your distribution ID
2. Go to **"Error Pages"** tab
3. Click **"Create Custom Error Response"**

### For 403 Errors:
```
HTTP Error Code: 403
Customize Error Response: Yes
Response Page Path: /index.html
HTTP Response Code: 200
TTL: 10
```
Click **"Create Custom Error Response"**

### For 404 Errors:
```
HTTP Error Code: 404
Customize Error Response: Yes
Response Page Path: /index.html
HTTP Response Code: 200
TTL: 10
```
Click **"Create Custom Error Response"**

## Step 9: Test CloudFront URL

Your website is now available at:
```
https://YOUR_DISTRIBUTION_ID.cloudfront.net
```

Example: `https://d1234567890abc.cloudfront.net`

## Step 10: Route 53 DNS (Optional)

If you want `www.tradeeon.com`:

1. Go to Route 53 → Hosted Zones → `tradeeon.com`
2. Click "Create Record"
3. Configure:
   - Record Name: `www`
   - Record Type: A - IPv4 address
   - Alias: Yes
   - Route Traffic To: Alias to CloudFront distribution
   - Distribution: Select your CloudFront distribution
4. Click "Create"

Wait 5-15 minutes for DNS propagation, then test:
```
https://www.tradeeon.com
```

---

## ⚡ Quick Summary

**Time to complete:** 5 minutes in console + 15 minutes deployment

**What you'll get:**
- ✅ HTTPS/SSL automatically
- ✅ Global CDN
- ✅ React Router 404 handling
- ✅ Lower costs than S3 alone

**After deployment, your site will be:**
- Fast (CDN)
- Secure (HTTPS)
- Global (edge locations)

---

## 🎯 Next: Backend Deployment

Once CloudFront is working:
1. Deploy backend to ECS Fargate
2. Update frontend API URL
3. Test full application



# CloudFront & DNS Setup Guide

## ✅ Current Status

- ✅ S3 bucket deployed and working
- ✅ Website live at: http://www-tradeeon-prod.s3-website-us-east-1.amazonaws.com
- ✅ Frontend fully functional

## 🌐 Step 1: Create CloudFront Distribution

### Why CloudFront?
- Faster global delivery (CDN)
- HTTPS/SSL support
- Lower S3 costs
- Better security

### Method A: AWS Console (Recommended)

1. **Go to CloudFront**
   - AWS Console → Search "CloudFront" → CloudFront

2. **Create Distribution**
   - Click "Create Distribution"

3. **Configure Origin**
   ```
   Origin Domain:
   www-tradeeon-prod.s3-website-us-east-1.amazonaws.com
   
   Origin Type: S3
   Name: www-tradeeon-prod
   ```

4. **Default Cache Behavior**
   ```
   Viewer Protocol Policy: Redirect HTTP to HTTPS
   Allowed HTTP Methods: GET, HEAD, OPTIONS
   Cache Policy: CachingOptimized (or CachingDisabled for development)
   ```

5. **Settings**
   ```
   Price Class: Use only North America and Europe
   Default Root Object: index.html
   Custom SSL Certificate: Not needed (CloudFront provides free SSL)
   ```

6. **Create**
   - Click "Create Distribution"
   - Wait 10-15 minutes for deployment

7. **Get Distribution Domain**
   - Copy the "Domain Name" (e.g., `d1234567890.cloudfront.net`)

---

### Method B: AWS CLI

```bash
aws cloudfront create-distribution \
  --origin-domain-name www-tradeeon-prod.s3-website-us-east-1.amazonaws.com \
  --default-root-object index.html
```

---

## 🔧 Step 2: Configure Error Pages

**IMPORTANT:** This fixes React Router 404 errors!

1. Go to your CloudFront distribution
2. Click "Error Pages" tab
3. Click "Create Custom Error Response"

### For 403 Errors:
```
HTTP Error Code: 403
Customize Error Response: Yes
Response Page Path: /index.html
HTTP Response Code: 200
TTL: 10
```

### For 404 Errors:
```
HTTP Error Code: 404
Customize Error Response: Yes
Response Page Path: /index.html
HTTP Response Code: 200
TTL: 10
```

Click "Create" for each error type.

---

## 🗺️ Step 3: Route 53 DNS

### Add A Record (Alias to CloudFront)

1. **Go to Route 53**
   - AWS Console → Route 53 → Hosted Zones

2. **Select Your Domain**
   - Click on `tradeeon.com`

3. **Create Record**
   - Click "Create Record"

4. **Configure A Record**
   ```
   Record Name: www
   Record Type: A - Routes traffic to an IPv4 address
   Alias: Yes
   
   Route Traffic To:
   ✓ Alias to CloudFront distribution
   
   Choose distribution: [Select your CloudFront dist]
   
   Record Name: www.tradeeon.com
   
   Routing Policy: Simple routing
   ```

5. **Create**
   - Click "Create Record"

6. **Wait for DNS Propagation**
   - 5-15 minutes typically
   - Test with: `nslookup www.tradeeon.com`

---

## ✅ Step 4: Test Everything

### Test CloudFront URL
```
https://YOUR_DISTRIBUTION_ID.cloudfront.net
```

### Test Custom Domain
```
https://www.tradeeon.com
```

### Verify
- [ ] Homepage loads
- [ ] No console errors
- [ ] React Router navigation works
- [ ] HTTPS is working
- [ ] Assets load correctly

---

## 🔄 Step 5: Invalidate CloudFront Cache

After any frontend updates, invalidate cache:

### Method A: AWS Console
1. CloudFront → Your Distribution
2. Invalidations tab → Create Invalidation
3. Paths: `/*`
4. Create

### Method B: AWS CLI
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## 🐛 Troubleshooting

### CloudFront Shows Old Content
**Solution:** Create invalidation with `/*` path

### 404 on Sub-pages (e.g., /dashboard)
**Solution:** You didn't configure error pages. Go back to Step 2!

### DNS Not Resolving
**Solution:** Wait longer (up to 48 hours max, usually 15-30 minutes)

### SSL Certificate Error
**Solution:** CloudFront provides free SSL automatically. Wait for deployment.

---

## 📊 Monitoring

### CloudWatch Metrics
1. CloudFront → Your Distribution → Metrics
2. Watch:
   - Requests
   - Error Rate
   - Cache Hit Ratio
   - Data Transfer

### Set Up Alarms
1. CloudWatch → Alarms
2. Create alarm for 5xx error rate
3. Get notified if site is down

---

## 💰 Cost Estimate

**CloudFront:**
- First 10 TB: $0.085 per GB
- Free tier: 1 TB transfer/month
- Requests: $0.0075 per 10,000 requests

**Route 53:**
- Hosted zone: $0.50/month
- Queries: $0.40 per million

**Typical monthly cost:** $2-5 for moderate traffic

---

## 🎯 Next Steps

1. ✅ Frontend on S3
2. ⏳ CloudFront + Route 53
3. ⏳ Backend on ECS Fargate
4. ⏳ Update frontend API URL
5. ⏳ Full E2E testing

---

**Your website will be live at https://www.tradeeon.com! 🚀**



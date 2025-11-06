# Step 4: Create CloudFront Distribution - Detailed Guide

## ✅ What You've Done So Far
- ✅ Step 1: SSL Certificate requested (validation CNAME record added)
- ✅ Step 2: S3 Bucket created
- ✅ Step 3: Frontend built and uploaded

## 🔍 Before Starting Step 4

### Check SSL Certificate Status
1. Go to **Certificate Manager** (in `us-east-1` region)
2. Check your certificate status
3. **Status should be "Issued"** ✅ before proceeding
4. If still "Pending validation", wait 5-30 more minutes

---

## 📝 Step 4: Create CloudFront Distribution

### 4.1 Navigate to CloudFront
1. AWS Console → Search **"CloudFront"**
2. Click **"CloudFront"**
3. Click **"Create distribution"** button (top right)

### 4.2 Configure Origin Settings

#### Origin Domain
1. Click in the **"Origin domain"** field
2. **IMPORTANT:** You'll see a dropdown with your S3 buckets
3. **DO NOT select the bucket directly!** Instead:
   - Scroll down in the dropdown OR
   - Manually type: `www-tradeeon-prod.s3-website-us-east-1.amazonaws.com`
   - **Use the website endpoint, NOT the bucket endpoint!**

**Why?** CloudFront needs the website endpoint (`.s3-website-`) to serve static websites properly.

**How to get your website endpoint:**
- Go to S3 → Your bucket → Properties tab
- Scroll to "Static website hosting"
- Copy the endpoint URL (looks like `www-tradeeon-prod.s3-website-us-east-1.amazonaws.com`)

#### Origin Path
- Leave empty (no path needed)

#### Origin Name
- Will auto-populate (e.g., `S3-www-tradeeon-prod`)

---

### 4.3 Configure Default Cache Behavior

Scroll down to **"Default cache behavior"** section:

#### Viewer Protocol Policy
- Select: **"Redirect HTTP to HTTPS"** ✅
- This ensures all traffic uses SSL

#### Allowed HTTP Methods
- Select: **"GET, HEAD, OPTIONS"** (default)
- OR **"GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE"** if you need write access

#### Cache Policy
- Select: **"CachingOptimized"** (recommended)
- OR create a custom policy if needed

#### Origin Request Policy
- Select: **"CORS-S3Origin"** if your site uses CORS
- OR **"None"** if no CORS needed

---

### 4.4 Configure Distribution Settings

Scroll down to **"Distribution settings"** section:

#### Alternate Domain Names (CNAMEs)
1. Click **"Add item"** button
2. Enter: `www.tradeeon.com`
3. Click **"Add item"** again
4. Enter: `tradeeon.com`

**You should see 2 items:**
- `www.tradeeon.com`
- `tradeeon.com`

#### Custom SSL Certificate
1. Click the dropdown for **"Custom SSL certificate"**
2. Select your certificate (should show domains: `www.tradeeon.com, tradeeon.com`)
3. **If certificate doesn't appear:**
   - Check certificate is in `us-east-1` region
   - Check certificate status is "Issued"
   - Refresh the page

#### Default Root Object
- Enter: `index.html`

#### Price Class
- Choose based on your needs:
  - **Cheapest:** "Use only North America and Europe"
  - **Global:** "Use all edge locations"

#### WAF
- Leave disabled (unless you need Web Application Firewall)

#### Enable IPv6
- Optional: Enable if you want IPv6 support

---

### 4.5 Review and Create

1. Scroll to bottom of page
2. Review all settings:
   - ✅ Origin domain uses website endpoint
   - ✅ Viewer protocol: Redirect HTTP to HTTPS
   - ✅ CNAMEs: `www.tradeeon.com`, `tradeeon.com`
   - ✅ SSL certificate selected
   - ✅ Default root object: `index.html`

3. Click **"Create distribution"** button

---

### 4.6 Wait for Deployment

⏳ **Important:** CloudFront takes 10-15 minutes to deploy!

1. You'll see the distribution with status **"In Progress"**
2. **Note your distribution domain** (e.g., `d1234567890abc.cloudfront.net`)
3. Wait until status changes to **"Deployed"** ✅

**Status Location:**
- CloudFront → Your distribution → "General" tab
- Look for "Status" field (should say "Deployed" when ready)

---

## ✅ Step 4 Checklist

- [ ] CloudFront distribution created
- [ ] Origin uses S3 website endpoint (`.s3-website-`)
- [ ] Viewer protocol: Redirect HTTP to HTTPS
- [ ] CNAMEs added: `www.tradeeon.com`, `tradeeon.com`
- [ ] SSL certificate selected (status: "Issued")
- [ ] Default root object: `index.html`
- [ ] Distribution status: "Deployed" ✅

---

## 🆘 Troubleshooting

### Issue: Can't Find Website Endpoint
**Solution:**
1. Go to S3 → Your bucket
2. Properties tab → Static website hosting
3. Make sure static website hosting is enabled
4. Copy the endpoint URL from there

### Issue: SSL Certificate Not in Dropdown
**Solutions:**
1. Check certificate is in `us-east-1` region (CloudFront requires this)
2. Check certificate status is "Issued" (not "Pending validation")
3. Refresh the CloudFront page
4. Make sure certificate includes both domains

### Issue: Origin Domain Error
**Solution:**
- Make sure you're using the **website endpoint** format:
  - ✅ Correct: `www-tradeeon-prod.s3-website-us-east-1.amazonaws.com`
  - ❌ Wrong: `www-tradeeon-prod.s3.us-east-1.amazonaws.com`

### Issue: Distribution Stuck "In Progress"
**Solution:**
- This is normal - can take 10-15 minutes
- Just wait and refresh the page periodically
- Don't modify the distribution while it's deploying

---

## 🎯 What's Next?

After Step 4 is complete:
1. ✅ Step 5: Configure Error Pages (for React Router)
2. ✅ Step 6: Create Route 53 DNS Records
3. ✅ Step 7: Test Your Site

---

## 💡 Quick Tips

- **Save time:** While CloudFront is deploying (Step 4), you can start preparing Step 5 (Error Pages)
- **Test CloudFront URL:** Once deployed, test `https://your-distribution-id.cloudfront.net` to verify it works
- **Cache invalidation:** If you update files, you may need to invalidate CloudFront cache (later step)

---

Ready to create your CloudFront distribution? Follow the steps above! 🚀


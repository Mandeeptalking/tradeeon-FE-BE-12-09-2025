# Fresh Deployment with SSL - Complete Guide

## 🎯 Goal
Deploy the frontend to AWS S3 + CloudFront with SSL certificate for `www.tradeeon.com` and `tradeeon.com`.

---

## 📋 Prerequisites
- ✅ AWS account with Route 53 hosting `tradeeon.com`
- ✅ Domain registered in Route 53 (you have this)
- ✅ AWS CLI configured (if using scripts)
- ✅ Frontend built and ready

---

## 🚀 Deployment Steps (In Order)

### Step 1: Request SSL Certificate (Do This FIRST - Takes 30-60 min)

**Why first?** SSL certificate validation takes time, so we start it early.

#### 1.1 Go to Certificate Manager
1. AWS Console → Search **"Certificate Manager"**
2. Click **"Certificate Manager"**
3. **Important:** Make sure you're in **`us-east-1` region** (CloudFront requires certificates in us-east-1)

#### 1.2 Request Certificate
1. Click **"Request certificate"** button (top right)
2. Choose **"Request a public certificate"**
3. Click **"Next"**

#### 1.3 Enter Domain Names
In the **"Fully qualified domain name"** field:
```
www.tradeeon.com
```
Then click **"Add another name to this certificate"** and enter:
```
tradeeon.com
```

Click **"Next"**

#### 1.4 Choose Validation Method
- Select **"DNS validation"** ✅
- Click **"Request"**

#### 1.5 Add DNS Validation Records
1. Certificate appears with **"Pending validation"** status
2. Click on the certificate
3. **For www.tradeeon.com:**
   - Expand **"Domain: www.tradeeon.com"**
   - Copy the **Name** and **Value** from the CNAME record
   - Go to Route 53 → Hosted zones → Create a new hosted zone for `tradeeon.com` (if needed)
   - Or if hosted zone exists: Route 53 → Hosted zones → `tradeeon.com` → Create record
   - Record type: **CNAME**
   - Record name: Paste the **Name** (e.g., `_abc123.www`)
   - Value: Paste the **Value** (e.g., `_xyz789.acm-validations.aws.`)
   - Click **"Create record"**

4. **Repeat for tradeeon.com:**
   - Expand **"Domain: tradeeon.com"**
   - Copy the CNAME details
   - Create another CNAME record in Route 53

#### 1.6 Wait for Validation
⏳ **Wait 5-30 minutes** for validation

**Check status:** Certificate Manager → Your certificate → Should change to **"Issued"** ✅

**⚠️ IMPORTANT:** Don't proceed to Step 2 until certificate status is **"Issued"**!

---

### Step 2: Create S3 Bucket

#### 2.1 Create Bucket
1. AWS Console → S3
2. Click **"Create bucket"**
3. **Bucket name:** `www-tradeeon-prod` (or your preferred name)
4. **AWS Region:** `us-east-1`
5. Uncheck **"Block all public access"** ✅
   - Check the acknowledgment box
6. **Bucket Versioning:** Disable (or enable if you want)
7. Click **"Create bucket"**

#### 2.2 Configure Bucket Policy
1. Click on your bucket name
2. Go to **"Permissions"** tab
3. Scroll to **"Bucket policy"**
4. Click **"Edit"**
5. Paste this policy (replace `BUCKET_NAME` with your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::www-tradeeon-prod/*"
    }
  ]
}
```

6. Click **"Save changes"**

#### 2.3 Enable Static Website Hosting
1. Still in bucket → Go to **"Properties"** tab
2. Scroll to **"Static website hosting"**
3. Click **"Edit"**
4. Enable static website hosting
5. **Index document:** `index.html`
6. **Error document:** `index.html` (for React Router)
7. Click **"Save changes"**
8. **Note the website endpoint** (e.g., `www-tradeeon-prod.s3-website-us-east-1.amazonaws.com`)

---

### Step 3: Build and Upload Frontend

#### 3.1 Build Frontend
```powershell
cd apps/frontend
npm run build
```

This creates a `dist` folder with your built files.

#### 3.2 Upload to S3
```powershell
# From project root
aws s3 sync apps/frontend/dist s3://www-tradeeon-prod --region us-east-1 --delete
```

**Verify:** Go to S3 bucket → You should see your files (index.html, assets, etc.)

#### 3.3 Test S3 Website
Visit your S3 website endpoint:
```
http://www-tradeeon-prod.s3-website-us-east-1.amazonaws.com
```

Should show your website! ✅

---

### Step 4: Create CloudFront Distribution

#### 4.1 Create Distribution
1. AWS Console → CloudFront
2. Click **"Create distribution"**

#### 4.2 Configure Origin
1. **Origin domain:** 
   - Select your S3 bucket OR
   - Enter: `www-tradeeon-prod.s3-website-us-east-1.amazonaws.com` (website endpoint, not bucket endpoint)
   - **Important:** Use the website endpoint, not the bucket endpoint!

2. **Origin path:** Leave empty

3. **Name:** `tradeeon-frontend` (or auto-generated)

#### 4.3 Configure Default Cache Behavior
- **Viewer protocol policy:** `Redirect HTTP to HTTPS` ✅
- **Allowed HTTP methods:** `GET, HEAD, OPTIONS`
- **Cache policy:** `CachingOptimized` (or create custom)

#### 4.4 Configure Distribution Settings

1. **Alternate domain names (CNAMEs):**
   - Click **"Add item"**
   - Enter: `www.tradeeon.com`
   - Click **"Add item"** again
   - Enter: `tradeeon.com`

2. **Custom SSL certificate:**
   - Select your certificate from the dropdown (should show `www.tradeeon.com, tradeeon.com`)
   - **Important:** Certificate must be in **"Issued"** status!

3. **Default root object:** `index.html`

4. **Price class:** Choose based on your needs (cheapest: "Use only North America and Europe")

#### 4.5 Create Distribution
1. Scroll down
2. Click **"Create distribution"**
3. ⏳ **Wait 10-15 minutes** for deployment

**Note the distribution domain:** e.g., `d1234567890abc.cloudfront.net`

---

### Step 5: Configure Error Pages (For React Router)

#### 5.1 Go to CloudFront Distribution
1. CloudFront → Click on your distribution
2. Go to **"Error pages"** tab

#### 5.2 Create Custom Error Response
1. Click **"Create custom error response"**
2. **HTTP error code:** `403: Forbidden`
3. **Customize error response:** Yes
4. **Response page path:** `/index.html`
5. **HTTP response code:** `200: OK`
6. Click **"Create custom error response"**

#### 5.3 Repeat for 404
1. Click **"Create custom error response"** again
2. **HTTP error code:** `404: Not Found`
3. **Customize error response:** Yes
4. **Response page path:** `/index.html`
5. **HTTP response code:** `200: OK`
6. Click **"Create custom error response"**

---

### Step 6: Create Route 53 DNS Records

#### 6.1 Go to Route 53
1. AWS Console → Route 53
2. Click **"Hosted zones"**
3. If hosted zone doesn't exist:
   - Click **"Create hosted zone"**
   - Domain name: `tradeeon.com`
   - Type: Public hosted zone
   - Click **"Create hosted zone"**

#### 6.2 Create A Record for www.tradeeon.com
1. Click on `tradeeon.com` hosted zone
2. Click **"Create record"**
3. **Record name:** `www`
4. **Record type:** `A`
5. **Alias:** Enable ✅
6. **Route traffic to:**
   - Alias to CloudFront distribution
   - Select your CloudFront distribution from dropdown
   - OR enter the CloudFront domain manually
7. Click **"Create record"**

#### 6.3 Create A Record for tradeeon.com (Apex)
1. Click **"Create record"** again
2. **Record name:** Leave empty (for apex domain)
3. **Record type:** `A`
4. **Alias:** Enable ✅
5. **Route traffic to:**
   - Alias to CloudFront distribution
   - Select your CloudFront distribution
6. Click **"Create record"**

---

### Step 7: Wait and Test

#### 7.1 Wait for Propagation
⏳ **Wait 15-30 minutes** for:
- CloudFront distribution to fully deploy
- DNS propagation

#### 7.2 Test Your Site
1. Test CloudFront URL directly:
   ```
   https://d1234567890abc.cloudfront.net
   ```
   Should work with HTTPS! ✅

2. Test custom domain:
   ```
   https://www.tradeeon.com
   ```
   Should work with SSL! ✅

3. Test apex domain:
   ```
   https://tradeeon.com
   ```
   Should work with SSL! ✅

---

## ✅ Checklist

- [ ] SSL certificate requested and validated (Status: "Issued")
- [ ] S3 bucket created and configured
- [ ] Frontend built and uploaded to S3
- [ ] S3 website endpoint works
- [ ] CloudFront distribution created
- [ ] CloudFront configured with SSL certificate
- [ ] CloudFront CNAMEs added (`www.tradeeon.com`, `tradeeon.com`)
- [ ] Error pages configured (403, 404 → index.html)
- [ ] Route 53 DNS records created (A records pointing to CloudFront)
- [ ] CloudFront distribution deployed (Status: "Deployed")
- [ ] `https://www.tradeeon.com` works ✅
- [ ] `https://tradeeon.com` works ✅

---

## 🎉 Success!

Once all steps are complete, your site should be:
- ✅ Live on `https://www.tradeeon.com`
- ✅ Live on `https://tradeeon.com`
- ✅ SSL secured
- ✅ Fast via CloudFront CDN
- ✅ React Router working (via error page redirects)

---

## 🆘 Troubleshooting

### Issue: SSL Certificate Not Validating
- Check DNS validation records are correct in Route 53
- Wait longer (can take up to 30 minutes)
- Verify CNAME records match exactly what ACM shows

### Issue: CloudFront Shows "In Progress"
- Normal - takes 10-15 minutes
- Wait until status is "Deployed"

### Issue: SSL Certificate Not in Dropdown
- Make sure certificate is in `us-east-1` region
- Make sure certificate status is "Issued"
- Refresh the page

### Issue: Site Shows Access Denied
- Check S3 bucket policy allows public access
- Check CloudFront origin uses website endpoint (not bucket endpoint)

### Issue: React Router Routes Don't Work
- Verify error pages are configured (403, 404 → index.html)
- Make sure default root object is `index.html`

---

## 📝 Quick Reference

**S3 Bucket:** `www-tradeeon-prod`  
**CloudFront Domain:** `d1234567890abc.cloudfront.net` (yours will be different)  
**SSL Certificate:** Must be in `us-east-1` region  
**Route 53 Zone:** `tradeeon.com`

**Total Time:** ~45-90 minutes (mostly waiting for SSL validation and CloudFront deployment)

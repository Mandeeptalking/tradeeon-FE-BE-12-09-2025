# Fix SSL Certificate for www.tradeeon.com

## Problem
CloudFront needs an SSL certificate to serve HTTPS for custom domains.

## Solution: Request SSL Certificate from ACM

### Step 1: Go to Certificate Manager
1. AWS Console → Search "Certificate Manager"
2. Click "Certificate Manager"

### Step 2: Request Certificate
1. Click **"Request certificate"**
2. Choose: **"Request a public certificate"**
3. Click **"Next"**

### Step 3: Domain Names
Enter domains:
```
www.tradeeon.com
tradeeon.com
```

### Step 4: Validation Method
Choose: **"DNS validation"** (recommended)
Click **"Request"**

### Step 5: Add DNS Validation Records
1. You'll see **"Certificate summary"**
2. Expand the "www.tradeeon.com" domain
3. Copy the **Name** and **Value** from the CNAME record
4. Go to Route 53 → Hosted zones → tradeeon.com
5. Create record:
   - Record type: CNAME
   - Name: [paste from ACM]
   - Value: [paste from ACM]
6. Click "Create record"
7. Repeat for "tradeeon.com" domain

### Step 6: Wait for Validation
⏳ **Time:** 5-30 minutes

### Step 7: Add Certificate to CloudFront
1. Go to CloudFront → Your distribution
2. Click "Security" tab
3. Click "Edit" on "Custom SSL certificate"
4. Select your certificate from dropdown
5. Click "Save changes"

---

## Alternative: Use CloudFront Default Certificate

If you just want it working NOW:

1. CloudFront → Your distribution → Security tab
2. Custom SSL certificate: Keep "Default CloudFront certificate"
3. This works BUT only with CloudFront domain, not custom domain

---

## What You Need

**For https://www.tradeeon.com to work:**
- SSL certificate from ACM
- Certificate validated
- Certificate added to CloudFront
- Wait 15-30 minutes for propagation

---

**Quick fix:** Use CloudFront URL for now: https://d17hg7j76nwuhw.cloudfront.net ✅




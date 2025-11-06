# Step-by-Step SSL Certificate Fix

## ✅ Current Status
- ✅ CloudFront is working
- ✅ DNS is pointing correctly
- ❌ **Missing SSL certificate for www.tradeeon.com**

---

## 📝 Step 1: Request SSL Certificate

### 1.1 Open Certificate Manager
1. Go to AWS Console
2. Search for **"Certificate Manager"**
3. Click **"Certificate Manager"**

### 1.2 Request New Certificate
1. Click **"Request certificate"** button (top right)
2. Choose **"Request a public certificate"**
3. Click **"Next"**

### 1.3 Enter Domain Names
In the **"Fully qualified domain name"** field, enter:
```
www.tradeeon.com
```
Then click **"Add another name to this certificate"** and enter:
```
tradeeon.com
```

You should see:
- www.tradeeon.com
- tradeeon.com

Click **"Next"**

### 1.4 Choose Validation Method
- Select **"DNS validation"** ✅
- Click **"Request"**

---

## 📝 Step 2: Add DNS Validation Records

### 2.1 Get Validation Records
After requesting, you'll see the certificate in **"Pending validation"** status.

1. Click on the certificate (it will show as **"Pending validation"**)
2. Expand **"Domain: www.tradeeon.com"**
3. You'll see a **CNAME record** with:
   - **Name:** (something like `_abc123.www.tradeeon.com`)
   - **Value:** (something like `_xyz789.acm-validations.aws.`)

### 2.2 Add to Route 53
1. Open a **NEW TAB** → Go to Route 53
2. Click **"Hosted zones"**
3. Click on **"tradeeon.com"**
4. Click **"Create record"**

For **www.tradeeon.com** validation:
- **Record name:** Paste the **Name** from ACM (e.g., `_abc123.www`)
- **Record type:** Select **CNAME**
- **Value:** Paste the **Value** from ACM (e.g., `_xyz789.acm-validations.aws.`)
- Click **"Create record"**

### 2.3 Repeat for tradeeon.com
1. Go back to Certificate Manager tab
2. Expand **"Domain: tradeeon.com"**
3. Copy the CNAME record details
4. Go back to Route 53
5. Create another CNAME record for `tradeeon.com`

### 2.4 Wait for Validation
⏳ **Wait 5-30 minutes** for AWS to validate

**Check status:** Certificate Manager → Your certificate → Should change from "Pending validation" to **"Issued"** ✅

---

## 📝 Step 3: Add Certificate to CloudFront

### 3.1 Go to CloudFront
1. AWS Console → CloudFront
2. Click on your distribution (`tradeeon-frontend` or ID `E2GKG9WFGGVUOQ`)

### 3.2 Add Custom Domain (CNAME)
1. Click **"General"** tab
2. Click **"Edit"** button (top right)
3. Scroll to **"Alternate domain names (CNAMEs)"**
4. Click **"Add item"**
5. Enter: `www.tradeeon.com`
6. Click **"Add item"** again
7. Enter: `tradeeon.com`
8. Scroll down and click **"Save changes"**

⏳ **Wait 5-10 minutes** for CloudFront to update

### 3.3 Attach SSL Certificate
1. Still in CloudFront → Click **"Security"** tab
2. Click **"Edit"** on **"Custom SSL certificate"**
3. In the dropdown, select your certificate (should show `www.tradeeon.com, tradeeon.com`)
4. Click **"Save changes"**

⏳ **Wait 15-30 minutes** for CloudFront to deploy

---

## ✅ Step 4: Verify It Works

After waiting for CloudFront deployment:

1. Check CloudFront status: Should show **"Deployed"** (not "In Progress")
2. Test in browser: `https://www.tradeeon.com`
3. Should work! ✅

---

## 🚨 Important Notes

- **ACM certificates must be in `us-east-1` region** (or same region as CloudFront)
- **Validation takes 5-30 minutes**
- **CloudFront deployment takes 15-30 minutes**
- **Total time: ~30-60 minutes**

---

## 🎯 Quick Checklist

- [ ] Certificate requested in ACM
- [ ] DNS validation records added to Route 53
- [ ] Certificate status changed to "Issued"
- [ ] CNAMEs added to CloudFront (`www.tradeeon.com`, `tradeeon.com`)
- [ ] SSL certificate attached to CloudFront
- [ ] CloudFront shows "Deployed" status
- [ ] `https://www.tradeeon.com` works!

---

## 💡 While You Wait

The CloudFront URL still works:
**https://d17hg7j76nwuhw.cloudfront.net** ✅


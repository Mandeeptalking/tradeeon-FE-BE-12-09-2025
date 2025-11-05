# AWS Deployment Step-by-Step Guide

## Current Status ✅

1. ✅ Domain registered: `tradeeon.com` on Route 53
2. ✅ S3 bucket created: `www-tradeeon-prod`
3. ✅ S3 configured for static website hosting
4. ✅ Public access enabled
5. ✅ Frontend build completed: `apps/frontend/dist` (~2 MB)

## Deployment Options

### **Option A: CloudShell Upload (Recommended for First Time)**

#### Step 1: Upload Files to CloudShell

In AWS CloudShell:
1. Click **Actions** → **Upload file**
2. Upload the entire `apps/frontend/dist` folder
   - Or create a ZIP file first: `dist.zip`
3. Wait for upload to complete

#### Step 2: Unzip and Sync to S3

```bash
# Unzip if you uploaded a zip
unzip dist.zip -d dist

# Sync dist contents to S3
aws s3 sync dist s3://www-tradeeon-prod --region us-east-1 --delete
```

#### Step 3: Set Correct Permissions

```bash
# Set public read access
aws s3 cp dist/index.html s3://www-tradeeon-prod/index.html --content-type text/html --region us-east-1
aws s3 sync dist/assets s3://www-tradeeon-prod/assets --region us-east-1
```

---

### **Option B: Local AWS CLI (Fastest)**

#### Step 1: Install AWS CLI

**Windows:**
```powershell
# Download installer
# https://awscli.amazonaws.com/AWSCLIV2.msi
# Run installer and follow prompts
```

**Or via Chocolatey:**
```powershell
choco install awscli
```

#### Step 2: Configure AWS CLI

```bash
aws configure
# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-east-1
# - Default output format: json
```

#### Step 3: Sync to S3

```bash
# From project root
aws s3 sync apps/frontend/dist s3://www-tradeeon-prod --region us-east-1 --delete

# Verify
aws s3 ls s3://www-tradeeon-prod/
```

---

### **Option C: CloudShell Git Clone (For Future Updates)**

#### Step 1: Clone Repo in CloudShell

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

#### Step 2: Build in CloudShell

```bash
# Install Node.js (if not present)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Build
cd apps/frontend
npm install
npm run build
```

#### Step 3: Deploy

```bash
# Sync to S3
cd ../..
aws s3 sync apps/frontend/dist s3://www-tradeeon-prod --region us-east-1 --delete
```

---

## CloudFront Setup (Next Step)

After S3 is working:

### Step 1: Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
  --origin-domain-name www-tradeeon-prod.s3-website-us-east-1.amazonaws.com \
  --default-root-object index.html
```

### Step 2: Update Route 53

1. Go to Route 53 → `tradeeon.com`
2. Add **A record** (Alias):
   - Name: `www`
   - Type: **A**
   - Alias: **Yes**
   - Alias Target: Your CloudFront distribution
   - Routing Policy: Simple

---

## Verification Steps

### Check S3 is Public

```bash
# Test with curl
curl https://www-tradeeon-prod.s3-website-us-east-1.amazonaws.com
```

Should return HTML content.

### Check Route 53 DNS

```bash
# Test DNS resolution
nslookup www.tradeeon.com
```

### Test Full URL (After CloudFront)

```bash
# After CloudFront is deployed
curl https://www.tradeeon.com
```

---

## Troubleshooting

### S3 403 Forbidden

```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket www-tradeeon-prod

# Re-apply if missing
aws s3api put-bucket-policy --bucket www-tradeeon-prod --policy file://policy.json
```

### CloudFront 404 on Sub-routes

Add **Error Pages** in CloudFront:
- **HTTP Error Code:** 403, 404
- **Response Page Path:** /index.html
- **HTTP Response Code:** 200

### Index.html Not Found

```bash
# Ensure index.html is at root
aws s3 cp dist/index.html s3://www-tradeeon-prod/index.html
```

---

## Quick Commands Reference

```bash
# S3 Sync
aws s3 sync apps/frontend/dist s3://www-tradeeon-prod --delete

# CloudFront Invalidation
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"

# Check S3 Contents
aws s3 ls s3://www-tradeeon-prod/

# Test S3 Website
curl https://www-tradeeon-prod.s3-website-us-east-1.amazonaws.com
```

---

## Next Steps After Frontend Deployment

1. ✅ Frontend on S3 + CloudFront
2. ⏳ Backend on ECS Fargate
3. ⏳ Connect frontend to backend
4. ⏳ Test full application

---

**Ready to Deploy?** Choose Option A, B, or C above and follow the steps!


# Your Current AWS Setup - What You Have

## ✅ What's Already Done

From your screenshots, here's what you have:

### Already Configured

- ✅ **Route 53**: Domain `tradeeon.com` registered
- ✅ **ACM**: SSL certificate for `www.tradeeon.com`
- ✅ **CloudFront**: Distribution created
  - Distribution ID: `E5ZVJZFGZMV8V`
  - Domain: `d3reix1p0rkbbz.cloudfront.net`
  - Alternate domain: `www.tradeeon.com`
  - Status: **Enabled** ✅
- ✅ **Certificate**: Configured on CloudFront
- ✅ **Origins**: Connected to `www.tradeeon.com`

---

## 🎯 What's Next

### You Need To:

1. **Set the CloudFront origin** (where files come from)
2. **Deploy your frontend** to S3
3. **Deploy your backend** to ECS
4. **Point domain** to CloudFront

---

## 🚀 Immediate Next Steps

### Step 1: Create S3 Bucket for Frontend (15 min)

```bash
# Create bucket
aws s3 mb s3://www-tradeeon-prod --region us-east-1

# Enable website hosting
aws s3 website s3://www-tradeeon-prod \
  --index-document index.html \
  --error-document index.html

# Make public
aws s3api put-public-access-block \
  --bucket www-tradeeon-prod \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Add bucket policy
aws s3api put-bucket-policy --bucket www-tradeeon-prod --policy '{
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
}'
```

---

### Step 2: Update CloudFront Origin (10 min)

**In AWS Console**:

1. Go to CloudFront → Your distribution → **Origins** tab
2. Click **"Edit"** on existing origin or **"Create origin"**
3. Configure:
   - **Origin domain**: `www-tradeeon-prod.s3.amazonaws.com`
   - **Origin path**: (leave blank)
   - **Name**: `S3-tradeeon-frontend`
   - **Origin access**: None
   - **Protocol**: HTTPS
4. Save

**OR** update your existing origin:

1. Click on origin `www.tradeeon.com`
2. Edit to point to `www-tradeeon-prod.s3.amazonaws.com`
3. Save

---

### Step 3: Build & Deploy Frontend (30 min)

```bash
# Build frontend
cd apps/frontend
npm install
npm run build

# Upload to S3
aws s3 sync dist s3://www-tradeeon-prod \
  --delete \
  --cache-control "max-age=31536000,immutable" \
  --exclude "index.html"

# Upload index.html without cache
aws s3 cp dist/index.html s3://www-tradeeon-prod/index.html \
  --cache-control "max-age=0,no-cache,no-store,must-revalidate"

cd ../..

echo "✅ Frontend uploaded!"
```

---

### Step 4: Configure CloudFront Behaviors (15 min)

**In CloudFront**:

1. Go to **Behaviors** tab
2. Select default behavior → **Edit**
3. Update:
   - **Origin and origin groups**: Select your S3 origin
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP methods**: GET, HEAD
   - **Cache key and origin requests**: Use legacy cache settings
   - **TTL settings**: 
     - Default: 86400 (1 day)
     - Maximum: 31536000 (1 year)
     - Minimum: 0
4. Save

---

### Step 5: Configure Error Pages (10 min)

**In CloudFront**:

1. Go to **Error pages** tab
2. **Create custom error response**

**Error 403**:
- HTTP error code: `403`
- Customize error response: Yes
- Response page path: `/index.html`
- HTTP response code: `200`

**Error 404**:
- HTTP error code: `404`
- Customize error response: Yes
- Response page path: `/index.html`
- HTTP response code: `200`

**Save both**

---

### Step 6: Configure Route 53 (10 min)

**Go to**: Route 53 → Hosted zones → tradeeon.com

**Update existing record or create**:

**Record 1: Root domain**
- Record name: (blank for root)
- Type: A
- Alias: Yes
- Alias target: CloudFront distribution
- Select: Your distribution

**Record 2: www subdomain**
- Record name: www
- Type: A
- Alias: Yes
- Alias target: CloudFront distribution
- Select: Your distribution

---

### Step 7: Wait & Test (15 min)

**Wait 10-15 minutes** for CloudFront to update

**Then test**:

```bash
# Test frontend
curl https://www.tradeeon.com/
curl https://tradeeon.com/

# Should see your frontend!
```

---

### Step 8: Deploy Backend (30 min)

**Follow**: `DEPLOY_TO_AWS.md` OR run:

```powershell
.\deploy.ps1
```

**This will**:
1. Build Docker image
2. Push to ECR
3. Deploy to ECS
4. Create ALB

**Result**: Backend running

---

### Step 9: Point Backend Subdomain (10 min)

**In Route 53**:

**Create A record**:
- Record name: api
- Type: A
- Alias: Yes
- Alias target: Application Load Balancer
- Select: Your ALB

**This creates**: `api.tradeeon.com` → Backend

---

### Step 10: Update Frontend Config (5 min)

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers --names tradeeon-backend-alb --query 'LoadBalancers[0].DNSName' --output text)

echo "Backend URL: $ALB_DNS"

# Update frontend .env
cat > apps/frontend/.env.production << EOF
VITE_API_URL=https://api.tradeeon.com
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EOF

# Rebuild and redeploy
cd apps/frontend
npm run build
cd ../..

aws s3 sync apps/frontend/dist s3://www-tradeeon-prod --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E5ZVJZFGZMV8V \
  --paths "/*"
```

---

### Step 11: Test Everything (15 min)

**Test URLs**:

```bash
# Frontend
https://www.tradeeon.com
https://tradeeon.com

# Backend
https://api.tradeeon.com/health
```

**In browser**:
- Open https://www.tradeeon.com
- Try logging in
- Create a bot
- Check if it works!

---

## ✅ Simplified Quick Start

### If You Want to Go FAST:

**Option 1: Use Your Existing CloudFront**

```bash
# Just deploy files
cd apps/frontend
npm run build
aws s3 sync dist s3://www-tradeeon-prod --delete
cd ../..

# Update CloudFront origin to point to your S3 bucket
# (Follow Step 2 above)

# Wait 15 minutes
# Test!
```

**Option 2: Fresh Setup**

```powershell
# Run automated script
.\deploy.ps1

# This creates everything new
# Then point domain
```

---

## 🎯 What You Need Right Now

### Immediate Actions

1. **Create S3 bucket**: `www-tradeeon-prod`
2. **Update CloudFront origin**: Point to S3
3. **Deploy frontend**: Upload to S3
4. **Configure Route 53**: Point www → CloudFront
5. **Deploy backend**: Run deploy script
6. **Point api**: Point api.tradeeon.com → ALB

---

## 📊 Your Current Architecture

```
Already have:
├─ Route 53: tradeeon.com ✅
├─ ACM: SSL for www.tradeeon.com ✅
├─ CloudFront: Distribution active ✅
└─ Distribution: E5ZVJZFGZMV8V ✅

Need to add:
├─ S3 bucket: Frontend storage
├─ ECS service: Backend runtime
├─ ALB: Load balancer
└─ Route 53 records: Point domains
```

---

## 🚀 Next Command

### Run This Now

```bash
# Create S3 bucket
aws s3 mb s3://www-tradeeon-prod --region us-east-1

# Build and deploy frontend
cd apps/frontend
npm run build
aws s3 sync dist s3://www-tradeeon-prod --delete --cache-control "max-age=0"
cd ../..

echo "✅ Files deployed to S3!"
```

**Then** in AWS Console:
1. CloudFront → Origins → Edit → Point to your S3 bucket
2. Wait 15 minutes
3. Test!

---

## 📝 Quick Checklist

### Do These Now

- [ ] Create S3 bucket: `www-tradeeon-prod`
- [ ] Update CloudFront origin to S3
- [ ] Build frontend: `npm run build`
- [ ] Upload to S3: `aws s3 sync dist s3://www-tradeeon-prod --delete`
- [ ] Configure error pages in CloudFront
- [ ] Update Route 53: www → CloudFront
- [ ] Deploy backend: `.\deploy.ps1`
- [ ] Point api.tradeeon.com → ALB
- [ ] Test everything
- [ ] Launch! 🎉

---

**You're 90% there! Just need to point CloudFront to S3 and deploy!** 🚀




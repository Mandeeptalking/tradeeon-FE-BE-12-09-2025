# AWS S3 + CloudFront Deployment Guide

## Overview

Deploying your Tradeeon frontend to **AWS S3 + CloudFront** provides a robust, scalable, and cost-effective solution for production hosting.

---

## 🎯 Why S3 + CloudFront?

### Advantages Over Netlify

| Feature | Netlify | S3 + CloudFront | Winner |
|---------|---------|-----------------|--------|
| **Performance** | Good | Excellent (Global CDN) | ✅ CloudFront |
| **Cost** | Free tier limited | $1-5/month (100GB) | ✅ CloudFront |
| **Scalability** | Good | Unlimited | ✅ CloudFront |
| **Custom Domain** | Free SSL | Free SSL | Tie |
| **Setup Complexity** | Easy | Moderate | ✅ Netlify |
| **Control** | Limited | Full | ✅ CloudFront |
| **Custom Headers** | Limited | Full control | ✅ CloudFront |
| **Traffic Limits** | 100GB/month | No hard limit | ✅ CloudFront |
| **Region Selection** | Fixed | Choose regions | ✅ CloudFront |

### Cost Comparison

**Netlify**: Free for 100GB bandwidth/month, then paid
**S3 + CloudFront**: ~$1-3/month for typical usage

```
S3 Storage:        $0.023/GB/month
CloudFront:        $0.085/GB (first 10TB)
GET requests:      $0.005 per 1,000
```

**Example Monthly Cost** (100GB traffic, 1GB storage):
- S3: $0.023
- CloudFront: $8.50
- **Total: ~$8.53/month**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         User Browser                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      CloudFront CDN                     │
│  - Edge locations worldwide              │
│  - SSL/TLS termination                   │
│  - DDoS protection                       │
│  - Custom caching rules                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      S3 Bucket                          │
│  - Static files (HTML, JS, CSS)          │
│  - Website hosting enabled               │
│  - Versioning                            │
│  - Lifecycle policies                    │
└─────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Backend API                        │
│  - Railway/Render/AWS Lambda            │
│  - FastAPI                               │
└─────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Supabase                           │
│  - Database                              │
│  - Auth                                  │
└─────────────────────────────────────────┘
```

---

## 🚀 Deployment Steps

### Step 1: Build Frontend

```bash
cd apps/frontend
npm install
npm run build
```

This creates `apps/frontend/dist` with static files.

### Step 2: Create S3 Bucket

**Option A: AWS Console**

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click **"Create bucket"**
3. Configuration:
   - **Bucket name**: `tradeeon-frontend-prod` (must be globally unique)
   - **Region**: Choose closest to users (e.g., `us-east-1`)
   - **Block Public Access**: **Uncheck** (required for website hosting)
   - **Bucket Versioning**: Optional (recommended)
   - **Object Encryption**: Server-side encryption with Amazon S3 managed keys (SSE-S3)
4. Click **"Create bucket"**

**Option B: AWS CLI**

```bash
# Install AWS CLI first
aws s3 mb s3://tradeeon-frontend-prod --region us-east-1

# Enable public access
aws s3api put-public-access-block \
  --bucket tradeeon-frontend-prod \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Enable website hosting
aws s3 website s3://tradeeon-frontend-prod \
  --index-document index.html \
  --error-document index.html
```

### Step 3: Configure S3 Bucket Policy

Add this bucket policy to allow public read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tradeeon-frontend-prod/*"
    }
  ]
}
```

**How to apply:**
1. S3 Console → Your bucket → **"Permissions"** tab
2. Scroll to **"Bucket policy"**
3. Click **"Edit"** and paste the policy above
4. Replace `tradeeon-frontend-prod` with your bucket name
5. Click **"Save changes"**

### Step 4: Configure Static Website Hosting

1. S3 Console → Your bucket → **"Properties"** tab
2. Scroll to **"Static website hosting"**
3. Click **"Edit"**
4. Configuration:
   - **Hosting type**: Enable
   - **Index document**: `index.html`
   - **Error document**: `index.html` (for SPA routing)
5. Click **"Save changes"**

**Note your endpoint URL**: `http://tradeeon-frontend-prod.s3-website-us-east-1.amazonaws.com`

### Step 5: Upload Files to S3

**Option A: AWS Console**

1. S3 Console → Your bucket
2. Click **"Upload"**
3. Navigate to `apps/frontend/dist`
4. Select **all files** in `dist` folder
5. Click **"Upload"**

**Option B: AWS CLI (Recommended)**

```bash
# Sync all files from dist to S3
aws s3 sync apps/frontend/dist s3://tradeeon-frontend-prod \
  --delete \
  --cache-control max-age=31536000,immutable

# Upload with proper content types
aws s3 cp apps/frontend/dist s3://tradeeon-frontend-prod \
  --recursive \
  --cache-control max-age=31536000,immutable

# Set correct content types
aws s3 cp apps/frontend/dist/index.html s3://tradeeon-frontend-prod/index.html \
  --content-type text/html \
  --cache-control max-age=0,no-cache,no-store,must-revalidate

aws s3 cp apps/frontend/dist/assets s3://tradeeon-frontend-prod/assets \
  --recursive \
  --cache-control max-age=31536000,immutable
```

**Option C: AWS CDK/SDK Script**

Create `deploy-to-s3.js`:

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const BUCKET_NAME = 'tradeeon-frontend-prod';
const DIST_DIR = 'apps/frontend/dist';

const s3 = new S3Client({ region: 'us-east-1' });

const uploadFile = async (localPath, s3Key, contentType) => {
  const content = readFileSync(localPath);
  
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: content,
    ContentType: contentType,
    CacheControl: s3Key.endsWith('.html') 
      ? 'max-age=0,no-cache,no-store,must-revalidate'
      : 'max-age=31536000,immutable'
  }));
  
  console.log(`✅ Uploaded: ${s3Key}`);
};

const uploadDir = async (localDir, s3Dir = '') => {
  const files = readdirSync(localDir);
  
  for (const file of files) {
    const localPath = join(localDir, file);
    const s3Key = s3Dir ? `${s3Dir}/${file}` : file;
    
    if (statSync(localPath).isDirectory()) {
      await uploadDir(localPath, s3Key);
    } else {
      const ext = file.split('.').pop();
      const contentType = {
        'html': 'text/html',
        'js': 'application/javascript',
        'css': 'text/css',
        'json': 'application/json',
        'svg': 'image/svg+xml',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'ico': 'image/x-icon'
      }[ext] || 'application/octet-stream';
      
      await uploadFile(localPath, s3Key, contentType);
    }
  }
};

uploadDir(DIST_DIR);
```

### Step 6: Create CloudFront Distribution

**Option A: AWS Console**

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Click **"Create distribution"**
3. Configuration:

**Origin Settings:**
- **Origin domain**: Select your S3 bucket (or enter endpoint)
  - ✅ **Recommended**: S3 bucket domain (e.g., `tradeeon-frontend-prod.s3.amazonaws.com`)
  - ❌ **Don't use**: S3 website endpoint (CloudFront will handle routing)
- **Origin access**: **Origin access control settings (recommended)**
  - Click **"Create control setting"**
    - **Name**: `s3-cloudfront-oac`
    - **Description**: Access control for Tradeeon
    - **Signing behavior**: Sign requests (recommended)
    - Click **"Create"**
  - **Default Cache Behavior**: Use it
  - **Bucket name**: Your S3 bucket
  - Click **"Create"**
- **Origin access control**: Select the control setting you just created
- **Comment**: `Tradeeon Frontend`

**Default Cache Behavior:**
- **Viewer protocol policy**: **"Redirect HTTP to HTTPS"** ✅
- **Allowed HTTP methods**: **GET, HEAD, OPTIONS** (for static site)
- **Cache policy**: **"CachingOptimized"**
- **Origin request policy**: **"CORS-S3Origin"** (if using CORS)
- **Response headers policy**: **"SecurityHeadersPolicy"** (recommended)

**Additional Settings:**
- **Price class**: Choose based on your users' locations
  - **Use all edge locations (best performance)**: Most expensive
  - **Use only North America and Europe**: Cheaper, good coverage
  - **Use only North America**: Cheapest
- **Alternate domain names (CNAMEs)**: Add your custom domain (e.g., `app.tradeeon.com`)
- **SSL certificate**: If using custom domain, request or upload one
  - **Default CloudFront certificate**: For `*.cloudfront.net` domains (free)
  - **Custom SSL certificate**: For custom domains (via ACM - free)

4. Click **"Create distribution"**

**Wait 5-15 minutes** for CloudFront distribution to deploy.

**Option B: AWS CLI**

```bash
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

`cloudfront-config.json`:
```json
{
  "CallerReference": "tradeeon-frontend",
  "Aliases": {
    "Quantity": 1,
    "Items": ["app.tradeeon.com"]
  },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-tradeeon-frontend-prod",
        "DomainName": "tradeeon-frontend-prod.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-tradeeon-frontend-prod",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "CachedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "MinTTL": 0,
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true
  },
  "PriceClass": "PriceClass_All",
  "Enabled": true,
  "Comment": "Tradeeon Frontend Distribution"
}
```

### Step 7: Configure CloudFront for SPA Routing

**Problem**: CloudFront returns 404 for routes like `/app/dashboard`

**Solution**: Add custom error responses

1. CloudFront Console → Your distribution → **"Error pages"** tab
2. Click **"Create custom error response"**
3. Create these error responses:

**Error 403:**
- HTTP error code: `403`
- Customize error response: **Yes**
- Response page path: `/index.html`
- HTTP response code: `200`

**Error 404:**
- HTTP error code: `404`
- Customize error response: **Yes**
- Response page path: `/index.html`
- HTTP response code: `200`

4. Click **"Create custom error response"**

This ensures all routes serve `index.html` (React Router handles routing).

### Step 8: Update Backend CORS

Add CloudFront domain to your backend CORS:

**Railway/Render backend:**
```bash
CORS_ORIGINS=http://localhost:5173,https://dxxxxxxxxxxxxx.cloudfront.net,https://app.tradeeon.com
```

**AWS Lambda/API Gateway:**
```python
allowed_origins = [
    "http://localhost:5173",
    "https://dxxxxxxxxxxxxx.cloudfront.net",
    "https://app.tradeeon.com"
]
```

### Step 9: Configure Custom Domain (Optional)

**Using Route 53:**

1. **Request SSL Certificate** (Certificate Manager)
   - Go to [Certificate Manager](https://console.aws.amazon.com/acm/)
   - Choose **US East (N. Virginia)** (CloudFront requires this region)
   - Click **"Request certificate"**
   - Domain: `app.tradeeon.com`
   - Validation: DNS validation
   - Follow DNS validation steps in Route 53

2. **Add CNAME to CloudFront**
   - CloudFront → Distribution → Settings
   - Add alternate domain: `app.tradeeon.com`
   - SSL certificate: Select your certificate

3. **Update Route 53**
   - Route 53 → Hosted zones → Your domain
   - Create CNAME record:
     - Name: `app`
     - Type: `CNAME`
     - Value: `dxxxxxxxxxxxxx.cloudfront.net`

**Using external DNS (e.g., Cloudflare):**

1. Get CloudFront domain: `dxxxxxxxxxxxxx.cloudfront.net`
2. Add CNAME record in Cloudflare:
   - Name: `app`
   - Target: `dxxxxxxxxxxxxx.cloudfront.net`
   - Proxy status: Proxied (orange cloud)

---

## 🔧 Environment Variables

Since S3/CloudFront serves static files, environment variables must be embedded at build time.

**Set in Netlify CI/CD** or **build script**:

```bash
# Build with environment variables
VITE_SUPABASE_URL=https://xxxxx.supabase.co \
VITE_SUPABASE_ANON_KEY=eyJxxxxx \
VITE_API_URL=https://your-backend-api.com \
npm run build

# Then upload to S3
aws s3 sync dist s3://tradeeon-frontend-prod --delete
```

---

## 🤖 CI/CD Automation

### GitHub Actions

Create `.github/workflows/deploy-aws.yml`:

```yaml
name: Deploy to AWS S3 + CloudFront

on:
  push:
    branches:
      - main
    paths:
      - 'apps/frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd apps/frontend
          npm ci
      
      - name: Build
        run: |
          cd apps/frontend
          VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }} \
          VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }} \
          VITE_API_URL=${{ secrets.VITE_API_URL }} \
          npm run build
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to S3
        run: |
          aws s3 sync apps/frontend/dist s3://tradeeon-frontend-prod \
            --delete \
            --cache-control max-age=31536000,immutable
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

**Add secrets to GitHub:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `CLOUDFRONT_DISTRIBUTION_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

### IAM Policy for CI/CD

Create IAM user with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::tradeeon-frontend-prod",
        "arn:aws:s3:::tradeeon-frontend-prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## ✅ Comparison: Netlify vs S3 + CloudFront

| Criterion | Netlify | S3 + CloudFront | Recommended |
|-----------|---------|-----------------|-------------|
| **Setup Time** | 5 minutes | 30 minutes | Netlify |
| **Learning Curve** | Easy | Moderate | Netlify |
| **Performance** | Good | Excellent | CloudFront |
| **Global CDN** | Yes | Yes (more edge locations) | CloudFront |
| **Cost** | Free tier → Paid | $1-10/month | CloudFront |
| **Control** | Limited | Full | CloudFront |
| **Scalability** | Good | Unlimited | CloudFront |
| **CI/CD** | Built-in | Manual setup | Netlify |
| **Custom Headers** | Limited | Full | CloudFront |
| **AWS Integration** | None | Native | CloudFront |
| **Analytics** | Built-in | CloudWatch + others | Netlify |

---

## 💰 Cost Estimates

### Light Usage (100GB/month, 1GB storage)
- S3 Storage: $0.023
- CloudFront: $8.50
- Requests: $0.50
- **Total: ~$9/month**

### Medium Usage (500GB/month, 5GB storage)
- S3 Storage: $0.115
- CloudFront: $42.50
- Requests: $2.50
- **Total: ~$45/month**

### Heavy Usage (2TB/month, 10GB storage)
- S3 Storage: $0.23
- CloudFront: $170
- Requests: $10
- **Total: ~$180/month**

### AWS Free Tier
- **S3**: 5GB storage, 20,000 GET requests
- **CloudFront**: 1TB data transfer out
- **Combined**: Covers most small apps for first year

---

## 🎯 Recommendation

### Use S3 + CloudFront If:
- ✅ You need maximum performance
- ✅ You want fine-grained control
- ✅ You're already using AWS
- ✅ You anticipate high traffic
- ✅ You need custom headers/rules
- ✅ You want the lowest long-term cost

### Use Netlify If:
- ✅ You want the fastest setup
- ✅ You prefer simplicity over control
- ✅ You don't need advanced features
- ✅ You want built-in CI/CD
- ✅ You want built-in analytics
- ✅ You're okay with monthly traffic limits

---

## 🚀 Quick Start Checklist

- [ ] Create S3 bucket
- [ ] Enable public access
- [ ] Configure bucket policy
- [ ] Enable static website hosting
- [ ] Build frontend (`npm run build`)
- [ ] Upload files to S3
- [ ] Create CloudFront distribution
- [ ] Configure SPA error handling (404 → index.html)
- [ ] Update backend CORS
- [ ] Test deployment
- [ ] Set up custom domain (optional)
- [ ] Configure CI/CD (optional)
- [ ] Set up monitoring (optional)

---

## 📚 Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [S3 + CloudFront Guide](https://aws.amazon.com/blogs/networking-and-content-delivery/hosting-a-spa-on-amazon-s3-and-cloudfront/)
- [Deploying Static Sites to AWS](https://aws.amazon.com/getting-started/hands-on/host-static-website/)

---

**Bottom Line**: S3 + CloudFront is excellent for production, offering better performance and control than Netlify, though setup is more complex. For rapid iteration, use Netlify; for production scale, use S3 + CloudFront.




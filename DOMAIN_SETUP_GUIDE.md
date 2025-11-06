# Domain Setup Guide - tradeeon.com

## 🎉 Congratulations!

You've registered `tradeeon.com` on Route 53! Now let's connect it to your AWS services.

---

## 🎯 Next Steps

### Step 1: Request SSL Certificate (30 minutes)

```bash
# Go to AWS Certificate Manager (ACM)
# https://console.aws.amazon.com/acm/home

# IMPORTANT: Choose us-east-1 (N. Virginia)
# CloudFront requires certificates from us-east-1!

# 1. Click "Request certificate"
# 2. Choose "Request a public certificate"
# 3. Domain: tradeeon.com
#    Add also: *.tradeeon.com (for subdomains)
# 4. Validation: DNS validation
# 5. Submit request

# ACM will provide CNAME records
```

**Save these CNAME records!** You'll need them next.

---

### Step 2: Create Hosted Zone (5 minutes)

```bash
# Your hosted zone should be created automatically
# But verify it exists:

# Go to Route 53 → Hosted zones
# You should see: tradeeon.com

# If not, create it:
aws route53 create-hosted-zone \
  --name tradeeon.com \
  --caller-reference $(date +%s)
```

---

### Step 3: Validate Certificate (10 minutes)

```bash
# 1. In ACM, copy the CNAME records provided
#    Example:
#    Name: _1234567890.tradeeon.com
#    Type: CNAME
#    Value: _abcd1234567890.acm-validations.aws.

# 2. In Route 53 → Hosted zones → tradeeon.com
#    Click "Create record"

# 3. Add CNAME record:
#    Record name: _1234567890
#    Type: CNAME
#    Value: _abcd1234567890.acm-validations.aws.
#    TTL: 300

# 4. Save record

# Wait for validation (5-10 minutes)
# ACM will show "Issued" when ready
```

---

### Step 4: Deploy Frontend & Backend (3-6 hours)

**Follow**: `DEPLOY_TO_AWS.md`

You'll get:
- CloudFront URL (e.g., `dxxxxxxxxxxxxx.cloudfront.net`)
- ALB DNS (e.g., `tradeeon-alb-123456.us-east-1.elb.amazonaws.com`)

**Save these URLs!**

---

### Step 5: Point Domain to CloudFront (10 minutes)

```bash
# 1. Go to Route 53 → Hosted zones → tradeeon.com

# 2. Create A record (frontend):
#    Record name: app
#    Type: A
#    Alias: Yes
#    Alias target: CloudFront distribution
#    Select your CloudFront distribution
#    Routing policy: Simple

# This creates: app.tradeeon.com → CloudFront

# 3. (Optional) Create root A record:
#    Record name: (leave blank for root)
#    Type: A
#    Alias: Yes
#    Alias target: CloudFront
#    Select distribution

# This creates: tradeeon.com → CloudFront
```

---

### Step 6: Connect CloudFront to Certificate (15 minutes)

```bash
# 1. Go to CloudFront → Your distribution → Settings

# 2. Click "Edit"

# 3. Alternate domain names (CNAMEs):
#    Add: app.tradeeon.com (and tradeeon.com if you added root record)

# 4. Custom SSL certificate:
#    Select your ACM certificate

# 5. Save changes

# Wait 15-30 minutes for CloudFront to update
```

---

### Step 7: Point Backend Subdomain (10 minutes)

```bash
# Create API subdomain:

# 1. Go to Route 53 → Hosted zones → tradeeon.com

# 2. Create A record (backend):
#    Record name: api
#    Type: A
#    Alias: Yes
#    Alias target: Application Load Balancer
#    Select your ALB
#    Routing policy: Simple

# This creates: api.tradeeon.com → Backend ALB

# (Optional) Request certificate for api.tradeeon.com too
# Then configure on ALB
```

---

## ✅ Complete DNS Setup

### Final Configuration

```
tradeeon.com
├─ CNAME: _1234567890 → ACM validation (for SSL)
├─ A: (root) → CloudFront (optional)
├─ A: app → CloudFront (main app)
└─ A: api → ALB (backend API)
```

### Access Points

**Frontend**: `https://app.tradeeon.com`  
**Backend API**: `http://api.tradeeon.com` (or HTTPS if configured)  
**Root**: `https://tradeeon.com` (optional)

---

## 🔒 SSL/HTTPS Setup

### For CloudFront (Frontend)

**Already done above!** CloudFront uses ACM certificate.

---

### For ALB (Backend)

**Option A: ALB with ACM** (Recommended)

```bash
# 1. Request certificate for api.tradeeon.com
#    In us-east-1 (not required, can be any region)

# 2. Validate via DNS (same process as above)

# 3. In ALB → Listeners
#    Add HTTPS listener on port 443
#    Select your certificate

# 4. Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<CERT_ARN> \
  --default-actions Type=forward,TargetGroupArn=<TG_ARN>
```

**Option B: HTTP only** (For now)

```bash
# Keep HTTP for now, add HTTPS later
# Update CORS to allow both
```

---

## 📝 Environment Variables Update

### Frontend

Update `apps/frontend/.env.production`:

```env
VITE_API_URL=https://api.tradeeon.com
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### Backend

Update CORS in `apps/api/main.py`:

```python
allowed_origins = [
    "https://app.tradeeon.com",
    "https://tradeeon.com",
    "http://localhost:5173"  # Keep for local dev
]
```

---

## 🧪 Testing

### Verify DNS

```bash
# Check frontend
curl https://app.tradeeon.com/health
nslookup app.tradeeon.com

# Check backend
curl https://api.tradeeon.com/health
nslookup api.tradeeon.com

# Check SSL
openssl s_client -connect app.tradeeon.com:443 -servername app.tradeeon.com
```

---

## 🎯 Quick Reference

### DNS Records Summary

| Record | Type | Target | Purpose |
|--------|------|--------|---------|
| `_1234567890` | CNAME | ACM validation | SSL validation |
| `(root)` | A | CloudFront | Main website |
| `app` | A | CloudFront | Frontend app |
| `api` | A | ALB | Backend API |

### Important URLs

- **Frontend**: `https://app.tradeeon.com`
- **Backend**: `https://api.tradeeon.com`
- **ACM**: https://console.aws.amazon.com/acm/home?region=us-east-1
- **Route 53**: https://console.aws.amazon.com/route53/v2/hostedzones
- **CloudFront**: https://console.aws.amazon.com/cloudfront/v3/home

---

## ✅ Post-Setup Checklist

- [ ] SSL certificate requested (us-east-1)
- [ ] CNAME records added to Route 53
- [ ] Certificate validated
- [ ] CloudFront distribution created
- [ ] Frontend deployed to S3
- [ ] Backend deployed to ECS
- [ ] ALB created
- [ ] app.tradeeon.com → CloudFront
- [ ] api.tradeeon.com → ALB
- [ ] SSL configured on CloudFront
- [ ] SSL configured on ALB (optional)
- [ ] CORS updated
- [ ] Frontend .env updated
- [ ] End-to-end testing
- [ ] Launch! 🚀

---

## 🚨 Common Issues

### DNS Not Resolving

**Wait!** DNS propagation takes 10-60 minutes.

**Check**:
```bash
# Check current DNS
nslookup app.tradeeon.com 8.8.8.8
```

---

### SSL Not Working

**Issue**: Certificate not validated  
**Fix**: Double-check CNAME records in Route 53

**Issue**: Wrong region  
**Fix**: CloudFront requires us-east-1 certificates!

---

### CloudFront Not Updating

**Issue**: Changes not reflected  
**Fix**: Invalidate cache
```bash
aws cloudfront create-invalidation \
  --distribution-id <DIST_ID> \
  --paths "/*"
```

---

## 🎉 You're All Set!

Once DNS propagates, your site will be live at:
- **Frontend**: https://app.tradeeon.com
- **Backend**: https://api.tradeeon.com

**Welcome to production!** 🚀



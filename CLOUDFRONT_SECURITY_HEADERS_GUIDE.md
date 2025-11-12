# CloudFront Security Headers Setup Guide

This guide will help you add HSTS and other security headers to your CloudFront distribution.

## 🎯 What This Does

Adds the following security headers to your CloudFront distribution:

1. **Strict-Transport-Security (HSTS)** - Forces HTTPS connections
2. **X-Content-Type-Options: nosniff** - Prevents MIME type sniffing
3. **X-Frame-Options: DENY** - Prevents clickjacking
4. **Referrer-Policy: strict-origin-when-cross-origin** - Controls referrer information
5. **Content-Security-Policy** - Prevents XSS attacks
6. **Permissions-Policy** - Restricts browser features
7. **X-XSS-Protection** - Additional XSS protection

## 📋 Prerequisites

- AWS CLI installed and configured
- CloudFront Distribution ID: `EMF4IMNT9637C`
- Appropriate AWS permissions (CloudFront Full Access)

## 🚀 Quick Setup (PowerShell)

```powershell
# Run the setup script
.\scripts\setup-cloudfront-security-headers.ps1 -DistributionId EMF4IMNT9637C
```

## 🚀 Quick Setup (Bash/Linux/Mac)

```bash
# Make script executable
chmod +x scripts/setup-cloudfront-security-headers.sh

# Run the setup script
./scripts/setup-cloudfront-security-headers.sh EMF4IMNT9637C
```

## 📝 Manual Setup Steps

If you prefer to set this up manually via AWS Console:

### Step 1: Create Response Headers Policy

1. Go to AWS Console → CloudFront
2. Click **Policies** → **Response headers policies**
3. Click **Create response headers policy**
4. Name: `TradeeonSecurityHeadersPolicy`
5. Configure security headers:

#### Strict Transport Security (HSTS)
- ✅ Override: Yes
- Max age: `31536000` (1 year)
- ✅ Include subdomains
- ✅ Preload

#### Content Type Options
- ✅ Override: Yes

#### Frame Options
- ✅ Override: Yes
- Frame option: `DENY`

#### Referrer Policy
- ✅ Override: Yes
- Referrer policy: `strict-origin-when-cross-origin`

#### Content Security Policy
- ✅ Override: Yes
- Content Security Policy:
```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.tradeeon.com https://*.binance.com wss://*.binance.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;
```

#### XSS Protection
- ✅ Override: Yes
- ✅ Protection: Yes
- ✅ Mode block: Yes

#### Custom Headers
Add custom header:
- Header: `Permissions-Policy`
- Value: `geolocation=(), microphone=(), camera=()`
- ✅ Override: Yes

6. Click **Create**

### Step 2: Attach Policy to Distribution

1. Go to CloudFront → Distributions
2. Select distribution: `EMF4IMNT9637C`
3. Go to **Behaviors** tab
4. Edit the default behavior (or all behaviors)
5. Scroll to **Response headers policy**
6. Select: `TradeeonSecurityHeadersPolicy`
7. Click **Save changes**

### Step 3: Wait for Deployment

CloudFront changes take **5-15 minutes** to propagate globally.

## ✅ Verification

### Check Headers via AWS CLI

```bash
# Get distribution config
aws cloudfront get-distribution --id EMF4IMNT9637C --query 'Distribution.DistributionConfig.DefaultCacheBehavior.ResponseHeadersPolicyId' --output text
```

### Test Headers Online

Visit: https://securityheaders.com/?q=https://www.tradeeon.com

Expected result: **A+ rating** with all security headers present.

### Test via curl

```bash
curl -I https://www.tradeeon.com | grep -i "strict-transport-security\|x-content-type-options\|x-frame-options\|referrer-policy\|content-security-policy"
```

## 🔍 Troubleshooting

### Issue: Policy not applying

**Solution:** 
- Wait 5-15 minutes for CloudFront propagation
- Clear browser cache
- Check that policy is attached to the correct cache behavior

### Issue: CSP blocking resources

**Solution:**
- Check browser console for CSP violations
- Update CSP policy to allow required resources
- Use `report-uri` to monitor violations

### Issue: HSTS not showing

**Solution:**
- HSTS only appears on HTTPS responses
- Ensure you're testing via HTTPS (not HTTP)
- Check that `Override` is set to `true` in policy

## 📊 Expected Headers

After setup, responses should include:

```
Strict-Transport-Security: max-age=31536000; includeSubdomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
Permissions-Policy: geolocation=(), microphone=(), camera=()
X-XSS-Protection: 1; mode=block
```

## 🔄 Updating Headers

To update headers later:

```powershell
# Update policy
.\scripts\setup-cloudfront-security-headers.ps1 -DistributionId EMF4IMNT9637C -PolicyName TradeeonSecurityHeadersPolicy
```

Or manually update the policy in AWS Console.

## 📚 Additional Resources

- [CloudFront Response Headers Policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/response-headers-policies.html)
- [Security Headers Best Practices](https://owasp.org/www-project-secure-headers/)
- [HSTS Preload List](https://hstspreload.org/)

## ✅ Security Checklist

After setup, verify:

- [ ] HSTS header present
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Referrer-Policy configured
- [ ] CSP configured
- [ ] Permissions-Policy configured
- [ ] Test at securityheaders.com shows A+ rating
- [ ] No CSP violations in browser console
- [ ] Site still functions correctly

---

**Last Updated:** 2025-01-12  
**Distribution ID:** EMF4IMNT9637C


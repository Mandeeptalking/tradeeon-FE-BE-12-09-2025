# CloudFront Security Headers Setup Guide

This guide explains how to add HSTS and other security headers to your CloudFront distribution.

## 🎯 What This Does

Adds the following security headers to all responses from CloudFront:

1. **Strict-Transport-Security (HSTS)**: Forces HTTPS for 1 year, includes subdomains, and enables preload
2. **X-Content-Type-Options**: Prevents MIME type sniffing
3. **X-Frame-Options**: Prevents clickjacking attacks
4. **Referrer-Policy**: Controls referrer information
5. **Content-Security-Policy**: Prevents XSS and other injection attacks

## 📋 Prerequisites

- AWS CLI installed and configured
- CloudFront distribution ID: `EMF4IMNT9637C`
- AWS credentials with CloudFront permissions

## 🚀 Quick Setup (PowerShell - Windows)

```powershell
cd scripts
.\add-cloudfront-security-headers.ps1
```

## 🚀 Quick Setup (Bash - Linux/Mac)

```bash
chmod +x scripts/add-cloudfront-security-headers.sh
./scripts/add-cloudfront-security-headers.sh
```

## 📝 Manual Setup Steps

### Step 1: Create Response Headers Policy

1. Go to AWS Console → CloudFront → Policies → Response headers
2. Click "Create response headers policy"
3. Name: `tradeeon-security-headers-policy`
4. Configure security headers:

#### Strict-Transport-Security (HSTS)
- ✅ Override: Yes
- Max age: `31536000` (1 year)
- ✅ Include subdomains
- ✅ Preload

#### X-Content-Type-Options
- ✅ Override: Yes

#### X-Frame-Options
- ✅ Override: Yes
- Frame option: `DENY`

#### Referrer-Policy
- ✅ Override: Yes
- Referrer policy: `strict-origin-when-cross-origin`

#### Content-Security-Policy
- ✅ Override: Yes
- Content Security Policy:
```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.tradeeon.com https://*.binance.com wss://*.binance.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;
```

### Step 2: Attach Policy to Distribution

1. Go to CloudFront → Distributions → `EMF4IMNT9637C`
2. Click "Behaviors" tab
3. Select the default behavior (or all behaviors)
4. Click "Edit"
5. Scroll to "Response headers policy"
6. Select `tradeeon-security-headers-policy`
7. Click "Save changes"

### Step 3: Wait for Deployment

CloudFront changes take **5-15 minutes** to deploy globally.

## ✅ Verification

### Check Headers via Browser

1. Open browser DevTools (F12)
2. Go to Network tab
3. Visit `https://www.tradeeon.com`
4. Click on any request
5. Check Response Headers:
   - ✅ `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
   - ✅ `X-Content-Type-Options: nosniff`
   - ✅ `X-Frame-Options: DENY`
   - ✅ `Referrer-Policy: strict-origin-when-cross-origin`
   - ✅ `Content-Security-Policy: ...`

### Check via cURL

```bash
curl -I https://www.tradeeon.com | grep -i "strict-transport-security\|x-content-type-options\|x-frame-options\|referrer-policy\|content-security-policy"
```

### Check via PowerShell

```powershell
$response = Invoke-WebRequest -Uri "https://www.tradeeon.com" -Method Head
$response.Headers | Select-Object Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Content-Security-Policy
```

## 🔍 Troubleshooting

### Headers Not Appearing

1. **Wait longer**: CloudFront changes can take up to 15 minutes
2. **Clear cache**: Hard refresh (Ctrl+Shift+R) or use incognito mode
3. **Check policy attachment**: Verify the policy is attached to the correct behavior
4. **Check distribution status**: Ensure distribution is "Deployed"

### Check Distribution Status

```bash
aws cloudfront get-distribution --id EMF4IMNT9637C --region ap-southeast-1 --query 'Distribution.Status' --output text
```

Should return: `Deployed`

### View Current Configuration

```bash
aws cloudfront get-distribution-config --id EMF4IMNT9637C --region ap-southeast-1 | jq '.DistributionConfig.DefaultCacheBehavior.ResponseHeadersPolicyId'
```

Should return the policy ID.

## 📊 Security Impact

After implementing these headers:

- ✅ **HSTS**: Prevents MITM attacks and protocol downgrade
- ✅ **X-Content-Type-Options**: Prevents MIME type confusion attacks
- ✅ **X-Frame-Options**: Prevents clickjacking
- ✅ **Referrer-Policy**: Controls information leakage
- ✅ **CSP**: Prevents XSS attacks

## 🔄 Updating Headers

To update headers in the future:

1. Go to CloudFront → Policies → Response headers
2. Select `tradeeon-security-headers-policy`
3. Click "Edit"
4. Update headers as needed
5. Save changes (automatically applies to all attached distributions)

## 📚 Additional Resources

- [AWS CloudFront Response Headers Policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-response-headers.html)
- [HSTS Preload List](https://hstspreload.org/)
- [Content Security Policy Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## ✅ Checklist

- [ ] Response Headers Policy created
- [ ] Policy attached to CloudFront distribution
- [ ] Distribution status is "Deployed"
- [ ] Headers verified via browser DevTools
- [ ] Headers verified via cURL/PowerShell
- [ ] Security audit updated

---

**Last Updated:** 2025-01-12  
**Distribution ID:** EMF4IMNT9637C  
**Region:** ap-southeast-1


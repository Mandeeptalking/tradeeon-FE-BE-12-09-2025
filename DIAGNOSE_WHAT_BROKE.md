# Diagnose What Broke This Morning

## 🔍 Problem
The website was working until this morning, but now shows `DNS_PROBE_FINISHED_NXDOMAIN`. The A record has always been present, so something else changed.

## 🚀 Quick Diagnostic

Run the diagnostic script to find what broke:

### Windows (PowerShell)
```powershell
.\diagnose-what-broke.ps1
```

### Linux/Mac/WSL (Bash)
```bash
# Check CloudFront status
aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.{Status:Status,Enabled:Enabled,DomainName:DomainName}" --output json

# Check S3 bucket
aws s3 ls s3://tradeeon-frontend/index.html

# Check Route53 record
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].[Id]" --output text | cut -d'/' -f3)
aws route53 list-resource-record-sets --hosted-zone-id $ZONE_ID --query "ResourceRecordSets[?Name=='www.tradeeon.com.']" --output json
```

## 🔴 Common Causes (What Could Have Broken)

### 1. CloudFront Distribution Disabled
**Symptom**: Distribution exists but `Enabled: false`

**Check**:
```bash
aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.DistributionConfig.Enabled" --output text
```

**Fix**:
- Go to CloudFront Console
- Select distribution `EMF4IMNT9637C`
- Click "Edit" → Enable distribution
- Wait 15-20 minutes for deployment

---

### 2. Custom Domain Removed from CloudFront
**Symptom**: Distribution works but `www.tradeeon.com` not in aliases

**Check**:
```bash
aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.DistributionConfig.Aliases.Items" --output json
```

**Fix**:
- CloudFront → Distribution → Settings → Edit
- Add `www.tradeeon.com` to "Alternate domain names (CNAMEs)"
- Select SSL certificate
- Save and wait 15-20 minutes

---

### 3. Route53 Record Points to Wrong CloudFront
**Symptom**: Record exists but points to old/deleted distribution

**Check**:
```bash
# Get what Route53 points to
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].[Id]" --output text | cut -d'/' -f3)
aws route53 list-resource-record-sets --hosted-zone-id $ZONE_ID --query "ResourceRecordSets[?Name=='www.tradeeon.com.'].AliasTarget.DNSName" --output text

# Get actual CloudFront domain
aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.DomainName" --output text
```

**Fix**:
```bash
# Run fix script
.\fix-dns-www-tradeeon.ps1
```

---

### 4. S3 Bucket Deleted or Emptied
**Symptom**: CloudFront works but returns 404 or Access Denied

**Check**:
```bash
aws s3 ls s3://tradeeon-frontend/index.html
aws s3 ls s3://tradeeon-frontend/ --recursive | wc -l
```

**Fix**:
- Trigger GitHub Actions: `.github/workflows/deploy-frontend.yml`
- Or manually deploy:
  ```bash
  cd apps/frontend
  npm run build
  aws s3 sync dist/ s3://tradeeon-frontend/ --delete
  aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
  ```

---

### 5. SSL Certificate Expired or Removed
**Symptom**: HTTPS doesn't work, browser shows certificate error

**Check**:
```bash
aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?contains(DomainName, 'tradeeon.com')]" --output json
```

**Fix**:
- Request new certificate in ACM (us-east-1)
- Validate via DNS
- Attach to CloudFront distribution

---

### 6. CloudFront Origin Changed
**Symptom**: Distribution points to wrong S3 bucket

**Check**:
```bash
aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.DistributionConfig.Origins.Items[0].DomainName" --output text
```

**Should be**: `tradeeon-frontend.s3.amazonaws.com` or `tradeeon-frontend.s3.ap-southeast-1.amazonaws.com`

**Fix**:
- CloudFront → Distribution → Origins → Edit
- Update origin domain to correct S3 bucket

---

### 7. Recent Deployment Broke Something
**Symptom**: Everything looks correct but still not working

**Check Recent Changes**:
```bash
# Check CloudFront last modified
aws cloudfront get-distribution-config --id EMF4IMNT9637C --query "DistributionConfig.LastModifiedTime" --output text

# Check GitHub Actions (recent runs)
# Go to: https://github.com/YOUR_REPO/actions/workflows/deploy-frontend.yml
```

**Fix**:
- Check GitHub Actions logs for errors
- Rollback recent changes if needed
- Redeploy frontend

---

## 🔧 Step-by-Step Fix Process

### Step 1: Run Diagnostic
```powershell
.\diagnose-what-broke.ps1
```

### Step 2: Based on Results

**If CloudFront Disabled**:
1. Enable in CloudFront Console
2. Wait 15-20 minutes

**If Custom Domain Missing**:
1. Add `www.tradeeon.com` to CloudFront aliases
2. Select SSL certificate
3. Wait 15-20 minutes

**If Route53 Wrong**:
1. Run: `.\fix-dns-www-tradeeon.ps1`
2. Wait 15-60 minutes for DNS propagation

**If S3 Empty**:
1. Trigger GitHub Actions deployment
2. Or manually deploy (see above)

**If Everything Looks OK**:
1. Wait 15-60 minutes (DNS propagation)
2. Clear browser cache
3. Try different DNS server (8.8.8.8)
4. Check: https://dnschecker.org/#A/www.tradeeon.com

### Step 3: Verify Fix
```bash
# Test DNS
nslookup www.tradeeon.com

# Test website
curl -I https://www.tradeeon.com

# Should return 200 OK
```

---

## 📋 Quick Checklist

- [ ] CloudFront distribution is enabled
- [ ] CloudFront has custom domain `www.tradeeon.com` configured
- [ ] Route53 A record points to correct CloudFront domain
- [ ] S3 bucket has `index.html` and other files
- [ ] SSL certificate is valid and attached
- [ ] CloudFront origin points to correct S3 bucket
- [ ] No recent breaking changes in GitHub Actions

---

## 🆘 Still Not Working?

1. **Check CloudWatch Logs**:
   - CloudFront → Distribution → Monitoring → View logs

2. **Check S3 Access Logs**:
   - S3 → Bucket → Properties → Server access logging

3. **Test Direct CloudFront URL**:
   ```bash
   CF_DOMAIN=$(aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.DomainName" --output text)
   curl -I https://$CF_DOMAIN
   ```
   - If this works but `www.tradeeon.com` doesn't → DNS issue
   - If this doesn't work → CloudFront/S3 issue

4. **Contact AWS Support** if nothing else works

---

**Most Likely Cause**: CloudFront distribution was disabled or custom domain was removed from CloudFront configuration.


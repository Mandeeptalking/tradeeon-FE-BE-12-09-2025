# SSL Diagnostic Checklist - Step by Step

## 🔍 Let's Check Everything One by One

### ✅ Step 1: Check if SSL Certificate Exists

**Go to AWS Certificate Manager:**
1. AWS Console → Search "Certificate Manager"
2. Click "Certificate Manager"
3. Look for a certificate with domains: `www.tradeeon.com` or `tradeeon.com`

**What to check:**
- [ ] Certificate exists? (Yes/No)
- [ ] Certificate status? (Pending validation / Issued / Failed)
- [ ] Which domains? (List them)

**Tell me:** Does the certificate exist? What's its status?

---

### ✅ Step 2: Check CloudFront Distribution Settings

**Go to CloudFront:**
1. AWS Console → CloudFront
2. Click on your distribution (should be `tradeeon-frontend` or ID `E2GKG9WFGGVUOQ`)
3. Click "General" tab

**What to check:**
- [ ] Distribution Status: (Deployed / In Progress)
- [ ] Price Class: (Should be set)
- [ ] SSL Certificate: (Default CloudFront certificate / Custom certificate)
- [ ] Which certificate is selected? (If custom, list the ARN)

**Tell me:** 
- Is distribution deployed? 
- What SSL certificate is configured?

---

### ✅ Step 3: Check CloudFront Alternate Domain Names (CNAMEs)

**Still in CloudFront distribution:**
1. Click "General" tab
2. Scroll to "Settings"
3. Look for "Alternate domain names (CNAMEs)"

**What to check:**
- [ ] Does it list `www.tradeeon.com`? (Yes/No)
- [ ] Does it list `tradeeon.com`? (Yes/No)

**Tell me:** What domains are listed here?

---

### ✅ Step 4: Check Route 53 DNS Records

**Go to Route 53:**
1. AWS Console → Route 53
2. Click "Hosted zones"
3. Click on `tradeeon.com`
4. Look at the records

**What to check:**
- [ ] Is there an A record for `www.tradeeon.com`? (Yes/No)
- [ ] Is it an Alias? (Yes/No)
- [ ] Does it point to CloudFront? (Yes/No)
- [ ] What's the Alias target? (Should be CloudFront domain or distribution)

**Tell me:** What DNS records exist for `www`?

---

### ✅ Step 5: Test CloudFront URL Directly

**Test these URLs in your browser:**
1. `https://d17hg7j76nwuhw.cloudfront.net` (Your CloudFront domain)
2. `http://d17hg7j76nwuhw.cloudfront.net` (HTTP version)

**What to check:**
- [ ] Does HTTPS CloudFront URL work? (Yes/No)
- [ ] Does HTTP CloudFront URL work? (Yes/No)

**Tell me:** Which CloudFront URLs work?

---

### ✅ Step 6: Test DNS Resolution

**Open PowerShell and run:**
```powershell
nslookup www.tradeeon.com
```

**What to check:**
- [ ] Does it resolve to CloudFront IPs? (Yes/No)
- [ ] What IPs does it show? (List them)

**Tell me:** What IPs does DNS return?

---

## 🎯 Common Issues & Solutions

### Issue 1: No SSL Certificate
**Symptom:** Certificate doesn't exist in ACM
**Fix:** Request certificate (see FIX_SSL_CERTIFICATE.md)

### Issue 2: Certificate Not Validated
**Symptom:** Certificate status is "Pending validation"
**Fix:** Add DNS validation records to Route 53

### Issue 3: Certificate Not Attached to CloudFront
**Symptom:** CloudFront shows "Default CloudFront certificate"
**Fix:** Edit CloudFront → Security tab → Select your certificate

### Issue 4: CNAME Not Added to CloudFront
**Symptom:** `www.tradeeon.com` not in CloudFront CNAME list
**Fix:** Edit CloudFront → General tab → Add CNAME

### Issue 5: DNS Not Pointing to CloudFront
**Symptom:** DNS doesn't resolve to CloudFront
**Fix:** Update Route 53 A record to point to CloudFront

---

## 📋 Quick Fix Script

Run this to check everything automatically:

```powershell
Write-Host "`n🔍 Checking SSL Setup...`n" -ForegroundColor Cyan

Write-Host "1️⃣ Testing CloudFront URL..." -ForegroundColor Yellow
Test-NetConnection -ComputerName d17hg7j76nwuhw.cloudfront.net -Port 443 -InformationLevel Quiet
if ($?) { Write-Host "   ✅ CloudFront HTTPS reachable" -ForegroundColor Green } 
else { Write-Host "   ❌ CloudFront HTTPS unreachable" -ForegroundColor Red }

Write-Host "`n2️⃣ Checking DNS resolution..." -ForegroundColor Yellow
$dns = Resolve-DnsName www.tradeeon.com -Type A -ErrorAction SilentlyContinue
if ($dns) { 
    Write-Host "   ✅ DNS resolves to: $($dns.IPAddress -join ', ')" -ForegroundColor Green 
} else { 
    Write-Host "   ❌ DNS not resolving" -ForegroundColor Red 
}

Write-Host "`n3️⃣ Testing www.tradeeon.com..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://www.tradeeon.com" -Method Head -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ HTTPS works! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ HTTPS failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Diagnostic complete!`n" -ForegroundColor Cyan
```

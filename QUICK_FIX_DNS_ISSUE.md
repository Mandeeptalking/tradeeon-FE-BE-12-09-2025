# Quick Fix: DNS Issue for www.tradeeon.com

## 🔴 Problem
**Error**: `DNS_PROBE_FINISHED_NXDOMAIN`  
**Meaning**: DNS cannot resolve `www.tradeeon.com`  
**Impact**: Website is inaccessible

## ✅ Solution
Create Route53 A record pointing `www.tradeeon.com` → CloudFront distribution

## 🚀 Quick Fix (Choose One Method)

### Method 1: PowerShell Script (Windows)
```powershell
.\fix-dns-www-tradeeon.ps1
```

### Method 2: Bash Script (Linux/Mac/WSL)
```bash
chmod +x fix-dns-www-tradeeon.sh
./fix-dns-www-tradeeon.sh
```

### Method 3: AWS Console (Manual)
1. Go to: https://console.aws.amazon.com/route53/
2. Select hosted zone: `tradeeon.com`
3. Click "Create record"
4. Configure:
   - **Name**: `www`
   - **Type**: `A - Routes traffic to an IPv4 address`
   - **Alias**: **Yes** (toggle on)
   - **Route traffic to**: `CloudFront distribution`
   - **Select distribution**: `EMF4IMNT9637C`
   - **Routing policy**: `Simple routing`
5. Click "Create records"

### Method 4: AWS CLI (One Command)
```bash
# Get CloudFront domain
CF_DOMAIN=$(aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.DomainName" --output text)

# Get hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].[Id]" --output text | cut -d'/' -f3)

# Create record
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.tradeeon.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "'"$CF_DOMAIN"'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

## ⏱️ After Fixing

1. **Wait for DNS Propagation**: 15-60 minutes
2. **Check Propagation**: https://dnschecker.org/#A/www.tradeeon.com
3. **Test Website**: https://www.tradeeon.com

## 🔍 Verify Fix

```bash
# Check DNS resolution
nslookup www.tradeeon.com

# Should return CloudFront IP addresses
# If still NXDOMAIN, wait longer for propagation
```

## 📚 Full Documentation

See [COMPLETE_ARCHITECTURE_AND_DEPLOYMENT_GUIDE.md](COMPLETE_ARCHITECTURE_AND_DEPLOYMENT_GUIDE.md) for:
- Complete architecture explanation
- How FE and BE work
- Deployment details
- Troubleshooting guide


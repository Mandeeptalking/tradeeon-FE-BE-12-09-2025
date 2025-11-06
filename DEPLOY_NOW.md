# 🚀 DEPLOY NOW - Complete Instructions

## Quick Deployment Guide

Since AWS CLI is not available on your system, here's the simplest path to get everything running:

---

## Step 1: Get Route 53 Zone ID (2 minutes)

### Option A: AWS Console (Easiest)
1. Go to: https://console.aws.amazon.com/route53/home
2. Click **"Hosted zones"** in left menu
3. Click on **"tradeeon.com"**
4. Copy the **"Hosted zone ID"** (starts with `Z`, like `Z1234567890ABC`)

### Option B: If you have AWS CLI available
```powershell
aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].Id" --output text
```

---

## Step 2: Update terraform.tfvars

Open `infra/terraform/terraform.tfvars` and replace:
```
route53_zone_id = "<your Route53 Hosted Zone ID for tradeeon.com>"
```

With:
```
route53_zone_id = "Z1234567890ABC"  # Use your actual Zone ID
```

---

## Step 3: Deploy Everything

```powershell
cd infra/terraform
.\deploy-complete.ps1
```

**OR if you have the Zone ID:**
```powershell
cd infra/terraform
.\deploy-complete.ps1 -Route53ZoneId "Z1234567890ABC"
```

---

## What This Does

1. ✅ Verifies all configuration
2. ✅ Initializes Terraform
3. ✅ Shows deployment plan
4. ✅ Creates all AWS resources:
   - VPC with 2 public subnets
   - Internet Gateway
   - Security Groups
   - Application Load Balancer (HTTPS)
   - ECS Cluster + Service
   - Route 53 DNS record
   - CloudWatch Logs
5. ✅ Verifies deployment
6. ✅ Tests API endpoint

**Time:** ~10-15 minutes

---

## After Deployment

1. **Wait for DNS propagation** (5-60 minutes)
2. **Test API:**
   ```bash
   curl https://api.tradeeon.com/health
   ```
3. **Get task IPs for Binance:**
   - See `infra/terraform/DEPLOY_STEPS.md` Step 7
4. **Monitor logs:**
   ```bash
   aws logs tail /ecs/tradeeon-backend --follow
   ```

---

## Current Status

- ✅ Frontend: Live at https://www.tradeeon.com
- ⚠️ Backend: Need to deploy via Terraform
- ⚠️ Alert Runner: Need to verify

---

## Need Help?

- **Zone ID Instructions:** `infra/terraform/GET_ZONE_ID_INSTRUCTIONS.md`
- **Full Deployment Guide:** `infra/terraform/DEPLOY_STEPS.md`
- **Architecture:** `infra/terraform/ARCHITECTURE_SUMMARY.md`

---

**Ready? Get Zone ID and run `.\deploy-complete.ps1`!**


# How to Get Route 53 Zone ID - Quick Guide

## Method 1: AWS Console (Easiest)

1. **Open AWS Console:**
   - Go to: https://console.aws.amazon.com/route53/home
   - Make sure you're in `us-east-1` region

2. **Navigate to Hosted Zones:**
   - Click "Hosted zones" in the left menu

3. **Find Your Domain:**
   - Look for `tradeeon.com` in the list
   - Click on it

4. **Copy Zone ID:**
   - The "Hosted zone ID" is displayed at the top
   - It starts with `Z` (e.g., `Z1234567890ABC`)
   - Copy this value

5. **Update terraform.tfvars:**
   - Open `infra/terraform/terraform.tfvars`
   - Find: `route53_zone_id = "<your Route53 Hosted Zone ID for tradeeon.com>"`
   - Replace with: `route53_zone_id = "Z1234567890ABC"` (use your actual Zone ID)

---

## Method 2: AWS CLI (If Available)

```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].Id" --output text
```

This will output something like: `/hostedzone/Z1234567890ABC`

Remove the `/hostedzone/` prefix, so you get: `Z1234567890ABC`

---

## Method 3: Use Deployment Script

If you have the Zone ID, you can pass it directly:

```powershell
cd infra/terraform
.\deploy-complete.ps1 -Route53ZoneId "Z1234567890ABC"
```

---

## Quick Reference

**Zone ID Format:**
- Starts with `Z`
- Followed by 13 alphanumeric characters
- Example: `Z1234567890ABC`

**Common Locations:**
- AWS Console → Route 53 → Hosted zones → tradeeon.com
- Usually shown at the top of the hosted zone page

---

**After getting the Zone ID, update `terraform.tfvars` and run:**
```powershell
cd infra/terraform
.\deploy-complete.ps1
```


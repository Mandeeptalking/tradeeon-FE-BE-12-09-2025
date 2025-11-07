# Add HTTPS Listener to ALB

## Problem Found ✅

Your ALB only has **HTTP:80** listener. **HTTPS:443 is missing!**

This is why:
- HTTP sometimes works ✅
- HTTPS fails ❌
- Frontend might be trying HTTPS and failing

---

## Solution: Add HTTPS Listener

### Option 1: Add via AWS Console (Quick Fix - 5 minutes)

1. **EC2** → **Load Balancers** → `tradeeon-alb`
2. **Listeners** tab
3. **Click:** "Add listener"
4. **Configure:**
   - **Protocol:** HTTPS
   - **Port:** 443
   - **Default action:** Forward to target group
   - **Target group:** `tradeeon-backend-tg`
   - **Security policy:** ELBSecurityPolicy-TLS13-1-2-2021-06 (or latest)
   - **Default SSL/TLS certificate:** 
     - Select: "From ACM"
     - Choose your certificate for `api.tradeeon.com`
     - (If you don't have one, see Option 2)
5. **Click:** "Add"

**Wait 1-2 minutes** for listener to be active.

---

### Option 2: Use Terraform (Recommended - Permanent Fix)

The Terraform config already has HTTPS listener defined, but it might not have been applied.

**Check if Terraform was applied:**
1. Go to `infra/terraform` directory
2. Run: `terraform plan`
3. Check if it shows HTTPS listener needs to be created

**If HTTPS listener is missing in Terraform state:**
1. Run: `terraform apply`
2. This will create the HTTPS listener

**If certificate ARN is missing:**
- You need an ACM certificate for `api.tradeeon.com`
- Create it in ACM (us-east-1 region)
- Add the ARN to `terraform.tfvars`

---

## Step-by-Step: Add via Console

### Step 1: Get ACM Certificate ARN

1. **AWS Console** → **Certificate Manager (ACM)**
2. **Make sure region is:** `us-east-1` (N. Virginia)
3. **Look for certificate** for `api.tradeeon.com`
4. **Copy the ARN** (e.g., `arn:aws:acm:us-east-1:123456789012:certificate/abc-123`)

**If certificate doesn't exist:**
- **Request certificate:**
  1. Click "Request certificate"
  2. Domain: `api.tradeeon.com`
  3. Validation: DNS validation
  4. Add CNAME record to Route 53
  5. Wait for validation (5-10 minutes)

---

### Step 2: Add HTTPS Listener

1. **EC2** → **Load Balancers** → `tradeeon-alb`
2. **Listeners** tab → **Add listener**
3. **Fill in:**
   - **Protocol:** HTTPS
   - **Port:** 443
   - **Default action:** Forward to `tradeeon-backend-tg`
   - **Security policy:** ELBSecurityPolicy-TLS13-1-2-2021-06
   - **Default SSL/TLS certificate:** 
     - Select "From ACM"
     - Choose certificate for `api.tradeeon.com`
4. **Click:** "Add"

---

### Step 3: Verify

**Test HTTPS:**
```powershell
curl https://api.tradeeon.com/health
```

**Should return:** `{"status":"ok"}`

---

## After Adding HTTPS Listener

**Both should work:**
- ✅ `http://api.tradeeon.com/health` (HTTP)
- ✅ `https://api.tradeeon.com/health` (HTTPS)

**Frontend should use HTTPS:**
- Update `VITE_API_URL` to use `https://api.tradeeon.com`
- Rebuild frontend

---

## Quick Checklist

- [ ] ACM certificate exists for `api.tradeeon.com` (in us-east-1)
- [ ] HTTPS listener added to ALB (port 443)
- [ ] SSL certificate attached to listener
- [ ] Test HTTPS: `curl https://api.tradeeon.com/health`
- [ ] Update frontend to use HTTPS

---

## Need Help?

**If you don't have an ACM certificate:**
1. Create one in Certificate Manager
2. Validate via DNS (add CNAME to Route 53)
3. Wait for validation
4. Then add HTTPS listener

**If Terraform should have created it:**
1. Check `terraform.tfvars` for `acm_certificate_arn`
2. If missing, add it and run `terraform apply`



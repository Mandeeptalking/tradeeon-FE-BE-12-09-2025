# Deploy Backend from Scratch - Step by Step

## Overview

We're deploying the Tradeeon backend infrastructure using Terraform via GitHub Actions. This will create:
- VPC with public subnets
- Application Load Balancer (ALB)
- ECS Cluster and Service
- Route 53 DNS record for `api.tradeeon.com`

---

## Step 1: Verify GitHub Secrets

**All secrets must be added before deployment!**

### Go to GitHub Secrets:
1. Go to: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/settings/secrets/actions
2. Verify these 5 secrets exist:
   - ✅ `AWS_ACCESS_KEY_ID`
   - ✅ `AWS_SECRET_ACCESS_KEY`
   - ✅ `ROUTE53_ZONE_ID` = `Z08494351HC32A4M6XAOH`
   - ✅ `SUPABASE_URL` = `https://mgjlnmlhwuqspctanaik.supabase.co`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` = (JWT token)

**If any are missing, add them now!**

---

## Step 2: Check Current Workflow Status

### Go to GitHub Actions:
1. Go to: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions
2. Find: **"Deploy Infrastructure with Terraform"**
3. Check the **latest run** status:
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed
   - ⏳ Yellow circle = Running
   - No runs = Never executed

**What do you see?** (Share the status)

---

## Step 3: Run the Workflow

### If workflow never ran or failed:

1. **Click "Run workflow"** button (top right)
2. **Select branch**: `main`
3. **Click green "Run workflow"** button
4. **Wait** - deployment takes ~10-15 minutes

### Monitor the workflow:
- Watch each step execute
- Steps will show:
  - ✅ Checkout code
  - ✅ Configure AWS credentials
  - ✅ Setup Terraform
  - ✅ Create terraform.tfvars
  - ✅ Terraform Init
  - ✅ Terraform Validate
  - ✅ Terraform Plan
  - ✅ Terraform Apply (this creates resources)
  - ✅ Terraform Outputs
  - ✅ Verify Deployment

---

## Step 4: Verify Deployment

### After workflow completes:

1. **Check Route 53:**
   - AWS Console → Route 53 → Hosted zones → `tradeeon.com`
   - Look for: `api.tradeeon.com` record
   - Should point to an ALB

2. **Check ECS:**
   - AWS Console → ECS → Clusters → `tradeeon-cluster`
   - Service: `tradeeon-backend-service`
   - Tasks should be running

3. **Check ALB:**
   - AWS Console → EC2 → Load Balancers
   - Look for: `tradeeon-backend-alb`
   - Status should be "active"

4. **Test API:**
   - Wait 5-60 minutes for DNS propagation
   - Test: `curl https://api.tradeeon.com/health`

---

## Troubleshooting

### If workflow fails:
1. Click on failed run
2. Click "deploy" job
3. Find step with red X
4. Check error message
5. Share error to fix

### Common errors:
- **Missing secrets** → Add all 5 secrets
- **AWS permissions** → Check IAM user permissions
- **Terraform validation** → Check configuration
- **Resource conflicts** → Delete conflicting resources

---

## Quick Checklist

- [ ] All 5 GitHub secrets added
- [ ] GitHub Actions workflow checked
- [ ] Workflow run (if not run yet)
- [ ] Workflow completed successfully
- [ ] Route 53 record created
- [ ] ECS service running
- [ ] ALB active
- [ ] API accessible

---

**Ready? Let's start with Step 1!**


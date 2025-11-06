# 🚀 How to Trigger Deployment

## Step-by-Step Guide

### Step 1: Go to GitHub Actions

1. **Open your repository:**
   - https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025

2. **Click "Actions" tab** (top navigation)

3. **Find "Deploy Infrastructure with Terraform"** workflow
   - It should be in the list on the left

### Step 2: Run the Workflow

1. **Click "Deploy Infrastructure with Terraform"**

2. **Click "Run workflow"** button (top right, next to "Filter")

3. **Select branch:**
   - Should be `main` (default)

4. **Click green "Run workflow" button**

### Step 3: Monitor Deployment

1. **Watch the workflow run:**
   - You'll see it start with "Queued"
   - Then "In progress"
   - Each step will show progress

2. **Expected Timeline:**
   - **Init**: ~30 seconds
   - **Plan**: ~1 minute
   - **Apply**: ~5-10 minutes
   - **Verify**: ~2 minutes
   - **Total**: ~10-15 minutes

3. **Check logs:**
   - Click on the running workflow
   - Click on "deploy" job
   - Watch each step execute

### Step 4: Verify Success

✅ **Workflow completes successfully:**
- All steps should show green checkmarks
- "Terraform Apply" should succeed
- "Verify Deployment" should pass (or show retry attempts)

✅ **Check outputs:**
- Look for "Terraform Outputs" step
- Should show ALB DNS and API URL

✅ **Test API:**
```bash
curl https://api.tradeeon.com/health
```

---

## What Gets Created

The workflow will create:

- ✅ VPC with 2 public subnets
- ✅ Internet Gateway
- ✅ Security Groups
- ✅ Application Load Balancer (HTTPS)
- ✅ ECS Cluster
- ✅ ECS Service with backend tasks
- ✅ Route 53 DNS record (`api.tradeeon.com`)
- ✅ CloudWatch Log Group

---

## Troubleshooting

### If Workflow Fails

1. **Check the error message** in the failed step
2. **Common issues:**
   - Missing secrets (check all 3 are added)
   - AWS permissions (check IAM user has correct permissions)
   - Certificate not ready (check ACM certificate is "Issued")

3. **Re-run workflow:**
   - Click "Re-run all jobs"

### If Secrets Error

Make sure all 3 secrets are added:
- `ROUTE53_ZONE_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## After Successful Deployment

1. **Wait for DNS propagation** (5-60 minutes)
2. **Test API endpoint:**
   ```bash
   curl https://api.tradeeon.com/health
   ```
3. **Get task IPs for Binance:**
   - AWS Console → ECS → Clusters → tradeeon-cluster
   - Click on running task → Network tab → Public IP
4. **Monitor logs:**
   - AWS Console → CloudWatch → Log groups → `/ecs/tradeeon-backend`

---

**Quick Link:** https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions

**Ready? Go trigger the workflow!** 🚀



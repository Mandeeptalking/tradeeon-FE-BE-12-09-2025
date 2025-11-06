# Diagnosing Workflow Failure

## Quick Failure Analysis

All 3 workflow runs failed very quickly (8-14 seconds), which means they're failing in the **early steps**, not during Terraform apply.

## Most Likely Causes

### 1. Missing AWS Credentials Secrets
The workflow requires these secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

**Check if these exist:**
- Go to: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/settings/secrets/actions
- Verify both secrets are present

### 2. Missing Terraform Secrets
The workflow also needs:
- `ROUTE53_ZONE_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Verify all 3 are added.**

### 3. AWS IAM Permissions
The AWS user might not have required permissions.

**Required permissions:**
- EC2 (VPC, subnets, security groups)
- ECS (cluster, service, task definition)
- ELB (load balancer, target group, listener)
- Route 53 (record creation)
- ACM (certificate access)
- CloudWatch (log groups)

## How to Check Workflow Logs

1. **Go to failed run:**
   - Click on the failed workflow run (red X icon)

2. **Check the failed step:**
   - Click on the "deploy" job
   - Look at which step failed
   - Read the error message

3. **Common error messages:**
   - "Error: Missing credentials" → AWS secrets missing
   - "Error: Access Denied" → IAM permissions issue
   - "Error: Invalid secret" → Secret value incorrect
   - "Error: Terraform validation failed" → Terraform config issue

## Quick Fix Steps

### Step 1: Verify All Secrets

Required secrets:
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
ROUTE53_ZONE_ID
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### Step 2: Check AWS IAM Permissions

The IAM user needs full permissions for:
- EC2
- ECS
- ELB
- Route53
- ACM
- CloudWatch Logs

### Step 3: Check Workflow Logs

Click on the failed run to see the exact error.

## Next Steps

1. **Check the workflow logs** to see exact error
2. **Verify all secrets are added**
3. **Check AWS IAM permissions**
4. **Fix the issue and re-run**

---

**To see the exact error, click on the failed workflow run and check the logs!**


# How to Check Workflow Error

## Quick Steps

1. **Go to the failed run:**
   - Click on the red X icon next to "Deploy Infrastructure with Terraform #5"

2. **Click on the "deploy" job:**
   - This will show all the steps

3. **Find the failed step:**
   - Look for the step with a red X
   - Common failed steps:
     - "Terraform Init"
     - "Terraform Validate"
     - "Terraform Plan"
     - "Configure AWS credentials"

4. **Click on the failed step:**
   - This will show the error output

5. **Copy the error message:**
   - Look for lines starting with "Error:"
   - Copy the full error message

---

## Common Errors

### 1. Missing Secrets
**Error:** `Error: Missing credentials` or `Access Denied`
**Fix:** Check all 5 secrets are added:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- ROUTE53_ZONE_ID
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

### 2. Terraform Validation Error
**Error:** `Error: Cycle:` or `Error: Invalid configuration`
**Fix:** Check Terraform configuration syntax

### 3. AWS Permissions
**Error:** `AccessDenied` or `UnauthorizedOperation`
**Fix:** Check IAM user has required permissions

### 4. Resource Already Exists
**Error:** `Error: resource already exists`
**Fix:** May need to import existing resources or use different names

---

## Share the Error

Once you have the error message, share it and I'll help fix it!

---

**Quick Link:** https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions



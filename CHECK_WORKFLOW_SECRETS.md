# Check Workflow Secrets - Quick Guide

## Required Secrets Checklist

Go to: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/settings/secrets/actions

### AWS Credentials (Required for Terraform)
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`

### Terraform Configuration
- [ ] `ROUTE53_ZONE_ID` = `Z08494351HC32A4M6XAOH`
- [ ] `SUPABASE_URL` = `https://mgjlnmlhwuqspctanaik.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (JWT token)

---

## If Secrets Are Missing

### Add AWS Credentials

1. **Get AWS Access Key:**
   - AWS Console → IAM → Users → `github-actions-deployer`
   - Security credentials tab
   - Create access key

2. **Add to GitHub:**
   - Name: `AWS_ACCESS_KEY_ID`
   - Value: `AKIA...` (your access key ID)
   - Name: `AWS_SECRET_ACCESS_KEY`
   - Value: `...` (your secret access key)

### Required IAM Permissions

The IAM user needs these permissions:
- `AmazonEC2FullAccess` (or specific VPC, subnet, security group permissions)
- `AmazonECS_FullAccess`
- `ElasticLoadBalancingFullAccess`
- `AmazonRoute53FullAccess`
- `AWSCertificateManagerReadOnly`
- `CloudWatchLogsFullAccess`

Or attach: `PowerUserAccess` policy (easier but less secure)

---

## Verify Secrets Are Set

After adding secrets, they should appear in the secrets list.

**Note:** Secret values are masked - you can't see them after adding.

---

## Next Steps

1. ✅ Add all 5 secrets
2. ✅ Verify IAM user has permissions
3. ✅ Trigger workflow again
4. ✅ Check workflow logs if it fails

---

**Quick Link:** https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/settings/secrets/actions



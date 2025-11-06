# Add Terraform Secrets to GitHub

## Required Secrets

The Terraform deployment workflow needs these GitHub Secrets:

### 1. ROUTE53_ZONE_ID
- **Value**: `Z08494351HC32A4M6XAOH`
- **Purpose**: Route 53 hosted zone ID for tradeeon.com

### 2. SUPABASE_URL
- **Value**: `https://mgjlnmlhwuqspctanaik.supabase.co`
- **Purpose**: Supabase project URL

### 3. SUPABASE_SERVICE_ROLE_KEY
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQxNDMwNSwiZXhwIjoyMDcyOTkwMzA1fQ.AgWM1MZCPGQHgpZ4749KtgAOOGQZoI7wFvBqp_2p8Ng`
- **Purpose**: Supabase service role key

---

## How to Add Secrets

1. **Go to GitHub Repository:**
   - https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025

2. **Navigate to Settings:**
   - Click "Settings" tab
   - Click "Secrets and variables" → "Actions"

3. **Add Each Secret:**

   **Secret 1: ROUTE53_ZONE_ID**
   - Click "New repository secret"
   - Name: `ROUTE53_ZONE_ID`
   - Value: `Z08494351HC32A4M6XAOH`
   - Click "Add secret"

   **Secret 2: SUPABASE_URL**
   - Click "New repository secret"
   - Name: `SUPABASE_URL`
   - Value: `https://mgjlnmlhwuqspctanaik.supabase.co`
   - Click "Add secret"

   **Secret 3: SUPABASE_SERVICE_ROLE_KEY**
   - Click "New repository secret"
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQxNDMwNSwiZXhwIjoyMDcyOTkwMzA1fQ.AgWM1MZCPGQHgpZ4749KtgAOOGQZoI7wFvBqp_2p8Ng`
   - Click "Add secret"

---

## After Adding Secrets

1. **Trigger Deployment:**
   - Go to "Actions" tab
   - Click "Deploy Infrastructure with Terraform"
   - Click "Run workflow" → "Run workflow"

2. **Monitor Deployment:**
   - Watch the workflow run
   - Check logs for any errors
   - Deployment takes ~10-15 minutes

3. **Verify:**
   - Check ECS service in AWS Console
   - Test: `curl https://api.tradeeon.com/health`

---

## Quick Checklist

- [ ] ROUTE53_ZONE_ID added
- [ ] SUPABASE_URL added
- [ ] SUPABASE_SERVICE_ROLE_KEY added
- [ ] Workflow triggered
- [ ] Deployment successful
- [ ] API accessible

---

**After adding secrets, the workflow will deploy automatically!**


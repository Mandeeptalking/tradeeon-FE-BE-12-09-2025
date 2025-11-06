# Create Route 53 Record Manually

## Current Status

You're creating the `api.tradeeon.com` record. Here's how to complete it:

---

## Step-by-Step Instructions

### Step 1: Configure Alias

1. **Enable "Alias" toggle** (should be ON/Enabled)
   - This allows the record to point to AWS resources (ALB)

### Step 2: Select Target

1. **Route traffic to:**
   - Select: **"Alias to Application and Classic Load Balancer"**

2. **Region:**
   - Select: **"us-east-1"** (N. Virginia)

3. **Load balancer:**
   - Select: **"tradeeon-backend-alb"**
   - If you don't see it, the ALB doesn't exist yet - need to run Terraform first!

### Step 3: Health Check

1. **Evaluate target health:**
   - ✅ **Yes** (already set - good!)

### Step 4: Create

1. **Click "Create records"** button

---

## If ALB Doesn't Exist

If you don't see `tradeeon-backend-alb` in the dropdown:

### Option A: Run Terraform Workflow (Recommended)

The Terraform workflow will create:
- ✅ ALB
- ✅ Route 53 record automatically
- ✅ Everything else

**Steps:**
1. Go to: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions
2. Find: "Deploy Infrastructure with Terraform"
3. Click "Run workflow"
4. Wait ~10-15 minutes
5. Terraform will create everything including this record

### Option B: Create ALB First

If you want to create manually:
1. Go to EC2 → Load Balancers
2. Create Application Load Balancer
3. Then come back and create this Route 53 record

---

## After Creating Record

1. **Wait 5-60 minutes** for DNS propagation

2. **Test DNS:**
   ```bash
   nslookup api.tradeeon.com
   ```

3. **Test API:**
   ```bash
   curl https://api.tradeeon.com/health
   ```

---

## Quick Checklist

- [ ] Alias enabled
- [ ] Target: Application Load Balancer
- [ ] Region: us-east-1
- [ ] Load Balancer: tradeeon-backend-alb (or create first)
- [ ] Evaluate target health: Yes
- [ ] Create records

---

**If ALB exists, complete the record creation. If not, run Terraform workflow first!**



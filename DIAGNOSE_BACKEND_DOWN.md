# Backend Not Reachable - Diagnosis Steps

## Confirmed Issue
`https://api.tradeeon.com/health` cannot be reached = Backend is down or not accessible

---

## Step 1: Check ECS Service Status (CRITICAL)

### In AWS Console:

1. **Go to:** AWS Console → **ECS** → **Clusters**
2. **Click:** `tradeeon-cluster` (or your cluster name)
3. **Click:** **Services** tab
4. **Find:** `tradeeon-backend-service` (or your service name)
5. **Check these values:**

   **Running count:** Should be > 0 (e.g., 1/1)
   **Desired count:** Should be > 0
   **Status:** Should be "Active"

### If Running count = 0:

**The service is stopped or tasks are failing!**

**Next steps:**
1. **Click on the service** → **Events** tab
   - Look for error messages
   - Common: "Service failed to start", "Task stopped", etc.

2. **Click** → **Logs** tab (or go to CloudWatch)
   - Check for container errors
   - Look for: "Database not available", "Missing env vars", etc.

3. **Check Tasks tab:**
   - Are there any tasks? (stopped, failed, etc.)
   - Click on a task → Check why it stopped

---

## Step 2: Check Task Definition

1. **ECS** → **Task Definitions** → `tradeeon-backend`
2. **Click latest revision**
3. **Check Container definitions:**
   - **Image:** Should be your ECR image
   - **Port mappings:** Should have port 8000
   - **Environment variables:** Check if these are set:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `SUPABASE_JWT_SECRET`
     - `ENCRYPTION_KEY`

**If env vars are missing:**
- This is likely why tasks are failing!
- Add them and create new revision
- Update service to use new revision

---

## Step 3: Check CloudWatch Logs

1. **AWS Console** → **CloudWatch** → **Log groups**
2. **Find:** `/ecs/tradeeon-backend` or similar
3. **Click** → **Log streams** → **Most recent**
4. **Look for errors:**
   - `"Database not available"` → Supabase not configured
   - `"WARNING: Generated new encryption key"` → ENCRYPTION_KEY missing
   - `"Error starting container"` → Container crash
   - `"Connection refused"` → Port binding issue

---

## Step 4: Check ALB and Target Group

1. **EC2** → **Load Balancers**
2. **Find:** `tradeeon-backend-alb` (or your ALB)
3. **Check:**
   - **State:** Should be "Active"
   - **DNS name:** Copy this (we'll use it)

4. **Click** → **Target Groups** tab
5. **Click on target group**
6. **Targets** tab:
   - **Health status:** Are targets healthy?
   - **If unhealthy:** Check why (port, health check path)

---

## Step 5: Check Route 53 DNS

1. **Route 53** → **Hosted zones** → `tradeeon.com`
2. **Check for A record:**
   - **Name:** `api` (or `api.tradeeon.com`)
   - **Type:** A - Alias
   - **Alias target:** Should point to your ALB

**If missing:**
- Create A record pointing to ALB
- Wait 2-3 minutes for DNS propagation

---

## Most Common Causes & Fixes

### Cause 1: Tasks Failing Due to Missing Env Vars

**Symptoms:**
- Running count = 0
- Tasks keep stopping
- Logs show: "Database not available" or encryption errors

**Fix:**
1. **ECS** → **Task Definitions** → `tradeeon-backend` → **Create new revision**
2. **Add environment variables:**
   ```
   SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   ENCRYPTION_KEY=eaSgpZ4S9aHs_xiW_g__ILQCa-dF8wnVZNhTGX8TdTs=
   ```
3. **Update service** to use new revision
4. **Wait 2-3 minutes** for service to restart

---

### Cause 2: Container Crashing on Startup

**Symptoms:**
- Tasks start then immediately stop
- Logs show Python errors or import errors

**Fix:**
- Check CloudWatch logs for specific error
- Verify Docker image is correct
- Check if all dependencies are installed

---

### Cause 3: Health Check Failing

**Symptoms:**
- Tasks are running but ALB shows unhealthy
- Health check path `/health` not returning 200

**Fix:**
- Verify `/health` endpoint exists (it does in `main.py`)
- Check target group health check settings:
  - Path: `/health`
  - Protocol: HTTP
  - Port: 8000
  - Matcher: 200

---

### Cause 4: Security Groups Blocking Traffic

**Symptoms:**
- ALB can't reach ECS tasks
- Health checks failing

**Fix:**
- **ECS Task Security Group:**
  - Allow inbound: Port 8000 from ALB security group
- **ALB Security Group:**
  - Allow inbound: Port 80, 443 from 0.0.0.0/0
  - Allow outbound: All traffic

---

## Quick Action Plan

**Do these in order:**

1. ✅ **Check ECS service** → Running count?
2. ✅ **Check Events tab** → Any errors?
3. ✅ **Check CloudWatch logs** → What errors?
4. ✅ **Check task definition** → Env vars set?
5. ✅ **If env vars missing** → Add them and update service
6. ✅ **Wait 2-3 minutes** → Service should restart
7. ✅ **Test again:** `curl https://api.tradeeon.com/health`

---

## What to Share

**Please check and share:**
1. **ECS Service:** Running count? (0 or >0?)
2. **Events tab:** Any error messages?
3. **CloudWatch logs:** What errors do you see?
4. **Task definition:** Are the 4 env vars set?

This will help pinpoint the exact issue!



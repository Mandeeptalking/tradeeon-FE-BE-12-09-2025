# Fix "Failed to load resource" / Connection Error

## Problem
`net::ERR_CONNECTION_...` error means the frontend **cannot reach the backend** at `https://api.tradeeon.com`.

---

## Quick Checks

### 1. Is Backend Running?

**Test the backend directly:**
```bash
curl https://api.tradeeon.com/health
```

**Expected:** `{"status":"ok"}`

**If it fails:**
- Backend is not running or not accessible
- DNS not resolving
- Security groups blocking traffic

---

### 2. Check ECS Service Status

1. **AWS Console** → **ECS** → **Clusters** → `tradeeon-cluster`
2. **Services** tab → Click `tradeeon-backend-service`
3. **Check:**
   - **Status**: Should be "Active"
   - **Running count**: Should be > 0
   - **Desired count**: Should be > 0
   - **Tasks**: Should show running tasks

**If service is not running:**
- Service might have failed to start
- Check task logs for errors
- Check if task definition has required env vars

---

### 3. Check ALB Target Health

1. **AWS Console** → **EC2** → **Load Balancers**
2. Find your ALB (likely named `tradeeon-alb`)
3. **Target Groups** tab
4. Check **Health checks**:
   - Targets should be "healthy"
   - If "unhealthy", check why

**Common issues:**
- Health check path wrong (`/health` should return 200)
- Security groups blocking health checks
- Backend not responding on health endpoint

---

### 4. Check DNS Resolution

**Test DNS:**
```bash
nslookup api.tradeeon.com
# or
ping api.tradeeon.com
```

**Should resolve to:** ALB's DNS name or IP

**If DNS fails:**
- Route 53 record might be missing or incorrect
- DNS propagation delay (wait a few minutes)

---

### 5. Check Security Groups

**ALB Security Group:**
- Should allow inbound: 80, 443 from 0.0.0.0/0
- Should allow outbound: All traffic

**ECS Task Security Group:**
- Should allow inbound: 8000 from ALB security group
- Should allow outbound: All traffic

---

## Most Common Fixes

### Fix 1: ECS Service Not Running

**Symptoms:**
- Service shows 0 running tasks
- Tasks keep stopping

**Fix:**
1. **ECS** → **Services** → `tradeeon-backend-service`
2. **Check Events** tab for errors
3. **Check Logs** tab for task failures
4. **Common causes:**
   - Missing environment variables
   - Task definition error
   - Container failing to start

---

### Fix 2: Health Check Failing

**Symptoms:**
- ALB shows targets as "unhealthy"
- Backend is running but health check fails

**Fix:**
1. **Check health endpoint:**
   ```bash
   curl https://api.tradeeon.com/health
   ```
2. **If it fails**, check backend logs:
   - CloudWatch → Log groups → ECS logs
   - Look for errors in `/health` endpoint
3. **Verify health check path** in target group:
   - Should be `/health`
   - Protocol: HTTP
   - Port: 8000 (or container port)

---

### Fix 3: DNS Not Resolving

**Symptoms:**
- `nslookup api.tradeeon.com` fails
- Browser can't resolve domain

**Fix:**
1. **Route 53** → **Hosted zones** → `tradeeon.com`
2. **Check A record** for `api.tradeeon.com`:
   - Should point to ALB
   - Type: A - Alias
   - Alias target: Your ALB
3. **If missing**, create the record:
   - Name: `api`
   - Type: A - Alias
   - Alias: Yes
   - Alias target: Your ALB

---

### Fix 4: CORS Preflight Failing

**Symptoms:**
- Network tab shows preflight (OPTIONS) request failing
- Main request also fails

**Fix:**
1. **Check backend CORS config:**
   - Should allow `https://www.tradeeon.com`
   - Should allow credentials
2. **Check ALB** allows OPTIONS requests
3. **Check security groups** allow all HTTP methods

---

## Step-by-Step Diagnosis

### Step 1: Test Backend Directly
```bash
curl https://api.tradeeon.com/health
```

**If this works:**
- Backend is reachable
- Issue is with frontend → backend connection
- Check CORS, authentication

**If this fails:**
- Backend is not accessible
- Continue to Step 2

---

### Step 2: Check ECS Service

1. **AWS Console** → **ECS** → **Clusters** → `tradeeon-cluster`
2. **Services** → `tradeeon-backend-service`
3. **Check:**
   - Running count > 0?
   - Tasks are running?
   - Any errors in Events tab?

**If service is down:**
- Check task definition
- Check environment variables
- Check CloudWatch logs

---

### Step 3: Check ALB

1. **EC2** → **Load Balancers**
2. Find your ALB
3. **Check:**
   - State: Active?
   - Target groups: Healthy?
   - Listeners: HTTP/HTTPS configured?

**If ALB issues:**
- Check security groups
- Check target group health
- Check listener rules

---

### Step 4: Check Route 53

1. **Route 53** → **Hosted zones** → `tradeeon.com`
2. **Check A record** for `api.tradeeon.com`
3. **Verify** it points to ALB

**If missing:**
- Create A record (Alias) pointing to ALB

---

## Quick Fix Checklist

- [ ] Backend health check works: `curl https://api.tradeeon.com/health`
- [ ] ECS service is running (tasks > 0)
- [ ] ALB targets are healthy
- [ ] Route 53 A record exists for `api.tradeeon.com`
- [ ] Security groups allow traffic
- [ ] Backend has required env vars (Supabase, encryption key)

---

## Still Not Working?

**Share:**
1. **Backend health check result**: `curl https://api.tradeeon.com/health`
2. **ECS service status**: Running count, task status
3. **ALB target health**: Healthy or unhealthy?
4. **Route 53 record**: Does `api.tradeeon.com` A record exist?
5. **CloudWatch logs**: Any errors in backend logs?



# Quick Fix: Backend Connection Error

## The Problem
`net::ERR_CONNECTION_...` = Frontend cannot reach `https://api.tradeeon.com`

---

## Step 1: Test Backend Directly (30 seconds)

**Open PowerShell and run:**
```powershell
curl https://api.tradeeon.com/health
```

**Expected:** `{"status":"ok"}`

**If it fails:**
- Backend is not running or not accessible
- Continue to Step 2

---

## Step 2: Check ECS Service (2 minutes)

1. **AWS Console** → **ECS** → **Clusters** → `tradeeon-cluster`
2. **Services** tab → Click `tradeeon-backend-service`
3. **Check these:**
   - **Running count**: Should be > 0 (e.g., 1/1)
   - **Desired count**: Should be > 0
   - **Tasks tab**: Should show running tasks

**If Running count = 0:**
- Service is stopped or tasks are failing
- **Check Events tab** for errors
- **Check Logs tab** for task failures

**Common causes:**
- Missing environment variables (Supabase, encryption key)
- Container failing to start
- Health check failing

---

## Step 3: Check ALB Target Health (1 minute)

1. **AWS Console** → **EC2** → **Load Balancers**
2. Find: `tradeeon-backend-alb` (or similar)
3. **Target Groups** tab
4. Click on the target group
5. **Targets** tab → Check health status

**If targets are "unhealthy":**
- Backend is running but health check is failing
- Check if `/health` endpoint returns 200
- Check security groups allow health checks

---

## Step 4: Check Route 53 DNS (1 minute)

1. **AWS Console** → **Route 53** → **Hosted zones** → `tradeeon.com`
2. **Check for A record** named `api`
3. **Should point to:** Your ALB (Alias)

**If missing:**
- Create A record:
  - Name: `api`
  - Type: A - Alias
  - Alias: Yes
  - Alias target: Your ALB

---

## Most Common Fix

### ECS Service Not Running

**Symptoms:**
- Running count = 0
- Tasks keep stopping

**Fix:**
1. **ECS** → **Services** → `tradeeon-backend-service`
2. **Events tab** → Look for errors
3. **Logs tab** → Check CloudWatch logs
4. **Common fix:** Add missing environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `ENCRYPTION_KEY`

---

## Quick Checklist

Run these checks in order:

1. ✅ **Backend reachable?** 
   ```powershell
   curl https://api.tradeeon.com/health
   ```

2. ✅ **ECS service running?**
   - AWS Console → ECS → Services → Running count > 0?

3. ✅ **ALB targets healthy?**
   - EC2 → Load Balancers → Target Groups → Targets healthy?

4. ✅ **DNS record exists?**
   - Route 53 → Hosted zones → `api.tradeeon.com` A record?

5. ✅ **Backend logs show errors?**
   - CloudWatch → Log groups → Check for errors

---

## If Backend Health Check Works But Frontend Still Fails

**Check CORS:**
- Backend should allow `https://www.tradeeon.com`
- Check `CORS_ORIGINS` environment variable in ECS

**Check Authentication:**
- Frontend should send JWT token
- Check browser console for auth errors

---

## Need Help?

**Share:**
1. Result of: `curl https://api.tradeeon.com/health`
2. ECS service status: Running count?
3. ALB target health: Healthy or unhealthy?
4. Any errors in CloudWatch logs?



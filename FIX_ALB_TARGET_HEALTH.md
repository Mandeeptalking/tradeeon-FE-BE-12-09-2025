# Fix ALB Target Health Status

## Current Status

✅ **Backend is actually healthy!**
- Logs show health checks returning 200 OK
- Health checks coming from ALB (172.31.x.x IPs)
- Application is running correctly

❌ **But ALB shows target as unhealthy**

---

## Why This Happens

The ALB health check might:
1. **Just started passing** - needs time to update status
2. **Hasn't met healthy threshold yet** - needs 2 consecutive successful checks
3. **Configuration mismatch** - check path/port/protocol

---

## Quick Fix: Wait and Refresh

### Option 1: Wait for Health Check

1. **Health check interval**: 30 seconds
2. **Healthy threshold**: 2 consecutive successes
3. **Wait**: ~1-2 minutes
4. **Refresh** ALB target group status

### Option 2: Check Target Details

1. **Go to ALB Target Group:**
   - EC2 → Load Balancers → `tradeeon-backend-alb`
   - Target groups → `tradeeon-backend-tg`
   - Targets tab

2. **Click on the target** (the IP address)

3. **Check:**
   - **Health check status**: What does it say?
   - **Last health check**: Recent?
   - **Response code**: Any errors?
   - **Description**: Any error messages?

---

## Verify Health Check Configuration

**Current settings:**
- Path: `/health` ✅
- Protocol: HTTP ✅
- Port: 8000 ✅
- Matcher: 200 ✅
- Interval: 30 seconds
- Healthy threshold: 2
- Unhealthy threshold: 3
- Timeout: 5 seconds

**If these match, just wait for health checks to pass!**

---

## If Still Unhealthy After Waiting

### Check 1: Security Group

**ECS Task Security Group must allow:**
- Inbound: Port 8000 from ALB security group

**Check:**
1. EC2 → Security Groups
2. Find ECS task security group
3. Verify inbound rule allows port 8000 from ALB SG

### Check 2: Target Registration

**Verify target is registered:**
1. Target Group → Targets tab
2. Check if IP is registered
3. Check registration status

### Check 3: Health Check Response

**Test directly:**
1. Get task private IP
2. From ALB subnet, test: `curl http://<task-ip>:8000/health`
3. Should return 200 OK

---

## Most Likely Solution

Since logs show health checks are working:
1. **Wait 1-2 minutes** for ALB to update
2. **Refresh target group** status
3. **Target should become healthy**

If still unhealthy after waiting, check target details for specific error.

---

**Quick Link:** https://console.aws.amazon.com/ec2/home?region=us-east-1#TargetGroups:sort=targetGroupName


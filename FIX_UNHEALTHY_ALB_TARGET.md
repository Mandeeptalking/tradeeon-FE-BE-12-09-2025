# Fix Unhealthy ALB Target

## Issue

ALB target group shows:
- ✅ Total targets: 1
- ❌ Healthy: 0
- ❌ Unhealthy: 1
- Protocol: HTTP:8000

This means the ECS task is not responding to health checks.

---

## Why Target is Unhealthy

### Common Causes:

1. **Application not listening on port 8000**
   - Check if FastAPI is running on port 8000
   - Check if container port matches task definition

2. **Application crashed**
   - Check CloudWatch logs for errors
   - Application may have failed to start

3. **Health check path wrong**
   - ALB checks: `/health`
   - Backend must respond to `/health` endpoint

4. **Security group blocking**
   - ECS task security group must allow port 8000 from ALB

5. **Application startup timeout**
   - Application taking too long to start
   - Health check failing before app is ready

---

## Diagnosis Steps

### Step 1: Check Target Details

In ALB Target Group:
1. Click on the target group
2. Go to "Targets" tab
3. Click on the unhealthy target
4. Check:
   - **Health check details**
   - **Last health check time**
   - **Health check path** (should be `/health`)
   - **Response code** (if any)

### Step 2: Check CloudWatch Logs

1. **Go to CloudWatch:**
   - https://console.aws.amazon.com/cloudwatch/home?region=us-east-1

2. **Check logs:**
   - Log groups → `/ecs/tradeeon-backend`
   - Look for recent log streams
   - Check for:
     - Application startup messages
     - Errors
     - Port binding issues

3. **Look for these messages:**
   - `Application startup complete`
   - `Uvicorn running on http://0.0.0.0:8000`
   - Any error messages

### Step 3: Check ECS Task Status

1. **Go to ECS:**
   - https://console.aws.amazon.com/ecs/home?region=us-east-1

2. **Check task:**
   - Clusters → `tradeeon-cluster`
   - Services → `tradeeon-backend-service`
   - Tasks tab → Click on task
   - Check:
     - **Status**: Running?
     - **Last status**: Any errors?
     - **Health status**: Healthy?

### Step 4: Check Container Port

1. **In ECS task definition:**
   - Verify container port is `8000`
   - Verify host port mapping

2. **In ALB target group:**
   - Verify port is `8000`
   - Verify protocol is HTTP

---

## Common Fixes

### Fix 1: Application Not Starting

**Check logs for:**
- Import errors
- Missing environment variables
- Database connection failures

**Fix:**
- Check CloudWatch logs
- Fix errors in application code
- Verify all environment variables set

### Fix 2: Port Mismatch

**Check:**
- Task definition container port: `8000`
- ALB target group port: `8000`
- Application listening on: `8000`

**Fix:**
- Ensure all ports match
- Update task definition if needed
- Redeploy service

### Fix 3: Health Check Path

**Check:**
- ALB health check path: `/health`
- Backend endpoint exists: `GET /health`

**Fix:**
- Verify `/health` endpoint in backend
- Check if it returns 200 status
- Test locally: `curl http://localhost:8000/health`

### Fix 4: Security Group

**Check:**
- ECS task security group allows inbound port 8000 from ALB security group

**Fix:**
- Add inbound rule if missing
- Allow port 8000 from ALB security group

### Fix 5: Restart Service

If all else fails:
1. ECS → Service → `tradeeon-backend-service`
2. Click "Update service"
3. Check "Force new deployment"
4. Click "Update"
5. Wait for new tasks to start

---

## Quick Checklist

- [ ] Check CloudWatch logs for errors
- [ ] Verify port 8000 in task definition
- [ ] Verify `/health` endpoint exists
- [ ] Check security group rules
- [ ] Check task status in ECS
- [ ] Restart service if needed

---

## Next Steps

1. **Check CloudWatch logs first** - most likely to show the issue
2. **Check target details** in ALB for health check response
3. **Fix the issue** based on logs
4. **Restart service** to apply fix
5. **Wait for health checks** to pass (2-3 minutes)

---

**Quick Links:**
- CloudWatch: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1
- ECS: https://console.aws.amazon.com/ecs/home?region=us-east-1
- ALB: https://console.aws.amazon.com/ec2/home?region=us-east-1



# AWS Backend Database Connection Check

## ✅ What We Fixed

1. **Improved Supabase client initialization**
   - ✅ Fails fast in production if credentials are missing
   - ✅ Better error messages
   - ✅ Startup validation

2. **Enhanced health check endpoint**
   - ✅ Now shows database connection status
   - ✅ Tests actual database query

3. **Added startup validation**
   - ✅ Tests database connection on startup
   - ✅ Logs clear error messages

## 🔍 How to Check AWS Backend

### Step 1: Check if Backend is Running

```bash
# Get ECS service status
aws ecs describe-services \
  --cluster tradeeon-cluster \
  --services tradeeon-backend \
  --region us-east-1

# Check running tasks
aws ecs list-tasks \
  --cluster tradeeon-cluster \
  --service-name tradeeon-backend \
  --region us-east-1
```

### Step 2: Check Environment Variables

The task definition (`task-definition.json`) has:
- ✅ `SUPABASE_URL` = `https://mgjlnmlhwuqspctanaik.supabase.co`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` = (set correctly)

**But you need to verify they're actually deployed:**

```bash
# Get current task definition
aws ecs describe-task-definition \
  --task-definition tradeeon-backend \
  --region us-east-1 \
  --query 'taskDefinition.containerDefinitions[0].environment'
```

### Step 3: Check Backend Logs

```bash
# View recent logs
aws logs tail /ecs/tradeeon-backend --follow --region us-east-1

# Look for:
# ✅ "Supabase client initialized successfully"
# ✅ "Database connection verified successfully"
# OR
# ❌ "Database connection failed"
# ❌ "Missing required Supabase credentials"
```

### Step 4: Test Health Endpoint

```bash
# Get ALB URL from AWS console or:
aws elbv2 describe-load-balancers \
  --region us-east-1 \
  --query 'LoadBalancers[?contains(LoadBalancerName, `tradeeon`)].DNSName'

# Then test:
curl https://YOUR-ALB-URL/health

# Should return:
# {
#   "status": "ok",
#   "timestamp": 1234567890,
#   "database": "connected"  <-- This is the key!
# }
```

## 🚨 Common Issues

### Issue 1: Environment Variables Not Set

**Symptom:** Logs show "Supabase client not initialized"

**Fix:**
1. Update task definition with environment variables
2. Force new deployment:
   ```bash
   aws ecs update-service \
     --cluster tradeeon-cluster \
     --service tradeeon-backend \
     --force-new-deployment \
     --region us-east-1
   ```

### Issue 2: Network/Firewall Blocking

**Symptom:** Connection timeout errors

**Fix:**
- Check security groups allow outbound HTTPS (port 443)
- Check if NAT Gateway is configured (for private subnets)
- Verify Supabase project isn't paused

### Issue 3: Wrong Credentials

**Symptom:** Authentication errors

**Fix:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct (not anon key!)
- Get fresh key from Supabase dashboard → Settings → API

## 📋 Quick Checklist

- [ ] Backend service is running in ECS
- [ ] Task definition has `SUPABASE_URL` environment variable
- [ ] Task definition has `SUPABASE_SERVICE_ROLE_KEY` environment variable
- [ ] Logs show "Supabase client initialized successfully"
- [ ] `/health` endpoint returns `"database": "connected"`
- [ ] Can query database from backend (test with `/connections` endpoint)

## 🔧 If Still Not Working

1. **Check CloudWatch Logs** - Look for startup errors
2. **Verify Task Definition** - Make sure env vars are actually set
3. **Test Locally** - Run `python apps/api/test_db_connection.py` (should pass)
4. **Redeploy** - Force new deployment to pick up changes

## 💡 Next Steps

1. Run the diagnostic commands above
2. Check CloudWatch logs for errors
3. Test `/health` endpoint
4. If database shows "disconnected", check environment variables in ECS


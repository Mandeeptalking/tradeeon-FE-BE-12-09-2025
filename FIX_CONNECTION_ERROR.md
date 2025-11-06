# Fix "Failed to save connection" Error

## Quick Diagnosis Steps

### Step 1: Check Browser Console (Most Important!)

1. **Open browser console**: Press `F12` → Console tab
2. **Try to connect exchange again**
3. **Look for errors** - Share the exact error message

Common errors you might see:
- `401 Unauthorized` → Authentication issue
- `503 Service Unavailable` → Backend/Supabase not configured  
- `500 Internal Server Error` → Backend error
- `Network Error` → Backend not reachable

---

### Step 2: Check Network Tab

1. **F12** → **Network** tab
2. **Try to connect** exchange
3. **Find the failed request** (usually `/connections` or `/connections/test`)
4. **Click on it** → Check:
   - **Status code** (401, 500, 503?)
   - **Request headers** (Does it have `Authorization: Bearer ...`?)
   - **Response** (What error message?)

---

### Step 3: Most Likely Causes & Fixes

## ❌ Cause 1: Backend Missing Environment Variables

**Symptoms:**
- Error: `503 Service Unavailable` or `Database not available`
- Backend logs show: `Supabase client not available`

**Fix:**
1. Go to **AWS Console** → **ECS** → **Task Definitions** → `tradeeon-backend`
2. **Create new revision**
3. **Add these 4 environment variables:**
   ```
   SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   SUPABASE_JWT_SECRET=your-jwt-secret-here
   ENCRYPTION_KEY=eaSgpZ4S9aHs_xiW_g__ILQCa-dF8wnVZNhTGX8TdTs=
   ```
4. **Update service** to use new revision
5. **Wait 2-3 minutes** for service to restart

---

## ❌ Cause 2: Authentication Token Missing/Invalid

**Symptoms:**
- Error: `401 Unauthorized`
- Network tab shows no `Authorization` header

**Fix:**
1. **Sign out** and **sign in again**
2. Check browser console for Supabase errors
3. Verify frontend has Supabase configured:
   - Check if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
   - Rebuild frontend if needed

---

## ❌ Cause 3: Encryption Key Missing

**Symptoms:**
- Error: `500 Internal Server Error`
- Backend logs show: `WARNING: Generated new encryption key`

**Fix:**
1. Add `ENCRYPTION_KEY` to ECS task definition (see Cause 1)
2. Use the exact key: `eaSgpZ4S9aHs_xiW_g__ILQCa-dF8wnVZNhTGX8TdTs=`

---

## ❌ Cause 4: Supabase RLS Blocking Insert

**Symptoms:**
- Error: `500 Internal Server Error`
- Backend logs show Supabase errors

**Fix:**
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this to check RLS:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'exchange_keys';
   ```
3. If policies are missing, run the schema again

---

## ❌ Cause 5: Frontend Not Sending Auth Token

**Symptoms:**
- Network tab shows request without `Authorization` header
- Error: `401 Unauthorized`

**Fix:**
1. Check if user is signed in
2. Check browser console for Supabase client errors
3. Verify `authenticatedFetch` is being used (not regular `fetch`)

---

## Step 4: Check Backend Logs

1. **AWS Console** → **CloudWatch** → **Log groups**
2. Find log group for your ECS service (usually `/ecs/tradeeon-backend`)
3. **Check recent logs** for errors

**Look for:**
- `"Database not available"` → Supabase not configured
- `"WARNING: Generated new encryption key"` → ENCRYPTION_KEY missing
- `"Error upserting connection"` → Check full error message
- `"Invalid token"` → JWT secret mismatch

---

## Step 5: Test Manually

### Test 1: Check if backend is reachable
```bash
curl https://api.tradeeon.com/health
```
Should return: `{"status":"ok"}`

### Test 2: Test with JWT token
1. **Get JWT token** from browser:
   - F12 → Application → Local Storage
   - Find key like `sb-xxxxx-auth-token`
   - Copy the `access_token` value

2. **Test API:**
   ```bash
   curl -X POST https://api.tradeeon.com/connections \
     -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d '{
       "exchange": "BINANCE",
       "api_key": "test-key",
       "api_secret": "test-secret"
     }'
   ```

---

## Most Common Fix (90% of cases)

**Add these 4 environment variables to ECS:**

1. AWS Console → ECS → Task Definitions → `tradeeon-backend`
2. Create new revision
3. Add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `ENCRYPTION_KEY`
4. Update service
5. Wait for restart

---

## Still Not Working?

**Share these details:**
1. **Browser console error** (F12 → Console)
2. **Network tab** (F12 → Network → Failed request details)
3. **Backend logs** (CloudWatch)
4. **Exact error message** from the alert


# Troubleshoot "Failed to save connection" Error

## Quick Diagnosis

The error can happen at several points. Let's check each one:

---

## 1. Check Browser Console (F12)

Open browser console and look for:
- **401 Unauthorized** → Authentication issue
- **503 Service Unavailable** → Backend/Supabase not configured
- **500 Internal Server Error** → Backend error (check logs)

---

## 2. Most Common Causes

### ❌ Backend Missing Environment Variables

The backend needs these 4 env vars in ECS:

1. **`SUPABASE_URL`** - Your Supabase project URL
2. **`SUPABASE_SERVICE_ROLE_KEY`** - Service role key
3. **`SUPABASE_JWT_SECRET`** - JWT secret
4. **`ENCRYPTION_KEY`** - `eaSgpZ4S9aHs_xiW_g__ILQCa-dF8wnVZNhTGX8TdTs=`

**Fix:** Go to AWS ECS → Task Definitions → tradeeon-backend → Create new revision → Add env vars → Update service

---

### ❌ Supabase Client Not Initialized

If `supabase` is `None` in backend, you'll get "Database not available" error.

**Check:** Backend logs should show if Supabase client initialized

**Fix:** Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly

---

### ❌ Encryption Key Missing

If `ENCRYPTION_KEY` is not set, encryption will fail.

**Check:** Backend logs for "WARNING: Generated new encryption key"

**Fix:** Add `ENCRYPTION_KEY` to ECS task definition

---

### ❌ Authentication Token Invalid

If JWT token is missing or invalid, you'll get 401.

**Check:** Browser console → Network tab → Look at request headers
- Should have: `Authorization: Bearer <token>`

**Fix:** Sign in again, check if Supabase is configured in frontend

---

### ❌ RLS Policy Blocking Insert

Supabase RLS might be blocking the insert.

**Check:** Supabase Dashboard → Logs → Look for RLS errors

**Fix:** Verify RLS policies are correct:
```sql
CREATE POLICY "Users can manage own exchange keys" ON public.exchange_keys
    FOR ALL USING (auth.uid() = user_id);
```

---

## 3. Check Backend Logs

### AWS CloudWatch Logs

1. Go to: AWS Console → CloudWatch → Log groups
2. Find: `/ecs/tradeeon-backend` or similar
3. Check recent logs for errors

**Look for:**
- `"Database not available"` → Supabase not configured
- `"WARNING: Generated new encryption key"` → ENCRYPTION_KEY missing
- `"Error upserting connection"` → Check the full error message
- `"Invalid token"` → JWT secret mismatch

---

## 4. Test Backend Directly

Test the API endpoint directly:

```bash
# Get your JWT token from browser (F12 → Application → Local Storage → supabase.auth.token)
TOKEN="your-jwt-token-here"

# Test connection endpoint
curl -X POST https://api.tradeeon.com/connections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exchange": "BINANCE",
    "api_key": "test-key",
    "api_secret": "test-secret"
  }'
```

**Expected responses:**
- `401` → Token invalid
- `503` → Database not available (Supabase not configured)
- `500` → Check error message in response

---

## 5. Step-by-Step Fix

### Step 1: Verify Backend Env Vars

1. AWS Console → ECS → Task Definitions → `tradeeon-backend`
2. Check latest revision → Container definitions → Environment variables
3. Verify all 4 are set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `ENCRYPTION_KEY`

### Step 2: Check Backend Logs

1. AWS Console → CloudWatch → Log groups
2. Find your ECS log group
3. Check for errors

### Step 3: Test Authentication

1. Sign in to frontend
2. Open browser console (F12)
3. Check if JWT token is stored:
   ```javascript
   // In browser console
   localStorage.getItem('sb-mgjlnmlhwuqspctanaik-auth-token')
   ```

### Step 4: Test API Directly

Use the curl command above to test the endpoint directly

---

## 6. Quick Fixes

### If Supabase not configured:
```bash
# Add to ECS task definition:
SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

### If Encryption key missing:
```bash
# Add to ECS task definition:
ENCRYPTION_KEY=eaSgpZ4S9aHs_xiW_g__ILQCa-dF8wnVZNhTGX8TdTs=
```

### If Frontend not authenticated:
1. Check browser console for Supabase errors
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Rebuild frontend

---

## 7. Still Not Working?

Share:
1. **Browser console errors** (F12 → Console)
2. **Network tab** (F12 → Network → Look at failed request)
3. **Backend logs** (CloudWatch)
4. **Error message** from the alert



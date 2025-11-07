# Next Steps After Schema Setup ✅

## ✅ Completed
- [x] Database schema created and executed
- [x] All tables, indexes, policies, and triggers are in place

---

## Step 1: Add GitHub Secrets (5 minutes)

Go to: **GitHub → Your Repo → Settings → Secrets and variables → Actions**

### Add these 5 secrets:

**Frontend Secrets:**
1. **`VITE_SUPABASE_URL`**
   - Value: Your Supabase project URL (e.g., `https://mgjlnmlhwuqspctanaik.supabase.co`)

2. **`VITE_SUPABASE_ANON_KEY`**
   - Value: Your Supabase anon/public key (from Settings → API)

**Backend Secrets:**
3. **`SUPABASE_URL`**
   - Value: Same as VITE_SUPABASE_URL

4. **`SUPABASE_SERVICE_ROLE_KEY`**
   - Value: Your Supabase service_role key (from Settings → API) - **KEEP SECRET!**

5. **`SUPABASE_JWT_SECRET`**
   - Value: Get from Supabase → Settings → API → JWT Secret

---

## Step 2: Generate Encryption Key (1 minute)

Run this command to generate an encryption key for API keys:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Copy the output** - you'll need it for Step 3.

---

## Step 3: Update Backend ECS Task Definition (10 minutes)

The backend needs environment variables in AWS ECS:

1. **Go to AWS Console**: https://console.aws.amazon.com/ecs/
2. **Select region**: `us-east-1`
3. **Go to**: ECS → Task Definitions → `tradeeon-backend`
4. **Click**: "Create new revision"
5. **Scroll to**: Container definitions → `tradeeon-backend` → Environment variables
6. **Add these environment variables:**

   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | Your Supabase URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
   | `SUPABASE_JWT_SECRET` | Your JWT secret |
   | `ENCRYPTION_KEY` | The key you generated in Step 2 |
   | `VITE_API_URL` | `https://api.tradeeon.com` (if not already set) |

7. **Click**: "Create" (creates new revision)
8. **Go to**: ECS → Clusters → `tradeeon-cluster` → Services → `tradeeon-backend-service`
9. **Click**: "Update"
10. **Select**: The new task definition revision
11. **Click**: "Update" (this will deploy the new task definition)

**Wait 2-3 minutes** for the service to update.

---

## Step 4: Rebuild Frontend (Automatic or Manual)

After adding GitHub secrets, rebuild the frontend:

### Option A: Automatic (on next push)
- Just push any change to trigger auto-deploy

### Option B: Manual (immediate)
1. **Go to**: GitHub → Actions
2. **Select**: "Deploy Frontend to S3 + CloudFront"
3. **Click**: "Run workflow" → "Run workflow"

**Wait 2-3 minutes** for the build to complete.

---

## Step 5: Test Everything (5 minutes)

1. **Visit**: https://www.tradeeon.com
2. **Test Signup:**
   - Click "Sign Up"
   - Create a new account
   - Should create user in Supabase `public.users` table

3. **Test Sign In:**
   - Sign in with your account
   - Should authenticate successfully

4. **Test Exchange Connection:**
   - Go to Connections page
   - Add Binance API key and secret
   - Click "Connect"
   - Should save to `public.exchange_keys` table (encrypted)

5. **Test Portfolio:**
   - Go to Portfolio page
   - Should fetch real data from Binance

---

## Quick Checklist

- [ ] GitHub Secrets added (5 secrets)
- [ ] Encryption key generated
- [ ] Backend ECS task definition updated
- [ ] Backend service updated and running
- [ ] Frontend rebuilt with Supabase keys
- [ ] Tested signup
- [ ] Tested signin
- [ ] Tested exchange connection
- [ ] Tested portfolio data

---

## Troubleshooting

**If frontend still shows blank:**
- Check GitHub Actions build logs
- Verify secrets are set correctly
- Check browser console (F12) for errors

**If backend errors:**
- Check CloudWatch logs: ECS → Clusters → tradeeon-cluster → Services → tradeeon-backend-service → Logs
- Verify environment variables are set in task definition
- Check that encryption key is correct format

**If authentication fails:**
- Verify `SUPABASE_JWT_SECRET` matches Supabase dashboard
- Check backend logs for auth errors
- Verify RLS policies are enabled

---

## Need Help?

Share:
1. Error message
2. Browser console errors (F12)
3. CloudWatch logs
4. GitHub Actions logs



# Setup Supabase for Production

## Current Status
✅ App loads without Supabase (graceful fallback)
✅ Now need to configure Supabase properly

## Required Supabase Environment Variables

### For Frontend Build:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

### For Backend:
- `SUPABASE_URL` - Same as above
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (secret!)
- `SUPABASE_JWT_SECRET` - JWT secret for token verification

---

## Step 1: Get Supabase Keys

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. **Select your project** (or create one if you don't have it)
3. **Go to Settings → API**
4. **Copy these values:**
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - **KEEP THIS SECRET!**

---

## Step 2: Add to GitHub Secrets

1. **Go to GitHub**: Your repo → Settings → Secrets and variables → Actions
2. **Add these secrets:**

   **For Frontend:**
   - `VITE_SUPABASE_URL` = Your project URL
   - `VITE_SUPABASE_ANON_KEY` = Your anon key

   **For Backend:**
   - `SUPABASE_URL` = Your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = Your service role key
   - `SUPABASE_JWT_SECRET` = Get from Supabase → Settings → API → JWT Secret

---

## Step 3: Verify Database Schema

Make sure your Supabase database has the required tables:

1. **Go to Supabase → SQL Editor**
2. **Run the schema**: `infra/supabase/schema.sql`
3. **Or run migrations**: `infra/supabase/migrations/*.sql`

Required tables:
- `public.users`
- `public.exchange_keys`
- `public.bots`
- `public.alerts`
- etc.

---

## Step 4: Rebuild and Deploy

After adding secrets:

1. **Frontend will auto-rebuild** (on next push or manual trigger)
2. **Backend needs environment variables** in ECS task definition

---

## Step 5: Test

1. **Visit production site**
2. **Try to sign up** - should create user in Supabase
3. **Try to sign in** - should authenticate
4. **Try to connect exchange** - should save to database

---

## Quick Checklist

- [ ] Supabase project created
- [ ] Keys copied from Supabase dashboard
- [ ] GitHub Secrets added (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Backend secrets added (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET)
- [ ] Database schema created
- [ ] Frontend rebuilt
- [ ] Backend environment variables updated
- [ ] Tested signup/signin

---

## Troubleshooting

**If app still shows blank:**
- Check browser console for errors
- Verify secrets are set correctly
- Check GitHub Actions build logs

**If auth doesn't work:**
- Verify SUPABASE_JWT_SECRET matches Supabase dashboard
- Check backend logs for auth errors
- Verify database schema is correct

**If database errors:**
- Run schema.sql in Supabase SQL Editor
- Check RLS (Row Level Security) policies
- Verify service role key has correct permissions



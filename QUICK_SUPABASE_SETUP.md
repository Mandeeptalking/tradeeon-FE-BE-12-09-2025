# Quick Supabase Setup for Production

## ✅ Current Status
- App loads without Supabase (graceful fallback working)
- Now need to add Supabase keys to enable full functionality

---

## Step 1: Get Supabase Keys (2 minutes)

1. **Go to**: https://app.supabase.com
2. **Select your project** (or create new one)
3. **Go to**: Settings → API
4. **Copy these 3 values:**
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key: `eyJhbGc...` (long string)
   - **service_role** key: `eyJhbGc...` (long string) - **KEEP SECRET!**

---

## Step 2: Add GitHub Secrets (3 minutes)

1. **Go to**: GitHub → Your Repo → Settings → Secrets and variables → Actions
2. **Click "New repository secret"**
3. **Add these secrets:**

### Frontend Secrets:
- **Name**: `VITE_SUPABASE_URL`
  - **Value**: Your Supabase project URL

- **Name**: `VITE_SUPABASE_ANON_KEY`
  - **Value**: Your Supabase anon/public key

### Backend Secrets:
- **Name**: `SUPABASE_URL`
  - **Value**: Your Supabase project URL (same as above)

- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
  - **Value**: Your Supabase service_role key

- **Name**: `SUPABASE_JWT_SECRET`
  - **Value**: Get from Supabase → Settings → API → JWT Secret

---

## Step 3: Setup Database Schema (5 minutes)

1. **Go to Supabase**: SQL Editor
2. **Run this SQL** (copy from `infra/supabase/schema.sql`):

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exchange keys table
CREATE TABLE IF NOT EXISTS public.exchange_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'zerodha', 'coinbase', 'kraken')),
    api_key_encrypted TEXT NOT NULL,
    api_secret_encrypted TEXT NOT NULL,
    passphrase_encrypted TEXT,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, exchange)
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own exchange keys" ON public.exchange_keys
    FOR ALL USING (auth.uid() = user_id);
```

3. **Click "Run"**

---

## Step 4: Rebuild Frontend (Automatic)

After adding secrets, the frontend will auto-rebuild on next push, OR:

1. **Go to**: GitHub → Actions
2. **Select**: "Deploy Frontend to S3 + CloudFront"
3. **Click**: "Run workflow" → "Run workflow"

---

## Step 5: Update Backend Environment Variables

The backend needs Supabase env vars in ECS task definition:

1. **Go to AWS Console**: ECS → Task Definitions → tradeeon-backend
2. **Create new revision**
3. **Add environment variables:**
   - `SUPABASE_URL` = Your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY` = Your service role key
   - `SUPABASE_JWT_SECRET` = Your JWT secret
   - `ENCRYPTION_KEY` = Generate one (see below)

4. **Update service** to use new task definition

---

## Step 6: Generate Encryption Key

For encrypting API keys:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Add this as `ENCRYPTION_KEY` in backend environment variables.

---

## Step 7: Test

1. **Visit production site**
2. **Try signup** → Should create user in Supabase
3. **Try signin** → Should authenticate
4. **Try connect exchange** → Should save to database

---

## Quick Checklist

- [ ] Supabase project created
- [ ] Keys copied (URL, anon key, service role key, JWT secret)
- [ ] GitHub Secrets added (5 secrets total)
- [ ] Database schema created
- [ ] Frontend rebuilt (auto or manual)
- [ ] Backend env vars updated in ECS
- [ ] Encryption key generated and added
- [ ] Tested signup/signin

---

## Need Help?

If you get stuck:
1. Share the error message
2. Check browser console (F12)
3. Check GitHub Actions logs
4. Check CloudWatch logs for backend



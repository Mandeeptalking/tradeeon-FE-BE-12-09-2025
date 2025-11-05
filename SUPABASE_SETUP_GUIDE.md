# Supabase Database Setup Guide

## ⚠️ IMPORTANT: Tables Must Be Created

The database schema files exist in the codebase, but **the tables have NOT been created in your Supabase database yet**. You need to run the SQL migrations manually.

---

## 📋 Required Tables

Your DCA bot system requires these tables:

1. ✅ `public.bots` - Bot configurations
2. ✅ `public.bot_runs` - Bot execution runs
3. ✅ `public.order_logs` - Trade order history
4. ✅ `public.positions` - Current open positions
5. ✅ `public.funds` - Account balances

---

## 🚀 Step-by-Step Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click **"SQL Editor"** in the left sidebar

2. **Run the Migration**
   - Copy the entire content of `infra/supabase/migrations/001_initial_schema.sql`
   - Paste it into the SQL Editor
   - Click **"Run"** or press `Ctrl+Enter`

3. **Verify Tables Created**
   - Go to **"Table Editor"** in the left sidebar
   - You should see these tables:
     - `bots`
     - `bot_runs`
     - `order_logs`
     - `positions`
     - `funds`
     - `users`
     - `exchange_keys`
     - `holdings`
     - `signals`
     - `market_data_cache`

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: Direct SQL Connection

```bash
# Using psql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f infra/supabase/migrations/001_initial_schema.sql
```

---

## 🔧 Important: Fix bot_id Data Type

**⚠️ CRITICAL ISSUE**: The migration file defines `bot_id` as `UUID`, but the code generates `bot_id` as **TEXT** (e.g., `"dca_bot_1234567890"`).

### Fix Required:

You need to modify the `bots` and `bot_runs` tables to use `TEXT` instead of `UUID` for `bot_id`:

**Option A: Modify Migration Before Running**

Edit `infra/supabase/migrations/001_initial_schema.sql`:

```sql
-- Change this:
bot_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

-- To this:
bot_id TEXT PRIMARY KEY,
```

**Option B: Run This SQL After Initial Migration**

```sql
-- Fix bots table
ALTER TABLE public.bots 
  ALTER COLUMN bot_id TYPE TEXT;

-- Fix bot_runs foreign key constraint
ALTER TABLE public.bot_runs 
  DROP CONSTRAINT IF EXISTS bot_runs_bot_id_fkey,
  ALTER COLUMN bot_id TYPE TEXT;

ALTER TABLE public.bot_runs 
  ADD CONSTRAINT bot_runs_bot_id_fkey 
  FOREIGN KEY (bot_id) REFERENCES public.bots(bot_id) ON DELETE CASCADE;

-- Fix order_logs foreign key constraint
ALTER TABLE public.order_logs 
  DROP CONSTRAINT IF EXISTS order_logs_bot_id_fkey,
  ALTER COLUMN bot_id TYPE TEXT;

ALTER TABLE public.order_logs 
  ADD CONSTRAINT order_logs_bot_id_fkey 
  FOREIGN KEY (bot_id) REFERENCES public.bots(bot_id) ON DELETE CASCADE;
```

---

## ✅ Verification Checklist

After running the migration, verify:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('bots', 'bot_runs', 'order_logs', 'positions', 'funds');

-- Check bot_id data type
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bots' AND column_name = 'bot_id';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('bots', 'bot_runs', 'order_logs', 'positions', 'funds');

-- Test insert (should work if RLS allows)
INSERT INTO public.bots (bot_id, user_id, name, bot_type, symbol, config)
VALUES ('test_bot_123', '00000000-0000-0000-0000-000000000000', 'Test Bot', 'dca', 'BTCUSDT', '{}')
RETURNING bot_id;
```

---

## 🔐 Row Level Security (RLS) Setup

The migration includes RLS policies. Make sure:

1. **RLS is enabled** on all tables (included in migration)
2. **Policies are created** (included in migration)
3. **Service Role Key is used** for backend operations

RLS policies ensure users can only access their own data when authenticated. For backend operations using the service role key, RLS is bypassed.

---

## 🧪 Test Database Connection

After setup, test the connection:

```python
# Test script
from apps.api.clients.supabase_client import supabase

if supabase:
    # Try to query bots table
    result = supabase.table("bots").select("bot_id").limit(1).execute()
    print("✅ Database connection successful!")
    print(f"Tables exist: {result}")
else:
    print("❌ Supabase not configured. Check environment variables.")
```

---

## 📝 Environment Variables Required

### Step 1: Create `.env` File

**IMPORTANT**: The `.env` file is not included in the repository for security reasons. You need to create it first.

#### On Windows (PowerShell):
```powershell
# Copy the template to create your .env file
Copy-Item "infra\configs\env.template" ".env"
```

#### On Linux/Mac:
```bash
# Copy the template to create your .env file
cp infra/configs/env.template .env
```

#### Or manually:
1. Create a new file named `.env` in the project root directory
2. Copy the content from `infra/configs/env.template`
3. Fill in your actual values

### Step 2: Fill in Your Supabase Credentials

Edit the `.env` file and update these critical values:

```bash
# Database - REQUIRED
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Encryption - REQUIRED (generate a 32-character key)
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

**Where to find Supabase credentials:**
1. Go to Supabase Dashboard → https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy values:
   - `Project URL` → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

**How to generate an encryption key:**
```bash
# Generate a 32-character random string
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Or online: https://generate-secret.vercel.app/32
```

### Step 3: Verify `.env` File Location

Your `.env` file should be at the root of the project:

```
tradeeon-FE-BE-12-09-2025/
├── .env                    ← HERE
├── apps/
├── backend/
├── infra/
│   └── configs/
│       └── env.template    ← Source template
├── README.md
└── ...
```

### ⚠️ Security Warning

- ❌ **NEVER** commit `.env` to git (already in `.gitignore`)
- ❌ **NEVER** share your `.env` file publicly
- ✅ Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- ✅ Generate unique encryption keys for production

---

## 🐛 Common Issues

### Issue: ".env file not found" or "Missing required environment variables"
**Solution**: 
1. Create `.env` file from template: `Copy-Item "infra\configs\env.template" ".env"` (Windows) or `cp infra/configs/env.template .env` (Linux/Mac)
2. Fill in Supabase credentials (see Step 2 above)
3. Verify file is at project root: `tradeeon-FE-BE-12-09-2025/.env`

### Issue: "relation 'public.bots' does not exist"
**Solution**: Run the migration SQL file in Supabase SQL Editor

### Issue: "invalid input syntax for type uuid"
**Solution**: Fix `bot_id` data type from UUID to TEXT (see fix above)

### Issue: "permission denied for table bots"
**Solution**: Check RLS policies and ensure service role key is used for backend

### Issue: "foreign key constraint violation"
**Solution**: Ensure tables are created in order: `bots` → `bot_runs` → `order_logs`

### Issue: "Supabase not configured. Check environment variables"
**Solution**: Verify `.env` file exists and contains `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

---

## 📚 Files Reference

- **Migration File**: `infra/supabase/migrations/001_initial_schema.sql`
- **Full Schema**: `infra/supabase/schema.sql`
- **Database Service**: `apps/bots/db_service.py`

---

## ✅ After Setup

Once tables are created:

1. ✅ Bot creation will persist to database
2. ✅ Bot runs will be tracked
3. ✅ Orders will be logged
4. ✅ Positions will be synced
5. ✅ Balances will be tracked
6. ✅ All CRUD operations will work

The code already handles database gracefully - if tables don't exist, it will:
- Log warnings
- Fall back to in-memory storage
- Continue working (but without persistence)



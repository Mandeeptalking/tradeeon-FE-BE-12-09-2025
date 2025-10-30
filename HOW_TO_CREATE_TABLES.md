# How to Create Database Tables in Supabase

## 🎯 Summary

**You have shared database access, but I cannot automatically create tables.** You need to run the SQL migration in your Supabase Dashboard.

---

## ⚡ Quick Steps (2 Minutes)

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

### Step 2: Run Migration

1. Open the file: `infra/supabase/migrations/001_initial_schema.sql`
2. **Copy ALL the content** (Ctrl+A, Ctrl+C)
3. **Paste** it into the SQL Editor
4. Click **"Run"** or press `Ctrl+Enter`

### Step 3: Verify

You should see all these tables created:
- ✅ `bots`
- ✅ `bot_runs`
- ✅ `order_logs`
- ✅ `positions`
- ✅ `funds`
- ✅ `users`
- ✅ `exchange_keys`
- ✅ `holdings`
- ✅ `signals`
- ✅ `market_data_cache`

---

## 📝 Alternative: Use Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migration
supabase db push
```

---

## ✅ After Tables Are Created

Once tables exist:

1. **Bot creation will persist** to database
2. **Bot history will be tracked**
3. **Orders will be logged**
4. **All CRUD operations will work**
5. **Data survives restarts**

---

## 🔍 Files Ready

All code is ready:
- ✅ Migration SQL: `infra/supabase/migrations/001_initial_schema.sql`
- ✅ Database service: `apps/bots/db_service.py`
- ✅ All endpoints integrated: `apps/api/routers/bots.py`
- ✅ Schema fixed: `bot_id` is TEXT (not UUID)

---

## ⚠️ Important Note

The Supabase Python client (used in the code) **cannot execute raw SQL**. It's designed for CRUD operations via REST API.

To create tables, you must:
- Use the Supabase Dashboard (recommended), OR
- Use Supabase CLI, OR
- Use `psql` directly

---

## 📚 See Also

- `SUPABASE_SETUP_GUIDE.md` - Detailed setup instructions
- `QUICK_START_DATABASE.md` - Quick reference
- `infra/supabase/migrations/001_initial_schema.sql` - The SQL to run

---

**Run the migration SQL manually, and everything will work!** 🚀



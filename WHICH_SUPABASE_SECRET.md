# Which Supabase Secret to Use?

## Answer: **SERVICE ROLE SECRET**

### ✅ Use This:
**Service Role Secret** (also called "Service Role Key")

### ❌ Do NOT Use:
- **Anon Secret** - Has Row Level Security (RLS) restrictions, only for client-side
- **Legacy JWT Secret** - Deprecated, don't use this

---

## Why Service Role Secret?

The backend needs the **Service Role Secret** because:

1. **Full Database Access**
   - Backend needs to read/write to all tables
   - Anon key has RLS restrictions

2. **Bypasses Row Level Security**
   - Service Role Key bypasses RLS policies
   - Required for administrative operations

3. **Server-Side Operations**
   - Backend runs on AWS servers
   - Needs elevated permissions

---

## Where to Find It

### In Supabase Dashboard:

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your project: `mgjlnmlhwuqspctanaik`

2. **Go to Settings:**
   - Click "Settings" (gear icon)
   - Click "API"

3. **Find Service Role Key:**
   - Look for **"service_role"** key (NOT "anon" key)
   - It's labeled as "service_role secret" or "service_role key"
   - It starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

4. **Copy the Key:**
   - Click "Reveal" or "Copy" button
   - Copy the entire JWT token

---

## How to Add to GitHub

1. **Go to GitHub Secrets:**
   - https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/settings/secrets/actions

2. **Add Secret:**
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Paste the Service Role Secret (the long JWT token)

3. **Save**

---

## Quick Checklist

- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Find "service_role" key (NOT "anon")
- [ ] Copy the entire JWT token
- [ ] Add to GitHub as `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Verify it's added (you won't see the value, just the name)

---

## Security Note

⚠️ **Important:** Service Role Key has full database access. Keep it secret!

- ✅ Safe to use in GitHub Secrets (encrypted)
- ✅ Safe to use in server-side code (AWS ECS)
- ❌ Never expose in frontend/client-side code
- ❌ Never commit to Git

---

**Use the SERVICE ROLE SECRET!** 🔑



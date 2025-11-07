# Fix "Cannot read properties of null (reading 'auth')"

## 🔴 Error
"Cannot read properties of null (reading 'auth')"

This means `supabase` is `null` when code tries to access `supabase.auth`.

## ✅ What I Fixed

1. **Fixed `useAlertMarkers.ts`** - Added null check before accessing `supabase.from()`
2. **Added diagnostic logging** - Now shows exactly what Vite is loading

## 🔍 What to Check NOW

### Step 1: Check Browser Console

After restarting dev server, open DevTools (F12) → Console

**You should see TWO messages:**

1. **Vite Environment Check:**
   ```
   🔍 Vite Environment Check: {
     VITE_SUPABASE_URL: "https://mgjlnmlhwuqspctanaik.supabase.co",
     VITE_SUPABASE_ANON_KEY: "SET",
     ...
   }
   ```

2. **Supabase Config:**
   ```
   🔍 Supabase Config: {
     hasUrl: true,
     urlValue: "https://mgjlnmlhwuqspctanaik.supabase.co",
     ...
   }
   ✅ Supabase client initialized successfully
   ```

### Step 2: If You See "MISSING" or "undefined"

**This means .env file isn't being loaded:**

1. **Check file location:**
   - Must be: `apps/frontend/.env`
   - NOT: `.env.local`, root `.env`, etc.

2. **Check file format:**
   ```env
   VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   - No spaces around `=`
   - No quotes
   - No trailing spaces

3. **Clear Vite cache:**
   ```bash
   cd apps/frontend
   Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
   npm run dev
   ```

### Step 3: Check Which File is Causing Error

The error "Cannot read properties of null (reading 'auth')" could be from:
- `useAuth.ts` - Already has null check ✅
- `SignIn.tsx` - Already has null check ✅
- `Signup.tsx` - Already has null check ✅
- `useAlertMarkers.ts` - Just fixed ✅
- `alertsApi.ts` - Already has null check ✅

**Check browser console stack trace** - it will show which file/line is causing the error.

## 🎯 Most Likely Issue

**Environment variables aren't being loaded by Vite.**

**Check the console output:**
- If `VITE_SUPABASE_URL` shows `undefined` → .env file not being read
- If it shows the URL → Supabase client should initialize

**Share the console output** and I can tell you exactly what's wrong!


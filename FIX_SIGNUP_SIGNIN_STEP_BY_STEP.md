# Fix Signup/Signin - Step by Step Guide

## 🔴 Current Issue
"Authentication service is not available. Please check your configuration."

This means Supabase client is `null` in the browser.

## ✅ Step-by-Step Fix

### Step 1: Stop Dev Server
**CRITICAL:** Vite only loads `.env` files when it starts!

1. Go to terminal where dev server is running
2. Press **Ctrl+C** to stop it
3. Make sure it's completely stopped

### Step 2: Verify .env File
Check that `apps/frontend/.env` exists and has:
```env
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:**
- No spaces around `=` sign
- No quotes around values
- File must be in `apps/frontend/` directory (not root)

### Step 3: Start Dev Server
```bash
cd apps/frontend
npm run dev
```

**Wait for it to fully start** - you should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Step 4: Hard Refresh Browser
**CRITICAL:** Browser caches JavaScript!

- **Windows:** Ctrl+Shift+R
- **Mac:** Cmd+Shift+R
- Or: Open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

### Step 5: Check Browser Console
Open DevTools (F12) → Console tab

**You should see:**
```
🔍 Supabase Config: {
  hasUrl: true,
  urlValue: "https://mgjlnmlhwuqspctanaik.supabase.co",
  hasKey: true,
  keyLength: 208,
  ...
}
✅ Supabase client initialized successfully
```

**If you see:**
- `hasUrl: false` or `urlValue: "MISSING"` → .env file not loaded
- `hasKey: false` → .env file not loaded
- `❌ Missing Supabase environment variables` → .env file not loaded

### Step 6: If Still Not Working

#### Check A: .env File Location
File must be: `apps/frontend/.env`

Not:
- `.env.local`
- `.env.production`
- Root directory `.env`

#### Check B: .env File Format
```env
# CORRECT:
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# WRONG:
VITE_SUPABASE_URL = https://...  # Space around =
VITE_SUPABASE_URL="https://..."  # Quotes
```

#### Check C: Dev Server Restart
**MUST restart after any .env changes!**

#### Check D: Browser Cache
Try:
1. Close browser completely
2. Open in incognito/private mode
3. Go to http://localhost:5173
4. Check console

## 🎯 Most Common Issue

**90% of the time:** Dev server wasn't restarted after creating/editing `.env` file.

**Solution:** Stop and restart the dev server!

## 📋 Quick Checklist

- [ ] Dev server is stopped
- [ ] `.env` file exists in `apps/frontend/`
- [ ] `.env` file has correct format (no spaces, no quotes)
- [ ] Dev server restarted
- [ ] Browser hard refreshed (Ctrl+Shift+R)
- [ ] Browser console shows "✅ Supabase client initialized successfully"

## 🆘 Still Not Working?

**Share the browser console output:**
1. Open DevTools (F12)
2. Go to Console tab
3. Copy everything that says "Supabase" or "🔍"
4. Share it with me

This will show exactly what's wrong!


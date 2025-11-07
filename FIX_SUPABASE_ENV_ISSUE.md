# Fix Supabase Environment Variable Issue

## Problem
Error: "Authentication service is not available. Please check your configuration."

## Root Cause
The `.env` file exists with correct variables, but the dev server may not have picked them up, or there might be formatting issues.

## Solution

### Step 1: Verify .env File
Your `.env` file should be in `apps/frontend/.env` and contain:
```env
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTQzMDUsImV4cCI6MjA3Mjk5MDMwNX0.LF1iumCNB4EPJxAJSeTx04V0Tp7SlL7HBfsJVb3RmLU
VITE_API_URL=http://tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com
```

**Important:**
- No spaces around `=`
- No quotes needed
- No trailing spaces
- Each variable on its own line

### Step 2: Restart Dev Server
**Vite only reads `.env` files on startup!**

1. **Stop the dev server** (Ctrl+C in terminal)
2. **Restart it:**
   ```bash
   cd apps/frontend
   npm run dev
   ```
3. **Hard refresh browser** (Ctrl+Shift+R or Ctrl+F5)

### Step 3: Check Browser Console
Open browser DevTools (F12) and check Console tab. You should see:
- ✅ "Supabase Config Check" with all values showing as valid
- ✅ No error messages about missing Supabase

If you see errors, check:
- Are variables prefixed with `VITE_`?
- Are there any typos?
- Are there trailing spaces?

### Step 4: Verify Variables Are Loaded
In browser console, type:
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL)
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY)
```

You should see your values, not `undefined`.

## Common Issues

### Issue 1: Dev Server Not Restarted
**Symptom:** Variables exist but still getting error  
**Fix:** Restart dev server

### Issue 2: Wrong File Location
**Symptom:** Variables not found  
**Fix:** Ensure `.env` is in `apps/frontend/` directory (same level as `package.json`)

### Issue 3: Trailing Spaces
**Symptom:** Variables look correct but validation fails  
**Fix:** Remove any spaces after the `=` sign

### Issue 4: Missing VITE_ Prefix
**Symptom:** Variables not accessible  
**Fix:** All frontend env vars must start with `VITE_`

### Issue 5: Browser Cache
**Symptom:** Old error still showing  
**Fix:** Hard refresh (Ctrl+Shift+R) or clear cache

## Debugging

I've added debug logging to `apps/frontend/src/lib/supabase.ts`. After restarting the dev server, check the browser console for:
- Detailed configuration check
- Specific reason why Supabase isn't initializing
- Helpful error messages

## Quick Fix Checklist

- [ ] `.env` file exists in `apps/frontend/`
- [ ] Variables start with `VITE_`
- [ ] No spaces around `=`
- [ ] No trailing spaces
- [ ] Dev server restarted
- [ ] Browser hard refreshed
- [ ] Check browser console for debug info

## Still Not Working?

1. **Check browser console** for detailed error messages
2. **Verify .env file format** (no quotes, no spaces)
3. **Try creating a new .env file** from scratch
4. **Check if dev server is running** from the correct directory
5. **Verify Supabase project is active** in Supabase dashboard


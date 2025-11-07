# Fix Sign Up / Sign In Issues

## 🔍 Quick Diagnostic Steps

### Step 1: Check Browser Console

Open DevTools (F12) → Console tab and look for:

1. **Supabase Environment Check** - Should show:
   ```
   🔍 Supabase Environment Check: {
     hasUrl: true,
     hasKey: true,
     urlStartsWithHttp: true,
     keyLengthValid: true
   }
   ```

2. **Any Errors** - Look for:
   - "Supabase client not initialized"
   - "Cannot read properties of null (reading 'auth')"
   - Network errors
   - CORS errors

### Step 2: Verify Environment Variables

Check `apps/frontend/.env`:
```env
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**IMPORTANT:** After changing `.env`, you MUST:
1. Stop the dev server (Ctrl+C)
2. Restart it: `npm run dev`
3. Hard refresh browser (Ctrl+Shift+R)

### Step 3: Test Supabase Connection

Open browser console and run:
```javascript
// Check if Supabase is initialized
console.log('Supabase:', window.supabase || 'Not found');

// If you can access it, test connection
import { supabase } from './lib/supabase';
console.log('Supabase client:', supabase);
if (supabase) {
  supabase.auth.getSession().then(console.log);
}
```

## 🚨 Common Issues

### Issue 1: "Supabase client not initialized"

**Cause:** Environment variables not loaded

**Fix:**
1. Verify `.env` file exists in `apps/frontend/`
2. Variables start with `VITE_`
3. Restart dev server
4. Hard refresh browser

### Issue 2: "Cannot read properties of null (reading 'auth')"

**Cause:** Supabase client is `null`

**Fix:**
- Check console for "Supabase Environment Check" output
- Verify environment variables are correct
- Check for typos in `.env` file

### Issue 3: Sign up works but can't sign in

**Cause:** Email confirmation required or password wrong

**Fix:**
- Check Supabase dashboard → Authentication → Users
- Verify email confirmation settings
- Check if user exists

### Issue 4: Network/CORS errors

**Cause:** Supabase URL incorrect or blocked

**Fix:**
- Verify Supabase URL is correct
- Check Supabase dashboard → Settings → API
- Ensure Supabase project is active (not paused)

## 🔧 Quick Fixes

### Fix 1: Force Environment Variable Reload

1. Delete `.env` file
2. Recreate it with correct values
3. Restart dev server
4. Clear browser cache (Ctrl+Shift+Delete)

### Fix 2: Check Supabase Project Status

1. Go to https://supabase.com/dashboard
2. Select your project
3. Check if project is active
4. Verify API keys in Settings → API

### Fix 3: Test Direct Supabase Connection

Create a test file `test-supabase.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <script>
    const supabaseUrl = 'https://mgjlnmlhwuqspctanaik.supabase.co';
    const supabaseKey = 'YOUR_ANON_KEY_HERE';
    
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    // Test signup
    supabase.auth.signUp({
      email: 'test@example.com',
      password: 'test123456'
    }).then(console.log).catch(console.error);
  </script>
</body>
</html>
```

## 📋 Checklist

- [ ] `.env` file exists in `apps/frontend/`
- [ ] Environment variables start with `VITE_`
- [ ] Dev server restarted after `.env` changes
- [ ] Browser hard refreshed (Ctrl+Shift+R)
- [ ] Console shows "Supabase Environment Check" with valid values
- [ ] No errors in browser console
- [ ] Supabase project is active (not paused)
- [ ] API keys are correct in Supabase dashboard

## 🆘 Still Not Working?

1. **Share browser console output** - Copy all errors/warnings
2. **Check Network tab** - Look for failed requests to Supabase
3. **Verify Supabase project** - Make sure it's not paused/deleted
4. **Test with curl** - Verify Supabase API is accessible


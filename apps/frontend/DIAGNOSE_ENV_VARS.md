# Diagnose Environment Variables Not Loading

## 🔴 Issue: "Cannot read properties of null (reading 'auth')"

This means `supabase` is `null`, which means environment variables aren't being loaded.

## 🔍 Step 1: Check Browser Console

Open DevTools (F12) → Console tab

**Look for:**
```
🔍 Supabase Config: { ... }
```

**What to check:**
- `hasUrl`: Should be `true`
- `urlValue`: Should show your Supabase URL, NOT "MISSING"
- `hasKey`: Should be `true`
- `rawEnvUrl`: Should show the URL or `undefined`
- `rawEnvKey`: Should show "SET" or "MISSING"

## 🔍 Step 2: Check .env File Location

**CRITICAL:** File must be exactly here:
```
apps/frontend/.env
```

**NOT:**
- `.env.local`
- `.env.production`
- Root `.env`
- `apps/.env`

## 🔍 Step 3: Check .env File Format

**CORRECT:**
```env
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**WRONG:**
```env
VITE_SUPABASE_URL = https://...  # Space around =
VITE_SUPABASE_URL="https://..."  # Quotes
VITE_SUPABASE_URL=https://...    # Trailing space
```

## 🔍 Step 4: Verify Dev Server Restart

1. **Stop dev server completely:**
   - Press Ctrl+C
   - Wait until terminal shows prompt
   - Make sure it's fully stopped

2. **Start dev server:**
   ```bash
   cd apps/frontend
   npm run dev
   ```

3. **Wait for it to fully start:**
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ```

4. **Hard refresh browser:**
   - Ctrl+Shift+R (Windows)
   - Cmd+Shift+R (Mac)

## 🔍 Step 5: Check Vite is Reading .env

Add this to `apps/frontend/src/main.tsx` temporarily:

```typescript
console.log('ENV CHECK:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
});
```

If both show `undefined`, Vite isn't reading the .env file.

## 🚨 Common Issues

### Issue 1: File in Wrong Location
**Fix:** Move `.env` to `apps/frontend/.env`

### Issue 2: Wrong File Name
**Fix:** Must be exactly `.env` (not `.env.local`)

### Issue 3: Dev Server Not Restarted
**Fix:** Stop and restart completely

### Issue 4: Browser Cache
**Fix:** Hard refresh (Ctrl+Shift+R) or use incognito mode

### Issue 5: Vite Cache
**Fix:** Delete `.vite` folder and restart:
```bash
cd apps/frontend
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
npm run dev
```

## 📋 Quick Test

After restarting, check browser console. You should see:
```
🔍 Supabase Config: {
  hasUrl: true,
  urlValue: "https://mgjlnmlhwuqspctanaik.supabase.co",
  hasKey: true,
  ...
}
✅ Supabase client initialized successfully
```

If you see `hasUrl: false` or `urlValue: "MISSING"`, the .env file isn't being loaded.


# Fix: Frontend Using Wrong API URL

## Issue
Frontend was defaulting to `http://localhost:8000` instead of using the production API at `https://api.tradeeon.com`.

## Root Cause
The `.env` file has `VITE_API_URL=https://api.tradeeon.com` set, but:
1. Frontend dev server might not have been restarted after setting the env variable
2. Vite needs to be restarted to pick up `.env` changes

## Solution

### Step 1: Verify .env File
Check `apps/frontend/.env` contains:
```
VITE_API_URL=https://api.tradeeon.com
```

### Step 2: Restart Frontend Dev Server
Vite only reads `.env` files on startup, so you must restart:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
cd apps/frontend
npm run dev
```

### Step 3: Verify in Browser
Open browser console (F12) and check:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

Should show: `https://api.tradeeon.com`

### Step 4: Check Network Requests
1. Open DevTools → Network tab
2. Click "Start" on a bot
3. Check the request URL - should be `https://api.tradeeon.com/bots/...`

## If Still Not Working

### Check Build vs Dev
- **Development**: Uses `.env` file (needs restart)
- **Production Build**: Uses `.env.production` file

### Create .env.production if needed:
```bash
# apps/frontend/.env.production
VITE_API_URL=https://api.tradeeon.com
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_key
```

### Verify CORS on Production Backend
Make sure `https://api.tradeeon.com` allows requests from your frontend domain:
- Check `CORS_ORIGINS` environment variable on backend
- Should include your frontend domain (e.g., `https://www.tradeeon.com`)

## Testing

After restarting, test the connection:
```javascript
// In browser console
fetch('https://api.tradeeon.com/health')
  .then(r => r.json())
  .then(console.log)
```

Should return: `{"status":"ok","timestamp":...,"database":"connected"}`


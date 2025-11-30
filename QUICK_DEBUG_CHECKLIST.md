# Quick Debugging Checklist

## 1. Check Backend is Running
Open browser and go to: `http://localhost:8000/health`

**Expected:** You should see JSON like:
```json
{"status": "ok", "database": "connected", ...}
```

**If not working:**
- Start backend: `cd apps/api && python -m uvicorn apps.api.main:app --reload --port 8000`
- Check if port 8000 is already in use

## 2. Check Frontend API URL
Open browser DevTools (F12) → Console tab, type:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

**Expected:** `http://localhost:8000` (or your backend URL)

**If wrong:**
- Check `apps/frontend/.env` file
- Should have: `VITE_API_URL=http://localhost:8000`
- Restart frontend dev server

## 3. Check Network Requests
1. Open DevTools (F12) → Network tab
2. Click "Start" button on bot
3. Look for request to `/bots/dca-bots/{id}/start-paper`

**Check:**
- **Request URL**: Should be `http://localhost:8000/bots/dca-bots/...`
- **Status Code**: 
  - 200 = Success
  - 401 = Not authenticated (login first)
  - 500 = Server error (check backend logs)
  - CORS error = Backend CORS not configured

## 4. Check Browser Console
Look for errors:
- **CORS errors**: "No 'Access-Control-Allow-Origin' header"
- **Network errors**: "Failed to fetch"
- **Auth errors**: "401 Unauthorized"

## 5. Check Backend Logs
When you click "Start", backend should log:
- Request received
- Bot start attempt
- Any errors with full stack trace

## Common Issues & Fixes

### "Failed to fetch" or Network Error
**Cause:** Backend not running or wrong URL
**Fix:** 
1. Start backend server
2. Check `VITE_API_URL` in frontend `.env`

### CORS Error
**Cause:** Backend doesn't allow frontend origin
**Fix:**
1. Check `CORS_ORIGINS` in backend environment
2. Should include `http://localhost:5173`
3. Restart backend

### 401 Unauthorized
**Cause:** Not logged in or token expired
**Fix:**
1. Make sure you're logged in
2. Check Supabase configuration
3. Try logging out and back in

### 500 Internal Server Error
**Cause:** Backend error (check logs)
**Fix:**
1. Check backend console/logs for error details
2. The error message should now be more descriptive
3. Look for import errors, database errors, etc.

## Quick Test Commands

```bash
# Test backend health
curl http://localhost:8000/health

# Test with Python
python diagnose_connection.py

# Check if backend is running
netstat -ano | findstr :8000
```

## Still Not Working?

1. **Share the error message** from browser console
2. **Share the network request details** (URL, status, response)
3. **Share backend logs** when you click Start
4. **Check if backend is actually running** on port 8000


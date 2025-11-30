# Frontend-Backend Connection Debugging Guide

## Quick Diagnostic Checklist

### 1. Check Backend is Running
```bash
# Test backend health endpoint
curl http://localhost:8000/health

# Or in browser:
# http://localhost:8000/health
```
**Expected:** JSON response with status "ok"

### 2. Check Frontend API URL Configuration
```bash
# Check if VITE_API_URL is set
# In frontend directory:
cat .env
# or
cat .env.local
```

**Should contain:**
```
VITE_API_URL=http://localhost:8000
```

### 3. Check CORS Configuration
Backend should allow requests from frontend origin:
- Development: `http://localhost:5173`
- Production: Your frontend domain

### 4. Check Browser Console
Open browser DevTools (F12) and check:
- **Console tab**: Look for errors
- **Network tab**: 
  - Check if requests are being made
  - Check request URL (is it correct?)
  - Check response status codes
  - Check CORS errors (red requests)

### 5. Check Backend Logs
Look for:
- Request received logs
- Error messages
- CORS errors

## Common Issues

### Issue 1: Backend Not Running
**Symptoms:**
- Network tab shows "Failed to fetch" or connection errors
- Health endpoint doesn't respond

**Fix:**
```bash
cd apps/api
python -m uvicorn apps.api.main:app --reload --port 8000
```

### Issue 2: Wrong API URL
**Symptoms:**
- Requests going to wrong URL
- 404 errors

**Fix:**
- Check `VITE_API_URL` in frontend `.env` file
- Should be `http://localhost:8000` for local development
- Should be your backend URL for production

### Issue 3: CORS Errors
**Symptoms:**
- Browser console shows: "CORS policy: No 'Access-Control-Allow-Origin' header"
- Network tab shows OPTIONS request failing

**Fix:**
- Check `CORS_ORIGINS` in backend environment
- Should include frontend origin (e.g., `http://localhost:5173`)

### Issue 4: Authentication Issues
**Symptoms:**
- 401 Unauthorized errors
- "Authentication required" messages

**Fix:**
- Make sure user is logged in
- Check if JWT token is being sent in Authorization header
- Check Supabase configuration

### Issue 5: Network/Firewall
**Symptoms:**
- Connection timeout
- "Network error"

**Fix:**
- Check firewall settings
- Check if ports are open
- Try accessing backend directly in browser

## Step-by-Step Debugging

### Step 1: Test Backend Directly
```bash
# Test health endpoint
curl http://localhost:8000/health

# Test with authentication (if needed)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/bots/
```

### Step 2: Test from Frontend
1. Open browser DevTools (F12)
2. Go to Network tab
3. Click "Start" button on bot
4. Look for the request:
   - What URL is it going to?
   - What's the status code?
   - What's the response?

### Step 3: Check Environment Variables
**Frontend (.env):**
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_key
```

**Backend (.env):**
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_key
CORS_ORIGINS=http://localhost:5173,https://www.tradeeon.com
```

### Step 4: Check Browser Console
Look for:
- JavaScript errors
- Network errors
- CORS errors
- Authentication errors

### Step 5: Check Backend Logs
Look for:
- Request received
- Error stack traces
- Import errors
- Database connection errors

## Diagnostic Script

Run the diagnostic script:
```bash
python diagnose_connection.py
```

This will check:
- Backend health
- CORS configuration
- API endpoint accessibility
- Environment variables

## Quick Fixes

### If Backend Not Accessible:
1. Start backend: `uvicorn apps.api.main:app --reload --port 8000`
2. Check if port 8000 is in use: `netstat -ano | findstr :8000`
3. Try different port if needed

### If CORS Errors:
1. Add frontend origin to `CORS_ORIGINS` in backend
2. Restart backend
3. Clear browser cache

### If Wrong API URL:
1. Check frontend `.env` file
2. Restart frontend dev server
3. Hard refresh browser (Ctrl+Shift+R)

### If Authentication Fails:
1. Check if user is logged in
2. Check Supabase configuration
3. Check JWT token in Network tab

## Still Not Working?

1. **Check browser console** - Most errors show up here
2. **Check network tab** - See actual requests/responses
3. **Check backend logs** - See what backend receives
4. **Test endpoints directly** - Use curl or Postman
5. **Check environment variables** - Make sure they're set correctly


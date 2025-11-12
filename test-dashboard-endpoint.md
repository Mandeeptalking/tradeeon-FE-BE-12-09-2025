# Test Dashboard Endpoint - Step by Step

## ✅ Backend Health Check Passed
The `/health` endpoint returned: `{status: 'ok', timestamp: 1762967982, database: 'connected'}`

This means:
- ✅ Backend is running
- ✅ Database is connected
- ✅ Network connectivity is working

## Next: Test Dashboard Endpoint

### Step 1: Test Dashboard Endpoint (Without Auth - Should Return 401)
In browser console, run:
```javascript
fetch('https://api.tradeeon.com/dashboard/summary', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
  .then(r => {
    console.log('Status:', r.status);
    console.log('Headers:', Object.fromEntries(r.headers.entries()));
    return r.text();
  })
  .then(data => {
    console.log('Response:', data);
  })
  .catch(err => {
    console.error('Error:', err);
  });
```

**Expected:** Should return `401 Unauthorized` (not 400 or CORS error)

### Step 2: Test CORS Preflight (OPTIONS Request)
In browser console, run:
```javascript
fetch('https://api.tradeeon.com/dashboard/summary', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://www.tradeeon.com',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'authorization,content-type,x-csrf-token'
  }
})
  .then(r => {
    console.log('OPTIONS Status:', r.status);
    console.log('CORS Headers:', {
      'access-control-allow-origin': r.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': r.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': r.headers.get('access-control-allow-headers'),
      'access-control-allow-credentials': r.headers.get('access-control-allow-credentials')
    });
    return r.text();
  })
  .then(data => console.log('OPTIONS Response:', data))
  .catch(err => console.error('OPTIONS Error:', err));
```

**Expected:** Should return `200 OK` with proper CORS headers

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Refresh the dashboard page
3. Look for the `/dashboard/summary` request
4. Check:
   - **Request Method:** Should be `GET` (after OPTIONS)
   - **Status Code:** What is it? (401 = auth needed, 400 = CORS issue, 404 = route not found)
   - **Request Headers:** Does it include `Authorization: Bearer ...`?
   - **Response Headers:** Check CORS headers

### Step 4: Check Authentication Token
In browser console, run:
```javascript
// Check if user is authenticated
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session ? 'Exists' : 'None');
console.log('Token:', session?.access_token ? session.access_token.substring(0, 20) + '...' : 'None');
```

## Possible Issues:

### Issue 1: CORS Preflight Failing (400 Bad Request)
**Symptom:** OPTIONS request returns 400
**Solution:** Backend needs redeployment with CORS fix

### Issue 2: No Authentication Token
**Symptom:** Request doesn't include `Authorization` header
**Solution:** User needs to sign in again

### Issue 3: Token Invalid/Expired
**Symptom:** Returns 401 with "Invalid token" message
**Solution:** User needs to sign in again

### Issue 4: Route Not Found (404)
**Symptom:** Returns 404
**Solution:** Backend router not properly registered

## Quick Fix Commands (if backend needs redeployment):

```bash
# SSH into Lightsail
ssh ubuntu@18.136.45.140

# Pull latest code
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main

# Restart container
sudo docker restart tradeeon-backend

# Wait a few seconds, then check logs
sudo docker logs tradeeon-backend --tail 50
```


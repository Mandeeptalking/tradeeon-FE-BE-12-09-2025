# Diagnose Dashboard "Failed to fetch" Error

## Quick Diagnosis Steps

### 1. Check if Backend is Running
SSH into Lightsail and check:
```bash
ssh ubuntu@18.136.45.140
sudo docker ps
```

Expected output should show `tradeeon-backend` container running.

### 2. Check Backend Logs
```bash
sudo docker logs tradeeon-backend --tail 50
```

Look for:
- Errors related to `/dashboard/summary`
- Errors related to Futures position check
- Import errors
- Database connection errors

### 3. Test Backend Endpoint Directly
From Lightsail:
```bash
curl -X GET https://api.tradeeon.com/dashboard/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Or test locally:
```bash
curl http://localhost:8000/dashboard/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t  # Test Nginx configuration
```

### 5. Check Backend Health
```bash
curl https://api.tradeeon.com/health
```

Should return: `{"status":"ok",...}`

## Common Issues and Fixes

### Issue 1: Backend Not Deployed
**Symptom**: Container not running or old code
**Fix**: Deploy backend:
```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
sudo docker stop tradeeon-backend
sudo docker rm tradeeon-backend
sudo docker build --no-cache -t tradeeon-backend .
sudo docker run -d --name tradeeon-backend --restart unless-stopped -p 8000:8000 --env-file apps/api/.env tradeeon-backend
```

### Issue 2: Backend Crashed Due to Code Error
**Symptom**: Container exits immediately after start
**Fix**: Check logs for specific error:
```bash
sudo docker logs tradeeon-backend
```

Common errors:
- Import error: Missing module
- Syntax error: Check Python code
- Database error: Check Supabase connection

### Issue 3: Futures Position Check Causing Error
**Symptom**: Backend crashes when checking Futures positions
**Fix**: The `/fapi/v2/positionRisk` endpoint might require different permissions. Check Binance API key permissions.

### Issue 4: CORS Error
**Symptom**: Browser console shows CORS error
**Fix**: Check backend CORS configuration in `apps/api/main.py`:
```python
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in cors_origins_str.split(",")]
```

Ensure `https://www.tradeeon.com` is in `CORS_ORIGINS`.

### Issue 5: Authentication Error
**Symptom**: 401 Unauthorized
**Fix**: 
- Check if user is signed in
- Check `SUPABASE_JWT_SECRET` in backend `.env`
- Verify JWT token is being sent in request headers

## Next Steps

1. **Deploy Backend** (most likely fix):
   ```bash
   ssh ubuntu@18.136.45.140
   cd ~/tradeeon-FE-BE-12-09-2025
   ./deploy-backend-lightsail.sh
   ```

2. **Check Browser Console**:
   - Open DevTools (F12)
   - Go to Network tab
   - Try loading dashboard
   - Check the failed request
   - Look at Response and Headers

3. **Check Backend Logs**:
   ```bash
   sudo docker logs -f tradeeon-backend
   ```
   Then try loading dashboard in browser and watch logs.

## Expected Behavior After Fix

- Dashboard should load and show:
  - USDT Balance
  - Total Assets
  - Active Trades count
  - Account Status (SPOT and/or FUTURES)
  - Assets list
  - Active trades list


# Test Backend Connection - Debug Steps

## Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for errors when dashboard loads
4. Check **Network** tab for the `/dashboard/summary` request
5. Look at the request details:
   - Status code
   - Response headers
   - Request headers
   - Error message

## Step 2: Test Backend Directly

### From Browser Console:
```javascript
// Test if backend is reachable
fetch('https://api.tradeeon.com/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Test dashboard endpoint (will fail without auth, but shows if backend is up)
fetch('https://api.tradeeon.com/dashboard/summary', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
  .then(r => {
    console.log('Status:', r.status);
    return r.text();
  })
  .then(console.log)
  .catch(console.error);
```

### From Terminal (if backend is on Lightsail):
```bash
# SSH into Lightsail
ssh ubuntu@18.136.45.140

# Check if container is running
sudo docker ps | grep tradeeon-backend

# Check logs
sudo docker logs tradeeon-backend --tail 50

# Test health endpoint locally
curl http://localhost:8000/health

# Test dashboard endpoint locally (will need auth token)
curl http://localhost:8000/dashboard/summary
```

## Step 3: Check CORS Preflight

The OPTIONS request should succeed. If it returns 400, the backend needs redeployment.

## Step 4: Verify Environment Variables

Check if `VITE_API_URL` is set in production:
- Should be `https://api.tradeeon.com`
- Check GitHub Actions secrets
- Check build output

## Common Issues:

1. **Backend not deployed** → Redeploy backend
2. **CORS preflight failing** → Backend needs CORS fix (already in code, needs deployment)
3. **API URL wrong** → Check environment variables
4. **Backend container not running** → Check Docker container status
5. **Network/firewall issue** → Check Lightsail firewall rules


# Connection Testing Checklist

## Pre-requisites
- [ ] Signed in to https://www.tradeeon.com
- [ ] Binance API key has IP `52.77.227.148` whitelisted
- [ ] Binance API key has required permissions:
  - Enable Reading (spot)
  - Enable Spot & Margin trading
  - Optional: Enable Futures trading

## Test Credentials
- **API Key:** `aQxqn57sU9rgvkNumm12dD4NvIYpWlxGEguwfX4bN6AyY5bmTS29OWH2rEJA38sL`
- **Secret Key:** `0R7lGW9KIoIQ5JqiqATO5AqF6GJMFqQTXk3bA8sF0eQkR3pOpUEFlAFzXIRTp7ct`

## Testing Steps

1. **Navigate to Connections Page**
   - URL: https://www.tradeeon.com/app/connections
   - Should see: Whitelist IP card, permissions list, "Connect Exchange" button

2. **Open Connection Drawer**
   - Click "Connect Exchange" button
   - Select "Binance" from dropdown

3. **Enter Credentials**
   - Step 1: Enter API Key
   - Step 2: Enter Secret Key
   - Step 3: (Optional) Add nickname

4. **Test Connection**
   - Click "Test Connection" button
   - Expected: Success message showing account type (SPOT, FUTURES, or both)
   - If error: Check error message and verify IP whitelist/permissions

5. **Save Connection**
   - If test successful, click "Save Connection"
   - Expected: Connection appears in "Your Connections" section
   - If error "Not Found": POST route not registered, run deployment script again

## Troubleshooting

### Error: "Not Found"
- **Cause:** POST `/connections` route not registered
- **Fix:** Run `./deploy-backend-lightsail.sh` on Lightsail

### Error: "Invalid API credentials"
- **Cause:** Wrong API key/secret or missing permissions
- **Fix:** Verify credentials and Binance API permissions

### Error: "IP not whitelisted"
- **Cause:** IP `52.77.227.148` not whitelisted in Binance
- **Fix:** Add IP to Binance API key restrictions

### Error: "Authentication service not configured"
- **Cause:** Backend missing JWT secret
- **Fix:** Verify `SUPABASE_JWT_SECRET` in backend `.env` file


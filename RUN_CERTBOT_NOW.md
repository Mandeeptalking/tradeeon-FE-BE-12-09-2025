# Run This Command in Lightsail Terminal

```bash
sudo certbot --nginx -d api.tradeeon.com --non-interactive --agree-tos --email admin@tradeeon.com --redirect
```

**What this does:**
- Obtains SSL certificate from Let's Encrypt
- Configures Nginx for HTTPS
- Sets up HTTP → HTTPS redirect
- Reloads Nginx automatically

**After running, test:**
```bash
curl https://api.tradeeon.com/health
```

**Expected output:**
```json
{"status":"ok","timestamp":...,"database":"connected"}
```

If you see this, SSL is working! ✅


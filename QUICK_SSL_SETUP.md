# Quick SSL Setup Commands for Lightsail

## Run These Commands on Lightsail Instance

**Via Browser SSH (Easiest):**
1. Go to Lightsail Console → Your Instance → Click SSH button
2. Copy and paste these commands one by one:

```bash
# Update system
sudo apt update

# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (will prompt for email)
sudo certbot --nginx -d api.tradeeon.com

# When prompted:
# - Email: admin@tradeeon.com (or your email)
# - Agree to terms: Y
# - Redirect HTTP to HTTPS: 2 (Yes, redirect)

# Verify Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Test HTTPS
curl https://api.tradeeon.com/health
```

## One-Liner (Copy All at Once)

```bash
sudo apt update && sudo apt install certbot python3-certbot-nginx -y && sudo certbot --nginx -d api.tradeeon.com --non-interactive --agree-tos --email admin@tradeeon.com --redirect && sudo nginx -t && sudo systemctl reload nginx && echo "✅ SSL Setup Complete! Test: curl https://api.tradeeon.com/health"
```

## After SSL Setup

1. **Update Backend CORS (if needed):**
   ```bash
   cd ~/tradeeon-FE-BE-12-09-2025/apps/api
   nano .env
   # Ensure: CORS_ORIGINS=https://www.tradeeon.com,https://tradeeon.com
   sudo docker restart tradeeon-backend
   ```

2. **Test Connection:**
   - Visit: https://www.tradeeon.com
   - Open DevTools → Console
   - Should work now!


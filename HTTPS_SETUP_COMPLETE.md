# Complete HTTPS Setup Guide

## ✅ Frontend Updated

**Completed:**
- ✅ Frontend API URL updated to `https://api.tradeeon.com`
- ✅ Frontend rebuilt with HTTPS API URL
- ✅ Frontend deployed to S3
- ✅ CloudFront cache invalidated

## ⏳ Backend SSL Setup Required

**Next Step:** Set up SSL certificate on Lightsail instance

### Option 1: Use AWS Lightsail Browser SSH (Easiest)

1. **Go to Lightsail Console:**
   - https://lightsail.aws.amazon.com/
   - Click on your instance

2. **Open Browser SSH:**
   - Click the blue square icon (SSH in browser)
   - Terminal will open

3. **Run SSL Setup:**
   ```bash
   # Copy and paste this entire script:
   sudo apt update
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d api.tradeeon.com --non-interactive --agree-tos --email admin@tradeeon.com --redirect
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Test:**
   ```bash
   curl https://api.tradeeon.com/health
   ```

### Option 2: Use Provided Script

**Upload and run the script:**

```bash
# On Lightsail instance
cd ~
# Copy setup-ssl-lightsail.sh content and create file
nano setup-ssl-lightsail.sh
# Paste the script content, save (Ctrl+X, Y, Enter)
chmod +x setup-ssl-lightsail.sh
./setup-ssl-lightsail.sh
```

### Option 3: Manual Steps

```bash
# 1. Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# 2. Get certificate
sudo certbot --nginx -d api.tradeeon.com

# Follow prompts:
# - Email: admin@tradeeon.com
# - Agree to terms: Yes
# - Redirect HTTP to HTTPS: Yes

# 3. Verify and reload
sudo nginx -t
sudo systemctl reload nginx

# 4. Test
curl https://api.tradeeon.com/health
```

## 📋 After SSL Setup

1. **Update Backend CORS (if needed):**
   ```bash
   # On Lightsail instance, check .env file
   cd ~/tradeeon-FE-BE-12-09-2025/apps/api
   nano .env
   
   # Ensure CORS_ORIGINS includes:
   CORS_ORIGINS=https://www.tradeeon.com,https://tradeeon.com
   
   # Restart backend
   sudo docker restart tradeeon-backend
   ```

2. **Test Connection:**
   - Visit: https://www.tradeeon.com
   - Open DevTools → Console
   - Should see no mixed content errors
   - API calls should work

## Current Status

- ✅ Frontend: Updated and deployed with HTTPS API URL
- ⏳ Backend: SSL setup needed (run certbot on Lightsail)
- ⏳ Connection: Will work after SSL setup

## Files Created

- `setup-ssl-lightsail.sh` - Complete SSL setup script
- `apps/frontend/.env` - Updated with HTTPS API URL


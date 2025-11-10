# Fix Nginx 404 Error

## Problem
Nginx is running but returning 404, which means:
- ✅ Nginx is installed and running
- ✅ Port 80 is accessible
- ❌ Configuration isn't routing correctly

## Solution: Check and Fix Configuration

Run these commands to diagnose and fix:

```bash
# 1. Check if your config file exists
sudo ls -la /etc/nginx/sites-available/tradeeon-backend

# 2. Check if it's enabled
sudo ls -la /etc/nginx/sites-enabled/

# 3. View the current config
sudo cat /etc/nginx/sites-available/tradeeon-backend

# 4. Check Nginx error logs
sudo tail -20 /var/log/nginx/error.log

# 5. Test Nginx configuration
sudo nginx -t
```

## If Config File Doesn't Exist or is Wrong:

```bash
# Create/edit the config file
sudo nano /etc/nginx/sites-available/tradeeon-backend
```

**Paste this EXACT configuration:**

```nginx
server {
    listen 80;
    server_name api.tradeeon.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

## Enable Site and Reload:

```bash
# Enable the site
sudo ln -sf /etc/nginx/sites-available/tradeeon-backend /etc/nginx/sites-enabled/

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx

# Or restart if reload doesn't work
sudo systemctl restart nginx
```

## Verify Backend is Running:

```bash
# Check if backend container is running
sudo docker ps

# Test backend directly on port 8000
curl http://localhost:8000/health
```

## Test Again:

```bash
curl http://localhost/health
curl http://api.tradeeon.com/health
```

## If Still Getting 404:

Check if default site is interfering:

```bash
# List all enabled sites
sudo ls -la /etc/nginx/sites-enabled/

# Make sure only tradeeon-backend is enabled
# Remove any default or other configs
sudo rm /etc/nginx/sites-enabled/default

# Reload
sudo systemctl reload nginx
```


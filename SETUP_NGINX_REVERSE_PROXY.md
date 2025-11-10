# Fix: Domain Access Issue - Port 80 vs Port 8000

## Current Status ✅

- ✅ Docker container is running
- ✅ Backend is accessible on port 8000 locally
- ✅ Backend is accessible via static IP on port 8000: `http://18.136.45.140:8000`
- ❌ Domain `api.tradeeon.com` fails because it defaults to port 80

## Problem

When you access `http://api.tradeeon.com/health`, it tries to connect on **port 80** (default HTTP port), but your backend is running on **port 8000**.

## Solution: Set Up Nginx Reverse Proxy

Nginx will listen on port 80 and forward requests to your backend on port 8000.

### Step 1: Install Nginx

Run these commands in your Lightsail SSH terminal:

```bash
# Update package list
sudo apt update

# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Step 2: Configure Nginx

```bash
# Create Nginx configuration file
sudo nano /etc/nginx/sites-available/tradeeon-backend
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name api.tradeeon.com;

    # Logging
    access_log /var/log/nginx/tradeeon-backend-access.log;
    error_log /var/log/nginx/tradeeon-backend-error.log;

    # Proxy settings
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### Step 3: Enable the Site

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/tradeeon-backend /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### Step 4: Update Lightsail Firewall

Add port 80 to the firewall:

1. Go to Lightsail console → `tradeeon-backend` instance
2. Click **Networking** tab
3. Click **Add rule**
4. Configure:
   - **Application**: HTTP
   - **Protocol**: TCP
   - **Port**: 80
   - **Source**: Anywhere (0.0.0.0/0)
5. Click **Save**

### Step 5: Test

```bash
# Test locally on the instance
curl http://localhost/health

# Test via static IP
curl http://18.136.45.140/health

# Test via domain (after DNS propagates)
curl http://api.tradeeon.com/health
```

**Expected response:**
```json
{"status":"ok","timestamp":1762772622,"database":"connected"}
```

---

## Alternative: Quick Test (Without Nginx)

If you just want to test quickly, you can access the domain with port 8000:

```bash
curl http://api.tradeeon.com:8000/health
```

But for production, you should use Nginx on port 80.

---

## Troubleshooting

### Nginx won't start:
```bash
# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check if port 80 is already in use
sudo netstat -tlnp | grep 80
```

### Backend not accessible:
```bash
# Check if backend container is running
sudo docker ps

# Check backend logs
sudo docker logs tradeeon-backend

# Test backend directly
curl http://localhost:8000/health
```

### DNS not resolving:
```bash
# Check DNS resolution
nslookup api.tradeeon.com

# Should show: 18.136.45.140
```

---

## Summary

1. ✅ Backend is running correctly on port 8000
2. ⚠️ Domain defaults to port 80, which has nothing listening
3. ✅ Solution: Install Nginx to proxy port 80 → port 8000
4. ✅ Update firewall to allow port 80

After setting up Nginx, `http://api.tradeeon.com/health` will work without specifying the port!


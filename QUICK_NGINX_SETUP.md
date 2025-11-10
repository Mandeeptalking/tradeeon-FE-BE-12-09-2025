# Quick Nginx Setup - Copy and Run These Commands

## Step 1: Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

## Step 2: Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/tradeeon-backend
```

**Paste this configuration:**

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

## Step 3: Enable Site and Test

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/tradeeon-backend /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# If test passes, start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

## Step 4: Test

```bash
# Test locally
curl http://localhost/health

# Test via IP
curl http://18.136.45.140/health

# Test via domain
curl http://api.tradeeon.com/health
```

All should return: `{"status":"ok","timestamp":...,"database":"connected"}`


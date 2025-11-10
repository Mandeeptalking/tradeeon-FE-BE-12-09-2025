# Fixed Nginx Configuration

## Step 1: Exit nano and Install Nginx

If you're still in nano:
- Press `Ctrl+X`
- Press `N` (to discard changes)

Then install Nginx:

```bash
sudo apt update
sudo apt install -y nginx
```

## Step 2: Create Configuration File (Fixed Syntax)

After Nginx is installed, create the config:

```bash
sudo nano /etc/nginx/sites-available/tradeeon-backend
```

**Paste this COMPLETE configuration (fixed syntax):**

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

**Important:** Make sure the last line ends with `_for;` (not just `_forwarded`)

**Save:** `Ctrl+X`, then `Y`, then `Enter`

## Step 3: Enable and Start

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tradeeon-backend /etc/nginx/sites-enabled/

# Remove default
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

## Step 4: Test

```bash
curl http://localhost/health
curl http://18.136.45.140/health
curl http://api.tradeeon.com/health
```


#!/bin/bash
# SSL Setup Script for api.tradeeon.com on Lightsail
# Run this script on the Lightsail instance via SSH

set -e  # Exit on error

echo "=========================================="
echo "  SSL Setup for api.tradeeon.com"
echo "=========================================="
echo ""

# Step 1: Update system
echo "Step 1: Updating system packages..."
sudo apt update

# Step 2: Install certbot
echo ""
echo "Step 2: Installing certbot..."
sudo apt install certbot python3-certbot-nginx -y

# Step 3: Check current Nginx config
echo ""
echo "Step 3: Checking current Nginx configuration..."
if [ ! -f /etc/nginx/sites-available/tradeeon-backend ]; then
    echo "⚠️  Nginx config not found. Creating it..."
    sudo tee /etc/nginx/sites-available/tradeeon-backend > /dev/null <<EOF
server {
    listen 80;
    server_name api.tradeeon.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    sudo ln -sf /etc/nginx/sites-available/tradeeon-backend /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
fi

# Step 4: Get SSL certificate
echo ""
echo "Step 4: Getting SSL certificate from Let's Encrypt..."
echo "This will prompt for email - you can use: admin@tradeeon.com"
sudo certbot --nginx -d api.tradeeon.com --non-interactive --agree-tos --email admin@tradeeon.com --redirect

# Step 5: Verify Nginx config
echo ""
echo "Step 5: Verifying Nginx configuration..."
sudo nginx -t

# Step 6: Reload Nginx
echo ""
echo "Step 6: Reloading Nginx..."
sudo systemctl reload nginx

# Step 7: Test HTTPS
echo ""
echo "Step 7: Testing HTTPS endpoint..."
sleep 2
curl -I https://api.tradeeon.com/health || echo "⚠️  HTTPS test failed - may need a few minutes to propagate"

echo ""
echo "=========================================="
echo "  SSL Setup Complete!"
echo "=========================================="
echo ""
echo "✅ Certificate installed"
echo "✅ Nginx configured for HTTPS"
echo "✅ HTTP redirects to HTTPS"
echo ""
echo "Test: curl https://api.tradeeon.com/health"


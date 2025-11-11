#!/bin/bash
# SSL Setup Script for api.tradeeon.com

echo "=== Installing Certbot ==="
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

echo ""
echo "=== Getting SSL Certificate ==="
sudo certbot --nginx -d api.tradeeon.com --non-interactive --agree-tos --email admin@tradeeon.com --redirect

echo ""
echo "=== Verifying Nginx Configuration ==="
sudo nginx -t

echo ""
echo "=== Reloading Nginx ==="
sudo systemctl reload nginx

echo ""
echo "=== Testing HTTPS ==="
curl -I https://api.tradeeon.com/health

echo ""
echo "âœ… SSL Setup Complete!"

#!/bin/bash
# Redis Installation Script for AWS Lightsail
# Run this on your Lightsail server

set -e

echo "=========================================="
echo "Redis Installation for Tradeeon Backend"
echo "=========================================="

# Update package list
echo "Updating package list..."
sudo apt-get update

# Install Redis
echo "Installing Redis..."
sudo apt-get install -y redis-server

# Start Redis service
echo "Starting Redis service..."
sudo systemctl start redis-server

# Enable Redis to start on boot
echo "Enabling Redis to start on boot..."
sudo systemctl enable redis-server

# Test Redis connection
echo "Testing Redis connection..."
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is running!"
else
    echo "❌ Redis failed to start"
    exit 1
fi

# Show Redis status
echo ""
echo "Redis Status:"
sudo systemctl status redis-server --no-pager -l

# Show Redis info
echo ""
echo "Redis Info:"
redis-cli INFO server | head -5

echo ""
echo "=========================================="
echo "✅ Redis installation complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Set REDIS_URL environment variable:"
echo "   export REDIS_URL='redis://localhost:6379'"
echo ""
echo "2. Install Python Redis library:"
echo "   pip install redis"
echo ""
echo "3. Restart your backend service"
echo ""



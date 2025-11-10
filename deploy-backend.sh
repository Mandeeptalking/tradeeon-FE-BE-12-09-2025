#!/bin/bash
# Quick deployment script - Run this AFTER connecting via SSH
# Copy and paste entire script into Lightsail SSH terminal

echo "=========================================="
echo "Tradeeon Backend Deployment Script"
echo "=========================================="
echo ""

# Step 1: Update system
echo "Step 1: Updating system..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install Docker
echo ""
echo "Step 2: Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Step 3: Install Docker Compose
echo ""
echo "Step 3: Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Step 4: Install Git
echo ""
echo "Step 4: Installing Git..."
sudo apt install git -y

# Step 5: Clone repository
echo ""
echo "Step 5: Cloning repository..."
cd ~
if [ -d "tradeeon-FE-BE-12-09-2025" ]; then
  echo "Repository already exists, pulling latest changes..."
  cd tradeeon-FE-BE-12-09-2025
  git pull
else
  git clone https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025.git
  cd tradeeon-FE-BE-12-09-2025
fi

# Step 6: Create .env file
echo ""
echo "Step 6: Creating .env file..."
cd apps/api
cat > .env << 'EOF'
SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQxNDMwNSwiZXhwIjoyMDcyOTkwMzA1fQ.AgWM1MZCPGQHgpZ4749KtgAOOGQZoI7wFvBqp_2p8Ng
SUPABASE_JWT_SECRET=b5xpWCI1kSA9+zuP39rNJ3RIJiwHa86gGsL6mBcUpl6u6VxFaTowQcHoNpJhrYTacxAdsHBosS+k88xHlNdXyQ==
ENCRYPTION_KEY=TIqxctfuLihJNhsVO7XBErFkdWiTM4N968T-YKsKij0=
CORS_ORIGINS=https://www.tradeeon.com,https://tradeeon.com
EOF

echo ".env file created!"

# Step 7: Build Docker image
echo ""
echo "Step 7: Building Docker image..."
echo "This may take a few minutes..."
docker build -t tradeeon-backend .

# Step 8: Stop and remove old container if exists
echo ""
echo "Step 8: Cleaning up old containers..."
docker stop tradeeon-backend 2>/dev/null || true
docker rm tradeeon-backend 2>/dev/null || true

# Step 9: Run container
echo ""
echo "Step 9: Starting container..."
docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file .env \
  tradeeon-backend

# Step 10: Wait a few seconds
echo ""
echo "Waiting for container to start..."
sleep 5

# Step 11: Check status
echo ""
echo "=========================================="
echo "Deployment Status:"
echo "=========================================="
docker ps | grep tradeeon-backend

echo ""
echo "Testing health endpoint..."
curl -s http://localhost:8000/health | head -20

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check logs: docker logs tradeeon-backend"
echo "2. Test from outside: curl http://18.136.45.140:8000/health"
echo "3. After DNS propagates: curl http://api.tradeeon.com/health"
echo ""
echo "Note: You may need to logout and login again for docker group to work"
echo "If docker commands fail, run: newgrp docker"


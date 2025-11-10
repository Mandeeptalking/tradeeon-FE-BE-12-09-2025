#!/bin/bash
# Quick Lightsail Setup Commands
# Run these commands step by step

echo "========================================"
echo "Lightsail Setup - Quick Commands"
echo "========================================"
echo ""

echo "Step 1: Create Lightsail Instance"
echo "Run this command or use AWS Console:"
echo "aws lightsail create-instances --instance-names tradeeon-backend --availability-zone ap-southeast-1a --blueprint-id ubuntu_22_04 --bundle-id nano_2_0 --region ap-southeast-1"
echo ""

echo "Step 2: Create and Attach Static IP"
echo "aws lightsail allocate-static-ip --static-ip-name tradeeon-backend-ip --region ap-southeast-1"
echo "aws lightsail attach-static-ip --static-ip-name tradeeon-backend-ip --instance-name tradeeon-backend --region ap-southeast-1"
echo ""

echo "Step 3: Get Static IP Address"
echo "aws lightsail get-static-ip --static-ip-name tradeeon-backend-ip --region ap-southeast-1 --query 'staticIp.ipAddress' --output text"
echo ""

echo "Step 4: Update Route 53 (replace YOUR_STATIC_IP with actual IP)"
echo "aws route53 change-resource-record-sets --hosted-zone-id Z08494351HC32A4M6XAOH --change-batch file://route53-update.json"
echo ""

echo "Step 5: Connect to instance"
echo "ssh ubuntu@YOUR_STATIC_IP"
echo ""

echo "Step 6: On Lightsail instance, run:"
echo "sudo apt update && sudo apt upgrade -y"
echo "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
echo "sudo usermod -aG docker ubuntu"
echo "sudo curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)' -o /usr/local/bin/docker-compose"
echo "sudo chmod +x /usr/local/bin/docker-compose"
echo ""

echo "Step 7: Clone repository"
echo "cd ~ && git clone https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025.git"
echo "cd tradeeon-FE-BE-12-09-2025/apps/api"
echo ""

echo "Step 8: Create .env file with environment variables"
echo "nano .env"
echo ""

echo "Step 9: Build and run Docker container"
echo "docker build -t tradeeon-backend ."
echo "docker run -d --name tradeeon-backend --restart unless-stopped -p 8000:8000 --env-file .env tradeeon-backend"
echo ""

echo "Step 10: Test"
echo "curl http://localhost:8000/health"
echo "curl http://api.tradeeon.com/health"


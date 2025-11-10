# AWS Lightsail Setup Guide - Tradeeon Backend Migration

## Overview
This guide helps you migrate your Tradeeon backend from AWS ECS to AWS Lightsail.

## Prerequisites
- ✅ Route 53 domain: `tradeeon.com`
- ✅ Route 53 hosted zone: `Z08494351HC32A4M6XAOH`
- ✅ AWS account access
- ✅ Backend code ready to deploy

---

## Step 1: Create Lightsail Instance

### Option A: Via AWS Console
1. Go to **AWS Lightsail** console
2. Click **Create instance**
3. Choose:
   - **Platform**: Linux/Unix
   - **Blueprint**: Ubuntu 22.04 LTS (or latest)
   - **Instance plan**: Choose based on your needs:
     - **$5/month**: 512 MB RAM, 1 vCPU (for testing)
     - **$10/month**: 1 GB RAM, 1 vCPU (recommended minimum)
     - **$20/month**: 2 GB RAM, 1 vCPU (better performance)
   - **Instance name**: `tradeeon-backend`
   - **Availability zone**: `ap-southeast-1a` (Singapore)
4. Click **Create instance**

### Option B: Via AWS CLI
```bash
aws lightsail create-instances \
  --instance-names tradeeon-backend \
  --availability-zone ap-southeast-1a \
  --blueprint-id ubuntu_22_04 \
  --bundle-id nano_2_0 \
  --region ap-southeast-1
```

---

## Step 2: Get Static IP and Attach to Instance

### Via Console:
1. Go to **Networking** → **Static IPs**
2. Click **Create static IP**
3. Attach to `tradeeon-backend` instance
4. **Note the IP address** (e.g., `54.255.xxx.xxx`)

### Via CLI:
```bash
# Create static IP
aws lightsail allocate-static-ip \
  --static-ip-name tradeeon-backend-ip \
  --region ap-southeast-1

# Attach to instance
aws lightsail attach-static-ip \
  --static-ip-name tradeeon-backend-ip \
  --instance-name tradeeon-backend \
  --region ap-southeast-1

# Get the IP address
aws lightsail get-static-ip \
  --static-ip-name tradeeon-backend-ip \
  --region ap-southeast-1 \
  --query "staticIp.ipAddress" \
  --output text
```

---

## Step 3: Update Route 53 DNS Record

### Update A Record for `api.tradeeon.com`:

```bash
# Get your static IP first
STATIC_IP=$(aws lightsail get-static-ip --static-ip-name tradeeon-backend-ip --region ap-southeast-1 --query "staticIp.ipAddress" --output text)

# Update Route 53 A record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z08494351HC32A4M6XAOH \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.tradeeon.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$STATIC_IP'"}]
      }
    }]
  }'
```

**Or via Console:**
1. Go to **Route 53** → **Hosted zones** → `tradeeon.com`
2. Find or create A record for `api.tradeeon.com`
3. Set value to your Lightsail static IP
4. TTL: 300 seconds
5. Save

---

## Step 4: Connect to Lightsail Instance

### Via Browser (Lightsail Console):
1. Go to your instance
2. Click **Connect using SSH** (opens browser-based terminal)

### Via SSH:
```bash
# Download SSH key from Lightsail console (if using key pair)
# Or use Lightsail's built-in SSH

# Connect
ssh ubuntu@YOUR_STATIC_IP

# Or if you have the key file
ssh -i ~/.ssh/lightsail-key.pem ubuntu@YOUR_STATIC_IP
```

---

## Step 5: Install Dependencies on Lightsail

Once connected to your Lightsail instance, run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y

# Install Python (if needed for scripts)
sudo apt install python3 python3-pip -y

# Logout and login again for docker group to take effect
exit
```

---

## Step 6: Clone and Deploy Backend

```bash
# Clone repository
cd ~
git clone https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025.git
cd tradeeon-FE-BE-12-09-2025

# Create .env file with your environment variables
nano apps/api/.env
```

**Add these environment variables:**
```env
SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQxNDMwNSwiZXhwIjoyMDcyOTkwMzA1fQ.AgWM1MZCPGQHgpZ4749KtgAOOGQZoI7wFvBqp_2p8Ng
SUPABASE_JWT_SECRET=b5xpWCI1kSA9+zuP39rNJ3RIJiwHa86gGsL6mBcUpl6u6VxFaTowQcHoNpJhrYTacxAdsHBosS+k88xHlNdXyQ==
ENCRYPTION_KEY=TIqxctfuLihJNhsVO7XBErFkdWiTM4N968T-YKsKij0=
CORS_ORIGINS=https://www.tradeeon.com,https://tradeeon.com
```

---

## Step 7: Build and Run Docker Container

```bash
# Navigate to backend directory
cd apps/api

# Build Docker image
docker build -t tradeeon-backend .

# Run container
docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file .env \
  tradeeon-backend

# Or use Docker Compose (if you have docker-compose.yml)
docker-compose up -d
```

---

## Step 8: Configure Lightsail Firewall

1. Go to **Lightsail** → Your instance → **Networking** tab
2. Click **Add rule**
3. Add:
   - **Application**: Custom
   - **Protocol**: TCP
   - **Port**: 8000
   - **Source**: Anywhere (0.0.0.0/0)
4. Save

---

## Step 9: Test Backend

```bash
# From your local machine or CloudShell
curl http://YOUR_STATIC_IP:8000/health

# Or test via domain (after DNS propagates)
curl http://api.tradeeon.com/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "database": "connected"
}
```

---

## Step 10: Set Up SSL Certificate (HTTPS)

### Option A: Lightsail Load Balancer + SSL
1. Go to **Lightsail** → **Networking** → **Load balancers**
2. Create load balancer
3. Attach your instance
4. Add SSL certificate (Lightsail can generate one)
5. Update Route 53 to point to load balancer DNS

### Option B: Let's Encrypt with Certbot (Free)
```bash
# On Lightsail instance
sudo apt install certbot python3-certbot-nginx -y

# If using Nginx as reverse proxy
sudo certbot --nginx -d api.tradeeon.com

# Or standalone (if no web server)
sudo certbot certonly --standalone -d api.tradeeon.com
```

### Option C: Use Nginx as Reverse Proxy
```bash
# Install Nginx
sudo apt install nginx -y

# Create config
sudo nano /etc/nginx/sites-available/tradeeon-backend
```

**Nginx config:**
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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tradeeon-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d api.tradeeon.com
```

---

## Step 11: Update Frontend API URL

Update your frontend to use the new API URL:

**Environment variable:**
```env
VITE_API_URL=https://api.tradeeon.com
```

Or if using HTTP initially:
```env
VITE_API_URL=http://api.tradeeon.com
```

---

## Step 12: Set Up Auto-Deployment (Optional)

### Using GitHub Actions:
Create `.github/workflows/deploy-lightsail.yml`:

```yaml
name: Deploy to Lightsail

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Lightsail
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.LIGHTSAIL_HOST }}
          username: ubuntu
          key: ${{ secrets.LIGHTSAIL_SSH_KEY }}
          script: |
            cd ~/tradeeon-FE-BE-12-09-2025
            git pull
            cd apps/api
            docker-compose down
            docker-compose up -d --build
```

---

## Step 13: Monitor and Maintain

### Check logs:
```bash
# Docker logs
docker logs tradeeon-backend -f

# System logs
sudo journalctl -u docker -f
```

### Restart service:
```bash
docker restart tradeeon-backend
```

### Update application:
```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull
cd apps/api
docker-compose up -d --build
```

---

## Cost Comparison

### ECS Fargate (Previous):
- ECS Fargate: ~$15-30/month
- ALB: ~$16/month
- NAT Gateway: ~$32/month
- **Total: ~$63-78/month**

### Lightsail (New):
- Lightsail Instance ($10/month): $10/month
- Static IP: Free
- Data Transfer: Included (1 TB)
- **Total: ~$10/month**

**Savings: ~$53-68/month** 🎉

---

## Troubleshooting

### Backend not accessible:
1. Check firewall rules in Lightsail
2. Verify Docker container is running: `docker ps`
3. Check logs: `docker logs tradeeon-backend`
4. Verify port 8000 is open: `sudo netstat -tlnp | grep 8000`

### DNS not resolving:
1. Wait 5-10 minutes for DNS propagation
2. Check Route 53 record: `dig api.tradeeon.com`
3. Verify static IP is attached to instance

### SSL issues:
1. Ensure domain points to Lightsail IP
2. Check certificate expiration: `sudo certbot certificates`
3. Renew if needed: `sudo certbot renew`

---

## Next Steps

1. ✅ Create Lightsail instance
2. ✅ Get static IP and attach
3. ✅ Update Route 53 A record
4. ✅ Deploy backend application
5. ✅ Configure SSL/HTTPS
6. ✅ Test API endpoints
7. ✅ Update frontend API URL
8. ✅ Set up monitoring/alerts (optional)

---

## Quick Reference Commands

```bash
# Connect to Lightsail
ssh ubuntu@YOUR_STATIC_IP

# Check Docker status
docker ps
docker logs tradeeon-backend

# Restart backend
docker restart tradeeon-backend

# Update code
cd ~/tradeeon-FE-BE-12-09-2025
git pull
cd apps/api
docker-compose up -d --build

# Check health
curl http://localhost:8000/health
curl https://api.tradeeon.com/health
```


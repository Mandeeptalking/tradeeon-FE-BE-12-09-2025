# Next Steps After Lightsail Instance Creation

## ✅ Completed
- Instance Name: `tradeeon-backend`
- Status: Running
- Public IPv4: `54.179.220.148`
- Location: Singapore, Zone A (ap-southeast-1a)
- Specs: 1 GB RAM, 2 vCPUs, 40 GB SSD

## 📋 Next Steps

### Step 1: Create Static IP (IMPORTANT!)
**Why:** The current IP (`54.179.220.148`) will change if you stop/restart the instance. Static IP stays the same.

**Via Console:**
1. In Lightsail console, click **"Networking"** in the left menu
2. Click **"Static IPs"** tab
3. Click **"Create static IP"**
4. Select **"tradeeon-backend"** instance
5. Name it: `tradeeon-backend-ip`
6. Click **"Create"**
7. **Note the static IP address** (will be shown after creation)

**Via CLI (CloudShell):**
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

# Get the static IP address
aws lightsail get-static-ip \
  --static-ip-name tradeeon-backend-ip \
  --region ap-southeast-1 \
  --query "staticIp.ipAddress" \
  --output text
```

### Step 2: Update Route 53 DNS Record
**After you get the static IP**, update Route 53:

**Via Console:**
1. Go to **Route 53** → **Hosted zones** → `tradeeon.com`
2. Find or create A record for `api.tradeeon.com`
3. Set value to your **static IP address**
4. TTL: 300 seconds
5. Save

**Via CLI (CloudShell):**
```bash
# Replace YOUR_STATIC_IP with the actual static IP from Step 1
STATIC_IP="YOUR_STATIC_IP_HERE"

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

### Step 3: Configure Lightsail Firewall
1. In Lightsail console, click on **"tradeeon-backend"** instance
2. Go to **"Networking"** tab
3. Click **"Add rule"**
4. Add:
   - **Application**: Custom
   - **Protocol**: TCP
   - **Port**: 8000
   - **Source**: Anywhere (0.0.0.0/0)
5. Click **"Save"**

### Step 4: Connect to Instance and Deploy Backend

**Connect via SSH:**
- Click the blue square icon with arrow on the instance card (SSH in browser)
- Or use SSH from terminal: `ssh ubuntu@YOUR_STATIC_IP`

**Once connected, run these commands:**

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

# Logout and login again for docker group
exit
```

**Reconnect and clone repository:**

```bash
# Clone repository
cd ~
git clone https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025.git
cd tradeeon-FE-BE-12-09-2025/apps/api

# Create .env file
nano .env
```

**Add these environment variables to .env:**
```env
SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQxNDMwNSwiZXhwIjoyMDcyOTkwMzA1fQ.AgWM1MZCPGQHgpZ4749KtgAOOGQZoI7wFvBqp_2p8Ng
SUPABASE_JWT_SECRET=b5xpWCI1kSA9+zuP39rNJ3RIJiwHa86gGsL6mBcUpl6u6VxFaTowQcHoNpJhrYTacxAdsHBosS+k88xHlNdXyQ==
ENCRYPTION_KEY=TIqxctfuLihJNhsVO7XBErFkdWiTM4N968T-YKsKij0=
CORS_ORIGINS=https://www.tradeeon.com,https://tradeeon.com
```

**Save and exit nano:** `Ctrl+X`, then `Y`, then `Enter`

**Build and run Docker container:**

```bash
# Build Docker image
docker build -t tradeeon-backend .

# Run container
docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file .env \
  tradeeon-backend

# Check if running
docker ps

# Check logs
docker logs tradeeon-backend
```

### Step 5: Test Backend

```bash
# From Lightsail instance
curl http://localhost:8000/health

# From your local machine (after DNS propagates, wait 5-10 minutes)
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

## Quick Reference

**Current Instance IP:** `54.179.220.148` (temporary - will change on restart)
**Static IP:** (Create one in Step 1)
**Route 53 Zone:** `Z08494351HC32A4M6XAOH`
**Domain:** `api.tradeeon.com`

---

## Priority Actions Now:
1. ⚠️ **Create Static IP** (do this first!)
2. Update Route 53 with static IP
3. Configure firewall (port 8000)
4. Deploy backend code


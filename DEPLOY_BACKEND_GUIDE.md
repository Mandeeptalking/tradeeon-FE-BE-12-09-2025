# Step-by-Step: Configure Lightsail Firewall & Deploy Backend

## Part 1: Configure Lightsail Firewall (Open Port 8000)

### Via Lightsail Console:

1. **Go to your instance:**
   - In AWS Lightsail console, click on **"tradeeon-backend"** instance card

2. **Open Networking tab:**
   - Click on the **"Networking"** tab at the top of the instance details page

3. **Add firewall rule:**
   - Scroll down to **"Firewall"** section
   - Click **"Add rule"** button

4. **Configure the rule:**
   - **Application**: Select **"Custom"** from dropdown
   - **Protocol**: Select **"TCP"**
   - **Port or port range**: Enter **`8000`**
   - **Source**: Select **"Anywhere (0.0.0.0/0)"** or **"Anywhere IPv4"**
   - **Description** (optional): "Backend API port"

5. **Save:**
   - Click **"Save"** button
   - You should see the new rule appear in the firewall list

### Verify Firewall Rule:
- You should see a rule like: `TCP | 8000 | 0.0.0.0/0`
- Status should show as active

---

## Part 2: Deploy Backend Code (SSH into Instance)

### Step 1: Connect to Lightsail Instance

**Option A: Via Lightsail Console (Easiest - Browser SSH)**
1. In Lightsail console, click on **"tradeeon-backend"** instance
2. Click the **blue square icon with arrow** (SSH in browser) at the top right
3. A browser-based terminal will open - you're now connected!

**Option B: Via SSH from Terminal**
```bash
# If you have the SSH key downloaded
ssh -i ~/.ssh/lightsail-key.pem ubuntu@18.136.45.140

# Or if using Lightsail's default key
ssh ubuntu@18.136.45.140
```

**Note:** If you see a password prompt, Lightsail uses key-based authentication. Use the browser SSH option instead.

---

### Step 2: Install Dependencies

Once connected, run these commands one by one:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group (so you can run docker without sudo)
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y

# Verify Docker installation
docker --version
docker-compose --version
```

**Important:** After adding user to docker group, you need to logout and login again for it to take effect:

```bash
# Logout
exit
```

**Then reconnect** (click SSH button again or reconnect via SSH), and continue:

---

### Step 3: Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025.git

# Navigate to backend directory
cd tradeeon-FE-BE-12-09-2025/apps/api

# List files to verify
ls -la
```

---

### Step 4: Create Environment Variables File

```bash
# Create .env file
nano .env
```

**In the nano editor, paste these lines:**

```env
SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQxNDMwNSwiZXhwIjoyMDcyOTkwMzA1fQ.AgWM1MZCPGQHgpZ4749KtgAOOGQZoI7wFvBqp_2p8Ng
SUPABASE_JWT_SECRET=b5xpWCI1kSA9+zuP39rNJ3RIJiwHa86gGsL6mBcUpl6u6VxFaTowQcHoNpJhrYTacxAdsHBosS+k88xHlNdXyQ==
ENCRYPTION_KEY=TIqxctfuLihJNhsVO7XBErFkdWiTM4N968T-YKsKij0=
CORS_ORIGINS=https://www.tradeeon.com,https://tradeeon.com
```

**To save and exit nano:**
1. Press `Ctrl + X`
2. Press `Y` (to confirm)
3. Press `Enter` (to save)

**Verify the file was created:**
```bash
cat .env
```

---

### Step 5: Build Docker Image

```bash
# Make sure you're in the apps/api directory
pwd
# Should show: /home/ubuntu/tradeeon-FE-BE-12-09-2025/apps/api

# Build Docker image
docker build -t tradeeon-backend .

# This will take a few minutes - wait for it to complete
# You should see "Successfully built" and "Successfully tagged" messages
```

---

### Step 6: Run Docker Container

```bash
# Run the container in detached mode (background)
docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file .env \
  tradeeon-backend

# Check if container is running
docker ps

# You should see tradeeon-backend in the list with status "Up"
```

---

### Step 7: Check Logs and Test

```bash
# View container logs
docker logs tradeeon-backend

# Follow logs in real-time (Ctrl+C to exit)
docker logs -f tradeeon-backend

# Test the health endpoint locally
curl http://localhost:8000/health
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

### Step 8: Test from Outside (After DNS Propagates)

Wait 5-10 minutes for DNS to propagate, then test:

```bash
# From your local machine or CloudShell
curl http://api.tradeeon.com/health

# Or test directly with IP
curl http://18.136.45.140:8000/health
```

---

## Troubleshooting

### Container won't start:
```bash
# Check logs
docker logs tradeeon-backend

# Check if port 8000 is already in use
sudo netstat -tlnp | grep 8000

# Remove old container and try again
docker rm -f tradeeon-backend
docker run -d --name tradeeon-backend --restart unless-stopped -p 8000:8000 --env-file .env tradeeon-backend
```

### Can't access from outside:
1. Verify firewall rule is added (port 8000)
2. Check container is running: `docker ps`
3. Test locally: `curl http://localhost:8000/health`
4. Check DNS: `nslookup api.tradeeon.com`

### Update code later:
```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull
cd apps/api
docker stop tradeeon-backend
docker rm tradeeon-backend
docker build -t tradeeon-backend .
docker run -d --name tradeeon-backend --restart unless-stopped -p 8000:8000 --env-file .env tradeeon-backend
```

---

## Quick Reference Commands

```bash
# Check container status
docker ps

# View logs
docker logs tradeeon-backend

# Restart container
docker restart tradeeon-backend

# Stop container
docker stop tradeeon-backend

# Start container
docker start tradeeon-backend

# Remove container
docker rm -f tradeeon-backend

# Test health
curl http://localhost:8000/health
```


# Fix: Install Docker on Lightsail Instance

## Problem
Docker is not installed, so `docker` commands are failing.

## Solution: Install Docker

Run these commands in your Lightsail SSH terminal **one by one**:

```bash
# Step 1: Update system
sudo apt update

# Step 2: Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Step 3: Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Step 4: Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Step 5: Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Step 6: Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Step 7: Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Step 8: Verify Docker installation
docker --version
sudo docker ps
```

**Important:** After adding user to docker group, you need to logout and login again:

```bash
exit
```

**Then reconnect via SSH** (click the SSH button again in Lightsail console), and continue:

---

## After Docker is Installed

Once Docker is working, continue with deployment:

```bash
# Navigate to project directory
cd ~/tradeeon-FE-BE-12-09-2025/apps/api

# Verify you're in the right directory
pwd
ls -la

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

# View logs
docker logs tradeeon-backend

# Test health endpoint
curl http://localhost:8000/health
```

---

## Quick One-Liner (Alternative Docker Installation)

If the above doesn't work, try this simpler method:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
exit
```

Then reconnect and verify:
```bash
docker --version
docker ps
```


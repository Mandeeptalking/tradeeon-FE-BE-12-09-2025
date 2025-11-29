# Fix Docker Permission Denied Error

## Problem
```
permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock
```

## Solution 1: Add User to Docker Group (Recommended)

This allows you to run Docker commands without `sudo`:

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply the group changes (you need to log out and back in, or use newgrp)
newgrp docker

# Verify it works
docker ps
```

**Important:** After running `usermod`, you need to:
- Log out and log back in, OR
- Run `newgrp docker` in your current session

## Solution 2: Use Sudo (Quick Fix)

If you can't add yourself to the docker group, use `sudo`:

```bash
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
sudo docker compose build --no-cache
sudo docker compose restart
sudo docker compose logs -f tradeeon-backend
```

## Solution 3: Fix Docker Socket Permissions (If above doesn't work)

```bash
# Check current permissions
ls -l /var/run/docker.sock

# Fix permissions (if needed)
sudo chmod 666 /var/run/docker.sock

# Or add your user to docker group (better)
sudo usermod -aG docker $USER
newgrp docker
```

## Full Deployment with Permissions Fixed

```bash
# 1. Add user to docker group (if not already done)
sudo usermod -aG docker $USER
newgrp docker

# 2. Verify Docker works
docker ps

# 3. Navigate to project
cd ~/tradeeon-FE-BE-12-09-2025

# 4. Pull latest code
git pull origin main

# 5. Build (remove version from docker-compose.yml if you see the warning)
docker compose build --no-cache

# 6. Restart services
docker compose restart

# 7. Check status
docker compose ps

# 8. View logs
docker compose logs -f tradeeon-backend
```

## Fix docker-compose.yml Warning

The warning about `version` being obsolete - you can remove it from docker-compose.yml:

```bash
# Edit docker-compose.yml and remove the version line (usually at the top)
nano docker-compose.yml
# OR
vi docker-compose.yml

# Remove the line that says:
# version: '3.8'  (or similar)
```

## Verify Everything Works

```bash
# Check Docker is accessible
docker ps

# Check docker compose works
docker compose version

# Check your containers
docker compose ps

# Check logs
docker compose logs tradeeon-backend
```


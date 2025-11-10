# Fix: Dockerfile is in Root Directory

## Problem
You're trying to build from `apps/api` directory, but the Dockerfile is in the **root directory**.

## Solution: Build from Root Directory

Run these commands in your Lightsail SSH terminal:

```bash
# Go to root directory
cd ~/tradeeon-FE-BE-12-09-2025

# Verify Dockerfile exists
ls -la Dockerfile

# Verify requirements.txt exists
ls -la requirements.txt

# Build Docker image from root directory
sudo docker build -t tradeeon-backend .

# After build completes, run container
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend

# Check status
sudo docker ps

# View logs
sudo docker logs tradeeon-backend

# Test health endpoint
curl http://localhost:8000/health
```

## Important Notes:

1. **Build from root**: `cd ~/tradeeon-FE-BE-12-09-2025` (not `apps/api`)
2. **Use sudo**: Since docker group isn't active yet, use `sudo docker` commands
3. **Env file path**: Use `--env-file apps/api/.env` (relative to root)

## After Container is Running:

Once it's working, you can fix the docker group issue:

```bash
# Logout and reconnect
exit
```

Then reconnect via SSH and run:
```bash
newgrp docker
```

After that, you won't need `sudo` anymore.


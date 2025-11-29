# Deploy Backend to Lightsail - Step by Step

## Prerequisites Check

First, check what's installed:

```bash
# Check Docker version
docker --version

# Check if docker compose (newer) is available
docker compose version

# Check if docker-compose (older) is available
docker-compose --version
```

## Option 1: Use Docker Compose (Newer - Recommended)

If you have Docker 20.10+, use the built-in `docker compose` (without hyphen):

```bash
cd ~/tradeeon-FE-BE-12-09-2025

# Pull latest code
git pull origin main

# Build without cache
docker compose build --no-cache

# Restart services
docker compose restart

# View logs
docker compose logs -f tradeeon-backend
```

## Option 2: Install docker-compose (Older)

If you need the older `docker-compose` command:

```bash
# Install docker-compose
sudo apt update
sudo apt install docker-compose -y

# Then use it
cd ~/tradeeon-FE-BE-12-09-2025
git pull origin main
docker-compose build --no-cache
docker-compose restart
docker-compose logs -f tradeeon-backend
```

## Option 3: Install Docker Compose Plugin (Recommended)

Install the Docker Compose plugin (newer method):

```bash
# Install Docker Compose plugin
sudo apt update
sudo apt install docker-compose-plugin -y

# Then use docker compose (without hyphen)
docker compose version
```

## Full Deployment Steps

```bash
# 1. Navigate to project directory
cd ~/tradeeon-FE-BE-12-09-2025

# 2. Pull latest code
git pull origin main

# 3. Check docker-compose.yml exists
ls -la docker-compose.yml

# 4. Build (try both commands)
# Try newer first:
docker compose build --no-cache

# OR if that doesn't work:
docker-compose build --no-cache

# 5. Restart services
docker compose restart
# OR
docker-compose restart

# 6. Check status
docker compose ps
# OR
docker-compose ps

# 7. View logs
docker compose logs -f tradeeon-backend
# OR
docker-compose logs -f tradeeon-backend
```

## Troubleshooting

### If docker-compose.yml doesn't exist:
Check if it's named differently:
```bash
ls -la | grep -i compose
ls -la | grep -i docker
```

### If services don't restart:
```bash
# Stop services
docker compose down
# OR
docker-compose down

# Start services
docker compose up -d
# OR
docker-compose up -d
```

### Check Docker is running:
```bash
sudo systemctl status docker
sudo systemctl start docker  # if not running
```

### Check container status:
```bash
docker ps -a
docker logs <container-name>
```


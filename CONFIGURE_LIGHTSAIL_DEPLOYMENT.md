# Configure Lightsail Deployment Secrets

The GitHub Actions workflow for deploying to Lightsail requires three secrets to be configured in your GitHub repository.

## Required Secrets

1. **LIGHTSAIL_SSH_PRIVATE_KEY** - Your SSH private key for accessing the Lightsail instance
2. **LIGHTSAIL_USER** - SSH username (usually `ubuntu` for Ubuntu instances)
3. **LIGHTSAIL_HOST** - IP address or hostname of your Lightsail instance

## How to Configure Secrets

### Step 1: Get Your SSH Private Key

If you don't have an SSH key pair yet, generate one:

```bash
ssh-keygen -t rsa -b 4096 -C "github-actions-lightsail" -f ~/.ssh/lightsail_deploy
```

**Important:** Keep the private key (`lightsail_deploy`) secure and never commit it to the repository.

### Step 2: Add Public Key to Lightsail Instance

Copy the public key to your Lightsail instance:

```bash
# Copy public key to Lightsail
ssh-copy-id -i ~/.ssh/lightsail_deploy.pub ubuntu@YOUR_LIGHTSAIL_IP
```

Or manually add it to `~/.ssh/authorized_keys` on the Lightsail instance:

```bash
cat ~/.ssh/lightsail_deploy.pub | ssh ubuntu@YOUR_LIGHTSAIL_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Step 3: Add Secrets to GitHub

1. Go to your GitHub repository: `https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025`
2. Click on **Settings** (top navigation)
3. Click on **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret** for each secret:

   **Secret 1: LIGHTSAIL_SSH_PRIVATE_KEY**
   - Name: `LIGHTSAIL_SSH_PRIVATE_KEY`
   - Value: Copy the entire contents of your private key file:
     ```bash
     cat ~/.ssh/lightsail_deploy
     ```
     Include the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines and everything in between.

   **Secret 2: LIGHTSAIL_USER**
   - Name: `LIGHTSAIL_USER`
   - Value: `ubuntu` (or your SSH username)

   **Secret 3: LIGHTSAIL_HOST**
   - Name: `LIGHTSAIL_HOST`
   - Value: Your Lightsail instance IP address or hostname (e.g., `18.136.45.140` or `ec2-18-136-45-140.ap-southeast-1.compute.amazonaws.com`)

### Step 4: Verify Secrets

After adding the secrets, the workflow will automatically run on the next push to `main` that affects backend files, or you can manually trigger it:

1. Go to **Actions** tab
2. Select **Deploy Backend to Lightsail** workflow
3. Click **Run workflow** → **Run workflow**

## Alternative: Manual Deployment

If you prefer not to use GitHub Actions, you can deploy manually:

```bash
# SSH into Lightsail
ssh ubuntu@YOUR_LIGHTSAIL_IP

# Navigate to project
cd ~/tradeeon-FE-BE-12-09-2025

# Pull latest code
git pull origin main

# Restart Docker container
sudo docker restart tradeeon-backend

# Or rebuild if needed
sudo docker stop tradeeon-backend
sudo docker rm tradeeon-backend
sudo docker build -t tradeeon-backend .
sudo docker run -d \
  --name tradeeon-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file apps/api/.env \
  tradeeon-backend
```

## Troubleshooting

### "Permission denied (publickey)" error
- Ensure the public key is in `~/.ssh/authorized_keys` on the Lightsail instance
- Check file permissions: `chmod 600 ~/.ssh/authorized_keys`
- Verify the private key matches the public key

### "Host key verification failed"
- The workflow automatically adds the host to known_hosts
- If issues persist, manually add: `ssh-keyscan -H YOUR_LIGHTSAIL_IP >> ~/.ssh/known_hosts`

### "Secret not found" error
- Double-check the secret names match exactly (case-sensitive)
- Ensure secrets are added to the correct repository
- Verify you have admin access to add secrets

## Security Notes

- **Never commit SSH private keys to the repository**
- **Never share private keys in chat or email**
- **Rotate keys periodically** (every 90 days recommended)
- **Use separate keys for different environments** (dev, staging, production)
- **Restrict SSH access** to specific IPs in Lightsail firewall rules if possible


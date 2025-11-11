# 🚀 DEPLOYMENT GUIDE: Backend (Lightsail) + Frontend (S3/CloudFront)

## 📋 PREREQUISITES

### Backend (Lightsail)
- ✅ Lightsail instance running (IP: 18.136.45.140)
- ✅ SSH access to Lightsail instance
- ✅ Docker installed on Lightsail
- ✅ Nginx configured with SSL
- ✅ `.env` file exists at `apps/api/.env` on Lightsail

### Frontend
- ✅ GitHub Actions configured with AWS credentials
- ✅ S3 bucket: `tradeeon-frontend`
- ✅ CloudFront distribution: `EMF4IMNT9637C`
- ✅ GitHub Secrets configured:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `VITE_API_URL` (should be `https://api.tradeeon.com`)
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

---

## 🔧 BACKEND DEPLOYMENT (Lightsail)

### Option 1: Using Automated Script (RECOMMENDED)

1. **SSH into Lightsail instance:**
   ```bash
   ssh ubuntu@18.136.45.140
   ```

2. **Navigate to project directory:**
   ```bash
   cd ~/tradeeon-FE-BE-12-09-2025
   ```

3. **Pull latest code:**
   ```bash
   git pull origin main
   ```

4. **Make script executable (if not already):**
   ```bash
   chmod +x deploy-backend-lightsail.sh
   ```

5. **Run deployment script:**
   ```bash
   ./deploy-backend-lightsail.sh
   ```

   The script will:
   - Pull latest code from Git
   - Stop old container
   - Build new Docker image (without cache)
   - Start new container
   - Verify health endpoints
   - Test all routes

### Option 2: Manual Deployment

1. **SSH into Lightsail:**
   ```bash
   ssh ubuntu@18.136.45.140
   ```

2. **Navigate to project:**
   ```bash
   cd ~/tradeeon-FE-BE-12-09-2025
   ```

3. **Pull latest code:**
   ```bash
   git pull origin main
   ```

4. **Stop and remove old container:**
   ```bash
   sudo docker stop tradeeon-backend
   sudo docker rm tradeeon-backend
   ```

5. **Build new Docker image:**
   ```bash
   sudo docker build --no-cache -t tradeeon-backend .
   ```

6. **Run new container:**
   ```bash
   sudo docker run -d \
     --name tradeeon-backend \
     --restart unless-stopped \
     -p 8000:8000 \
     --env-file apps/api/.env \
     tradeeon-backend
   ```

7. **Verify deployment:**
   ```bash
   # Check container is running
   sudo docker ps

   # Check logs
   sudo docker logs tradeeon-backend

   # Test health endpoint
   curl http://localhost:8000/health

   # Test dashboard endpoint (should return 401 without auth)
   curl -X POST http://localhost:8000/dashboard/summary
   ```

8. **Test via HTTPS:**
   ```bash
   curl https://api.tradeeon.com/health
   ```

### Verify Backend Deployment

Run these checks:

```bash
# 1. Container is running
sudo docker ps | grep tradeeon-backend

# 2. Health endpoint works
curl http://localhost:8000/health

# 3. Dashboard endpoint exists (should return 401, not 404)
curl -X GET https://api.tradeeon.com/dashboard/summary

# 4. Check logs for errors
sudo docker logs tradeeon-backend --tail 50
```

---

## 🎨 FRONTEND DEPLOYMENT

### Option 1: Automatic (GitHub Actions) - RECOMMENDED

The frontend will **automatically deploy** when you push to `main` branch if:
- Changes are in `apps/frontend/**`
- GitHub Actions workflow is enabled
- AWS credentials are configured

**Steps:**

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **Check GitHub Actions:**
   - Go to: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions
   - Find "Deploy Frontend to S3 + CloudFront" workflow
   - Wait for it to complete (usually 2-3 minutes)

3. **Verify deployment:**
   - Visit: https://www.tradeeon.com
   - Check browser console for errors
   - Test dashboard functionality

### Option 2: Manual Deployment (CloudShell or Local)

If GitHub Actions fails, deploy manually:

1. **Build frontend locally or in CloudShell:**
   ```bash
   cd apps/frontend
   npm install
   npm run build
   ```

2. **Upload to S3:**
   ```bash
   aws s3 sync dist/ s3://tradeeon-frontend/ --delete --region ap-southeast-1
   ```

3. **Invalidate CloudFront cache:**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id EMF4IMNT9637C \
     --paths "/*" \
     --region ap-southeast-1
   ```

### Option 3: Using Deployment Script

1. **SSH into Lightsail or use CloudShell:**
   ```bash
   # Clone repo if needed
   git clone https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025.git
   cd tradeeon-FE-BE-12-09-2025
   ```

2. **Run deployment script:**
   ```bash
   chmod +x deploy-frontend-cloudshell.sh
   ./deploy-frontend-cloudshell.sh
   ```

### Verify Frontend Deployment

1. **Check website:**
   - Visit: https://www.tradeeon.com
   - Should load without errors

2. **Check API connection:**
   - Open browser console (F12)
   - Go to Network tab
   - Navigate to dashboard
   - Should see API calls to `https://api.tradeeon.com/dashboard/summary`

3. **Test dashboard:**
   - Sign in
   - Connect Binance
   - Should redirect to dashboard
   - Should show account info, assets, USDT balance, active trades

---

## 🔍 TROUBLESHOOTING

### Backend Issues

**Container won't start:**
```bash
# Check logs
sudo docker logs tradeeon-backend

# Check .env file exists
ls -la apps/api/.env

# Check environment variables
sudo docker exec tradeeon-backend env | grep SUPABASE
```

**404 errors on routes:**
```bash
# Verify code is updated
sudo docker exec tradeeon-backend cat apps/api/routers/dashboard.py | head -20

# Check if router is included
sudo docker exec tradeeon-backend grep -r "dashboard.router" apps/api/main.py
```

**401 errors:**
- Check JWT token is being sent from frontend
- Verify `SUPABASE_JWT_SECRET` matches Supabase project
- Check user is authenticated

### Frontend Issues

**Build fails:**
- Check Node.js version (should be 18+)
- Check `package-lock.json` exists
- Check environment variables are set in GitHub Secrets

**Deployment fails:**
- Check AWS credentials in GitHub Secrets
- Check S3 bucket exists: `tradeeon-frontend`
- Check CloudFront distribution ID: `EMF4IMNT9637C`

**API calls fail:**
- Check `VITE_API_URL` is set to `https://api.tradeeon.com`
- Check CORS is configured on backend
- Check browser console for errors

---

## ✅ DEPLOYMENT CHECKLIST

### Backend
- [ ] SSH into Lightsail
- [ ] Pull latest code (`git pull origin main`)
- [ ] Run deployment script or manual steps
- [ ] Verify container is running (`sudo docker ps`)
- [ ] Test health endpoint (`curl http://localhost:8000/health`)
- [ ] Test dashboard endpoint (`curl https://api.tradeeon.com/dashboard/summary`)
- [ ] Check logs for errors (`sudo docker logs tradeeon-backend`)

### Frontend
- [ ] Push code to GitHub (`git push origin main`)
- [ ] Check GitHub Actions workflow completes successfully
- [ ] Wait for CloudFront invalidation (1-2 minutes)
- [ ] Visit https://www.tradeeon.com
- [ ] Test sign in
- [ ] Test Binance connection
- [ ] Test dashboard shows data

---

## 🎯 QUICK COMMANDS REFERENCE

### Backend (Lightsail)
```bash
# SSH into Lightsail
ssh ubuntu@18.136.45.140

# Quick deploy
cd ~/tradeeon-FE-BE-12-09-2025 && git pull origin main && ./deploy-backend-lightsail.sh

# Check status
sudo docker ps
sudo docker logs tradeeon-backend --tail 50
curl http://localhost:8000/health
```

### Frontend
```bash
# Trigger GitHub Actions (just push)
git push origin main

# Or manual deploy
cd apps/frontend
npm run build
aws s3 sync dist/ s3://tradeeon-frontend/ --delete
aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
```

---

## 📞 SUPPORT

If deployment fails:
1. Check logs (backend: `sudo docker logs tradeeon-backend`, frontend: GitHub Actions logs)
2. Verify environment variables are set correctly
3. Check network connectivity
4. Verify AWS credentials/permissions


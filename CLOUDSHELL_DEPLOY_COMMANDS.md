# Complete Frontend Deployment - Copy This Into CloudShell

## One-Command Deployment

Copy and paste this ENTIRE script into CloudShell:

```bash
cd ~ && \
if [ -d "tradeeon-FE-BE-12-09-2025" ]; then cd tradeeon-FE-BE-12-09-2025 && git pull; else git clone https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025.git && cd tradeeon-FE-BE-12-09-2025; fi && \
cd apps/frontend && \
cat > .env << 'ENVEOF'
VITE_API_URL=http://api.tradeeon.com
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTQzMDUsImV4cCI6MjA3Mjk5MDMwNX0.LF1iumCNB4EPJxAJSeTx04V0Tp7SlL7HBfsJVb3RmLU
ENVEOF
npm install && \
npm run build && \
aws s3 sync dist/ s3://tradeeon-frontend/ --delete && \
aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*" && \
echo "✅ Deployment complete! Wait 2-3 minutes for cache to clear."
```

## Or Use the Script File

If you prefer, upload `deploy-frontend-cloudshell.sh` to CloudShell and run:

```bash
chmod +x deploy-frontend-cloudshell.sh
./deploy-frontend-cloudshell.sh
```

## Step-by-Step (If Script Fails)

If the one-liner doesn't work, run these commands one by one:

```bash
# 1. Clone/update repo
cd ~
git clone https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025.git
cd tradeeon-FE-BE-12-09-2025/apps/frontend

# 2. Create .env
cat > .env << 'EOF'
VITE_API_URL=http://api.tradeeon.com
VITE_SUPABASE_URL=https://mgjlnmlhwuqspctanaik.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTQzMDUsImV4cCI6MjA3Mjk5MDMwNX0.LF1iumCNB4EPJxAJSeTx04V0Tp7SlL7HBfsJVb3RmLU
EOF

# 3. Install and build
npm install
npm run build

# 4. Upload to S3
aws s3 sync dist/ s3://tradeeon-frontend/ --delete

# 5. Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
```


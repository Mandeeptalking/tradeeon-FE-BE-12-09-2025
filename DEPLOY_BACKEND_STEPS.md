# Deploy Backend - Step by Step Guide

## Step 1: Build Docker Image in AWS CloudShell

1. **Open AWS CloudShell**:
   - Go to AWS Console → Click the CloudShell icon (top right)
   - Or visit: https://console.aws.amazon.com/cloudshell

2. **Clone your repository** (or upload files):
   ```bash
   # If you have a git repo:
   git clone <your-repo-url>
   cd tradeeon-FE-BE-12-09-2025
   
   # OR upload files manually using CloudShell's upload feature
   ```

3. **Run the build script**:
   ```bash
   # Make script executable
   chmod +x build-and-push-backend.sh
   
   # Run it
   ./build-and-push-backend.sh
   ```

   **OR run commands manually**:
   ```bash
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 531604848081.dkr.ecr.us-east-1.amazonaws.com
   
   # Build image
   docker build -t tradeeon-backend .
   
   # Tag image
   docker tag tradeeon-backend:latest 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest
   
   # Push to ECR
   docker push 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest
   ```

4. **Verify image was pushed**:
   ```bash
   aws ecr describe-images --repository-name tradeeon-backend --region us-east-1
   ```

## Step 2: Create ECS Service

Once the image is pushed, run this command in your local terminal:

```powershell
aws ecs create-service `
  --cluster tradeeon-cluster `
  --service-name tradeeon-backend-service `
  --task-definition tradeeon-backend:2 `
  --desired-count 1 `
  --launch-type FARGATE `
  --network-configuration "awsvpcConfiguration={subnets=[subnet-09d44422a715d0b1e,subnet-0658ce2b1169c0360],securityGroups=[sg-0722b6ede48aab4ed],assignPublicIp=ENABLED}" `
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:531604848081:targetgroup/tradeeon-backend-tg/af73a38364aa1f96,containerName=tradeeon-backend,containerPort=8000" `
  --region us-east-1
```

## Step 3: Update Frontend API URL

After the service is running, update frontend to point to backend:

1. Create/update `apps/frontend/.env`:
   ```
   VITE_API_URL=http://tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com
   ```

2. Rebuild frontend:
   ```powershell
   cd apps/frontend
   npm run build
   ```

3. Redeploy to S3:
   ```powershell
   cd ../..
   aws s3 sync apps/frontend/dist/ s3://tradeeon-frontend/ --delete
   ```

4. Invalidate CloudFront cache:
   ```powershell
   aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
   ```

## Step 4: Verify Backend is Running

1. Check service status:
   ```powershell
   aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service --region us-east-1
   ```

2. Test backend health endpoint:
   ```powershell
   curl http://tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com/health
   ```

3. Check logs:
   ```powershell
   aws logs tail /ecs/tradeeon-backend --follow --region us-east-1
   ```

## Troubleshooting

If service fails to start:
- Check ECS service events: `aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service`
- Check CloudWatch logs: `/ecs/tradeeon-backend`
- Verify task can pull image: Check ECR repository permissions



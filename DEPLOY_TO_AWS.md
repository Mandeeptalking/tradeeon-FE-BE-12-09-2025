# Deploy Tradeeon to AWS - Step by Step

## 🎯 Goal

Deploy Tradeeon DCA Bot to AWS with:
- Frontend on S3 + CloudFront
- Backend on ECS Fargate
- Minimal cost
- All features working

---

## 📋 Prerequisites

### AWS Account Setup

```bash
# 1. Create AWS account
# https://aws.amazon.com

# 2. Install AWS CLI
# Windows: choco install awscli
# Mac: brew install awscli

# 3. Configure credentials
aws configure

# Enter:
AWS Access Key ID: [your-key]
AWS Secret Access Key: [your-secret]
Default region name: us-east-1
Default output format: json

# 4. Install Docker
# https://www.docker.com/get-started
```

### Project Setup

```bash
# 1. Clone repo (if not done)
cd tradeeon-FE-BE-12-09-2025

# 2. Ensure all dependencies are installed
cd apps/frontend
npm install
cd ../..

# Backend dependencies handled by Docker
```

---

## 🚀 Quick Deploy (Automated)

### Using Deployment Script

**Windows (PowerShell)**:
```powershell
# Make script executable
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run deployment
.\deploy.ps1
```

**Linux/Mac**:
```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

**This will**:
- ✅ Build frontend
- ✅ Deploy to S3
- ✅ Build Docker image
- ✅ Push to ECR
- ✅ Update ECS service
- ✅ Wait for deployment

**Time**: 15-30 minutes

---

## 📖 Manual Deploy (Step by Step)

### Part 1: Frontend Deployment (2 hours)

#### Step 1.1: Build Frontend

```bash
cd apps/frontend
npm install
npm run build
cd ../..

# Verify build
ls apps/frontend/dist/
```

#### Step 1.2: Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://tradeeon-frontend-prod --region us-east-1

# Enable public access
aws s3api put-public-access-block \
  --bucket tradeeon-frontend-prod \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Enable website hosting
aws s3 website s3://tradeeon-frontend-prod \
  --index-document index.html \
  --error-document index.html
```

#### Step 1.3: Add Bucket Policy

```bash
# Create bucket policy
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tradeeon-frontend-prod/*"
    }
  ]
}
EOF

# Apply policy
aws s3api put-bucket-policy \
  --bucket tradeeon-frontend-prod \
  --policy file://bucket-policy.json
```

#### Step 1.4: Upload Files

```bash
# Sync files
aws s3 sync apps/frontend/dist s3://tradeeon-frontend-prod \
  --delete \
  --cache-control "max-age=31536000,immutable" \
  --exclude "index.html"

# Upload index.html with no cache
aws s3 cp apps/frontend/dist/index.html s3://tradeeon-frontend-prod/index.html \
  --cache-control "max-age=0,no-cache,no-store,must-revalidate"

# Verify upload
aws s3 ls s3://tradeeon-frontend-prod/
```

#### Step 1.5: Create CloudFront Distribution

```bash
# Get S3 endpoint
S3_ENDPOINT=$(aws s3api get-bucket-location --bucket tradeeon-frontend-prod)
echo "S3 Endpoint: tradeeon-frontend-prod.s3.amazonaws.com"

# Create CloudFront config
cat > cloudfront-config.json << 'EOF'
{
  "CallerReference": "tradeeon-frontend-$(date +%s)",
  "Comment": "Tradeeon Frontend",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-tradeeon-frontend-prod",
        "DomainName": "tradeeon-frontend-prod.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-tradeeon-frontend-prod",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
EOF

# Create distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json

# Note the Distribution ID and Domain Name!
```

#### Step 1.6: Configure CloudFront SPA Routing

**Manually in AWS Console**:
1. Go to CloudFront Console
2. Select your distribution
3. **Error pages** tab
4. **Create custom error response**

**Error 403**:
- Error code: `403`
- Customize: Yes
- Response page: `/index.html`
- HTTP response: `200`

**Error 404**:
- Error code: `404`
- Customize: Yes
- Response page: `/index.html`
- HTTP response: `200`

**Wait 15 minutes** for CloudFront to deploy!

---

### Part 2: Backend Deployment (4 hours)

#### Step 2.1: Create VPC (if needed)

```bash
# Check if VPC exists
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=tradeeon-vpc"

# If not, create one (or use default)
# For simplicity, we'll use default VPC
```

#### Step 2.2: Create Security Group

```bash
# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text)

# Create security group
SG_ID=$(aws ec2 create-security-group \
  --group-name tradeeon-backend-sg \
  --description "Security group for Tradeeon backend" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

echo "Security Group ID: $SG_ID"

# Allow HTTP from anywhere (ALB will be in front)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 8000 \
  --cidr 0.0.0.0/0

# Allow outbound HTTPS (for Supabase, Binance)
aws ec2 authorize-security-group-egress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

#### Step 2.3: Create Application Load Balancer

```bash
# Get subnets
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text | tr '\t' ' ')
SUBNET1=$(echo $SUBNETS | cut -d' ' -f1)
SUBNET2=$(echo $SUBNETS | cut -d' ' -f2)

echo "Subnets: $SUBNET1, $SUBNET2"

# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name tradeeon-backend-alb \
  --subnets $SUBNET1 $SUBNET2 \
  --security-groups $SG_ID \
  --scheme internet-facing \
  --ip-address-type ipv4 \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

echo "ALB ARN: $ALB_ARN"

# Wait for ALB to be ready
aws elbv2 wait load-balancer-available --load-balancer-arns $ALB_ARN

# Get DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' --output text)

echo "ALB DNS: $ALB_DNS"
```

#### Step 2.4: Create Target Group

```bash
# Create target group
TG_ARN=$(aws elbv2 create-target-group \
  --name tradeeon-backend-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --timeout-seconds 10 \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

echo "Target Group ARN: $TG_ARN"
```

#### Step 2.5: Create ALB Listener

```bash
# Create HTTP listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN

echo "Listener created"
```

#### Step 2.6: Create ECR Repository

```bash
# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create ECR repository
aws ecr create-repository \
  --repository-name tradeeon-backend \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

echo "ECR configured"
```

#### Step 2.7: Build and Push Docker Image

```bash
# Build Docker image
docker build -t tradeeon-backend:latest .

# Test locally (optional)
# docker run -p 8000:8000 -e SUPABASE_URL=xxx tradeeon-backend:latest

# Tag for ECR
docker tag tradeeon-backend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest

echo "Image pushed to ECR"
```

#### Step 2.8: Create IAM Roles

```bash
# Create task execution role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach managed policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create task role
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

echo "IAM roles created"
```

#### Step 2.9: Create CloudWatch Log Group

```bash
# Create log group
aws logs create-log-group \
  --log-group-name /ecs/tradeeon-backend \
  --region us-east-1

echo "Log group created"
```

#### Step 2.10: Update Task Definition

```bash
# Get secrets ARNs (you'll need to create these first - see below)
# For now, use environment variables in task definition

# Update task-definition.json with your values
# Replace <ACCOUNT_ID> with your AWS account ID

sed -i.bak "s/<ACCOUNT_ID>/$AWS_ACCOUNT_ID/g" task-definition.json
```

#### Step 2.11: Register Task Definition

```bash
# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json

echo "Task definition registered"
```

#### Step 2.12: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster \
  --cluster-name tradeeon-cluster

echo "ECS cluster created"
```

#### Step 2.13: Deploy Service

```bash
# Get subnets for public IP
SUBNETS_PUBLIC=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[?MapPublicIpOnLaunch==\`true\`].[SubnetId]" \
  --output text | tr '\t' ',')

# If no public subnets, use all subnets
if [ -z "$SUBNETS_PUBLIC" ]; then
    SUBNETS_PUBLIC=$(echo $SUBNETS | tr ' ' ',')
fi

echo "Using subnets: $SUBNETS_PUBLIC"

# Create service
aws ecs create-service \
  --cluster tradeeon-cluster \
  --service-name tradeeon-backend \
  --task-definition tradeeon-backend:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS_PUBLIC],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=$TG_ARN,containerName=tradeeon-backend,containerPort=8000 \
  --health-check-grace-period-seconds 60

echo "Service created, waiting for deployment..."

# Wait for service to stabilize
aws ecs wait services-stable \
  --cluster tradeeon-cluster \
  --services tradeeon-backend

echo "✅ Service is running!"
```

#### Step 2.14: Store Secrets in Secrets Manager

```bash
# Create secret for Supabase URL
aws secretsmanager create-secret \
  --name tradeeon-secrets \
  --secret-string '{
    "SUPABASE_URL": "https://YOUR_PROJECT.supabase.co",
    "SUPABASE_SERVICE_ROLE_KEY": "YOUR_SERVICE_ROLE_KEY",
    "ENCRYPTION_KEY": "YOUR_ENCRYPTION_KEY",
    "CORS_ORIGINS": "https://YOUR_CLOUDFRONT_URL,https://YOUR_DOMAIN"
  }'

echo "Secrets stored"
```

---

### Part 3: Configuration (1 hour)

#### Step 3.1: Update Frontend Environment

**After CloudFront is deployed**:

```bash
# Get CloudFront URL
CF_URL=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='Tradeeon Frontend'].DomainName" \
  --output text)

echo "CloudFront URL: https://$CF_URL"

# Update frontend .env
cat > apps/frontend/.env.production << EOF
VITE_API_URL=https://$ALB_DNS
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EOF

# Rebuild and redeploy frontend
cd apps/frontend
npm run build
cd ../..
aws s3 sync apps/frontend/dist s3://tradeeon-frontend-prod --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

#### Step 3.2: Test Deployment

```bash
# Test backend health
curl https://$ALB_DNS/health

# Test frontend
curl https://$CF_URL/

# Create test bot
curl -X POST https://$ALB_DNS/bots/dca-bots \
  -H "Content-Type: application/json" \
  -d @test-bot-config.json
```

---

## ✅ Deployment Checklist

### Before Launch

- [ ] S3 bucket created and public
- [ ] Frontend uploaded to S3
- [ ] CloudFront distribution created
- [ ] CloudFront error pages configured (404→index.html)
- [ ] ECR repository created
- [ ] Docker image built and pushed
- [ ] ECS cluster created
- [ ] Task definition registered
- [ ] Service running and healthy
- [ ] ALB created and forwarding
- [ ] Secrets stored in Secrets Manager
- [ ] Environment variables set
- [ ] Health check responding
- [ ] Frontend connected to backend
- [ ] Test bot created successfully

---

## 🚨 Troubleshooting

### Frontend Issues

**Issue**: CloudFront returns 404 for routes  
**Fix**: Configure error pages (403, 404 → index.html)

**Issue**: Assets not loading  
**Fix**: Check S3 bucket policy, CloudFront behaviors

---

### Backend Issues

**Issue**: Service won't start  
**Fix**: Check CloudWatch logs
```bash
aws logs tail /ecs/tradeeon-backend --follow
```

**Issue**: Health check failing  
**Fix**: Check task definition, security group

**Issue**: Can't connect to Supabase  
**Fix**: Check secrets, security group egress rules

---

### General Issues

**Issue**: Docker build fails  
**Fix**: Check requirements.txt, .dockerignore

**Issue**: Task fails to start  
**Fix**: Check logs, IAM permissions

---

## 🎉 Post-Deployment

### Configure Monitoring

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name TradeeonBackend \
  --dashboard-body file://dashboard.json

# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name HighCPU \
  --alarm-description "CPU usage too high" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### Set Up Custom Domain

**Option A: Route 53**:
```bash
# Get CloudFront ID
CF_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='Tradeeon Frontend'].Id" \
  --output text)

# Create hosted zone
aws route53 create-hosted-zone --name tradeeon.com --caller-reference $(date +%s)

# Create A record pointing to CloudFront
# (Use AWS Console for easier management)
```

**Option B: External DNS**:
1. Add CNAME record: `app.tradeeon.com → <CloudFront URL>`
2. Request SSL cert in ACM
3. Update CloudFront to use custom domain

---

## 📊 Cost Tracking

### Set Up Billing Alerts

```bash
# Enable billing alerts
aws budgets create-budget \
  --account-id $AWS_ACCOUNT_ID \
  --budget file://budget.json
```

### Current Costs

| Service | Estimated Cost |
|---------|----------------|
| S3 | $1-5/month |
| CloudFront | $10-50/month |
| ECS Fargate | $30-60/month |
| ALB | $20/month |
| CloudWatch | $5-10/month |
| **Total** | **$66-145/month** |

---

## 🎯 Next Steps

### After Launch

1. ✅ Monitor CloudWatch for errors
2. ✅ Set up alarms
3. ✅ Test complete bot flow
4. ✅ Optimize costs (alert-based refactor)
5. ✅ Add features based on feedback

---

## 📚 References

- **Frontend**: `AWS_S3_CLOUDFRONT_DEPLOYMENT.md`
- **Backend**: `AWS_ECS_DEPLOYMENT_GUIDE.md`
- **Complete**: `AWS_QUICK_START.md`
- **Strategy**: `GO_LIVE_STRATEGY.md`

---

**You're ready to deploy!** 🚀

**Quick deploy**: Run `deploy.ps1` or `deploy.sh`  
**Manual deploy**: Follow steps above

**Time**: 3-6 hours total  
**Result**: Live product on AWS! 🎉


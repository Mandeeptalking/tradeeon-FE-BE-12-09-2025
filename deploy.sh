#!/bin/bash
# Tradeeon Deployment Script

set -e

echo "🚀 Starting Tradeeon Deployment..."

# Configuration
AWS_REGION="us-east-1"
ECS_CLUSTER="tradeeon-cluster"
SERVICE_NAME="tradeeon-backend"
ECR_REPO="tradeeon-backend"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "AWS Account: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build frontend
echo -e "\n${YELLOW}Step 1: Building Frontend...${NC}"
cd apps/frontend
npm install
npm run build
echo -e "${GREEN}✅ Frontend built successfully${NC}"
cd ../..

# Step 2: Deploy frontend to S3
echo -e "\n${YELLOW}Step 2: Deploying Frontend to S3...${NC}"
aws s3 sync apps/frontend/dist s3://tradeeon-frontend-prod --delete
echo -e "${GREEN}✅ Frontend deployed to S3${NC}"

# Step 3: Invalidate CloudFront cache
echo -e "\n${YELLOW}Step 3: Invalidating CloudFront...${NC}"
CLOUDFRONT_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?DomainName=='tradeeon-frontend-prod.s3.amazonaws.com']].Id" --output text)
if [ ! -z "$CLOUDFRONT_ID" ]; then
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
    echo -e "${GREEN}✅ CloudFront cache invalidated${NC}"
fi

# Step 4: Login to ECR
echo -e "\n${YELLOW}Step 4: Logging in to ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
echo -e "${GREEN}✅ Logged in to ECR${NC}"

# Step 5: Build Docker image
echo -e "\n${YELLOW}Step 5: Building Docker image...${NC}"
docker build -t $ECR_REPO:latest .
docker tag $ECR_REPO:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest
echo -e "${GREEN}✅ Docker image built${NC}"

# Step 6: Push to ECR
echo -e "\n${YELLOW}Step 6: Pushing to ECR...${NC}"
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest
echo -e "${GREEN}✅ Image pushed to ECR${NC}"

# Step 7: Update task definition
echo -e "\n${YELLOW}Step 7: Updating task definition...${NC}"
# Replace placeholders in task definition
sed -i.bak "s/<ACCOUNT_ID>/$AWS_ACCOUNT_ID/g" task-definition.json
sed -i.bak "s/<AWS_REGION>/$AWS_REGION/g" task-definition.json
aws ecs register-task-definition --cli-input-json file://task-definition.json
echo -e "${GREEN}✅ Task definition updated${NC}"

# Step 8: Update ECS service
echo -e "\n${YELLOW}Step 8: Updating ECS service...${NC}"
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $SERVICE_NAME \
    --force-new-deployment \
    --region $AWS_REGION

echo -e "\n${GREEN}✅ Deployment initiated!${NC}"
echo "Waiting for service to stabilize..."

# Step 9: Wait for service to stabilize
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER \
    --services $SERVICE_NAME \
    --region $AWS_REGION

echo -e "\n${GREEN}🎉 Deployment complete!${NC}"

# Get service URL
echo -e "\n${YELLOW}Service Status:${NC}"
aws ecs describe-services \
    --cluster $ECS_CLUSTER \
    --services $SERVICE_NAME \
    --region $AWS_REGION \
    --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'

echo -e "\n${GREEN}✅ Tradeeon is now live!${NC}"



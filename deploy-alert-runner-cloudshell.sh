#!/bin/bash
# Complete Alert Runner Deployment in CloudShell
# Upload your project files first, then run this script

set -e

echo "========================================"
echo "  ALERT RUNNER DEPLOYMENT"
echo "========================================"
echo ""

REGION="us-east-1"
ACCOUNT_ID="531604848081"
ECR_REPO="tradeeon-alert-runner"
IMAGE_TAG="latest"
CLUSTER="tradeeon-cluster"
SERVICE="tradeeon-alert-runner-service"

# Step 1: Verify files
echo "Step 1: Verifying files..."
if [ ! -f "Dockerfile.alert-runner" ]; then
    echo "ERROR: Dockerfile.alert-runner not found!"
    exit 1
fi
if [ ! -f "requirements.txt" ]; then
    echo "ERROR: requirements.txt not found!"
    exit 1
fi
if [ ! -d "apps" ] || [ ! -d "backend" ] || [ ! -d "shared" ]; then
    echo "ERROR: Required directories not found!"
    exit 1
fi
echo "[OK] All files present"

# Step 2: Clean up nested directories
echo ""
echo "Step 2: Cleaning up nested directories..."
rm -rf apps/apps apps/backend 2>/dev/null || true
chmod -R 755 apps/ backend/ shared/ 2>/dev/null || true
chmod 644 requirements.txt Dockerfile.alert-runner 2>/dev/null || true

# Step 3: Login to ECR
echo ""
echo "Step 3: Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Step 4: Build Docker image
echo ""
echo "Step 4: Building Docker image..."
docker build -f Dockerfile.alert-runner -t $ECR_REPO:$IMAGE_TAG .

# Step 5: Tag for ECR
echo ""
echo "Step 5: Tagging image..."
docker tag $ECR_REPO:$IMAGE_TAG $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG

# Step 6: Push to ECR
echo ""
echo "Step 6: Pushing image to ECR..."
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG

# Step 7: Verify image
echo ""
echo "Step 7: Verifying image..."
aws ecr describe-images --repository-name $ECR_REPO --region $REGION --query "imageDetails[0]"

# Step 8: Register task definition (if not already done)
echo ""
echo "Step 8: Registering task definition..."
# Note: Task definition JSON needs to be uploaded separately or created inline
echo "[INFO] Task definition should already be registered. If not, register it manually."

# Step 9: Create or update service
echo ""
echo "Step 9: Creating/updating ECS service..."

# Get VPC and subnet info
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region $REGION --query "Vpcs[0].VpcId" --output text)
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --region $REGION --query "Subnets[0:2].SubnetId" --output text)
SUBNET_ARRAY=($SUBNETS)

# Get security group from backend service
SG=$(aws ecs describe-services --cluster $CLUSTER --services tradeeon-backend-service --region $REGION --query "services[0].networkConfiguration.awsvpcConfiguration.securityGroups[0]" --output text 2>/dev/null || echo "sg-0722b6ede48aab4ed")

echo "VPC: $VPC_ID"
echo "Subnets: ${SUBNET_ARRAY[0]}, ${SUBNET_ARRAY[1]}"
echo "Security Group: $SG"

# Check if service exists
SERVICE_EXISTS=$(aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION --query "services[0].status" --output text 2>/dev/null || echo "NONE")

if [ "$SERVICE_EXISTS" = "ACTIVE" ]; then
    echo "[INFO] Service exists, updating..."
    aws ecs update-service \
        --cluster $CLUSTER \
        --service $SERVICE \
        --task-definition tradeeon-alert-runner \
        --force-new-deployment \
        --region $REGION
    echo "[OK] Service updated"
else
    echo "[INFO] Creating new service..."
    aws ecs create-service \
        --cluster $CLUSTER \
        --service-name $SERVICE \
        --task-definition tradeeon-alert-runner \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_ARRAY[0]},${SUBNET_ARRAY[1]}],securityGroups=[$SG],assignPublicIp=ENABLED}" \
        --region $REGION
    echo "[OK] Service created"
fi

# Step 10: Wait for service to stabilize
echo ""
echo "Step 10: Waiting for service to stabilize..."
echo "This may take 1-2 minutes..."
aws ecs wait services-stable --cluster $CLUSTER --services $SERVICE --region $REGION

# Step 11: Check status
echo ""
echo "Step 11: Checking service status..."
aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION --query "services[0].{Status:status,Desired:desiredCount,Running:runningCount}" --output table

echo ""
echo "========================================"
echo "  DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "View logs:"
echo "  aws logs tail /ecs/tradeeon-alert-runner --follow --region $REGION"
echo ""
echo "Check service:"
echo "  aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION"



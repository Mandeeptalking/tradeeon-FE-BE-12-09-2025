#!/bin/bash
# COMPLETE Alert Runner Deployment Script
# Run this ONE script after uploading alert-runner-deploy.zip to CloudShell

set -e

echo "========================================"
echo "  ALERT RUNNER - COMPLETE DEPLOYMENT"
echo "========================================"
echo ""

REGION="us-east-1"
ACCOUNT_ID="531604848081"
ECR_REPO="tradeeon-alert-runner"
IMAGE_TAG="latest"
CLUSTER="tradeeon-cluster"
SERVICE="tradeeon-alert-runner-service"

# Step 1: Extract ZIP (if not already extracted)
echo "Step 1: Checking/extracting ZIP..."
if [ -f "alert-runner-deploy.zip" ]; then
    echo "Extracting alert-runner-deploy.zip..."
    unzip -o alert-runner-deploy.zip
    echo "[OK] ZIP extracted"
else
    echo "[INFO] ZIP already extracted or not found"
fi

# Step 2: Clean up nested directories
echo ""
echo "Step 2: Cleaning up nested directories..."
rm -rf apps/apps apps/backend 2>/dev/null || true
echo "[OK] Cleanup complete"

# Step 3: Verify files
echo ""
echo "Step 3: Verifying files..."
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

# Step 4: Fix permissions
echo ""
echo "Step 4: Fixing permissions..."
chmod -R 755 apps/ backend/ shared/ 2>/dev/null || true
chmod 644 requirements.txt Dockerfile.alert-runner 2>/dev/null || true
echo "[OK] Permissions set"

# Step 5: Login to ECR
echo ""
echo "Step 5: Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
echo "[OK] Logged into ECR"

# Step 6: Build Docker image
echo ""
echo "Step 6: Building Docker image (this may take 5-10 minutes)..."
docker build -f Dockerfile.alert-runner -t $ECR_REPO:$IMAGE_TAG .
echo "[OK] Image built"

# Step 7: Tag for ECR
echo ""
echo "Step 7: Tagging image..."
docker tag $ECR_REPO:$IMAGE_TAG $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG
echo "[OK] Image tagged"

# Step 8: Push to ECR
echo ""
echo "Step 8: Pushing image to ECR (this may take 5-10 minutes)..."
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG
echo "[OK] Image pushed"

# Step 9: Verify image
echo ""
echo "Step 9: Verifying image in ECR..."
aws ecr describe-images --repository-name $ECR_REPO --region $REGION --query "imageDetails[0].imageTags[0]" --output text
echo "[OK] Image verified"

# Step 10: Check service status
echo ""
echo "Step 10: Checking ECS service status..."
echo "The service should start automatically now..."
sleep 10

# Step 11: Monitor service
echo ""
echo "Step 11: Service status:"
aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION --query "services[0].{Status:status,Desired:desiredCount,Running:runningCount,Pending:pendingCount}" --output table

# Step 12: Show logs command
echo ""
echo "========================================"
echo "  DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "View logs (run this to see alert runner activity):"
echo "  aws logs tail /ecs/tradeeon-alert-runner --follow --region $REGION"
echo ""
echo "Check service status:"
echo "  aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION --query 'services[0].{Status:status,Desired:desiredCount,Running:runningCount}' --output table"
echo ""



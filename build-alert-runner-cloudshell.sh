#!/bin/bash
# Build Alert Runner Docker Image in CloudShell
# Run this script in AWS CloudShell after uploading your project files

set -e

echo "========================================"
echo "  ALERT RUNNER DOCKER BUILD"
echo "========================================"
echo ""

REGION="us-east-1"
ACCOUNT_ID="531604848081"
ECR_REPO="tradeeon-alert-runner"
IMAGE_TAG="latest"

# Step 1: Login to ECR
echo "Step 1: Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Step 2: Verify files exist
echo ""
echo "Step 2: Verifying files..."
if [ ! -f "Dockerfile.alert-runner" ]; then
    echo "ERROR: Dockerfile.alert-runner not found!"
    exit 1
fi

if [ ! -f "requirements.txt" ]; then
    echo "ERROR: requirements.txt not found!"
    exit 1
fi

if [ ! -d "apps" ]; then
    echo "ERROR: apps/ directory not found!"
    exit 1
fi

if [ ! -d "backend" ]; then
    echo "ERROR: backend/ directory not found!"
    exit 1
fi

if [ ! -d "shared" ]; then
    echo "ERROR: shared/ directory not found!"
    exit 1
fi

echo "[OK] All files present"

# Step 3: Clean up any existing nested directories
echo ""
echo "Step 3: Cleaning up nested directories..."
if [ -d "apps/apps" ]; then
    echo "Removing nested apps/apps directory..."
    rm -rf apps/apps
fi

if [ -d "apps/backend" ]; then
    echo "Removing nested apps/backend directory..."
    rm -rf apps/backend
fi

# Step 4: Build Docker image
echo ""
echo "Step 4: Building Docker image..."
docker build -f Dockerfile.alert-runner -t $ECR_REPO:$IMAGE_TAG .

# Step 5: Tag for ECR
echo ""
echo "Step 5: Tagging image for ECR..."
docker tag $ECR_REPO:$IMAGE_TAG $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG

# Step 6: Push to ECR
echo ""
echo "Step 6: Pushing image to ECR..."
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG

echo ""
echo "========================================"
echo "  BUILD COMPLETE!"
echo "========================================"
echo ""
echo "Image URI: $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG"
echo ""
echo "Next: Run deploy-alert-runner.ps1 locally to create the ECS service"


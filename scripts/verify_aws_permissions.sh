#!/bin/bash
# Verify AWS ECR Permissions
# Run this script to check if the IAM user has necessary ECR permissions

echo "🔍 Verifying AWS ECR Permissions..."
echo "=================================="

# Check ECR login permission
echo ""
echo "1. Testing ECR GetAuthorizationToken..."
if aws ecr get-authorization-token --region us-east-1 > /dev/null 2>&1; then
    echo "   ✅ ECR login permission: OK"
else
    echo "   ❌ ECR login permission: FAILED"
    echo "   Error: $(aws ecr get-authorization-token --region us-east-1 2>&1)"
fi

# Check repository access
echo ""
echo "2. Testing Repository Access..."
if aws ecr describe-repositories --region us-east-1 --repository-names tradeeon-alert-runner > /dev/null 2>&1; then
    echo "   ✅ Repository access: OK"
else
    echo "   ❌ Repository access: FAILED"
    echo "   Error: $(aws ecr describe-repositories --region us-east-1 --repository-names tradeeon-alert-runner 2>&1)"
fi

# Check ECS permissions (if deploying to ECS)
echo ""
echo "3. Testing ECS Permissions..."
if aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-alert-runner-service --region us-east-1 > /dev/null 2>&1; then
    echo "   ✅ ECS permissions: OK"
else
    echo "   ⚠️  ECS permissions: May need review"
    echo "   Error: $(aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-alert-runner-service --region us-east-1 2>&1)"
fi

echo ""
echo "=================================="
echo "✅ Permission check complete!"
echo ""
echo "If any checks failed, add the required permissions to IAM user."


#!/bin/bash
# Add SUPABASE_JWT_SECRET to ECS Task Definition
# Run this in AWS CloudShell

set -e  # Exit on error

JWT_SECRET="b5xpWCI1kSA9+zuP39rNJ3RIJiwHa86gGsL6mBcUpl6u6VxFaTowQcHoNpJhrYTacxAdsHBosS+k88xHlNdXyQ=="
TASK_DEFINITION="tradeeon-backend"
CLUSTER="tradeeon-cluster"
SERVICE="tradeeon-backend-service"

echo "=== Adding SUPABASE_JWT_SECRET to ECS Task Definition ==="
echo ""

# Step 1: Get current task definition
echo "1. Fetching current task definition..."
aws ecs describe-task-definition \
    --task-definition $TASK_DEFINITION \
    --query taskDefinition > task-def.json

if [ ! -f task-def.json ]; then
    echo "❌ Failed to get task definition"
    exit 1
fi

echo "✅ Task definition fetched"
echo ""

# Step 2: Add JWT_SECRET to environment variables
echo "2. Adding SUPABASE_JWT_SECRET environment variable..."

# Use jq to add the environment variable
jq --arg secret "$JWT_SECRET" '
    .containerDefinitions[0].environment = (
        (.containerDefinitions[0].environment // []) | 
        map(select(.name != "SUPABASE_JWT_SECRET")) + 
        [{"name": "SUPABASE_JWT_SECRET", "value": $secret}]
    ) |
    del(.taskDefinitionArn) |
    del(.revision) |
    del(.status) |
    del(.requiresAttributes) |
    del(.compatibilities) |
    del(.registeredAt) |
    del(.registeredBy)
' task-def.json > task-def-new.json

if [ ! -f task-def-new.json ]; then
    echo "❌ Failed to update task definition"
    exit 1
fi

echo "✅ Environment variable added"
echo ""

# Step 3: Register new task definition
echo "3. Registering new task definition revision..."
REGISTER_OUTPUT=$(aws ecs register-task-definition --cli-input-json file://task-def-new.json)

if [ $? -ne 0 ]; then
    echo "❌ Failed to register task definition"
    exit 1
fi

NEW_REVISION=$(echo $REGISTER_OUTPUT | jq -r '.taskDefinition.revision')
echo "✅ New revision created: $NEW_REVISION"
echo ""

# Step 4: Update service
echo "4. Updating ECS service to use new revision..."
aws ecs update-service \
    --cluster $CLUSTER \
    --service $SERVICE \
    --task-definition $TASK_DEFINITION:$NEW_REVISION \
    --force-new-deployment > /dev/null

if [ $? -ne 0 ]; then
    echo "❌ Failed to update service"
    exit 1
fi

echo "✅ Service update initiated"
echo ""

# Cleanup
rm -f task-def.json task-def-new.json

echo "=== SUCCESS ==="
echo ""
echo "✅ SUPABASE_JWT_SECRET added to task definition"
echo "✅ New task definition revision: $NEW_REVISION"
echo "✅ Service deployment started"
echo ""
echo "⏳ Wait 2-3 minutes for deployment to complete"
echo ""
echo "Monitor deployment:"
echo "  aws ecs describe-services --cluster $CLUSTER --services $SERVICE --query 'services[0].deployments'"


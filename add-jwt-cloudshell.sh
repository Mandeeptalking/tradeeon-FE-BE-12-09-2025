#!/bin/bash
# Complete script to add JWT secret - Run in AWS CloudShell
# Just copy and paste the entire script

set -e

JWT_SECRET="b5xpWCI1kSA9+zuP39rNJ3RIJiwHa86gGsL6mBcUpl6u6VxFaTowQcHoNpJhrYTacxAdsHBosS+k88xHlNdXyQ=="

echo "=== Adding SUPABASE_JWT_SECRET ==="
echo ""

# Install jq if needed
if ! command -v jq &> /dev/null; then
    echo "Installing jq..."
    sudo yum install jq -y -q
fi

# Get current task definition
echo "1. Fetching task definition..."
aws ecs describe-task-definition --task-definition tradeeon-backend --query taskDefinition > task-def.json

# Add JWT secret
echo "2. Adding JWT secret..."
jq --arg secret "$JWT_SECRET" '
    .containerDefinitions[0].environment = (
        (.containerDefinitions[0].environment // []) | 
        map(select(.name != "SUPABASE_JWT_SECRET")) + 
        [{"name": "SUPABASE_JWT_SECRET", "value": $secret}]
    ) |
    del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
' task-def.json > task-def-new.json

# Register new revision
echo "3. Registering new revision..."
REGISTER_OUTPUT=$(aws ecs register-task-definition --cli-input-json file://task-def-new.json)
NEW_REVISION=$(echo "$REGISTER_OUTPUT" | jq -r '.taskDefinition.revision')

echo "✅ New revision: $NEW_REVISION"
echo ""

# Update service
echo "4. Updating service..."
aws ecs update-service \
    --cluster tradeeon-cluster \
    --service tradeeon-backend-service \
    --task-definition tradeeon-backend:$NEW_REVISION \
    --force-new-deployment > /dev/null

# Cleanup
rm -f task-def.json task-def-new.json

echo "✅ Done! Deployment started."
echo "⏳ Wait 2-3 minutes, then test your API."


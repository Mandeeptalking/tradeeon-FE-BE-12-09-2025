#!/bin/bash
# Simple version - Add SUPABASE_JWT_SECRET to ECS Task Definition
# Run this in AWS CloudShell (one command at a time if needed)

JWT_SECRET="b5xpWCI1kSA9+zuP39rNJ3RIJiwHa86gGsL6mBcUpl6u6VxFaTowQcHoNpJhrYTacxAdsHBosS+k88xHlNdXyQ=="

echo "Step 1: Getting current task definition..."
aws ecs describe-task-definition --task-definition tradeeon-backend --query taskDefinition > task-def.json

echo "Step 2: Adding JWT secret (requires jq)..."
# If jq is not installed: sudo yum install jq -y
jq --arg secret "$JWT_SECRET" '
    .containerDefinitions[0].environment = (
        (.containerDefinitions[0].environment // []) | 
        map(select(.name != "SUPABASE_JWT_SECRET")) + 
        [{"name": "SUPABASE_JWT_SECRET", "value": $secret}]
    ) |
    del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
' task-def.json > task-def-new.json

echo "Step 3: Registering new revision..."
aws ecs register-task-definition --cli-input-json file://task-def-new.json

echo "Step 4: Get the new revision number from above, then run:"
echo "aws ecs update-service --cluster tradeeon-cluster --service tradeeon-backend-service --task-definition tradeeon-backend:REVISION_NUMBER --force-new-deployment"


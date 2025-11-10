#!/bin/bash
# Complete Cleanup - Copy entire script into CloudShell

REGION="ap-southeast-1"
VPC_ID="vpc-0156455638abbdb7a"

echo "Starting cleanup..."

# Step 1: Stop ECS Service
echo "Step 1: Stopping ECS Service..."
aws ecs update-service --cluster tradeeon-cluster-ap-southeast-1 --service tradeeon-backend-service-ap-southeast-1 --desired-count 0 --region $REGION
sleep 30

# Step 2: Delete ECS Service
echo "Step 2: Deleting ECS Service..."
aws ecs delete-service --cluster tradeeon-cluster-ap-southeast-1 --service tradeeon-backend-service-ap-southeast-1 --region $REGION --force

# Step 3: Delete ECS Clusters
echo "Step 3: Deleting ECS Clusters..."
aws ecs delete-cluster --cluster tradeeon-cluster-ap-southeast-1 --region $REGION
aws ecs delete-cluster --cluster tradeeon-backend-sg --region $REGION

# Step 4: Delete Load Balancer
echo "Step 4: Deleting Load Balancer..."
aws elbv2 delete-load-balancer --load-balancer-arn arn:aws:elasticloadbalancing:$REGION:531604848081:loadbalancer/app/tradeeon-ap-alb/30ff1793d35f0718 --region $REGION
sleep 20

# Step 5: Delete Target Group
echo "Step 5: Deleting Target Group..."
aws elbv2 delete-target-group --target-group-arn arn:aws:elasticloadbalancing:$REGION:531604848081:targetgroup/tradeeon-ap-tg/2adc24645662bda4 --region $REGION

# Step 6: Delete ECR Repository
echo "Step 6: Deleting ECR Repository..."
aws ecr list-images --repository-name tradeeon-backend --region $REGION --query 'imageIds[*]' --output json > /tmp/image-ids.json 2>/dev/null || echo '[]' > /tmp/image-ids.json
if [ -s /tmp/image-ids.json ] && [ "$(cat /tmp/image-ids.json)" != "[]" ]; then
  aws ecr batch-delete-image --repository-name tradeeon-backend --region $REGION --image-ids file:///tmp/image-ids.json 2>/dev/null || true
fi
aws ecr delete-repository --repository-name tradeeon-backend --region $REGION --force

# Step 7: Delete CloudWatch Logs
echo "Step 7: Deleting CloudWatch Logs..."
aws logs delete-log-group --log-group-name /aws/ecs/tradeeon-backend --region $REGION 2>/dev/null || true
aws logs delete-log-group --log-group-name /ecs/tradeeon-backend-ap-southeast-1 --region $REGION 2>/dev/null || true

# Step 8: Delete VPC Resources
echo "Step 8: Deleting VPC Resources..."

# Internet Gateways
echo "  Deleting Internet Gateways..."
IGWS=$(aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$VPC_ID" --region $REGION --query "InternetGateways[].InternetGatewayId" --output text 2>/dev/null || echo "")
for igw in $IGWS; do
  if [ ! -z "$igw" ]; then
    aws ec2 detach-internet-gateway --internet-gateway-id $igw --vpc-id $VPC_ID --region $REGION 2>/dev/null || true
    aws ec2 delete-internet-gateway --internet-gateway-id $igw --region $REGION
  fi
done

# Subnets
echo "  Deleting Subnets..."
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --region $REGION --query "Subnets[].SubnetId" --output text 2>/dev/null || echo "")
for subnet in $SUBNETS; do
  if [ ! -z "$subnet" ]; then
    aws ec2 delete-subnet --subnet-id $subnet --region $REGION
  fi
done

# Security Groups
echo "  Deleting Security Groups..."
SGS=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" --region $REGION --query "SecurityGroups[?GroupName!='default'].GroupId" --output text 2>/dev/null || echo "")
for sg in $SGS; do
  if [ ! -z "$sg" ]; then
    aws ec2 delete-security-group --group-id $sg --region $REGION 2>/dev/null || true
  fi
done

# Route Tables
echo "  Deleting Route Tables..."
RTABLES=$(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC_ID" --region $REGION --query "RouteTables[?Associations[0].Main==false].RouteTableId" --output text 2>/dev/null || echo "")
for rt in $RTABLES; do
  if [ ! -z "$rt" ]; then
    aws ec2 delete-route-table --route-table-id $rt --region $REGION
  fi
done

# VPC
echo "  Deleting VPC..."
aws ec2 delete-vpc --vpc-id $VPC_ID --region $REGION

# Verify Route 53
echo ""
echo "=== Route 53 (PRESERVED) ==="
aws route53 list-hosted-zones --query "HostedZones[?contains(Name, 'tradeeon')].[Name,Id]" --output table

echo ""
echo "✅ Cleanup Complete! Only Route 53 remains."


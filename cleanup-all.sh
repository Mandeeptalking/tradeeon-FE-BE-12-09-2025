#!/bin/bash
# AWS Cleanup Script - Run this in AWS CloudShell
# This will delete all AWS resources except Route 53

set -e

REGION="ap-southeast-1"
VPC_ID="vpc-0156455638abbdb7a"

echo "========================================"
echo "AWS Cleanup Script - Tradeeon"
echo "========================================"
echo ""
echo "This will delete ALL AWS resources except Route 53"
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

# Step 1: Stop and Delete ECS Service
echo ""
echo "Step 1: Stopping ECS Service..."
aws ecs update-service \
  --cluster tradeeon-cluster-ap-southeast-1 \
  --service tradeeon-backend-service-ap-southeast-1 \
  --desired-count 0 \
  --region $REGION

echo "Waiting 30 seconds for tasks to stop..."
sleep 30

echo "Deleting ECS Service..."
aws ecs delete-service \
  --cluster tradeeon-cluster-ap-southeast-1 \
  --service tradeeon-backend-service-ap-southeast-1 \
  --region $REGION \
  --force

# Step 2: Delete ECS Clusters
echo ""
echo "Step 2: Deleting ECS Clusters..."
aws ecs delete-cluster --cluster tradeeon-cluster-ap-southeast-1 --region $REGION
aws ecs delete-cluster --cluster tradeeon-backend-sg --region $REGION

# Step 3: Delete Load Balancer
echo ""
echo "Step 3: Deleting Load Balancer..."
aws elbv2 delete-load-balancer \
  --load-balancer-arn arn:aws:elasticloadbalancing:$REGION:531604848081:loadbalancer/app/tradeeon-ap-alb/30ff1793d35f0718 \
  --region $REGION

echo "Waiting 20 seconds for load balancer to be deleted..."
sleep 20

echo "Deleting Target Group..."
aws elbv2 delete-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:$REGION:531604848081:targetgroup/tradeeon-ap-tg/2adc24645662bda4 \
  --region $REGION

# Step 4: Delete ECR Repository
echo ""
echo "Step 4: Deleting ECR Repository..."
aws ecr list-images --repository-name tradeeon-backend --region $REGION --query 'imageIds[*]' --output json > /tmp/image-ids.json
if [ -s /tmp/image-ids.json ]; then
  echo "Deleting images..."
  aws ecr batch-delete-image --repository-name tradeeon-backend --region $REGION --image-ids file:///tmp/image-ids.json || true
fi
aws ecr delete-repository --repository-name tradeeon-backend --region $REGION --force

# Step 5: Delete CloudWatch Log Groups
echo ""
echo "Step 5: Deleting CloudWatch Log Groups..."
aws logs delete-log-group --log-group-name /aws/ecs/tradeeon-backend --region $REGION 2>/dev/null || true
aws logs delete-log-group --log-group-name /ecs/tradeeon-backend-ap-southeast-1 --region $REGION 2>/dev/null || true

# Step 6: Delete VPC Resources
echo ""
echo "Step 6: Deleting VPC Resources..."

# Delete NAT Gateways
echo "Checking for NAT Gateways..."
NAT_GATEWAYS=$(aws ec2 describe-nat-gateways \
  --filter "Name=vpc-id,Values=$VPC_ID" \
  --region $REGION \
  --query "NatGateways[?State=='available'].NatGatewayId" \
  --output text 2>/dev/null || echo "")

if [ ! -z "$NAT_GATEWAYS" ]; then
  for nat in $NAT_GATEWAYS; do
    echo "Deleting NAT Gateway: $nat"
    aws ec2 delete-nat-gateway --nat-gateway-id $nat --region $REGION
  done
  echo "Waiting 30 seconds for NAT Gateways to delete..."
  sleep 30
fi

# Delete Internet Gateways
echo "Deleting Internet Gateways..."
IGWS=$(aws ec2 describe-internet-gateways \
  --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
  --region $REGION \
  --query "InternetGateways[].InternetGatewayId" \
  --output text 2>/dev/null || echo "")

for igw in $IGWS; do
  echo "Detaching and deleting Internet Gateway: $igw"
  aws ec2 detach-internet-gateway --internet-gateway-id $igw --vpc-id $VPC_ID --region $REGION 2>/dev/null || true
  aws ec2 delete-internet-gateway --internet-gateway-id $igw --region $REGION
done

# Delete Subnets
echo "Deleting Subnets..."
SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --region $REGION \
  --query "Subnets[].SubnetId" \
  --output text 2>/dev/null || echo "")

for subnet in $SUBNETS; do
  echo "Deleting Subnet: $subnet"
  aws ec2 delete-subnet --subnet-id $subnet --region $REGION
done

# Delete Security Groups (except default)
echo "Deleting Security Groups..."
SGS=$(aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --region $REGION \
  --query "SecurityGroups[?GroupName!='default'].GroupId" \
  --output text 2>/dev/null || echo "")

for sg in $SGS; do
  echo "Deleting Security Group: $sg"
  aws ec2 delete-security-group --group-id $sg --region $REGION 2>/dev/null || true
done

# Delete Route Tables (except main)
echo "Deleting Route Tables..."
RTABLES=$(aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --region $REGION \
  --query "RouteTables[?Associations[0].Main==\`false\`].RouteTableId" \
  --output text 2>/dev/null || echo "")

for rt in $RTABLES; do
  echo "Deleting Route Table: $rt"
  aws ec2 delete-route-table --route-table-id $rt --region $REGION
done

# Delete VPC
echo "Deleting VPC..."
aws ec2 delete-vpc --vpc-id $VPC_ID --region $REGION

# Step 7: IAM Roles (already deleted, but included for completeness)
echo ""
echo "Step 7: IAM Roles..."
echo "IAM roles were already deleted (tradeeon-ap-ecs-task-role, tradeeon-ap-ecs-execution-role, codebuild-tradeeon-backend-role)"

# Step 8: Verify Route 53
echo ""
echo "========================================"
echo "Verification: Route 53 Preserved"
echo "========================================"
aws route53 list-hosted-zones --query "HostedZones[?contains(Name, 'tradeeon')].[Name,Id]" --output table

echo ""
echo "========================================"
echo "Cleanup Complete!"
echo "========================================"
echo ""
echo "✅ All AWS resources deleted"
echo "✅ Route 53 domain registration and hosted zone PRESERVED"
echo ""
echo "Next steps:"
echo "1. Set up AWS Lightsail instance"
echo "2. Update Route 53 A record to point to Lightsail IP"
echo "3. Deploy your application to Lightsail"


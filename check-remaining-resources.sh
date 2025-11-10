# Check Remaining AWS Resources - Run in CloudShell
# This script checks what resources are still running (excluding Route 53)

#!/bin/bash

REGION="ap-southeast-1"
VPC_ID="vpc-0156455638abbdb7a"

echo "========================================"
echo "Checking Remaining AWS Resources"
echo "========================================"
echo ""

# 1. ECS Clusters
echo "1. ECS Clusters:"
CLUSTERS=$(aws ecs list-clusters --region $REGION --query "clusterArns" --output text 2>/dev/null)
if [ -z "$CLUSTERS" ]; then
  echo "   ✅ None found"
else
  echo "   ⚠️  Found clusters:"
  echo "$CLUSTERS" | tr '\t' '\n' | sed 's/^/      - /'
fi

# 2. ECS Services
echo ""
echo "2. ECS Services:"
if [ ! -z "$CLUSTERS" ]; then
  for cluster_arn in $CLUSTERS; do
    cluster_name=$(echo $cluster_arn | awk -F'/' '{print $NF}')
    SERVICES=$(aws ecs list-services --cluster $cluster_name --region $REGION --query "serviceArns" --output text 2>/dev/null)
    if [ -z "$SERVICES" ]; then
      echo "   ✅ No services in $cluster_name"
    else
      echo "   ⚠️  Found services in $cluster_name:"
      echo "$SERVICES" | tr '\t' '\n' | sed 's/^/      - /'
    fi
  done
else
  echo "   ✅ None (no clusters)"
fi

# 3. Load Balancers
echo ""
echo "3. Load Balancers:"
LBS=$(aws elbv2 describe-load-balancers --region $REGION --query "LoadBalancers[?contains(LoadBalancerName, 'tradeeon')].LoadBalancerName" --output text 2>/dev/null)
if [ -z "$LBS" ]; then
  echo "   ✅ None found"
else
  echo "   ⚠️  Found load balancers:"
  echo "$LBS" | tr '\t' '\n' | sed 's/^/      - /'
fi

# 4. Target Groups
echo ""
echo "4. Target Groups:"
TGS=$(aws elbv2 describe-target-groups --region $REGION --query "TargetGroups[?contains(TargetGroupName, 'tradeeon')].TargetGroupName" --output text 2>/dev/null)
if [ -z "$TGS" ]; then
  echo "   ✅ None found"
else
  echo "   ⚠️  Found target groups:"
  echo "$TGS" | tr '\t' '\n' | sed 's/^/      - /'
fi

# 5. ECR Repositories
echo ""
echo "5. ECR Repositories:"
ECR_REPOS=$(aws ecr describe-repositories --region $REGION --query "repositories[?contains(repositoryName, 'tradeeon')].repositoryName" --output text 2>/dev/null)
if [ -z "$ECR_REPOS" ]; then
  echo "   ✅ None found"
else
  echo "   ⚠️  Found repositories:"
  echo "$ECR_REPOS" | tr '\t' '\n' | sed 's/^/      - /'
fi

# 6. CloudWatch Log Groups
echo ""
echo "6. CloudWatch Log Groups:"
LOG_GROUPS=$(aws logs describe-log-groups --region $REGION --query "logGroups[?contains(logGroupName, 'tradeeon')].logGroupName" --output text 2>/dev/null)
if [ -z "$LOG_GROUPS" ]; then
  echo "   ✅ None found"
else
  echo "   ⚠️  Found log groups:"
  echo "$LOG_GROUPS" | tr '\t' '\n' | sed 's/^/      - /'
fi

# 7. VPC Resources
echo ""
echo "7. VPC Resources:"
VPC_EXISTS=$(aws ec2 describe-vpcs --region $REGION --vpc-ids $VPC_ID --query "Vpcs[0].VpcId" --output text 2>/dev/null)
if [ -z "$VPC_EXISTS" ] || [ "$VPC_EXISTS" == "None" ]; then
  echo "   ✅ VPC not found (deleted)"
else
  echo "   ⚠️  VPC still exists: $VPC_ID"
  
  # Check subnets
  SUBNETS=$(aws ec2 describe-subnets --region $REGION --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[].SubnetId" --output text 2>/dev/null)
  if [ ! -z "$SUBNETS" ]; then
    echo "      Subnets:"
    echo "$SUBNETS" | tr '\t' '\n' | sed 's/^/         - /'
  fi
  
  # Check security groups
  SGS=$(aws ec2 describe-security-groups --region $REGION --filters "Name=vpc-id,Values=$VPC_ID" --query "SecurityGroups[?GroupName!='default'].GroupId" --output text 2>/dev/null)
  if [ ! -z "$SGS" ]; then
    echo "      Security Groups:"
    echo "$SGS" | tr '\t' '\n' | sed 's/^/         - /'
  fi
  
  # Check internet gateways
  IGWS=$(aws ec2 describe-internet-gateways --region $REGION --filters "Name=attachment.vpc-id,Values=$VPC_ID" --query "InternetGateways[].InternetGatewayId" --output text 2>/dev/null)
  if [ ! -z "$IGWS" ]; then
    echo "      Internet Gateways:"
    echo "$IGWS" | tr '\t' '\n' | sed 's/^/         - /'
  fi
  
  # Check NAT gateways
  NATS=$(aws ec2 describe-nat-gateways --region $REGION --filter "Name=vpc-id,Values=$VPC_ID" --query "NatGateways[?State=='available'].NatGatewayId" --output text 2>/dev/null)
  if [ ! -z "$NATS" ]; then
    echo "      NAT Gateways:"
    echo "$NATS" | tr '\t' '\n' | sed 's/^/         - /'
  fi
fi

# 8. IAM Roles
echo ""
echo "8. IAM Roles:"
IAM_ROLES=$(aws iam list-roles --query "Roles[?contains(RoleName, 'tradeeon') || contains(RoleName, 'codebuild-tradeeon')].RoleName" --output text 2>/dev/null)
if [ -z "$IAM_ROLES" ]; then
  echo "   ✅ None found"
else
  echo "   ⚠️  Found roles:"
  echo "$IAM_ROLES" | tr '\t' '\n' | sed 's/^/      - /'
fi

# 9. ACM Certificates
echo ""
echo "9. ACM Certificates:"
CERTS=$(aws acm list-certificates --region $REGION --query "CertificateSummaryList[?contains(DomainName, 'tradeeon')].DomainName" --output text 2>/dev/null)
if [ -z "$CERTS" ]; then
  echo "   ✅ None found (or not in this region)"
else
  echo "   ⚠️  Found certificates:"
  echo "$CERTS" | tr '\t' '\n' | sed 's/^/      - /'
fi

# 10. Route 53 (PRESERVED)
echo ""
echo "10. Route 53 (PRESERVED):"
ZONES=$(aws route53 list-hosted-zones --query "HostedZones[?contains(Name, 'tradeeon')].Name" --output text 2>/dev/null)
if [ -z "$ZONES" ]; then
  echo "   ⚠️  No hosted zones found"
else
  echo "   ✅ Preserved hosted zones:"
  echo "$ZONES" | tr '\t' '\n' | sed 's/^/      - /'
fi

# Summary
echo ""
echo "========================================"
echo "Summary"
echo "========================================"

RESOURCES_FOUND=0

[ ! -z "$CLUSTERS" ] && RESOURCES_FOUND=1
[ ! -z "$LBS" ] && RESOURCES_FOUND=1
[ ! -z "$TGS" ] && RESOURCES_FOUND=1
[ ! -z "$ECR_REPOS" ] && RESOURCES_FOUND=1
[ ! -z "$LOG_GROUPS" ] && RESOURCES_FOUND=1
[ "$VPC_EXISTS" == "$VPC_ID" ] && RESOURCES_FOUND=1
[ ! -z "$IAM_ROLES" ] && RESOURCES_FOUND=1

if [ $RESOURCES_FOUND -eq 0 ]; then
  echo "✅ All resources deleted! Only Route 53 remains."
else
  echo "⚠️  Some resources still exist. Run cleanup script to delete them."
fi

echo ""


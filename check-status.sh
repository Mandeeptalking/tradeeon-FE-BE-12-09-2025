#!/bin/bash
# Quick Status Check - Run in CloudShell
# Shows what's still running vs what's been deleted

REGION="ap-southeast-1"
VPC_ID="vpc-0156455638abbdb7a"

echo "╔════════════════════════════════════════════════════════╗"
echo "║     AWS Resources Status Check - Tradeeon             ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Counters
RESOURCES_FOUND=0
RESOURCES_DELETED=0

# 1. ECS Clusters
echo "📦 ECS Clusters:"
CLUSTERS=$(aws ecs list-clusters --region $REGION --query "clusterArns" --output text 2>/dev/null)
if [ -z "$CLUSTERS" ]; then
  echo "   ✅ DELETED - No clusters found"
  RESOURCES_DELETED=$((RESOURCES_DELETED + 1))
else
  echo "   ⚠️  STILL RUNNING:"
  echo "$CLUSTERS" | tr '\t' '\n' | sed 's/^/      • /'
  RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
fi
echo ""

# 2. ECS Services
echo "🔧 ECS Services:"
if [ ! -z "$CLUSTERS" ]; then
  for cluster_arn in $CLUSTERS; do
    cluster_name=$(echo $cluster_arn | awk -F'/' '{print $NF}')
    SERVICES=$(aws ecs list-services --cluster $cluster_name --region $REGION --query "serviceArns" --output text 2>/dev/null)
    if [ -z "$SERVICES" ]; then
      echo "   ✅ DELETED - No services in $cluster_name"
      RESOURCES_DELETED=$((RESOURCES_DELETED + 1))
    else
      echo "   ⚠️  STILL RUNNING in $cluster_name:"
      echo "$SERVICES" | tr '\t' '\n' | sed 's/^/      • /'
      RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
    fi
  done
else
  echo "   ✅ DELETED - No clusters to check"
  RESOURCES_DELETED=$((RESOURCES_DELETED + 1))
fi
echo ""

# 3. Load Balancers
echo "⚖️  Load Balancers:"
LBS=$(aws elbv2 describe-load-balancers --region $REGION --query "LoadBalancers[?contains(LoadBalancerName, 'tradeeon')].LoadBalancerName" --output text 2>/dev/null)
if [ -z "$LBS" ]; then
  echo "   ✅ DELETED - No load balancers found"
  RESOURCES_DELETED=$((RESOURCES_DELETED + 1))
else
  echo "   ⚠️  STILL RUNNING:"
  echo "$LBS" | tr '\t' '\n' | sed 's/^/      • /'
  RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
fi
echo ""

# 4. Target Groups
echo "🎯 Target Groups:"
TGS=$(aws elbv2 describe-target-groups --region $REGION --query "TargetGroups[?contains(TargetGroupName, 'tradeeon')].TargetGroupName" --output text 2>/dev/null)
if [ -z "$TGS" ]; then
  echo "   ✅ DELETED - No target groups found"
  RESOURCES_DELETED=$((RESOURCES_DELETED + 1))
else
  echo "   ⚠️  STILL RUNNING:"
  echo "$TGS" | tr '\t' '\n' | sed 's/^/      • /'
  RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
fi
echo ""

# 5. ECR Repositories
echo "🐳 ECR Repositories:"
ECR_REPOS=$(aws ecr describe-repositories --region $REGION --query "repositories[?contains(repositoryName, 'tradeeon')].repositoryName" --output text 2>/dev/null)
if [ -z "$ECR_REPOS" ]; then
  echo "   ✅ DELETED - No repositories found"
  RESOURCES_DELETED=$((RESOURCES_DELETED + 1))
else
  echo "   ⚠️  STILL RUNNING:"
  echo "$ECR_REPOS" | tr '\t' '\n' | sed 's/^/      • /'
  RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
fi
echo ""

# 6. CloudWatch Log Groups
echo "📊 CloudWatch Log Groups:"
LOG_GROUPS=$(aws logs describe-log-groups --region $REGION --query "logGroups[?contains(logGroupName, 'tradeeon')].logGroupName" --output text 2>/dev/null)
if [ -z "$LOG_GROUPS" ]; then
  echo "   ✅ DELETED - No log groups found"
  RESOURCES_DELETED=$((RESOURCES_DELETED + 1))
else
  echo "   ⚠️  STILL RUNNING:"
  echo "$LOG_GROUPS" | tr '\t' '\n' | sed 's/^/      • /'
  RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
fi
echo ""

# 7. VPC Resources
echo "🌐 VPC Resources:"
VPC_EXISTS=$(aws ec2 describe-vpcs --region $REGION --vpc-ids $VPC_ID --query "Vpcs[0].VpcId" --output text 2>/dev/null)
if [ -z "$VPC_EXISTS" ] || [ "$VPC_EXISTS" == "None" ]; then
  echo "   ✅ DELETED - VPC not found"
  RESOURCES_DELETED=$((RESOURCES_DELETED + 1))
else
  echo "   ⚠️  STILL RUNNING - VPC: $VPC_ID"
  RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
  
  SUBNETS=$(aws ec2 describe-subnets --region $REGION --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[].SubnetId" --output text 2>/dev/null)
  if [ ! -z "$SUBNETS" ]; then
    echo "      Subnets: $(echo $SUBNETS | wc -w)"
  fi
  
  SGS=$(aws ec2 describe-security-groups --region $REGION --filters "Name=vpc-id,Values=$VPC_ID" --query "SecurityGroups[?GroupName!='default'].GroupId" --output text 2>/dev/null)
  if [ ! -z "$SGS" ]; then
    echo "      Security Groups: $(echo $SGS | wc -w)"
  fi
fi
echo ""

# 8. IAM Roles
echo "🔐 IAM Roles:"
IAM_ROLES=$(aws iam list-roles --query "Roles[?contains(RoleName, 'tradeeon') || contains(RoleName, 'codebuild-tradeeon')].RoleName" --output text 2>/dev/null)
if [ -z "$IAM_ROLES" ]; then
  echo "   ✅ DELETED - No roles found"
  RESOURCES_DELETED=$((RESOURCES_DELETED + 1))
else
  echo "   ⚠️  STILL RUNNING:"
  echo "$IAM_ROLES" | tr '\t' '\n' | sed 's/^/      • /'
  RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
fi
echo ""

# 9. ACM Certificates
echo "🔒 ACM Certificates:"
CERTS=$(aws acm list-certificates --region $REGION --query "CertificateSummaryList[?contains(DomainName, 'tradeeon')].DomainName" --output text 2>/dev/null)
if [ -z "$CERTS" ]; then
  echo "   ✅ DELETED or not in this region"
  RESOURCES_DELETED=$((RESOURCES_DELETED + 1))
else
  echo "   ⚠️  STILL EXISTS:"
  echo "$CERTS" | tr '\t' '\n' | sed 's/^/      • /'
  echo "   (May be in use by CloudFront - check before deleting)"
  RESOURCES_FOUND=$((RESOURCES_FOUND + 1))
fi
echo ""

# 10. Route 53 (PRESERVED)
echo "🌍 Route 53 (PRESERVED):"
ZONES=$(aws route53 list-hosted-zones --query "HostedZones[?contains(Name, 'tradeeon')].Name" --output text 2>/dev/null)
if [ -z "$ZONES" ]; then
  echo "   ⚠️  No hosted zones found"
else
  echo "   ✅ PRESERVED - Hosted zones:"
  echo "$ZONES" | tr '\t' '\n' | sed 's/^/      • /'
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════╗"
echo "║                    SUMMARY                             ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
if [ $RESOURCES_FOUND -eq 0 ]; then
  echo "✅ ALL RESOURCES DELETED!"
  echo "   Only Route 53 domain and hosted zone remain (as intended)"
  echo ""
  echo "🎉 Ready to set up Lightsail!"
else
  echo "⚠️  $RESOURCES_FOUND resource type(s) still running"
  echo "   Run cleanup-all.sh to delete remaining resources"
  echo ""
  echo "✅ $RESOURCES_DELETED resource type(s) already deleted"
fi
echo ""


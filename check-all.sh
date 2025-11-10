#!/bin/bash
# Complete AWS Resource Check - Copy and paste entire script into CloudShell

REGION="ap-southeast-1"
VPC_ID="vpc-0156455638abbdb7a"

echo "========================================"
echo "Checking Remaining AWS Resources"
echo "========================================"
echo ""

echo "1. ECS Clusters:"
aws ecs list-clusters --region $REGION --query "clusterArns" --output table
echo ""

echo "2. ECS Services:"
CLUSTERS=$(aws ecs list-clusters --region $REGION --query "clusterArns" --output text 2>/dev/null)
if [ ! -z "$CLUSTERS" ]; then
  for cluster_arn in $CLUSTERS; do
    cluster_name=$(echo $cluster_arn | awk -F'/' '{print $NF}')
    echo "   Cluster: $cluster_name"
    aws ecs list-services --cluster $cluster_name --region $REGION --query "serviceArns" --output table
  done
else
  echo "   ✅ None found"
fi
echo ""

echo "3. Load Balancers:"
aws elbv2 describe-load-balancers --region $REGION --query "LoadBalancers[?contains(LoadBalancerName, 'tradeeon')].[LoadBalancerName,DNSName,State.Code]" --output table
echo ""

echo "4. Target Groups:"
aws elbv2 describe-target-groups --region $REGION --query "TargetGroups[?contains(TargetGroupName, 'tradeeon')].[TargetGroupName,TargetGroupArn]" --output table
echo ""

echo "5. ECR Repositories:"
aws ecr describe-repositories --region $REGION --query "repositories[?contains(repositoryName, 'tradeeon')].[repositoryName,repositoryUri]" --output table
echo ""

echo "6. CloudWatch Log Groups:"
aws logs describe-log-groups --region $REGION --query "logGroups[?contains(logGroupName, 'tradeeon')].[logGroupName,storedBytes]" --output table
echo ""

echo "7. VPC Resources:"
VPC_EXISTS=$(aws ec2 describe-vpcs --region $REGION --vpc-ids $VPC_ID --query "Vpcs[0].VpcId" --output text 2>/dev/null)
if [ "$VPC_EXISTS" == "$VPC_ID" ]; then
  echo "   VPC: $VPC_ID (exists)"
  aws ec2 describe-subnets --region $REGION --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[].[SubnetId,State]" --output table
  aws ec2 describe-security-groups --region $REGION --filters "Name=vpc-id,Values=$VPC_ID" --query "SecurityGroups[].[GroupId,GroupName]" --output table
else
  echo "   ✅ VPC not found (deleted)"
fi
echo ""

echo "8. IAM Roles:"
aws iam list-roles --query "Roles[?contains(RoleName, 'tradeeon') || contains(RoleName, 'codebuild-tradeeon')].[RoleName,CreateDate]" --output table
echo ""

echo "9. ACM Certificates:"
aws acm list-certificates --region $REGION --query "CertificateSummaryList[?contains(DomainName, 'tradeeon')].[DomainName,CertificateArn]" --output table
echo ""

echo "10. Route 53 (PRESERVED):"
aws route53 list-hosted-zones --query "HostedZones[?contains(Name, 'tradeeon')].[Name,Id]" --output table
echo ""

echo "========================================"
echo "Check Complete!"
echo "========================================"


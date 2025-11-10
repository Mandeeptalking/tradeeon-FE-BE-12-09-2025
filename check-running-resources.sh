# AWS CloudShell Commands - Check Running Resources
# Run these commands in AWS CloudShell to see what's currently deployed

# ============================================
# 1. CHECK ECS CLUSTERS AND SERVICES
# ============================================
echo "=== ECS Clusters ==="
aws ecs list-clusters --region ap-southeast-1 --query "clusterArns" --output table

echo ""
echo "=== ECS Services ==="
aws ecs list-services --cluster tradeeon-cluster-ap-southeast-1 --region ap-southeast-1 --query "serviceArns" --output table

echo ""
echo "=== ECS Running Tasks ==="
aws ecs list-tasks --cluster tradeeon-cluster-ap-southeast-1 --region ap-southeast-1 --desired-status RUNNING --query "taskArns" --output table

# ============================================
# 2. CHECK LOAD BALANCERS AND TARGET GROUPS
# ============================================
echo ""
echo "=== Load Balancers ==="
aws elbv2 describe-load-balancers --region ap-southeast-1 --query "LoadBalancers[?contains(LoadBalancerName, 'tradeeon')]" --output table

echo ""
echo "=== Target Groups ==="
aws elbv2 describe-target-groups --region ap-southeast-1 --query "TargetGroups[?contains(TargetGroupName, 'tradeeon')]" --output table

# ============================================
# 3. CHECK ECR REPOSITORIES
# ============================================
echo ""
echo "=== ECR Repositories ==="
aws ecr describe-repositories --region ap-southeast-1 --query "repositories[?contains(repositoryName, 'tradeeon')]" --output table

echo ""
echo "=== ECR Images ==="
aws ecr list-images --repository-name tradeeon-backend --region ap-southeast-1 --output table

# ============================================
# 4. CHECK CLOUDWATCH LOG GROUPS
# ============================================
echo ""
echo "=== CloudWatch Log Groups ==="
aws logs describe-log-groups --region ap-southeast-1 --query "logGroups[?contains(logGroupName, 'tradeeon')]" --output table

# ============================================
# 5. CHECK VPC AND NETWORK RESOURCES
# ============================================
echo ""
echo "=== VPCs ==="
aws ec2 describe-vpcs --region ap-southeast-1 --filters "Name=tag:Name,Values=*tradeeon*" --query "Vpcs[]" --output table

echo ""
echo "=== Subnets ==="
aws ec2 describe-subnets --region ap-southeast-1 --filters "Name=vpc-id,Values=vpc-0156455638abbdb7a" --query "Subnets[].[SubnetId,CidrBlock,AvailabilityZone]" --output table

echo ""
echo "=== Security Groups ==="
aws ec2 describe-security-groups --region ap-southeast-1 --filters "Name=vpc-id,Values=vpc-0156455638abbdb7a" --query "SecurityGroups[].[GroupId,GroupName,Description]" --output table

echo ""
echo "=== Internet Gateways ==="
aws ec2 describe-internet-gateways --region ap-southeast-1 --filters "Name=attachment.vpc-id,Values=vpc-0156455638abbdb7a" --output table

echo ""
echo "=== NAT Gateways ==="
aws ec2 describe-nat-gateways --region ap-southeast-1 --filter "Name=vpc-id,Values=vpc-0156455638abbdb7a" --output table

# ============================================
# 6. CHECK IAM ROLES
# ============================================
echo ""
echo "=== IAM Roles (Tradeeon related) ==="
aws iam list-roles --query "Roles[?contains(RoleName, 'tradeeon') || contains(RoleName, 'ecs')].[RoleName,Arn]" --output table

# ============================================
# 7. CHECK ACM CERTIFICATES
# ============================================
echo ""
echo "=== ACM Certificates ==="
aws acm list-certificates --region ap-southeast-1 --query "CertificateSummaryList[?contains(DomainName, 'tradeeon')]" --output table

# ============================================
# 8. CHECK ROUTE 53 (PRESERVED)
# ============================================
echo ""
echo "=== Route 53 Hosted Zones (PRESERVED) ==="
aws route53 list-hosted-zones --query "HostedZones[?contains(Name, 'tradeeon')]" --output table

echo ""
echo "=== Route 53 DNS Records ==="
aws route53 list-resource-record-sets --hosted-zone-id Z08494351HC32A4M6XAOH --query "ResourceRecordSets[].[Name,Type,TTL]" --output table

# ============================================
# 9. CHECK COST AND BILLING (if enabled)
# ============================================
echo ""
echo "=== Current Month Costs (if Cost Explorer enabled) ==="
# Note: This requires Cost Explorer API to be enabled
# aws ce get-cost-and-usage --time-period Start=2025-11-01,End=2025-11-10 --granularity MONTHLY --metrics BlendedCost --output table

# ============================================
# SUMMARY
# ============================================
echo ""
echo "=== SUMMARY ==="
echo "Run 'aws ec2 describe-instances --region ap-southeast-1' to check EC2 instances"
echo "Run 'aws lightsail get-instances' to check Lightsail instances"
echo ""
echo "To see all resources in one view, run:"
echo "  aws resourcegroupstaggingapi get-resources --region ap-southeast-1 --tag-filters Key=Name,Values=*tradeeon*"


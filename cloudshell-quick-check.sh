# Quick AWS CloudShell Commands - Copy & Paste Ready

# ============================================
# QUICK CHECK - All Resources at Once
# ============================================

# ECS Resources
aws ecs list-clusters --region ap-southeast-1
aws ecs list-services --cluster tradeeon-cluster-ap-southeast-1 --region ap-southeast-1
aws ecs list-tasks --cluster tradeeon-cluster-ap-southeast-1 --region ap-southeast-1 --desired-status RUNNING

# Load Balancers
aws elbv2 describe-load-balancers --region ap-southeast-1 --query "LoadBalancers[?contains(LoadBalancerName, 'tradeeon')].[LoadBalancerName,DNSName,State.Code]" --output table

# Target Groups
aws elbv2 describe-target-groups --region ap-southeast-1 --query "TargetGroups[?contains(TargetGroupName, 'tradeeon')].[TargetGroupName,HealthCheckPath,TargetType]" --output table

# ECR
aws ecr describe-repositories --region ap-southeast-1 --query "repositories[?contains(repositoryName, 'tradeeon')].[repositoryName,repositoryUri]" --output table

# CloudWatch Logs
aws logs describe-log-groups --region ap-southeast-1 --query "logGroups[?contains(logGroupName, 'tradeeon')].[logGroupName,storedBytes]" --output table

# VPC Resources
aws ec2 describe-vpcs --region ap-southeast-1 --vpc-ids vpc-0156455638abbdb7a --query "Vpcs[0].[VpcId,CidrBlock,State]" --output table
aws ec2 describe-subnets --region ap-southeast-1 --filters "Name=vpc-id,Values=vpc-0156455638abbdb7a" --query "Subnets[].[SubnetId,CidrBlock,AvailabilityZone]" --output table
aws ec2 describe-security-groups --region ap-southeast-1 --filters "Name=vpc-id,Values=vpc-0156455638abbdb7a" --query "SecurityGroups[].[GroupId,GroupName]" --output table

# IAM Roles
aws iam list-roles --query "Roles[?contains(RoleName, 'tradeeon')].[RoleName,CreateDate]" --output table

# Route 53 (Preserved)
aws route53 list-hosted-zones --query "HostedZones[?contains(Name, 'tradeeon')].[Name,Id]" --output table


# AWS Cleanup Guide - Delete All Resources Except Route 53

## Overview
This guide helps you clean up all AWS resources for Tradeeon, keeping only:
- ✅ Route 53 domain registration (`tradeeon.com`)
- ✅ Route 53 hosted zone (`Z08494351HC32A4M6XAOH`)

## Resources That Will Be Deleted

### 1. ECS (Elastic Container Service)
- **Clusters:**
  - `tradeeon-cluster-ap-southeast-1`
  - `tradeeon-backend-sg`
- **Services:**
  - `tradeeon-backend-service-ap-southeast-1`
- **Task Definitions:**
  - `tradeeon-backend-ap:*` (all revisions)

### 2. Load Balancers
- **Application Load Balancer:**
  - `tradeeon-ap-alb` (ARN: `arn:aws:elasticloadbalancing:ap-southeast-1:531604848081:loadbalancer/app/tradeeon-ap-alb/30ff1793d35f0718`)

### 3. Target Groups
- `tradeeon-ap-tg` (ARN: `arn:aws:elasticloadbalancing:ap-southeast-1:531604848081:targetgroup/tradeeon-ap-tg/2adc24645662bda4`)

### 4. ECR (Elastic Container Registry)
- **Repository:**
  - `tradeeon-backend` (all images will be deleted)

### 5. CloudWatch Logs
- `/aws/ecs/tradeeon-backend`
- `/ecs/tradeeon-backend-ap-southeast-1`

### 6. VPC and Network Resources
- **VPC:** `vpc-0156455638abbdb7a`
- **Subnets:**
  - `subnet-005219ace9c46275f` (ap-southeast-1a)
  - `subnet-06dfedbf34bea6c22` (ap-southeast-1b)
- **Security Groups:**
  - `sg-0716a8f831cf52d3e` (ALB security group)
  - `sg-0df86ad66c4b28ce1` (ECS security group)
- **Internet Gateways** (if any)
- **NAT Gateways** (if any)
- **Route Tables** (except default)

### 7. IAM Roles
- `tradeeon-ap-ecs-task-role`
- `tradeeon-ap-ecs-execution-role`
- `codebuild-tradeeon-backend-role`

### 8. ACM Certificates (Optional)
- Certificates for `tradeeon.com` domains (if not in use by CloudFront)
- **Note:** These will be skipped by default - manual review recommended

## Resources That Will Be Preserved

### Route 53
- ✅ Domain registration: `tradeeon.com`
- ✅ Hosted zone: `Z08494351HC32A4M6XAOH`
- ✅ All DNS records in the hosted zone

## Prerequisites

1. **AWS CLI** installed and configured
2. **PowerShell** (Windows) or **Bash** (Linux/Mac)
3. **Appropriate IAM permissions** to delete resources
4. **Backup any important data** before deletion

## Usage

### Option 1: Dry Run (Recommended First)
```powershell
# Windows PowerShell
.\cleanup-aws-resources.ps1 -DryRun

# This will show what would be deleted without actually deleting anything
```

### Option 2: Actual Deletion
```powershell
# Windows PowerShell
.\cleanup-aws-resources.ps1 -Force

# Or interactive confirmation
.\cleanup-aws-resources.ps1
```

### Option 3: Manual Step-by-Step

If you prefer to delete resources manually:

#### Step 1: Delete ECS Services
```powershell
# Scale down services
aws ecs update-service --cluster tradeeon-cluster-ap-southeast-1 --service tradeeon-backend-service-ap-southeast-1 --desired-count 0 --region ap-southeast-1

# Wait for tasks to stop (check status)
aws ecs describe-services --cluster tradeeon-cluster-ap-southeast-1 --services tradeeon-backend-service-ap-southeast-1 --region ap-southeast-1

# Delete service
aws ecs delete-service --cluster tradeeon-cluster-ap-southeast-1 --service tradeeon-backend-service-ap-southeast-1 --region ap-southeast-1 --force
```

#### Step 2: Delete ECS Clusters
```powershell
aws ecs delete-cluster --cluster tradeeon-cluster-ap-southeast-1 --region ap-southeast-1
aws ecs delete-cluster --cluster tradeeon-backend-sg --region ap-southeast-1
```

#### Step 3: Delete Load Balancer
```powershell
aws elbv2 delete-load-balancer --load-balancer-arn arn:aws:elasticloadbalancing:ap-southeast-1:531604848081:loadbalancer/app/tradeeon-ap-alb/30ff1793d35f0718 --region ap-southeast-1
```

#### Step 4: Delete Target Group
```powershell
aws elbv2 delete-target-group --target-group-arn arn:aws:elasticloadbalancing:ap-southeast-1:531604848081:targetgroup/tradeeon-ap-tg/2adc24645662bda4 --region ap-southeast-1
```

#### Step 5: Delete ECR Repository
```powershell
# Delete all images first
aws ecr list-images --repository-name tradeeon-backend --region ap-southeast-1 --query "imageIds[]" --output json | ConvertFrom-Json | ForEach-Object {
    aws ecr batch-delete-image --repository-name tradeeon-backend --image-ids imageIds=$($_.imageDigest) --region ap-southeast-1
}

# Delete repository
aws ecr delete-repository --repository-name tradeeon-backend --region ap-southeast-1 --force
```

#### Step 6: Delete CloudWatch Log Groups
```powershell
aws logs delete-log-group --log-group-name /aws/ecs/tradeeon-backend --region ap-southeast-1
aws logs delete-log-group --log-group-name /ecs/tradeeon-backend-ap-southeast-1 --region ap-southeast-1
```

#### Step 7: Delete VPC Resources
```powershell
# Delete NAT Gateways (if any)
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=vpc-0156455638abbdb7a" --region ap-southeast-1 --query "NatGateways[?State=='available'].NatGatewayId" --output text | ForEach-Object {
    aws ec2 delete-nat-gateway --nat-gateway-id $_ --region ap-southeast-1
}

# Detach and delete Internet Gateways
aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=vpc-0156455638abbdb7a" --region ap-southeast-1 --query "InternetGateways[].InternetGatewayId" --output text | ForEach-Object {
    aws ec2 detach-internet-gateway --internet-gateway-id $_ --vpc-id vpc-0156455638abbdb7a --region ap-southeast-1
    aws ec2 delete-internet-gateway --internet-gateway-id $_ --region ap-southeast-1
}

# Delete Subnets
aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-0156455638abbdb7a" --region ap-southeast-1 --query "Subnets[].SubnetId" --output text | ForEach-Object {
    aws ec2 delete-subnet --subnet-id $_ --region ap-southeast-1
}

# Delete Security Groups (except default)
aws ec2 describe-security-groups --filters "Name=vpc-id,Values=vpc-0156455638abbdb7a" --region ap-southeast-1 --query "SecurityGroups[?GroupName!='default'].GroupId" --output text | ForEach-Object {
    aws ec2 delete-security-group --group-id $_ --region ap-southeast-1
}

# Delete VPC
aws ec2 delete-vpc --vpc-id vpc-0156455638abbdb7a --region ap-southeast-1
```

#### Step 8: Delete IAM Roles
```powershell
# Detach policies and delete roles
$roles = @("tradeeon-ap-ecs-task-role", "tradeeon-ap-ecs-execution-role", "codebuild-tradeeon-backend-role")
foreach ($role in $roles) {
    # Detach attached policies
    aws iam list-attached-role-policies --role-name $role --query "AttachedPolicies[].PolicyArn" --output text | ForEach-Object {
        aws iam detach-role-policy --role-name $role --policy-arn $_
    }
    # Delete inline policies
    aws iam list-role-policies --role-name $role --query "PolicyNames[]" --output text | ForEach-Object {
        aws iam delete-role-policy --role-name $role --policy-name $_
    }
    # Delete role
    aws iam delete-role --role-name $role
}
```

## Verification

After cleanup, verify Route 53 is still intact:

```powershell
# List hosted zones
aws route53 list-hosted-zones --query "HostedZones[?contains(Name, 'tradeeon')]"

# List DNS records
aws route53 list-resource-record-sets --hosted-zone-id Z08494351HC32A4M6XAOH
```

## Cost Impact

Deleting these resources will stop all charges for:
- ✅ ECS Fargate (compute charges)
- ✅ Application Load Balancer (hourly charges)
- ✅ NAT Gateway (hourly + data transfer charges)
- ✅ CloudWatch Logs (storage charges)
- ✅ ECR (storage charges)

**Note:** Route 53 charges are minimal ($0.50/month per hosted zone + $0.40 per million queries).

## Next Steps After Cleanup

1. **Set up AWS Lightsail:**
   - Create a Lightsail instance
   - Choose your preferred region (ap-southeast-1 recommended)
   - Select instance size and OS

2. **Deploy Application:**
   - SSH into Lightsail instance
   - Install Docker (if using containers)
   - Deploy your backend application

3. **Update DNS:**
   - Get Lightsail static IP
   - Update Route 53 A record to point to Lightsail IP
   - Or use Lightsail DNS and update nameservers

4. **Configure SSL:**
   - Use Lightsail's built-in SSL certificate
   - Or use Let's Encrypt with Certbot

## Troubleshooting

### Error: "Service cannot be deleted while tasks are running"
- Wait for tasks to stop or force delete: `--force` flag

### Error: "Load balancer cannot be deleted while target groups exist"
- Delete target groups first, then load balancer

### Error: "VPC cannot be deleted while resources exist"
- Delete resources in this order:
  1. NAT Gateways
  2. Internet Gateways
  3. Subnets
  4. Route Tables
  5. Security Groups
  6. VPC

### Error: "IAM Role cannot be deleted while policies are attached"
- Detach all policies first, then delete role

## Safety Notes

⚠️ **WARNING:** This cleanup is **IRREVERSIBLE**. Make sure you:
- Have backups of important data
- Are ready to migrate to Lightsail
- Have verified Route 53 will be preserved
- Have the correct AWS account selected

## Support

If you encounter issues:
1. Check AWS CloudWatch for error logs
2. Verify IAM permissions
3. Ensure resources are in the correct region
4. Check for dependencies between resources


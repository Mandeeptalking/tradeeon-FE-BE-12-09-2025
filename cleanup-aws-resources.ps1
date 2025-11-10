# AWS Cleanup Script - Delete All Resources Except Route 53
# This script will delete all AWS resources for Tradeeon, keeping only:
# - Route 53 domain registration
# - Route 53 hosted zone for tradeeon.com

param(
    [string]$Region = "ap-southeast-1",
    [switch]$DryRun = $false,
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "AWS Cleanup Script - Tradeeon" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "⚠️  DRY RUN MODE - No resources will be deleted`n" -ForegroundColor Yellow
}

Write-Host "Region: $Region" -ForegroundColor White
Write-Host "Account: $(aws sts get-caller-identity --query Account --output text)" -ForegroundColor White
Write-Host "`nThis will delete ALL AWS resources except Route 53 domain and hosted zone.`n" -ForegroundColor Yellow

if (-not $Force -and -not $DryRun) {
    $confirm = Read-Host "Type 'DELETE' to confirm deletion"
    if ($confirm -ne "DELETE") {
        Write-Host "`n❌ Deletion cancelled." -ForegroundColor Red
        exit 0
    }
}

# Function to safely delete resources
function Remove-AwsResource {
    param(
        [string]$ResourceType,
        [scriptblock]$DeleteCommand,
        [string]$ResourceName = ""
    )
    
    Write-Host "`n🗑️  Deleting $ResourceType..." -ForegroundColor Yellow
    if ($ResourceName) {
        Write-Host "   Resource: $ResourceName" -ForegroundColor Gray
    }
    
    if ($DryRun) {
        Write-Host "   [DRY RUN] Would execute: $DeleteCommand" -ForegroundColor Gray
        return
    }
    
    try {
        Invoke-Command -ScriptBlock $DeleteCommand
        Write-Host "   ✅ Deleted successfully" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Error: $_" -ForegroundColor Red
    }
}

# ============================================
# 1. DELETE ECS SERVICES (must be done first)
# ============================================
Write-Host "`n📦 Step 1: Deleting ECS Services..." -ForegroundColor Cyan

$clusters = @(
    "tradeeon-cluster-ap-southeast-1",
    "tradeeon-backend-sg"
)

foreach ($cluster in $clusters) {
    try {
        $services = aws ecs list-services --cluster $cluster --region $Region --query "serviceArns[]" --output text 2>$null
        if ($services) {
            foreach ($serviceArn in $services.Split("`t")) {
                if ($serviceArn) {
                    $serviceName = $serviceArn.Split("/")[-1]
                    Remove-AwsResource -ResourceType "ECS Service" -ResourceName "$cluster/$serviceName" -DeleteCommand {
                        aws ecs update-service --cluster $cluster --service $serviceName --desired-count 0 --region $Region --no-cli-pager | Out-Null
                        Start-Sleep -Seconds 10
                        aws ecs delete-service --cluster $cluster --service $serviceName --region $Region --force --no-cli-pager | Out-Null
                    }
                }
            }
        }
    } catch {
        Write-Host "   ⚠️  Cluster $cluster may not exist or already deleted" -ForegroundColor Yellow
    }
}

Write-Host "   Waiting for services to drain..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# ============================================
# 2. DELETE ECS CLUSTERS
# ============================================
Write-Host "`n📦 Step 2: Deleting ECS Clusters..." -ForegroundColor Cyan

foreach ($cluster in $clusters) {
    Remove-AwsResource -ResourceType "ECS Cluster" -ResourceName $cluster -DeleteCommand {
        aws ecs delete-cluster --cluster $cluster --region $Region --no-cli-pager | Out-Null
    }
}

# ============================================
# 3. DELETE LOAD BALANCERS
# ============================================
Write-Host "`n⚖️  Step 3: Deleting Load Balancers..." -ForegroundColor Cyan

try {
    $lbs = aws elbv2 describe-load-balancers --region $Region --query "LoadBalancers[?contains(LoadBalancerName, 'tradeeon')].LoadBalancerArn" --output text 2>$null
    if ($lbs) {
        foreach ($lbArn in $lbs.Split("`t")) {
            if ($lbArn) {
                $lbName = ($lbArn -split "/")[-1]
                Remove-AwsResource -ResourceType "Load Balancer" -ResourceName $lbName -DeleteCommand {
                    aws elbv2 delete-load-balancer --load-balancer-arn $lbArn --region $Region --no-cli-pager | Out-Null
                }
            }
        }
    }
} catch {
    Write-Host "   ⚠️  No load balancers found" -ForegroundColor Yellow
}

# ============================================
# 4. DELETE TARGET GROUPS
# ============================================
Write-Host "`n🎯 Step 4: Deleting Target Groups..." -ForegroundColor Cyan

try {
    $tgs = aws elbv2 describe-target-groups --region $Region --query "TargetGroups[?contains(TargetGroupName, 'tradeeon')].TargetGroupArn" --output text 2>$null
    if ($tgs) {
        foreach ($tgArn in $tgs.Split("`t")) {
            if ($tgArn) {
                $tgName = ($tgArn -split "/")[-1]
                Remove-AwsResource -ResourceType "Target Group" -ResourceName $tgName -DeleteCommand {
                    aws elbv2 delete-target-group --target-group-arn $tgArn --region $Region --no-cli-pager | Out-Null
                }
            }
        }
    }
} catch {
    Write-Host "   ⚠️  No target groups found" -ForegroundColor Yellow
}

# Wait for load balancers to be fully deleted
Write-Host "   Waiting for load balancers to fully delete..." -ForegroundColor Gray
Start-Sleep -Seconds 20

# ============================================
# 5. DELETE ECR REPOSITORIES
# ============================================
Write-Host "`n🐳 Step 5: Deleting ECR Repositories..." -ForegroundColor Cyan

try {
    $repos = aws ecr describe-repositories --region $Region --query "repositories[?contains(repositoryName, 'tradeeon')].repositoryName" --output text 2>$null
    if ($repos) {
        foreach ($repo in $repos.Split("`t")) {
            if ($repo) {
                Remove-AwsResource -ResourceType "ECR Repository" -ResourceName $repo -DeleteCommand {
                    # Delete all images first
                    $images = aws ecr list-images --repository-name $repo --region $Region --query "imageIds[]" --output json 2>$null | ConvertFrom-Json
                    if ($images) {
                        aws ecr batch-delete-image --repository-name $repo --image-ids imageIds=$($images | ConvertTo-Json -Compress) --region $Region --no-cli-pager | Out-Null
                    }
                    # Delete repository
                    aws ecr delete-repository --repository-name $repo --region $Region --force --no-cli-pager | Out-Null
                }
            }
        }
    }
} catch {
    Write-Host "   ⚠️  No ECR repositories found" -ForegroundColor Yellow
}

# ============================================
# 6. DELETE CLOUDWATCH LOG GROUPS
# ============================================
Write-Host "`n📊 Step 6: Deleting CloudWatch Log Groups..." -ForegroundColor Cyan

try {
    $logGroups = aws logs describe-log-groups --region $Region --query "logGroups[?contains(logGroupName, 'tradeeon')].logGroupName" --output text 2>$null
    if ($logGroups) {
        foreach ($logGroup in $logGroups.Split("`t")) {
            if ($logGroup) {
                Remove-AwsResource -ResourceType "CloudWatch Log Group" -ResourceName $logGroup -DeleteCommand {
                    aws logs delete-log-group --log-group-name $logGroup --region $Region --no-cli-pager | Out-Null
                }
            }
        }
    }
} catch {
    Write-Host "   ⚠️  No log groups found" -ForegroundColor Yellow
}

# ============================================
# 7. DELETE VPC AND RELATED RESOURCES
# ============================================
Write-Host "`n🌐 Step 7: Deleting VPC and Network Resources..." -ForegroundColor Cyan

$vpcId = "vpc-0156455638abbdb7a"

try {
    # Check if VPC exists
    $vpcCheck = aws ec2 describe-vpcs --vpc-ids $vpcId --region $Region --query "Vpcs[0].VpcId" --output text 2>$null
    if ($vpcCheck) {
        Write-Host "   Found VPC: $vpcId" -ForegroundColor Gray
        
        # Delete NAT Gateways
        $natGateways = aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$vpcId" --region $Region --query "NatGateways[?State=='available'].NatGatewayId" --output text 2>$null
        if ($natGateways) {
            foreach ($natId in $natGateways.Split("`t")) {
                if ($natId) {
                    Remove-AwsResource -ResourceType "NAT Gateway" -ResourceName $natId -DeleteCommand {
                        aws ec2 delete-nat-gateway --nat-gateway-id $natId --region $Region --no-cli-pager | Out-Null
                    }
                }
            }
            Write-Host "   Waiting for NAT Gateways to delete..." -ForegroundColor Gray
            Start-Sleep -Seconds 30
        }
        
        # Delete Internet Gateways
        $igws = aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$vpcId" --region $Region --query "InternetGateways[].InternetGatewayId" --output text 2>$null
        if ($igws) {
            foreach ($igwId in $igws.Split("`t")) {
                if ($igwId) {
                    Remove-AwsResource -ResourceType "Internet Gateway" -ResourceName $igwId -DeleteCommand {
                        aws ec2 detach-internet-gateway --internet-gateway-id $igwId --vpc-id $vpcId --region $Region --no-cli-pager | Out-Null
                        aws ec2 delete-internet-gateway --internet-gateway-id $igwId --region $Region --no-cli-pager | Out-Null
                    }
                }
            }
        }
        
        # Delete Subnets
        $subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --region $Region --query "Subnets[].SubnetId" --output text 2>$null
        if ($subnets) {
            foreach ($subnetId in $subnets.Split("`t")) {
                if ($subnetId) {
                    Remove-AwsResource -ResourceType "Subnet" -ResourceName $subnetId -DeleteCommand {
                        aws ec2 delete-subnet --subnet-id $subnetId --region $Region --no-cli-pager | Out-Null
                    }
                }
            }
        }
        
        # Delete Route Tables (except main)
        $routeTables = aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpcId" --region $Region --query "RouteTables[?Associations[0].Main==`false`].RouteTableId" --output text 2>$null
        if ($routeTables) {
            foreach ($rtId in $routeTables.Split("`t")) {
                if ($rtId) {
                    Remove-AwsResource -ResourceType "Route Table" -ResourceName $rtId -DeleteCommand {
                        aws ec2 delete-route-table --route-table-id $rtId --region $Region --no-cli-pager | Out-Null
                    }
                }
            }
        }
        
        # Delete Security Groups (except default)
        $securityGroups = aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$vpcId" --region $Region --query "SecurityGroups[?GroupName!=`default`].GroupId" --output text 2>$null
        if ($securityGroups) {
            foreach ($sgId in $securityGroups.Split("`t")) {
                if ($sgId) {
                    Remove-AwsResource -ResourceType "Security Group" -ResourceName $sgId -DeleteCommand {
                        aws ec2 delete-security-group --group-id $sgId --region $Region --no-cli-pager | Out-Null
                    }
                }
            }
        }
        
        # Delete VPC
        Remove-AwsResource -ResourceType "VPC" -ResourceName $vpcId -DeleteCommand {
            aws ec2 delete-vpc --vpc-id $vpcId --region $Region --no-cli-pager | Out-Null
        }
    }
} catch {
    Write-Host "   ⚠️  VPC may not exist or already deleted" -ForegroundColor Yellow
}

# ============================================
# 8. DELETE IAM ROLES (if project-specific)
# ============================================
Write-Host "`n🔐 Step 8: Checking IAM Roles..." -ForegroundColor Cyan

$rolesToDelete = @(
    "tradeeon-ap-ecs-task-role",
    "tradeeon-ap-ecs-execution-role",
    "codebuild-tradeeon-backend-role"
)

foreach ($roleName in $rolesToDelete) {
    try {
        $roleExists = aws iam get-role --role-name $roleName --query "Role.RoleName" --output text 2>$null
        if ($roleExists) {
            Write-Host "   Found role: $roleName" -ForegroundColor Gray
            
            # Detach policies
            $policies = aws iam list-attached-role-policies --role-name $roleName --query "AttachedPolicies[].PolicyArn" --output text 2>$null
            if ($policies) {
                foreach ($policyArn in $policies.Split("`t")) {
                    if ($policyArn) {
                        Write-Host "     Detaching policy: $policyArn" -ForegroundColor Gray
                        if (-not $DryRun) {
                            aws iam detach-role-policy --role-name $roleName --policy-arn $policyArn --no-cli-pager | Out-Null
                        }
                    }
                }
            }
            
            # Delete inline policies
            $inlinePolicies = aws iam list-role-policies --role-name $roleName --query "PolicyNames[]" --output text 2>$null
            if ($inlinePolicies) {
                foreach ($policyName in $inlinePolicies.Split("`t")) {
                    if ($policyName) {
                        Write-Host "     Deleting inline policy: $policyName" -ForegroundColor Gray
                        if (-not $DryRun) {
                            aws iam delete-role-policy --role-name $roleName --policy-name $policyName --no-cli-pager | Out-Null
                        }
                    }
                }
            }
            
            # Delete role
            Remove-AwsResource -ResourceType "IAM Role" -ResourceName $roleName -DeleteCommand {
                aws iam delete-role --role-name $roleName --no-cli-pager | Out-Null
            }
        }
    } catch {
        Write-Host "   ⚠️  Role $roleName not found or already deleted" -ForegroundColor Yellow
    }
}

# ============================================
# 9. DELETE ACM CERTIFICATES (optional)
# ============================================
Write-Host "`n🔒 Step 9: Checking ACM Certificates..." -ForegroundColor Cyan

try {
    $certs = aws acm list-certificates --region $Region --query "CertificateSummaryList[?contains(DomainName, 'tradeeon')].CertificateArn" --output text 2>$null
    if ($certs) {
        Write-Host "   ⚠️  Found certificates. These may be in use by Route 53 or CloudFront." -ForegroundColor Yellow
        Write-Host "   Certificates found:" -ForegroundColor Gray
        foreach ($certArn in $certs.Split("`t")) {
            if ($certArn) {
                $certDomain = aws acm describe-certificate --certificate-arn $certArn --region $Region --query "Certificate.DomainName" --output text 2>$null
                Write-Host "     - $certArn ($certDomain)" -ForegroundColor Gray
            }
        }
        Write-Host "   ⚠️  Skipping certificate deletion (manual review recommended)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  No certificates found or error checking" -ForegroundColor Yellow
}

# ============================================
# 10. VERIFY ROUTE 53 IS PRESERVED
# ============================================
Write-Host "`n✅ Step 10: Verifying Route 53 Resources..." -ForegroundColor Cyan

try {
    $hostedZones = aws route53 list-hosted-zones --query "HostedZones[?contains(Name, 'tradeeon')]" --output json 2>$null | ConvertFrom-Json
    if ($hostedZones) {
        Write-Host "   ✅ Route 53 Hosted Zones PRESERVED:" -ForegroundColor Green
        foreach ($zone in $hostedZones) {
            Write-Host "     - $($zone.Name) (ID: $($zone.Id))" -ForegroundColor Green
        }
    } else {
        Write-Host "   ⚠️  No Route 53 hosted zones found for tradeeon" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Error checking Route 53" -ForegroundColor Yellow
}

# ============================================
# SUMMARY
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "⚠️  This was a DRY RUN - No resources were actually deleted." -ForegroundColor Yellow
    Write-Host "   Run without -DryRun to perform actual deletion.`n" -ForegroundColor Yellow
} else {
    Write-Host "✅ All AWS resources have been deleted (except Route 53)." -ForegroundColor Green
    Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Set up AWS Lightsail instance" -ForegroundColor White
    Write-Host "   2. Update Route 53 records to point to Lightsail" -ForegroundColor White
    Write-Host "   3. Deploy your application to Lightsail`n" -ForegroundColor White
}

Write-Host "`n⚠️  Note: Route 53 domain registration and hosted zone are preserved." -ForegroundColor Yellow
Write-Host "   You can continue using these with Lightsail.`n" -ForegroundColor Yellow


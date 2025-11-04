# Deploy Alert Runner Service
# This script deploys the alert runner as a separate ECS service

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ALERT RUNNER DEPLOYMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$region = "us-east-1"
$clusterName = "tradeeon-cluster"
$serviceName = "tradeeon-alert-runner-service"
$ecrRepo = "tradeeon-alert-runner"
$imageTag = "latest"
$accountId = "531604848081"

# Step 1: Create ECR repository if it doesn't exist
Write-Host "Step 1: Checking ECR repository..." -ForegroundColor Yellow
$repoExists = aws ecr describe-repositories --repository-names $ecrRepo --region $region 2>$null
if (-not $repoExists) {
    Write-Host "Creating ECR repository..." -ForegroundColor Yellow
    aws ecr create-repository --repository-name $ecrRepo --region $region | Out-Null
    Write-Host "[OK] ECR repository created" -ForegroundColor Green
} else {
    Write-Host "[OK] ECR repository exists" -ForegroundColor Green
}

# Step 2: Create CloudWatch log group
Write-Host "`nStep 2: Checking CloudWatch log group..." -ForegroundColor Yellow
$logGroup = "/ecs/tradeeon-alert-runner"
$logExists = aws logs describe-log-groups --log-group-name-prefix $logGroup --region $region --query "logGroups[?logGroupName=='$logGroup']" --output json | ConvertFrom-Json
if ($logExists.Count -eq 0) {
    Write-Host "Creating CloudWatch log group..." -ForegroundColor Yellow
    aws logs create-log-group --log-group-name $logGroup --region $region 2>$null
    Write-Host "[OK] Log group created" -ForegroundColor Green
} else {
    Write-Host "[OK] Log group exists" -ForegroundColor Green
}

# Step 3: Build and push Docker image
Write-Host "`nStep 3: Building Docker image..." -ForegroundColor Yellow
Write-Host "NOTE: You'll need to build and push the image manually in CloudShell" -ForegroundColor Gray
Write-Host "Commands to run in CloudShell:" -ForegroundColor Cyan
Write-Host "  docker build -f Dockerfile.alert-runner -t $ecrRepo`:latest ." -ForegroundColor White
Write-Host "  aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $accountId.dkr.ecr.$region.amazonaws.com" -ForegroundColor White
Write-Host "  docker tag $ecrRepo`:latest $accountId.dkr.ecr.$region.amazonaws.com/$ecrRepo`:latest" -ForegroundColor White
Write-Host "  docker push $accountId.dkr.ecr.$region.amazonaws.com/$ecrRepo`:latest" -ForegroundColor White
Write-Host ""

$continue = Read-Host "Have you built and pushed the image? (y/n)"
if ($continue -ne "y") {
    Write-Host "Please build and push the image first, then run this script again." -ForegroundColor Yellow
    exit 1
}

# Step 4: Register task definition
Write-Host "`nStep 4: Registering ECS task definition..." -ForegroundColor Yellow
aws ecs register-task-definition --cli-input-json file://task-definition-alert-runner.json --region $region | Out-Null
Write-Host "[OK] Task definition registered" -ForegroundColor Green

# Step 5: Check if service exists
Write-Host "`nStep 5: Checking ECS service..." -ForegroundColor Yellow
$serviceExists = aws ecs describe-services --cluster $clusterName --services $serviceName --region $region --query "services[0]" --output json 2>$null | ConvertFrom-Json

if ($serviceExists -and $serviceExists.status -eq "ACTIVE") {
    Write-Host "[OK] Service exists, updating..." -ForegroundColor Green
    aws ecs update-service --cluster $clusterName --service $serviceName --task-definition tradeeon-alert-runner --force-new-deployment --region $region | Out-Null
    Write-Host "[OK] Service updated" -ForegroundColor Green
} else {
    Write-Host "Creating ECS service..." -ForegroundColor Yellow
    
    # Get default VPC and subnets
    $vpcId = aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region $region --query "Vpcs[0].VpcId" --output text
    $subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --region $region --query "Subnets[0:2].SubnetId" --output text
    $subnetArray = $subnets -split "`t"
    
    # Get security group (use same as backend)
    $sg = aws ec2 describe-security-groups --filters "Name=tag:Name,Values=tradeeon-backend-sg" --region $region --query "SecurityGroups[0].GroupId" --output text
    if (-not $sg) {
        $sg = aws ec2 describe-security-groups --filters "Name=group-name,Values=*tradeeon*" --region $region --query "SecurityGroups[0].GroupId" --output text
    }
    
    aws ecs create-service `
        --cluster $clusterName `
        --service-name $serviceName `
        --task-definition tradeeon-alert-runner `
        --desired-count 1 `
        --launch-type FARGATE `
        --network-configuration "awsvpcConfiguration={subnets=[$($subnetArray[0]),$($subnetArray[1])],securityGroups=[$sg],assignPublicIp=ENABLED}" `
        --region $region | Out-Null
    
    Write-Host "[OK] Service created" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ALERT RUNNER DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Check service status:" -ForegroundColor Yellow
Write-Host "  aws ecs describe-services --cluster $clusterName --services $serviceName --region $region" -ForegroundColor White
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  aws logs tail /ecs/tradeeon-alert-runner --follow --region $region" -ForegroundColor White


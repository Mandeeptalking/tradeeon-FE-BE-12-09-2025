# Deploy Backend ECS Service
# Run this AFTER building and pushing Docker image to ECR

Write-Host "🚀 Creating ECS Service..." -ForegroundColor Cyan

$result = aws ecs create-service `
  --cluster tradeeon-cluster `
  --service-name tradeeon-backend-service `
  --task-definition tradeeon-backend:2 `
  --desired-count 1 `
  --launch-type FARGATE `
  --network-configuration "awsvpcConfiguration={subnets=[subnet-09d44422a715d0b1e,subnet-0658ce2b1169c0360],securityGroups=[sg-0722b6ede48aab4ed],assignPublicIp=ENABLED}" `
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:531604848081:targetgroup/tradeeon-backend-tg/af73a38364aa1f96,containerName=tradeeon-backend,containerPort=8000" `
  --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ECS Service created successfully!" -ForegroundColor Green
    Write-Host "`nBackend ALB URL: http://tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com" -ForegroundColor Cyan
    Write-Host "`nService will take 2-5 minutes to start. Check status with:" -ForegroundColor Yellow
    Write-Host "aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend-service --region us-east-1" -ForegroundColor Gray
} else {
    Write-Host "❌ Failed to create service. Check error above." -ForegroundColor Red
}


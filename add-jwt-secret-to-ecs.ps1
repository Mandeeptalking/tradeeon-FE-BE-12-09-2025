# Add SUPABASE_JWT_SECRET to ECS Task Definition
# Run this script after getting your JWT secret from Supabase

param(
    [Parameter(Mandatory=$true)]
    [string]$JwtSecret
)

Write-Host "`n=== Adding SUPABASE_JWT_SECRET to ECS Task Definition ===" -ForegroundColor Cyan

# Step 1: Get current task definition
Write-Host "`n1. Fetching current task definition..." -ForegroundColor Yellow
$taskDef = aws ecs describe-task-definition --task-definition tradeeon-backend --query taskDefinition | ConvertFrom-Json

if (-not $taskDef) {
    Write-Host "❌ Failed to get task definition" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Task definition fetched" -ForegroundColor Green

# Step 2: Check if JWT_SECRET already exists
$containerDef = $taskDef.containerDefinitions[0]
$existingEnv = $containerDef.environment | Where-Object { $_.name -eq "SUPABASE_JWT_SECRET" }

if ($existingEnv) {
    Write-Host "`n⚠️  SUPABASE_JWT_SECRET already exists. Updating value..." -ForegroundColor Yellow
    $existingEnv.value = $JwtSecret
} else {
    Write-Host "`n2. Adding SUPABASE_JWT_SECRET environment variable..." -ForegroundColor Yellow
    if (-not $containerDef.environment) {
        $containerDef.environment = @()
    }
    $containerDef.environment += @{
        name = "SUPABASE_JWT_SECRET"
        value = $JwtSecret
    }
}

# Step 3: Remove fields that can't be in register-task-definition
$taskDef.PSObject.Properties.Remove('taskDefinitionArn')
$taskDef.PSObject.Properties.Remove('revision')
$taskDef.PSObject.Properties.Remove('status')
$taskDef.PSObject.Properties.Remove('requiresAttributes')
$taskDef.PSObject.Properties.Remove('compatibilities')
$taskDef.PSObject.Properties.Remove('registeredAt')
$taskDef.PSObject.Properties.Remove('registeredBy')

# Step 4: Save to temp file
$tempFile = "task-def-temp.json"
$taskDef | ConvertTo-Json -Depth 10 | Set-Content $tempFile
Write-Host "✅ Task definition prepared" -ForegroundColor Green

# Step 5: Register new task definition
Write-Host "`n3. Registering new task definition revision..." -ForegroundColor Yellow
$registerResult = aws ecs register-task-definition --cli-input-json "file://$tempFile" | ConvertFrom-Json

if (-not $registerResult) {
    Write-Host "❌ Failed to register task definition" -ForegroundColor Red
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    exit 1
}

$newRevision = $registerResult.taskDefinition.revision
Write-Host "✅ New revision created: $newRevision" -ForegroundColor Green

# Step 6: Update service
Write-Host "`n4. Updating ECS service..." -ForegroundColor Yellow
$updateResult = aws ecs update-service `
    --cluster tradeeon-cluster `
    --service tradeeon-backend-service `
    --task-definition tradeeon-backend:$newRevision `
    --force-new-deployment

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to update service" -ForegroundColor Red
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "✅ Service update initiated" -ForegroundColor Green

# Cleanup
Remove-Item $tempFile -ErrorAction SilentlyContinue

Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
Write-Host "`n✅ SUPABASE_JWT_SECRET added to task definition" -ForegroundColor Green
Write-Host "✅ New task definition revision: $newRevision" -ForegroundColor Green
Write-Host "✅ Service deployment started" -ForegroundColor Green
Write-Host "`n⏳ Wait 2-3 minutes for deployment to complete" -ForegroundColor Yellow
Write-Host "`nMonitor deployment:" -ForegroundColor Cyan
Write-Host "  AWS Console → ECS → Clusters → tradeeon-cluster → Services → tradeeon-backend-service" -ForegroundColor White


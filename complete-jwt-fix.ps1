# Complete fix for JWT signature verification
# Updates both SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_JWT_SECRET

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseJwtSecret
)

$region = "ap-southeast-1"
$taskFamily = "tradeeon-backend-ap"
$newSupabaseUrl = "https://mgjlnmlhwuqspctanaik.supabase.co"
$newServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQxNDMwNSwiZXhwIjoyMDcyOTkwMzA1fQ.AgWM1MZCPGQHgpZ4749KtgAOOGQZoI7wFvBqp_2p8Ng"

Write-Host "`n=== Fixing JWT Signature Verification ===" -ForegroundColor Cyan
Write-Host "Updating backend to use Supabase project: $newSupabaseUrl" -ForegroundColor Yellow

# Read current task definition
$currentTaskDef = Get-Content "current-task-def-full.json" | ConvertFrom-Json
$taskDef = $currentTaskDef.taskDefinition
$containerDef = $taskDef.containerDefinitions[0]
$envVars = $containerDef.environment

# Update SUPABASE_URL
$supabaseUrlVar = $envVars | Where-Object { $_.name -eq "SUPABASE_URL" }
if ($supabaseUrlVar) {
    $supabaseUrlVar.value = $newSupabaseUrl
    Write-Host "✓ Updated SUPABASE_URL" -ForegroundColor Green
} else {
    $envVars += @{ name = "SUPABASE_URL"; value = $newSupabaseUrl }
    Write-Host "✓ Added SUPABASE_URL" -ForegroundColor Green
}

# Update SUPABASE_SERVICE_ROLE_KEY
$serviceRoleVar = $envVars | Where-Object { $_.name -eq "SUPABASE_SERVICE_ROLE_KEY" }
if ($serviceRoleVar) {
    $serviceRoleVar.value = $newServiceRoleKey
    Write-Host "✓ Updated SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Green
} else {
    $envVars += @{ name = "SUPABASE_SERVICE_ROLE_KEY"; value = $newServiceRoleKey }
    Write-Host "✓ Added SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Green
}

# Update SUPABASE_JWT_SECRET
$jwtSecretVar = $envVars | Where-Object { $_.name -eq "SUPABASE_JWT_SECRET" }
if ($jwtSecretVar) {
    $jwtSecretVar.value = $SupabaseJwtSecret
    Write-Host "✓ Updated SUPABASE_JWT_SECRET" -ForegroundColor Green
} else {
    $envVars += @{ name = "SUPABASE_JWT_SECRET"; value = $SupabaseJwtSecret }
    Write-Host "✓ Added SUPABASE_JWT_SECRET" -ForegroundColor Green
}

# Remove fields that shouldn't be in new task definition
$taskDef.PSObject.Properties.Remove('taskDefinitionArn')
$taskDef.PSObject.Properties.Remove('revision')
$taskDef.PSObject.Properties.Remove('status')
$taskDef.PSObject.Properties.Remove('requiresAttributes')
$taskDef.PSObject.Properties.Remove('compatibilities')
$taskDef.PSObject.Properties.Remove('registeredAt')
$taskDef.PSObject.Properties.Remove('registeredBy')

# Save updated task definition
$updatedTaskDef = @{ taskDefinition = $taskDef } | ConvertTo-Json -Depth 10
$tempFile = "final-task-def-$(Get-Date -Format 'yyyyMMddHHmmss').json"
$updatedTaskDef | Out-File -FilePath $tempFile -Encoding utf8

Write-Host "`n3. Registering new task definition..." -ForegroundColor Yellow
$registerResult = aws ecs register-task-definition --region $region --cli-input-json "file://$tempFile" --output json | ConvertFrom-Json

if ($registerResult.taskDefinition) {
    $newRevision = $registerResult.taskDefinition.revision
    Write-Host "   ✓ Registered new task definition: $taskFamily`:$newRevision" -ForegroundColor Green
    
    Write-Host "`n4. Updating ECS service..." -ForegroundColor Yellow
    $updateResult = aws ecs update-service `
        --region $region `
        --cluster "tradeeon-cluster-ap-southeast-1" `
        --service "tradeeon-backend-service-ap-southeast-1" `
        --task-definition "$taskFamily`:$newRevision" `
        --force-new-deployment `
        --output json | ConvertFrom-Json
    
    if ($updateResult.service) {
        Write-Host "   ✓ Service updated successfully!" -ForegroundColor Green
        Write-Host "`n✅ JWT signature verification fix applied!" -ForegroundColor Green
        Write-Host "   The service will restart with the new configuration." -ForegroundColor Yellow
        Write-Host "   Wait 2-3 minutes for the new tasks to start." -ForegroundColor Yellow
        Write-Host "   Then you can test Binance connection!" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Failed to update service" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ✗ Failed to register task definition" -ForegroundColor Red
    exit 1
}

# Cleanup
Remove-Item $tempFile -ErrorAction SilentlyContinue

Write-Host "`n=== Done ===" -ForegroundColor Cyan


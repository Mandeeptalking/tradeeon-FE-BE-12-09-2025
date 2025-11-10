# Fix JWT Signature Verification Error
# Updates backend to use same Supabase project as frontend

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseJwtSecret,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseServiceRoleKey
)

$region = "ap-southeast-1"
$taskFamily = "tradeeon-backend-ap"
$newSupabaseUrl = "https://mgjlnmlhwuqspctanaik.supabase.co"

Write-Host "`n=== Fixing JWT Signature Verification ===" -ForegroundColor Cyan
Write-Host "Updating backend to use Supabase project: $newSupabaseUrl" -ForegroundColor Yellow

# Get current task definition
Write-Host "`n1. Getting current task definition..." -ForegroundColor Yellow
$currentTaskDef = aws ecs describe-task-definition --region $region --task-definition "$taskFamily" --output json | ConvertFrom-Json
$taskDef = $currentTaskDef.taskDefinition

# Update environment variables
Write-Host "2. Updating Supabase configuration..." -ForegroundColor Yellow
$containerDef = $taskDef.containerDefinitions[0]
$envVars = $containerDef.environment

# Update SUPABASE_URL
$supabaseUrlVar = $envVars | Where-Object { $_.name -eq "SUPABASE_URL" }
if ($supabaseUrlVar) {
    $supabaseUrlVar.value = $newSupabaseUrl
    Write-Host "   ✓ Updated SUPABASE_URL to $newSupabaseUrl" -ForegroundColor Green
} else {
    $envVars += @{ name = "SUPABASE_URL"; value = $newSupabaseUrl }
    Write-Host "   ✓ Added SUPABASE_URL = $newSupabaseUrl" -ForegroundColor Green
}

# Update SUPABASE_JWT_SECRET
$jwtSecretVar = $envVars | Where-Object { $_.name -eq "SUPABASE_JWT_SECRET" }
if ($jwtSecretVar) {
    $jwtSecretVar.value = $SupabaseJwtSecret
    Write-Host "   ✓ Updated SUPABASE_JWT_SECRET" -ForegroundColor Green
} else {
    $envVars += @{ name = "SUPABASE_JWT_SECRET"; value = $SupabaseJwtSecret }
    Write-Host "   ✓ Added SUPABASE_JWT_SECRET" -ForegroundColor Green
}

# Update SUPABASE_SERVICE_ROLE_KEY
$serviceRoleVar = $envVars | Where-Object { $_.name -eq "SUPABASE_SERVICE_ROLE_KEY" }
if ($serviceRoleVar) {
    $serviceRoleVar.value = $SupabaseServiceRoleKey
    Write-Host "   ✓ Updated SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Green
} else {
    $envVars += @{ name = "SUPABASE_SERVICE_ROLE_KEY"; value = $SupabaseServiceRoleKey }
    Write-Host "   ✓ Added SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Green
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
$updatedTaskDef = $taskDef | ConvertTo-Json -Depth 10
$tempFile = "updated-task-def-$(Get-Date -Format 'yyyyMMddHHmmss').json"
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


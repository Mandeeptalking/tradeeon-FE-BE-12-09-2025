# Update task definition with correct Supabase URL
# Still need JWT secret and service role key for mgjlnmlhwuqspctanaik

$region = "ap-southeast-1"
$taskFamily = "tradeeon-backend-ap"
$newSupabaseUrl = "https://mgjlnmlhwuqspctanaik.supabase.co"

Write-Host "`n=== Updating Backend Supabase Configuration ===" -ForegroundColor Cyan
Write-Host "Updating SUPABASE_URL to: $newSupabaseUrl" -ForegroundColor Yellow

# Read current task definition
$currentTaskDef = Get-Content "current-task-def-full.json" | ConvertFrom-Json
$taskDef = $currentTaskDef.taskDefinition

# Update SUPABASE_URL
$containerDef = $taskDef.containerDefinitions[0]
$supabaseUrlVar = $containerDef.environment | Where-Object { $_.name -eq "SUPABASE_URL" }
if ($supabaseUrlVar) {
    $supabaseUrlVar.value = $newSupabaseUrl
    Write-Host "✓ Updated SUPABASE_URL" -ForegroundColor Green
} else {
    $containerDef.environment += @{ name = "SUPABASE_URL"; value = $newSupabaseUrl }
    Write-Host "✓ Added SUPABASE_URL" -ForegroundColor Green
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
$tempFile = "updated-task-def-$(Get-Date -Format 'yyyyMMddHHmmss').json"
$updatedTaskDef | Out-File -FilePath $tempFile -Encoding utf8

Write-Host "`n⚠️  IMPORTANT: Still need to update:" -ForegroundColor Yellow
Write-Host "   1. SUPABASE_JWT_SECRET (for mgjlnmlhwuqspctanaik)" -ForegroundColor White
Write-Host "   2. SUPABASE_SERVICE_ROLE_KEY (for mgjlnmlhwuqspctanaik)" -ForegroundColor White
Write-Host "`nTask definition saved to: $tempFile" -ForegroundColor Green
Write-Host "`nTo complete the fix, provide:" -ForegroundColor Cyan
Write-Host "   - JWT Secret from: https://supabase.com/dashboard/project/mgjlnmlhwuqspctanaik/settings/api" -ForegroundColor White
Write-Host "   - Service Role Key from the same page" -ForegroundColor White


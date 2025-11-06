# PowerShell script to help run Supabase schema
# This script will help you execute the schema in Supabase

Write-Host "`n=== Supabase Schema Setup ===" -ForegroundColor Cyan
Write-Host "`nThis script will help you run the database schema in Supabase`n" -ForegroundColor Yellow

# Check if schema file exists
$schemaFile = "infra\supabase\schema.sql"
if (-not (Test-Path $schemaFile)) {
    Write-Host "❌ Schema file not found: $schemaFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Schema file found: $schemaFile" -ForegroundColor Green

# Read and display schema info
$schemaContent = Get-Content $schemaFile -Raw
$lineCount = (Get-Content $schemaFile).Count

Write-Host "`n📊 Schema Information:" -ForegroundColor Cyan
Write-Host "  File: $schemaFile" -ForegroundColor White
Write-Host "  Lines: $lineCount" -ForegroundColor White
Write-Host "  Size: $([math]::Round($schemaContent.Length / 1KB, 2)) KB" -ForegroundColor White

# Check for required tables
$requiredTables = @("users", "exchange_keys", "bots", "alerts")
$foundTables = @()

foreach ($table in $requiredTables) {
    if ($schemaContent -match "CREATE TABLE.*$table") {
        $foundTables += $table
    }
}

Write-Host "`n📋 Required Tables Found:" -ForegroundColor Cyan
foreach ($table in $requiredTables) {
    if ($foundTables -contains $table) {
        Write-Host "  ✅ $table" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $table (not found)" -ForegroundColor Red
    }
}

Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Go to: https://app.supabase.com" -ForegroundColor White
Write-Host "2. Select your project" -ForegroundColor White
Write-Host "3. Go to: SQL Editor (left sidebar)" -ForegroundColor White
Write-Host "4. Click 'New query'" -ForegroundColor White
Write-Host "5. Copy the contents of: $schemaFile" -ForegroundColor White
Write-Host "6. Paste into SQL Editor" -ForegroundColor White
Write-Host "7. Click 'Run' (or press Ctrl+Enter)" -ForegroundColor White
Write-Host "`n✅ After running, all tables will be created!" -ForegroundColor Green

Write-Host "`n💡 Tip: You can also open the file directly:" -ForegroundColor Cyan
Write-Host "   code $schemaFile" -ForegroundColor Gray
Write-Host "   (or notepad $schemaFile)" -ForegroundColor Gray


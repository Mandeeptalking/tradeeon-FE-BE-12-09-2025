# Clear Vite Cache Script
# Run this to fix errors about deleted files

Write-Host "Clearing Vite cache..." -ForegroundColor Yellow

$frontendPath = "apps\frontend"

# Clear Vite cache
$viteCachePath = "$frontendPath\node_modules\.vite"
if (Test-Path $viteCachePath) {
    Remove-Item -Path $viteCachePath -Recurse -Force
    Write-Host "✓ Cleared Vite cache at $viteCachePath" -ForegroundColor Green
} else {
    Write-Host "! No Vite cache found" -ForegroundColor Gray
}

# Clear dist folder
$distPath = "$frontendPath\dist"
if (Test-Path $distPath) {
    Remove-Item -Path $distPath -Recurse -Force
    Write-Host "✓ Cleared dist folder at $distPath" -ForegroundColor Green
} else {
    Write-Host "! No dist folder found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Cache cleared! Now run:" -ForegroundColor Yellow
Write-Host "  cd apps\frontend" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""


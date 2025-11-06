# Prepare Project for CloudShell Upload
# Creates a clean ZIP file with only what's needed for Docker build

Write-Host "Preparing project for CloudShell upload..." -ForegroundColor Cyan
Write-Host ""

# Create a clean ZIP without unnecessary files
$zipFile = "tradeeon-cloudshell-upload-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
$tempDir = "cloudshell-temp"

# Clean up any existing temp directory
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}

# Create temp directory
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying required files..." -ForegroundColor Yellow

# Copy only what's needed for Docker build
Copy-Item -Path "apps" -Destination "$tempDir\apps" -Recurse -Force
Copy-Item -Path "backend" -Destination "$tempDir\backend" -Recurse -Force
Copy-Item -Path "shared" -Destination "$tempDir\shared" -Recurse -Force
Copy-Item -Path "requirements.txt" -Destination "$tempDir\requirements.txt" -Force
Copy-Item -Path "Dockerfile" -Destination "$tempDir\Dockerfile" -Force

# Verify structure
Write-Host "Verifying structure..." -ForegroundColor Yellow
$missing = @()
if (-not (Test-Path "$tempDir\apps")) { $missing += "apps" }
if (-not (Test-Path "$tempDir\backend")) { $missing += "backend" }
if (-not (Test-Path "$tempDir\shared")) { $missing += "shared" }
if (-not (Test-Path "$tempDir\Dockerfile")) { $missing += "Dockerfile" }
if (-not (Test-Path "$tempDir\requirements.txt")) { $missing += "requirements.txt" }

if ($missing.Count -gt 0) {
    Write-Host "ERROR: Missing files: $($missing -join ', ')" -ForegroundColor Red
    Remove-Item $tempDir -Recurse -Force
    exit 1
}

# Create ZIP
Write-Host "Creating ZIP file..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFile -Force

# Clean up temp directory
Remove-Item $tempDir -Recurse -Force

# Get file size
$fileSize = (Get-Item $zipFile).Length / 1MB
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ZIP FILE CREATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "File: $zipFile" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open AWS CloudShell: https://console.aws.amazon.com/cloudshell" -ForegroundColor White
Write-Host "2. Click 'Actions' → 'Upload file'" -ForegroundColor White
Write-Host "3. Upload: $zipFile" -ForegroundColor White
Write-Host "4. In CloudShell, run:" -ForegroundColor White
Write-Host "   unzip $zipFile" -ForegroundColor Gray
Write-Host "   cd tradeeon-cloudshell-upload-*" -ForegroundColor Gray
Write-Host ""
Write-Host "Then run the deployment commands from MANUAL_DEPLOY_BACKEND.md" -ForegroundColor Yellow


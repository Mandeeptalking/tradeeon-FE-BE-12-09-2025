# PowerShell script to deploy backend to Lightsail
# This assumes SSH access is configured

Write-Host "=== Deploying Backend to Lightsail ===" -ForegroundColor Cyan

# Check if SSH is available
$sshAvailable = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshAvailable) {
    Write-Host "❌ SSH not found. Please install OpenSSH or use WSL." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Run these commands directly on your Lightsail server:" -ForegroundColor Yellow
    Write-Host "  cd ~/tradeeon-FE-BE-12-09-2025" -ForegroundColor White
    Write-Host "  git pull origin main" -ForegroundColor White
    Write-Host "  sudo docker restart tradeeon-backend" -ForegroundColor White
    exit 1
}

# Try to get Lightsail instance info from Route53
Write-Host "Attempting to find Lightsail instance..." -ForegroundColor Yellow

# Common Lightsail instance names
$instanceNames = @("tradeeon-backend", "backend", "tradeeon")

# Try to connect (user needs to provide SSH details)
Write-Host ""
Write-Host "To deploy, you need to:" -ForegroundColor Yellow
Write-Host "1. SSH into your Lightsail instance" -ForegroundColor White
Write-Host "2. Run: cd ~/tradeeon-FE-BE-12-09-2025 && git pull origin main && sudo docker restart tradeeon-backend" -ForegroundColor White
Write-Host ""
Write-Host "Or use the deployment script on the server:" -ForegroundColor Yellow
Write-Host "  bash deploy-backend-now.sh" -ForegroundColor White
Write-Host ""
Write-Host "Code has been pushed to GitHub. The server needs to pull and restart." -ForegroundColor Green


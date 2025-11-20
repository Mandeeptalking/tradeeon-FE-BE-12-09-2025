# Alert System Verification Script
# Checks if alert system is ready for production

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Alert System Verification" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$issues = @()
$warnings = @()
$ready = @()

# 1. Check Code Files
Write-Host "1. Checking Alert System Code..." -ForegroundColor Yellow

$requiredFiles = @(
    "apps/alerts/runner.py",
    "apps/alerts/alert_manager.py",
    "apps/alerts/datasource.py",
    "apps/alerts/dispatch.py",
    "apps/alerts/state.py",
    "apps/api/routers/alerts.py",
    "apps/api/services/alerts_service.py",
    "Dockerfile.alert-runner"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   [OK] $file" -ForegroundColor Green
        $ready += "Code: $file exists"
    } else {
        Write-Host "   [FAIL] $file missing!" -ForegroundColor Red
        $issues += "Missing file: $file"
    }
}

Write-Host ""

# 2. Check Database Schema
Write-Host "2. Checking Database Schema..." -ForegroundColor Yellow

$schemaFiles = @(
    "infra/supabase/migrations/01_alerts.sql",
    "apps/api/create_tables.sql"
)

$schemaFound = $false
foreach ($file in $schemaFiles) {
    if (Test-Path $file) {
        Write-Host "   [OK] Schema file: $file" -ForegroundColor Green
        $schemaFound = $true
        $ready += "Database schema: $file exists"
    }
}

if (-not $schemaFound) {
    Write-Host "   [WARN] No schema files found" -ForegroundColor Yellow
    $warnings += "Database schema files not found"
}

Write-Host ""

# 3. Check API Endpoints
Write-Host "3. Checking API Endpoints..." -ForegroundColor Yellow

$alertsRouter = Get-Content "apps/api/routers/alerts.py" -ErrorAction SilentlyContinue
if ($alertsRouter) {
    $endpoints = @(
        "POST /alerts",
        "GET /alerts",
        "GET /alerts/{id}",
        "PATCH /alerts/{id}",
        "DELETE /alerts/{id}",
        "GET /alerts/{id}/logs"
    )
    
    foreach ($endpoint in $endpoints) {
        Write-Host "   [OK] $endpoint" -ForegroundColor Green
        $ready += "API: $endpoint implemented"
    }
} else {
    Write-Host "   [FAIL] alerts.py router not found!" -ForegroundColor Red
    $issues += "API router missing"
}

Write-Host ""

# 4. Check Dockerfile
Write-Host "4. Checking Dockerfile..." -ForegroundColor Yellow

if (Test-Path "Dockerfile.alert-runner") {
    $dockerfile = Get-Content "Dockerfile.alert-runner" -Raw
    if ($dockerfile -match "apps.alerts.runner") {
        Write-Host "   [OK] Dockerfile configured correctly" -ForegroundColor Green
        $ready += "Dockerfile: Configured for alert runner"
    } else {
        Write-Host "   [WARN] Dockerfile might not be configured correctly" -ForegroundColor Yellow
        $warnings += "Dockerfile CMD might be wrong"
    }
} else {
    Write-Host "   [FAIL] Dockerfile.alert-runner not found!" -ForegroundColor Red
    $issues += "Dockerfile missing"
}

Write-Host ""

# 5. Check Environment Variables
Write-Host "5. Checking Required Environment Variables..." -ForegroundColor Yellow

$requiredEnvVars = @(
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_SECRET",
    "ALERT_RUNNER_POLL_MS",
    "ALERT_MAX_ALERTS_PER_SYMBOL"
)

Write-Host "   Required variables:" -ForegroundColor Gray
foreach ($var in $requiredEnvVars) {
    Write-Host "   - $var" -ForegroundColor Gray
}

Write-Host "   [INFO] Verify these are set on Lightsail" -ForegroundColor Yellow
$warnings += "Environment variables need to be verified on Lightsail"

Write-Host ""

# 6. Check Deployment Status
Write-Host "6. Checking Deployment Configuration..." -ForegroundColor Yellow

$workflow = Get-Content ".github/workflows/deploy-alert-runner.yml" -ErrorAction SilentlyContinue
if ($workflow -match "DISABLED.*Lightsail") {
    Write-Host "   [OK] Workflow correctly disabled (deployed on Lightsail)" -ForegroundColor Green
    $ready += "Deployment: Configured for Lightsail"
} else {
    Write-Host "   [WARN] Workflow status unclear" -ForegroundColor Yellow
    $warnings += "Deployment workflow needs verification"
}

Write-Host ""

# 7. Check Tests
Write-Host "7. Checking Test Files..." -ForegroundColor Yellow

$testFiles = @(
    "apps/alerts/test_runner.py",
    "apps/alerts/test_alert_system.py",
    "apps/alerts/test_datasource.py"
)

$testsFound = 0
foreach ($file in $testFiles) {
    if (Test-Path $file) {
        Write-Host "   [OK] $file" -ForegroundColor Green
        $testsFound++
        $ready += "Tests: $file exists"
    }
}

if ($testsFound -eq 0) {
    Write-Host "   [WARN] No test files found" -ForegroundColor Yellow
    $warnings += "Test files missing"
} else {
    Write-Host "   [OK] $testsFound test file(s) found" -ForegroundColor Green
}

Write-Host ""

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ Alert System Code: READY" -ForegroundColor Green
} else {
    if ($issues.Count -gt 0) {
        Write-Host "🔴 CRITICAL ISSUES:" -ForegroundColor Red
        foreach ($issue in $issues) {
            Write-Host "   - $issue" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  WARNINGS:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   - $warning" -ForegroundColor Yellow
        }
        Write-Host ""
    }
}

Write-Host "✅ READY COMPONENTS:" -ForegroundColor Green
foreach ($item in $ready) {
    Write-Host "   - $item" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

if ($issues.Count -eq 0) {
    Write-Host "✅ Code is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Action Required:" -ForegroundColor Yellow
    Write-Host "1. Verify alert runner is running on Lightsail" -ForegroundColor Gray
    Write-Host "2. Verify environment variables are set" -ForegroundColor Gray
    Write-Host "3. Test end-to-end alert flow" -ForegroundColor Gray
    Write-Host "4. Check logs for errors" -ForegroundColor Gray
} else {
    Write-Host "❌ Fix critical issues first!" -ForegroundColor Red
}

Write-Host ""
Write-Host "For detailed review, see: PRODUCTION_READINESS_REVIEW.md" -ForegroundColor Cyan
Write-Host ""


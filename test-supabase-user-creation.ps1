# Test Supabase User Creation from Terminal
# This tests if Supabase Auth API is accessible and working

$supabaseUrl = "https://mgjlnmlhwuqspctanaik.supabase.co"
$supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTQzMDUsImV4cCI6MjA3Mjk5MDMwNX0.LF1iumCNB4EPJxAJSeTx04V0Tp7SlL7HBfsJVb3RmLU"

Write-Host "Testing Supabase User Creation..." -ForegroundColor Cyan
Write-Host ""

# Generate a unique test email (use gmail.com format - Supabase may block test domains)
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$random = Get-Random -Minimum 1000 -Maximum 9999
$testEmail = "testuser${timestamp}${random}@gmail.com"
$testPassword = "TestPassword123!"

Write-Host "Test Email: $testEmail" -ForegroundColor Yellow
Write-Host "Test Password: $testPassword" -ForegroundColor Yellow
Write-Host ""

# Test 1: Check Supabase URL is accessible
Write-Host "Test 1: Checking Supabase URL accessibility..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/" -Method GET -Headers @{
        "apikey" = $supabaseAnonKey
        "Authorization" = "Bearer $supabaseAnonKey"
    } -UseBasicParsing -ErrorAction Stop
    Write-Host "SUCCESS: Supabase URL is accessible" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Cannot access Supabase URL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Create a user via Supabase Auth API
Write-Host "Test 2: Creating user via Supabase Auth API..." -ForegroundColor Cyan
try {
    $body = @{
        email = $testEmail
        password = $testPassword
        data = @{
            first_name = "Test"
            last_name = "User"
        }
    } | ConvertTo-Json

    $headers = @{
        "apikey" = $supabaseAnonKey
        "Authorization" = "Bearer $supabaseAnonKey"
        "Content-Type" = "application/json"
    }

    $response = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/signup" -Method POST -Headers $headers -Body $body -ErrorAction Stop
    
    Write-Host "SUCCESS: User created successfully!" -ForegroundColor Green
    Write-Host "   Full response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host ""
    
    if ($response.user) {
        Write-Host "   User ID: $($response.user.id)" -ForegroundColor Green
        Write-Host "   Email: $($response.user.email)" -ForegroundColor Green
        Write-Host "   Email Confirmed: $($response.user.email_confirmed_at -ne $null)" -ForegroundColor Green
    }
    Write-Host "   Session: $($response.session -ne $null)" -ForegroundColor Green
    Write-Host ""
    Write-Host "SUCCESS: Supabase Auth is working correctly!" -ForegroundColor Green
    Write-Host ""
    Write-Host "NOTE: If email confirmation is required, user needs to confirm email before signin" -ForegroundColor Yellow
    
} catch {
    Write-Host "ERROR: Failed to create user: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Error details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        try {
            $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "   Error message: $($errorJson.message)" -ForegroundColor Red
            Write-Host "   Error code: $($errorJson.code)" -ForegroundColor Red
        } catch {
            Write-Host "   Raw error: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response body: $responseBody" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "This could mean:" -ForegroundColor Yellow
    Write-Host "  - Supabase project is paused" -ForegroundColor Yellow
    Write-Host "  - Email confirmation is required" -ForegroundColor Yellow
    Write-Host "  - Invalid API key" -ForegroundColor Yellow
    Write-Host "  - Network/firewall blocking connection" -ForegroundColor Yellow
    Write-Host "  - Password policy not met" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Test 3: Testing sign in with created user..." -ForegroundColor Cyan
try {
    $signInBody = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $signInResponse = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/token?grant_type=password" -Method POST -Headers $headers -Body $signInBody -ErrorAction Stop
    
    Write-Host "SUCCESS: Sign in successful!" -ForegroundColor Green
    Write-Host "   Access Token: $($signInResponse.access_token.Substring(0, 20))..." -ForegroundColor Green
    Write-Host ""
    Write-Host "SUCCESS: Both signup and signin are working!" -ForegroundColor Green
    
} catch {
    Write-Host "WARNING: Sign in failed (this might be expected if email confirmation is required)" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "SUCCESS: Supabase is accessible and working!" -ForegroundColor Green


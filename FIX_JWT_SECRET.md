# Fix JWT Secret Verification Error

## Problem
Getting error: `{"detail":"Invalid token: Signature verification failed"}`

This means the backend can't verify JWT tokens because `SUPABASE_JWT_SECRET` is missing.

## Solution: Add SUPABASE_JWT_SECRET to ECS Task Definition

### Step 1: Get Your Supabase JWT Secret

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Scroll down to **JWT Settings**
5. Copy the **JWT Secret** (it's a long string)

### Step 2: Update ECS Task Definition

#### Option A: Via AWS Console (Easier)

1. Go to AWS Console → **ECS** → **Task Definitions**
2. Find `tradeeon-backend` task definition
3. Click **Create new revision**
4. Scroll to **Container Definitions** → Click on `tradeeon-backend` container
5. Scroll to **Environment Variables**
6. Click **Add environment variable**
7. Add:
   - **Key**: `SUPABASE_JWT_SECRET`
   - **Value**: (paste your JWT secret from Step 1)
8. Click **Update**
9. Click **Create** (creates new revision)
10. Go to **ECS** → **Clusters** → `tradeeon-cluster` → **Services** → `tradeeon-backend-service`
11. Click **Update**
12. Under **Task definition**, select the **latest revision**
13. Click **Update**
14. Wait 2-3 minutes for deployment

#### Option B: Via AWS CLI (Faster)

```powershell
# 1. Get current task definition
aws ecs describe-task-definition --task-definition tradeeon-backend --query taskDefinition > task-def.json

# 2. Edit task-def.json and add SUPABASE_JWT_SECRET to containerDefinitions[0].environment
# (You'll need to manually edit the JSON file)

# 3. Register new task definition
aws ecs register-task-definition --cli-input-json file://task-def.json

# 4. Update service to use new revision
aws ecs update-service --cluster tradeeon-cluster --service tradeeon-backend-service --task-definition tradeeon-backend --force-new-deployment
```

### Step 3: Verify

After deployment completes (2-3 minutes), test again:
- Try connecting an exchange
- The JWT verification error should be gone

## Quick PowerShell Script

Save this as `add-jwt-secret.ps1`:

```powershell
$JWT_SECRET = Read-Host "Enter your Supabase JWT Secret"

# Get current task definition
aws ecs describe-task-definition --task-definition tradeeon-backend --query taskDefinition > task-def.json

# Note: You'll need to manually edit task-def.json to add the environment variable
# Or use jq if installed:
# $content = Get-Content task-def.json | ConvertFrom-Json
# $content.containerDefinitions[0].environment += @{name="SUPABASE_JWT_SECRET"; value=$JWT_SECRET}
# $content | ConvertTo-Json -Depth 10 | Set-Content task-def.json

Write-Host "Please edit task-def.json and add SUPABASE_JWT_SECRET to environment array"
Write-Host "Then run: aws ecs register-task-definition --cli-input-json file://task-def.json"
Write-Host "Then run: aws ecs update-service --cluster tradeeon-cluster --service tradeeon-backend-service --task-definition tradeeon-backend --force-new-deployment"
```

## Alternative: Use GitHub Secrets

If you want to automate this in the deployment workflow:

1. Add `SUPABASE_JWT_SECRET` to GitHub Secrets
2. Update `.github/workflows/deploy-backend.yml` to inject it into the task definition

But for now, the manual approach via AWS Console is fastest.


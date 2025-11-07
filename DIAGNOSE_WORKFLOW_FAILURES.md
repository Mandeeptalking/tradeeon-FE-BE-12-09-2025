# Diagnose Workflow Failures

## 🔴 Current Status
All workflows are failing. Most recent failures:
- Deploy All Services #40 - Failed (45s
- Deploy Frontend to S3 + CloudFront #21 - Failed (29s)

## 🔍 How to Check Specific Errors

### Step 1: View Workflow Logs
1. Go to GitHub → Actions tab
2. Click on the failed workflow (e.g., "Deploy All Services #40")
3. Click on the failed job (e.g., "Deploy Frontend")
4. Expand the failed step to see the error message

### Step 2: Common Failure Causes

#### Frontend Build Failures
**Symptoms:** Build step fails
**Common causes:**
- Missing `VITE_SUPABASE_URL` secret
- Missing `VITE_SUPABASE_ANON_KEY` secret
- Missing `VITE_API_URL` secret
- npm install fails (package-lock.json mismatch)
- Build errors in code

**Check:**
```bash
# In GitHub Actions logs, look for:
- "Missing environment variable"
- "npm ERR!"
- "Build failed"
- "Cannot find module"
```

#### AWS Deployment Failures
**Symptoms:** AWS commands fail
**Common causes:**
- Missing `AWS_ACCESS_KEY_ID` secret
- Missing `AWS_SECRET_ACCESS_KEY` secret
- Invalid AWS credentials
- Missing S3 bucket
- Missing ECR repository
- Missing ECS service/cluster

**Check:**
```bash
# In GitHub Actions logs, look for:
- "AccessDenied"
- "NoSuchBucket"
- "ResourceNotFoundException"
- "Invalid credentials"
```

#### Docker Build Failures
**Symptoms:** Docker build fails
**Common causes:**
- Missing files in Dockerfile COPY commands
- Incorrect Dockerfile paths
- Missing dependencies
- Build context issues

**Check:**
```bash
# In GitHub Actions logs, look for:
- "COPY failed"
- "file not found"
- "No such file or directory"
```

## 📋 Quick Diagnostic Checklist

### Required Secrets (Check in GitHub Settings → Secrets)
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `VITE_API_URL`
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `CLOUDFRONT_DISTRIBUTION_ID` (optional)

### AWS Resources (Verify they exist)
- [ ] S3 bucket: `tradeeon-frontend`
- [ ] ECR repository: `tradeeon-backend`
- [ ] ECR repository: `tradeeon-alert-runner`
- [ ] ECS cluster: `tradeeon-cluster`
- [ ] ECS service: `tradeeon-backend-service`
- [ ] ECS service: `tradeeon-alert-runner-service`

### Code Issues
- [ ] `package-lock.json` is committed
- [ ] `Dockerfile` exists and is correct
- [ ] `Dockerfile.alert-runner` exists and is correct
- [ ] All file paths in workflows are correct

## 🔧 Quick Fixes

### If Frontend Build Fails:
1. Check if all VITE_* secrets are set
2. Verify `package-lock.json` is up to date
3. Test build locally: `cd apps/frontend && npm ci && npm run build`

### If AWS Deployment Fails:
1. Verify AWS credentials are correct
2. Check if resources exist in AWS console
3. Verify IAM permissions for the AWS user

### If Docker Build Fails:
1. Test Docker build locally:
   ```bash
   docker build -t test-backend .
   docker build -f Dockerfile.alert-runner -t test-alert-runner .
   ```

## 📝 Next Steps

1. **Click on the failed workflow** in GitHub Actions
2. **Copy the error message** from the logs
3. **Check which step failed** (Build, Deploy, etc.)
4. **Verify secrets/resources** based on the error
5. **Fix and retry**


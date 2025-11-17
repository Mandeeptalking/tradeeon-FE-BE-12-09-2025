# GitHub Actions Workflow Errors Analysis

## 🔴 Current Failures

### 1. Deploy All Services #245 ❌
**Error**: `User: arn:aws:iam::531604848081:user/Mandeep1 is not authorized to perform: ecr:GetAuthorizationToken`

**Root Cause**: IAM user `Mandeep1` lacks ECR permissions

**Affected Step**: `aws-actions/amazon-ecr-login@v2` in `deploy-alert-runner` job

**Fix Required**: Add ECR permissions to IAM user (see below)

---

### 2. DB Nightly Backup #17, #18 ❌
**Error**: Likely database connection or secret issues

**Possible Causes**:
- Missing `PG_CONN_URL` secret
- Missing `BACKUP_PASSPHRASE` secret
- Database connection timeout
- Invalid connection string format

**Fix Required**: Verify secrets are set correctly

---

## 🔧 Fix for ECR Permission Error

### Step 1: Add ECR Permissions to IAM User

**Go to AWS IAM Console:**
1. Navigate to: https://console.aws.amazon.com/iam/
2. **Users** → Select `Mandeep1`
3. **Add permissions** → **Attach policies directly**
4. Search: `AmazonEC2ContainerRegistryPowerUser`
5. **Add permissions**

**OR** Create custom policy (more secure):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRLogin",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECRRepositoryAccess",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories",
        "ecr:ListImages"
      ],
      "Resource": [
        "arn:aws:ecr:us-east-1:531604848081:repository/tradeeon-alert-runner",
        "arn:aws:ecr:us-east-1:531604848081:repository/tradeeon-backend"
      ]
    },
    {
      "Sid": "ECSAccess",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:ListServices",
        "ecs:ListClusters"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 🔧 Fix for DB Backup Error

### Check GitHub Secrets

1. **Go to GitHub Repository**
   - Navigate to: Settings → Secrets and variables → Actions

2. **Verify Secrets Exist**:
   - `PG_CONN_URL` - Should be: `postgresql://user:password@host:port/database`
   - `BACKUP_PASSPHRASE` - Encryption passphrase for backups

3. **Test Connection**:
   ```bash
   # Extract password from connection string
   export PGPASSWORD=$(echo "$PG_CONN_URL" | sed -E 's/.*:(.*)@.*/\1/')
   pg_dump "$PG_CONN_URL" --no-owner --no-privileges --format=plain > test_dump.sql
   ```

---

## 📋 Required GitHub Secrets Checklist

### For ECR/ECS Deployment:
- ✅ `AWS_ACCESS_KEY_ID` - Should be set
- ✅ `AWS_SECRET_ACCESS_KEY` - Should be set
- ⚠️ **IAM User needs ECR permissions** ← **FIX THIS**

### For Database Backup:
- ⚠️ `PG_CONN_URL` - Verify it's set correctly
- ⚠️ `BACKUP_PASSPHRASE` - Verify it's set

### For Frontend Deployment:
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `CLOUDFRONT_DISTRIBUTION_ID`

---

## 🎯 Priority Fixes

### Priority 1: ECR Permissions (Blocks Deployments)
**Action**: Add `ecr:GetAuthorizationToken` permission to IAM user `Mandeep1`

**Time**: 2-3 minutes

**Impact**: All ECR-based deployments will fail until fixed

---

### Priority 2: DB Backup Secrets (Blocks Backups)
**Action**: Verify `PG_CONN_URL` and `BACKUP_PASSPHRASE` secrets are set

**Time**: 1-2 minutes

**Impact**: Nightly backups will fail

---

## ✅ Verification Steps

After fixing permissions, verify:

1. **ECR Login Test**:
   ```bash
   aws ecr get-authorization-token --region us-east-1
   ```
   Should return authorization token without errors

2. **Repository Access Test**:
   ```bash
   aws ecr describe-repositories --region us-east-1
   ```
   Should list repositories

3. **ECS Access Test**:
   ```bash
   aws ecs list-clusters --region us-east-1
   ```
   Should list clusters

---

## 🚀 After Fixes

Once permissions are added:
1. Workflows will automatically retry on next push
2. Or manually trigger: **Actions** → **Deploy All Services** → **Run workflow**

---

**Next Action**: Add ECR permissions to IAM user `Mandeep1` in AWS Console


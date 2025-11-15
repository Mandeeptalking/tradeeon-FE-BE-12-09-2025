# AWS IAM Permissions Fix for ECR Deployment

## 🔴 Issue

**Error**: `User: arn:aws:iam::531604848081:user/Mandeep1 is not authorized to perform: ecr:GetAuthorizationToken`

**Cause**: The IAM user `Mandeep1` doesn't have the necessary ECR (Elastic Container Registry) permissions.

---

## ✅ Solution: Add ECR Permissions

### Option 1: Attach AWS Managed Policy (Easiest)

1. **Go to AWS IAM Console**
   - Navigate to: https://console.aws.amazon.com/iam/
   - Go to **Users** → Select `Mandeep1`

2. **Add Permissions**
   - Click **Add permissions** → **Attach policies directly**
   - Search for: `AmazonEC2ContainerRegistryPowerUser`
   - Select it and click **Add permissions**

   **OR** for more restricted access, use: `AmazonEC2ContainerRegistryReadOnly` + custom policy for write access

### Option 2: Create Custom Policy (More Secure)

1. **Create Custom Policy**
   - Go to **IAM** → **Policies** → **Create policy**
   - Click **JSON** tab
   - Paste the policy below:

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
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:us-east-1:531604848081:repository/tradeeon-alert-runner"
    },
    {
      "Sid": "ECRListRepositories",
      "Effect": "Allow",
      "Action": [
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:DescribeImages"
      ],
      "Resource": "*"
    }
  ]
}
```

2. **Name the Policy**
   - Name: `TradeeonECRDeployPolicy`
   - Description: `ECR permissions for Tradeeon alert runner deployment`

3. **Attach to User**
   - Go to **Users** → `Mandeep1`
   - **Add permissions** → **Attach policies directly**
   - Search for `TradeeonECRDeployPolicy`
   - Select and **Add permissions**

---

## 📋 Required Permissions Breakdown

### Minimum Required for ECR Deployment:

1. **ECR Login** (Required)
   ```
   ecr:GetAuthorizationToken
   ```
   - Allows Docker to authenticate with ECR
   - Must be `Resource: *` (can't be restricted)

2. **Repository Access** (Required)
   ```
   ecr:BatchCheckLayerAvailability
   ecr:GetDownloadUrlForLayer
   ecr:BatchGetImage
   ecr:PutImage
   ecr:InitiateLayerUpload
   ecr:UploadLayerPart
   ecr:CompleteLayerUpload
   ```
   - Allows pushing/pulling images
   - Can be restricted to specific repository

3. **List/Describe** (Optional but helpful)
   ```
   ecr:DescribeRepositories
   ecr:ListImages
   ecr:DescribeImages
   ```
   - Allows listing repositories and images
   - Useful for debugging

---

## 🔧 Quick Fix Steps

### Step 1: Add ECR Login Permission

**Via AWS Console:**
1. Go to: https://console.aws.amazon.com/iam/
2. Users → `Mandeep1` → **Add permissions**
3. **Create inline policy** → **JSON** tab
4. Paste:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    }
  ]
}
```
5. Name: `ECRLoginPermission`
6. **Create policy**

### Step 2: Add Repository Permissions

**Create another inline policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:us-east-1:531604848081:repository/tradeeon-alert-runner"
    }
  ]
}
```

---

## 🎯 Recommended: Use Managed Policy

**Easiest Solution:**

1. Go to IAM → Users → `Mandeep1`
2. **Add permissions** → **Attach policies directly**
3. Search: `AmazonEC2ContainerRegistryPowerUser`
4. Attach it

This gives full ECR access (read/write) to all repositories. If you need more restricted access, use the custom policy above.

---

## ✅ Verify Permissions

After adding permissions, test with:

```bash
# Test ECR login
aws ecr get-login-password --region us-east-1

# Test repository access
aws ecr describe-repositories --region us-east-1
```

If these commands work, the GitHub Actions workflow should also work.

---

## 🔒 Security Best Practices

### For Production:

1. **Use IAM Roles** instead of users for CI/CD
   - Create an IAM role for GitHub Actions
   - Use OIDC to assume the role (more secure)

2. **Restrict to Specific Repositories**
   - Don't use `Resource: *` for repository actions
   - Specify exact repository ARNs

3. **Use Least Privilege**
   - Only grant permissions needed for deployment
   - Review and audit regularly

---

## 📝 Additional Permissions Needed

If you also deploy to ECS, you'll need:

```json
{
  "Effect": "Allow",
  "Action": [
    "ecs:DescribeTaskDefinition",
    "ecs:RegisterTaskDefinition",
    "ecs:UpdateService",
    "ecs:DescribeServices"
  ],
  "Resource": "*"
}
```

---

**After adding permissions, the GitHub Actions workflow should succeed!** 🚀


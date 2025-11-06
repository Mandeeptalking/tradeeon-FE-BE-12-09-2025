# IAM User Policies for GitHub Actions

## Required Policies

When creating the IAM user `github-actions-deployer`, attach these **4 policies**:

### 1. **AmazonEC2ContainerRegistryFullAccess**
- **Purpose:** Push Docker images to ECR
- **What it does:** Allows full access to ECR repositories
- **Why needed:** GitHub Actions needs to push Docker images to ECR

### 2. **AmazonECS_FullAccess**
- **Purpose:** Update ECS services
- **What it does:** Allows full access to ECS (start/stop/update services)
- **Why needed:** GitHub Actions needs to update ECS services after pushing images

### 3. **AmazonS3FullAccess**
- **Purpose:** Deploy frontend to S3
- **What it does:** Allows full access to S3 buckets
- **Why needed:** GitHub Actions needs to sync frontend build files to S3

### 4. **CloudFrontFullAccess**
- **Purpose:** Invalidate CloudFront cache
- **What it does:** Allows full access to CloudFront
- **Why needed:** GitHub Actions needs to invalidate cache after frontend deployment

---

## Step-by-Step in AWS Console

1. **Go to IAM Console:**
   ```
   https://console.aws.amazon.com/iam/home#/users
   ```

2. **Click "Create user"**

3. **User name:** `github-actions-deployer`

4. **Click "Next"**

5. **Select "Attach policies directly"**

6. **Search and select these 4 policies:**
   - ✅ `AmazonEC2ContainerRegistryFullAccess`
   - ✅ `AmazonECS_FullAccess`
   - ✅ `AmazonS3FullAccess`
   - ✅ `CloudFrontFullAccess`

7. **Click "Next"**

8. **Review and click "Create user"**

9. **Click on the user → "Security credentials" tab**

10. **Click "Create access key"**

11. **Select "Application running outside AWS"**

12. **Copy the credentials:**
    - Access Key ID
    - Secret Access Key

---

## Alternative: Minimal Permissions (Advanced)

If you want minimal permissions instead of full access, here are the specific permissions needed:

### For ECR:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    }
  ]
}
```

### For ECS:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:ListTasks"
      ],
      "Resource": "*"
    }
  ]
}
```

### For S3:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::tradeeon-frontend",
        "arn:aws:s3:::tradeeon-frontend/*"
      ]
    }
  ]
}
```

### For CloudFront:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations"
      ],
      "Resource": "*"
    }
  ]
}
```

**Note:** For simplicity, using the managed policies (full access) is recommended and easier to set up.

---

## Quick Reference

| Policy Name | Purpose |
|-------------|---------|
| `AmazonEC2ContainerRegistryFullAccess` | Push Docker images |
| `AmazonECS_FullAccess` | Update ECS services |
| `AmazonS3FullAccess` | Deploy frontend files |
| `CloudFrontFullAccess` | Invalidate cache |

---

## After Creating User

1. **Create access key** (Security credentials tab)
2. **Copy credentials:**
   - Access Key ID
   - Secret Access Key
3. **Add to GitHub Secrets:**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

---

That's it! These 4 policies are all you need! ✅



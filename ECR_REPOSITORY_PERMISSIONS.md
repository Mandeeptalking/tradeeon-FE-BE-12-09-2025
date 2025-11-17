# ECR Repository Creation Permissions

The GitHub Actions workflow is failing with exit code 254 when trying to create the ECR repository `tradeeon-alert-runner`. This suggests an AWS IAM permissions issue.

## Required AWS IAM Permissions

The IAM user/role used in GitHub Actions (`AWS_ACCESS_KEY_ID`) needs the following permissions to create ECR repositories:

### Minimum Required Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:CreateRepository",
        "ecr:DescribeRepositories",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    }
  ]
}
```

### Quick Fix Options

**Option 1: Create Repository Manually (Recommended for now)**

Run this command in AWS CLI (or AWS Console):

```bash
aws ecr create-repository \
  --repository-name tradeeon-alert-runner \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true
```

**Option 2: Update IAM Permissions**

1. Go to AWS IAM Console
2. Find the user `Mandeep1` (or the user associated with `AWS_ACCESS_KEY_ID`)
3. Add the permissions listed above
4. Or attach the AWS managed policy: `AmazonEC2ContainerRegistryFullAccess`

**Option 3: Use Existing Policy**

If you have an existing policy that works for `tradeeon-backend`, you can reuse it by adding `tradeeon-alert-runner` to the resource list.

## Verify Repository Exists

After creating manually, verify:

```bash
aws ecr describe-repositories --repository-names tradeeon-alert-runner --region us-east-1
```

The workflow will then skip the creation step and proceed directly to building and pushing the image.


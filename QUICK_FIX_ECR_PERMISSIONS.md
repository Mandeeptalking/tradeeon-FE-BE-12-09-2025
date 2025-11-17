# Quick Fix: ECR Permissions

## 🎯 Problem
GitHub Actions workflow fails with:
```
User: arn:aws:iam::531604848081:user/Mandeep1 is not authorized to perform: ecr:GetAuthorizationToken
```

## ✅ Solution (2 minutes)

### Step 1: Go to AWS IAM Console
https://console.aws.amazon.com/iam/

### Step 2: Add Policy to User
1. Click **Users** (left sidebar)
2. Click **Mandeep1**
3. Click **Add permissions** button
4. Click **Attach policies directly**
5. Search: `AmazonEC2ContainerRegistryPowerUser`
6. Check the box next to it
7. Click **Add permissions**

### Step 3: Verify
The policy should now appear in the user's permissions list.

### Step 4: Test (Optional)
```bash
aws ecr get-authorization-token --region us-east-1
```

If this works, GitHub Actions will work too!

---

## 🔄 Retry Workflow

After adding permissions:
1. Go to GitHub Actions
2. Find the failed workflow
3. Click **Re-run all jobs**

Or wait for the next push - it will automatically retry.

---

**That's it! The workflow should now succeed.** ✅


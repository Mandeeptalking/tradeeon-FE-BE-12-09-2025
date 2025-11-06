# Add GitHub Secrets - Step by Step

## You're on the right page! ✅

You're at: `https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/settings/secrets/actions`

---

## 📝 Step-by-Step Instructions

### Secret 1: AWS_ACCESS_KEY_ID

1. **Click "New repository secret"** (green button)

2. **Fill in the form:**
   - **Name:** `AWS_ACCESS_KEY_ID`
   - **Secret:** (Your AWS Access Key ID)

3. **Click "Add secret"**

---

### Secret 2: AWS_SECRET_ACCESS_KEY

1. **Click "New repository secret"** again

2. **Fill in the form:**
   - **Name:** `AWS_SECRET_ACCESS_KEY`
   - **Secret:** (Your AWS Secret Access Key)

3. **Click "Add secret"**

---

### Secret 3: CLOUDFRONT_DISTRIBUTION_ID

1. **Click "New repository secret"** again

2. **Fill in the form:**
   - **Name:** `CLOUDFRONT_DISTRIBUTION_ID`
   - **Secret:** `EMF4IMNT9637C`

3. **Click "Add secret"**

---

### Secret 4: VITE_API_URL

1. **Click "New repository secret"** again

2. **Fill in the form:**
   - **Name:** `VITE_API_URL`
   - **Secret:** `https://api.tradeeon.com` (or your backend API URL)

3. **Click "Add secret"**

---

## ✅ After Adding All 4 Secrets

You should see:
- ✅ AWS_ACCESS_KEY_ID
- ✅ AWS_SECRET_ACCESS_KEY
- ✅ CLOUDFRONT_DISTRIBUTION_ID
- ✅ VITE_API_URL

---

## 🚀 Next: Test It!

1. **Go back to your local terminal**

2. **Make a small test change:**
   ```powershell
   # Edit any file (e.g., add a comment to README.md)
   ```

3. **Commit and push:**
   ```powershell
   git add .
   git commit -m "Test GitHub Actions"
   git push origin main
   ```

4. **Check GitHub Actions:**
   - Go to: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions
   - You should see a workflow running!

---

## 🔑 Need AWS Credentials?

If you don't have AWS credentials yet:

**Option A: Use existing credentials**
- If you already have AWS CLI configured, use those

**Option B: Create new IAM user**
```powershell
# Run this script to create IAM user and get credentials
.\setup-github-actions.ps1
```

**Option C: Get from AWS Console**
1. Go to AWS Console → IAM → Users
2. Find your user (or create one)
3. Go to "Security credentials" tab
4. Click "Create access key"
5. Copy the Access Key ID and Secret Access Key

---

## 📋 Quick Checklist

- [ ] Added AWS_ACCESS_KEY_ID
- [ ] Added AWS_SECRET_ACCESS_KEY
- [ ] Added CLOUDFRONT_DISTRIBUTION_ID = EMF4IMNT9637C
- [ ] Added VITE_API_URL = https://api.tradeeon.com
- [ ] Tested with a push

---

## 🎯 That's It!

Once all 4 secrets are added, you're ready to use GitHub Actions!

**From now on:**
```powershell
git push origin main
```

GitHub Actions will automatically deploy! 🚀


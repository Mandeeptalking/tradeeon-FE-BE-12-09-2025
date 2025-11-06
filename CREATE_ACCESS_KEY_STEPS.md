# Create Access Key - Step by Step

## You're on the Create Access Key Page ✅

Follow these steps:

---

## Step 1: Select Use Case

**Select:** ✅ **"Application running outside AWS"**

**Why:** GitHub Actions runs on GitHub's servers (outside AWS), so this is the correct option.

**Note:** Don't select "Command Line Interface (CLI)" - that's for local AWS CLI usage, not GitHub Actions.

---

## Step 2: Click "Next"

After selecting "Application running outside AWS", click the **"Next"** button.

---

## Step 3: (Optional) Set Description Tag

You'll see a page to set a description tag.

**Description:** `GitHub Actions Deployer`

This helps you remember what this access key is for.

**Click "Create access key"**

---

## Step 4: ⚠️ **SAVE CREDENTIALS IMMEDIATELY!**

**This is critical!** You'll see:

### Access Key ID
```
AKIA... (example)
```
**Copy this** - this is your `AWS_ACCESS_KEY_ID`

### Secret Access Key
```
wJalr... (example)
```
**Copy this** - this is your `AWS_SECRET_ACCESS_KEY`

**⚠️ WARNING:** You can only see the Secret Access Key **once**! If you close this page without copying it, you'll need to create a new access key.

---

## Step 5: Add to GitHub Secrets

Now that you have the credentials:

1. **Go back to GitHub:**
   ```
   https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/settings/secrets/actions
   ```

2. **Add Secret #1:**
   - Click "New repository secret"
   - Name: `AWS_ACCESS_KEY_ID`
   - Secret: (Paste the Access Key ID)
   - Click "Add secret"

3. **Add Secret #2:**
   - Click "New repository secret" again
   - Name: `AWS_SECRET_ACCESS_KEY`
   - Secret: (Paste the Secret Access Key)
   - Click "Add secret"

4. **Add Secret #3:**
   - Click "New repository secret" again
   - Name: `CLOUDFRONT_DISTRIBUTION_ID`
   - Secret: `EMF4IMNT9637C`
   - Click "Add secret"

5. **Add Secret #4:**
   - Click "New repository secret" again
   - Name: `VITE_API_URL`
   - Secret: `https://api.tradeeon.com`
   - Click "Add secret"

---

## ✅ Checklist

- [ ] Selected "Application running outside AWS"
- [ ] Created access key
- [ ] Copied Access Key ID
- [ ] Copied Secret Access Key
- [ ] Added AWS_ACCESS_KEY_ID to GitHub Secrets
- [ ] Added AWS_SECRET_ACCESS_KEY to GitHub Secrets
- [ ] Added CLOUDFRONT_DISTRIBUTION_ID to GitHub Secrets
- [ ] Added VITE_API_URL to GitHub Secrets

---

## 🚀 After Adding All Secrets

Test it:
```powershell
git push origin main
```

Check: https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025/actions

You should see a workflow running! 🎉

---

**Remember:** Save the credentials before closing the page!



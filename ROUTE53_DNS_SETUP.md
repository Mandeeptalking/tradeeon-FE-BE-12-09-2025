# Route 53 DNS Setup for tradeeon.com

## Goal
Point `www.tradeeon.com` to your CloudFront distribution.

---

## Step 1: Go to Route 53

1. Open AWS Console
2. Search "Route 53"
3. Click "Hosted zones"

---

## Step 2: Select Your Domain

1. Click on **`tradeeon.com`** from the list

---

## Step 3: Create A Record

1. Click **"Create record"** button

---

## Step 4: Configure the Record

### Record Name
```
www
```

### Record Type
```
A - IPv4 address
```

### Alias
```
ON (toggle to Yes)
```

### Route Traffic To
```
☑️ Alias to CloudFront distribution
```

### Choose Distribution
Click the dropdown and select:
```
tradeeon-frontend (US East (N. Virginia))
```

Or look for Distribution ID: `E2GKG9WFGGVUOQ`

### Evaluate Target Health
```
No (default)
```

### Routing Policy
```
Simple routing
```

---

## Step 5: Create

1. Click **"Create record"**
2. Wait for confirmation message

---

## Step 6: Wait for DNS Propagation

⏳ **Time:** 5-15 minutes (sometimes up to 48 hours, but usually quick)

---

## Step 7: Test

After 5-15 minutes, visit:
```
https://www.tradeeon.com
```

You should see your Tradeeon website!

---

## Optional: Root Domain (tradeeon.com without www)

If you also want `tradeeon.com` (without www) to work:

### Create Another A Record

**Record Name:** Leave empty  
**Record Type:** A  
**Alias:** Yes  
**Route Traffic To:** Same CloudFront distribution  
**Create**

---

## Troubleshooting

### DNS Not Propagated Yet
**Solution:** Wait longer. Check with: `nslookup www.tradeeon.com`

### Still Shows Old Site
**Solution:** Clear browser cache or use incognito mode

### Access Denied Error
**Solution:** Make sure you're using `www.tradeeon.com` not just `tradeeon.com`

---

## Verify DNS is Working

In PowerShell, run:
```powershell
nslookup www.tradeeon.com
```

You should see CloudFront DNS addresses.

---

**After DNS propagates, your site will be at:** `https://www.tradeeon.com` ✨




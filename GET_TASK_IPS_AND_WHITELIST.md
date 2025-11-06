# Get Task IPs and Whitelist on Binance - Complete Guide

## Part 1: Get Task Public IPs

### Method 1: AWS Console (Easiest)

#### Step 1: Navigate to ECS Tasks

1. **Go to AWS Console:**
   - https://console.aws.amazon.com/ecs/home?region=us-east-1

2. **Click "Clusters"** in left menu

3. **Click on `tradeeon-cluster`**

4. **Click on "Services" tab**

5. **Click on `tradeeon-backend-service`**

6. **Click on "Tasks" tab**

7. **You'll see running tasks** - click on one

#### Step 2: Get Public IP

1. **Click on the task ID** (the blue link)

2. **Go to "Network" tab**

3. **Find "Public IP"** - this is what you need!

4. **Copy the IP address** (e.g., `54.123.45.67`)

5. **Repeat for all running tasks** (if multiple)

---

### Method 2: AWS CLI (If Available)

```bash
# Step 1: List all running tasks
aws ecs list-tasks \
  --cluster tradeeon-cluster \
  --service-name tradeeon-backend-service \
  --region us-east-1

# Output will show task ARNs like:
# arn:aws:ecs:us-east-1:531604848081:task/tradeeon-cluster/abc123...

# Step 2: Describe each task to get network info
aws ecs describe-tasks \
  --cluster tradeeon-cluster \
  --tasks <task-arn> \
  --region us-east-1

# Look for: "attachments" -> "details" -> "networkInterfaceId"
# Then get the network interface:

aws ec2 describe-network-interfaces \
  --network-interface-ids <eni-id> \
  --region us-east-1

# Look for: "Association" -> "PublicIp"
```

---

### Method 3: PowerShell Script (Quick)

Save this as `get-task-ips.ps1`:

```powershell
$cluster = "tradeeon-cluster"
$service = "tradeeon-backend-service"
$region = "us-east-1"

Write-Host "Getting task IPs for $service..." -ForegroundColor Cyan

# List tasks
$tasks = aws ecs list-tasks --cluster $cluster --service-name $service --region $region --query 'taskArns' --output json | ConvertFrom-Json

if ($tasks.Count -eq 0) {
    Write-Host "No running tasks found!" -ForegroundColor Yellow
    exit
}

Write-Host "Found $($tasks.Count) task(s)`n" -ForegroundColor Green

foreach ($taskArn in $tasks) {
    # Get task details
    $task = aws ecs describe-tasks --cluster $cluster --tasks $taskArn --region $region --query 'tasks[0]' --output json | ConvertFrom-Json
    
    # Get network interface ID
    $eniId = ($task.attachments[0].details | Where-Object { $_.name -eq 'networkInterfaceId' }).value
    
    if ($eniId) {
        # Get public IP
        $eni = aws ec2 describe-network-interfaces --network-interface-ids $eniId --region $region --query 'NetworkInterfaces[0]' --output json | ConvertFrom-Json
        
        if ($eni.Association) {
            $publicIp = $eni.Association.PublicIp
            Write-Host "✅ Task Public IP: $publicIp" -ForegroundColor Green -BackgroundColor DarkBlue
            Write-Host "   Whitelist this IP on Binance!`n" -ForegroundColor Yellow
        } else {
            Write-Host "⚠️  Task has no public IP" -ForegroundColor Yellow
        }
    }
}
```

Run it:
```powershell
.\get-task-ips.ps1
```

---

## Part 2: Whitelist IPs on Binance

### Step 1: Log in to Binance

1. **Go to Binance:**
   - https://www.binance.com

2. **Log in** to your account

### Step 2: Go to API Management

1. **Click on your profile** (top right)

2. **Select "API Management"** or go to:
   - https://www.binance.com/en/my/settings/api-management

### Step 3: Edit API Key

1. **Find your API key** (or create one if needed)

2. **Click "Edit"** or the key settings

3. **Look for "Restrict access to trusted IPs only"** or **"IP Access Restriction"**

4. **Enable IP whitelist** (toggle ON)

### Step 4: Add IP Addresses

1. **Click "Add IP Address"** or "Add" button

2. **Enter the Public IP** from your ECS task(s)

3. **Add all task IPs** (if you have multiple tasks)

4. **Click "Save"** or "Confirm"

5. **Enter 2FA code** if prompted

### Step 5: Verify

- The IPs should appear in the whitelist
- Status should show as "Active" or "Enabled"

---

## Important Notes

### ⚠️ Multiple Tasks = Multiple IPs

If you have multiple ECS tasks running, each has a different public IP:
- **Task 1**: `54.123.45.67`
- **Task 2**: `54.123.45.68`
- **Task 3**: `54.123.45.69`

**You need to whitelist ALL of them!**

### 🔄 IPs Change on Task Restart

**Important:** When ECS tasks restart, they get new public IPs!

**Solutions:**
1. **Whitelist all IPs** as tasks restart
2. **Use NAT Gateway** (recommended for production)
   - Provides static outbound IP
   - See `EXCHANGE_IP_WHITELIST_GUIDE.md` for migration
3. **Monitor and update** whitelist regularly

### 📋 Best Practice

For production, consider:
1. **NAT Gateway setup** (static IP)
2. **Automated IP whitelist updates** (if Binance API supports it)
3. **Monitor task IP changes**

---

## Quick Checklist

- [ ] Get task public IP(s) from AWS Console
- [ ] Copy all IP addresses
- [ ] Log in to Binance API Management
- [ ] Enable IP whitelist
- [ ] Add all task IPs
- [ ] Save and verify
- [ ] Test API connection

---

## Troubleshooting

### If IP whitelist doesn't work:

1. **Verify IP is correct** (check AWS Console)
2. **Check IP format** (should be like `54.123.45.67`)
3. **Wait a few minutes** for Binance to update
4. **Check Binance API logs** for blocked requests
5. **Verify API key has correct permissions**

### If tasks restart and IPs change:

1. **Get new IPs** from AWS Console
2. **Update Binance whitelist** with new IPs
3. **Consider NAT Gateway** for static IP

---

**Quick Links:**
- AWS ECS Console: https://console.aws.amazon.com/ecs/home?region=us-east-1
- Binance API Management: https://www.binance.com/en/my/settings/api-management


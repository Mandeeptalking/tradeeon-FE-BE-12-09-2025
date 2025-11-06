# Exchange API IP Whitelist Guide - Tradeeon (AWS Backend)

## 🔒 What is IP Whitelisting?

When creating API keys on exchanges (Binance, Coinbase, Kraken, etc.), you can optionally restrict access to specific IP addresses. This adds an extra layer of security - even if someone gets your API keys, they can't use them unless they're connecting from a whitelisted IP.

## ⚠️ **IMPORTANT FOR TRADEEON USERS:**

**Your backend is hosted on AWS**, so all exchange API calls come from your AWS backend, NOT from your personal computer.

**You MUST whitelist the AWS backend's IP address**, not your home IP address!

---

## 📍 What IP Address Should You Use?

### **🔥 FOR TRADEEON USERS: Use AWS Backend IP**

**Since your backend is on AWS, all API calls come from AWS, not your computer!**

### **Option 1: AWS Backend IP (REQUIRED for Tradeeon)**

**This is the IP that exchanges see when Tradeeon makes API calls.**

#### **Method A: Check AWS NAT Gateway IP (If Using)**
If you have a NAT Gateway configured:
1. Go to AWS Console → VPC → NAT Gateways
2. Find your NAT Gateway
3. Copy the **Elastic IP** address
4. **This is the IP to whitelist**

#### **Method B: Check What IP Exchanges See**
1. Make a test API call from your backend
2. Check exchange API logs (most exchanges show source IP)
3. Or use a test endpoint to see your IP:
   ```bash
   # From your backend (if you have SSH access)
   curl https://api.ipify.org
   ```

#### **Method C: Check ALB IP (If Requests Go Through ALB)**
1. Go to AWS Console → EC2 → Load Balancers
2. Find your ALB: `tradeeon-alb`
3. Check the IP addresses associated with it
4. **Note:** ALB IPs can change, so NAT Gateway is better

#### **Method D: Check ECS Task IP (Not Recommended)**
- ECS tasks get dynamic IPs
- **Not recommended** - IP changes when task restarts
- Use NAT Gateway instead for static IP

**✅ Add AWS IP to Exchange:**
- Go to exchange API settings
- Enable "Restrict access to trusted IPs only"
- Add the AWS backend IP address

---

### **Option 2: Personal IP (For Testing Only)**

**⚠️ Only use if testing locally or if not using Tradeeon backend**

**Best for:** Testing locally, not using Tradeeon platform

1. **Find Your Current IP:**
   - Visit: https://whatismyipaddress.com/
   - Copy the IPv4 address (e.g., `203.0.113.42`)

2. **Add to Exchange:**
   - Go to your exchange API settings
   - Enable "Restrict access to trusted IPs only"
   - Add your IP address

**⚠️ Important:** 
- **DO NOT use this for Tradeeon!** Tradeeon uses AWS backend IP
- Most home internet has **dynamic IP** (changes periodically)
- Your IP changes when router restarts or ISP refreshes
- You'll need to update the whitelist if IP changes

---

### **Option 3: Setup NAT Gateway for Static IP (RECOMMENDED)**

**Best for:** Production Tradeeon backend on AWS

**Why NAT Gateway?**
- Provides **static IP** for outbound connections
- ECS tasks → NAT Gateway → Internet
- Exchange sees the NAT Gateway IP (never changes)

**Setup Steps:**
1. **Create NAT Gateway:**
   ```bash
   # Create Elastic IP first
   aws ec2 allocate-address --domain vpc --region us-east-1
   
   # Create NAT Gateway
   aws ec2 create-nat-gateway \
     --subnet-id <public-subnet-id> \
     --allocation-id <elastic-ip-id> \
     --region us-east-1
   ```

2. **Update Route Table:**
   - Add route: `0.0.0.0/0` → NAT Gateway
   - All outbound traffic goes through NAT Gateway

3. **Get NAT Gateway IP:**
   - AWS Console → VPC → NAT Gateways
   - Copy the Elastic IP address
   - **This is the IP to whitelist**

4. **Cost:** ~$32/month + data transfer

**✅ Advantages:**
- Static IP (never changes)
- All ECS tasks use same IP
- More secure and reliable
- Better for production

---

### **Option 4: No IP Restriction (Not Recommended)**

**Best for:** Development only, testing

- **⚠️ Security Risk:** Anyone with your API keys can use them
- Only use if you're testing locally
- **Never use in production!**

---

## 🔍 How to Find Your IP Address

### **Method 1: Web Browser**
1. Visit: https://whatismyipaddress.com/
2. Look for "IPv4 Address"
3. Copy the number (e.g., `203.0.113.42`)

### **Method 2: Command Line (Windows)**
```powershell
# PowerShell
Invoke-WebRequest -Uri "https://ipinfo.io/ip" -UseBasicParsing | Select-Object -ExpandProperty Content
```

### **Method 3: Command Line (Mac/Linux)**
```bash
curl ifconfig.me
# or
curl ipinfo.io/ip
```

### **Method 4: Check Router Settings**
1. Log into your router (usually `192.168.1.1`)
2. Check "Internet" or "WAN" settings
3. Your public IP is shown there

---

## 🏠 Dynamic vs Static IP

### **Dynamic IP (Most Home Internet)**
- Changes periodically (daily, weekly, or when router restarts)
- **Problem:** If IP changes, API keys stop working
- **Solution:** Update IP whitelist when it changes

### **Static IP (Servers/VPS)**
- Never changes (or rarely)
- **Better for:** Production bots, servers
- Usually costs extra ($5-10/month from ISP)

---

## 📋 Step-by-Step: Adding IP to Binance

1. **Get Your IP:**
   ```
   Visit: https://whatismyipaddress.com/
   Copy your IPv4 address
   ```

2. **Go to Binance API Settings:**
   - Binance → Account → API Management
   - Click "Create API" or edit existing

3. **Enable IP Restriction:**
   - ✅ Check "Restrict access to trusted IPs only"
   - Enter your IP address (e.g., `203.0.113.42`)
   - Click "Add"
   - Save

4. **For Multiple IPs:**
   - You can add multiple IPs
   - Add home IP + server IP + office IP (if needed)

---

## 🔄 What If Your IP Changes?

### **If Using Dynamic IP:**

**Option A: Update Manually**
1. Check your new IP: https://whatismyipaddress.com/
2. Go to exchange API settings
3. Update IP whitelist
4. API keys will work again

**Option B: Use Dynamic DNS**
- Services like No-IP or DuckDNS
- Update automatically
- More complex setup

**Option C: Get Static IP**
- Contact your ISP
- Usually $5-10/month extra
- IP never changes

---

## 🏢 For Tradeeon Backend (AWS ECS) - DETAILED GUIDE

### **Current Setup:**
- Backend: AWS ECS Fargate
- Load Balancer: ALB (`tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com`)
- **Challenge:** ECS tasks get dynamic IPs by default

### **How to Find Your Backend's IP:**

**Step 1: Check if NAT Gateway Exists**
```bash
# List NAT Gateways
aws ec2 describe-nat-gateways --region us-east-1

# If exists, get the Elastic IP
aws ec2 describe-addresses --region us-east-1 \
  --filters "Name=domain,Values=vpc" \
  --query "Addresses[?AssociationId!=null].PublicIp"
```

**Step 2: If No NAT Gateway, Check Current IP**
```bash
# Get ALB IPs (temporary solution)
aws elbv2 describe-load-balancers \
  --region us-east-1 \
  --names tradeeon-alb \
  --query "LoadBalancers[0].AvailabilityZones[*].LoadBalancerAddresses[*].IpAddress"
```

**Step 3: Test What IP Exchanges See**
Create a test endpoint in your backend to return the source IP:
```python
# Add to apps/api/main.py
@app.get("/my-ip")
async def get_my_ip(request: Request):
    """Get the IP address that external services see"""
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    return {"ip": client_ip}
```

Then call it to see what IP is used.

### **Recommended Solution: Setup NAT Gateway**

**1. Create Elastic IP:**
```bash
aws ec2 allocate-address \
  --domain vpc \
  --region us-east-1 \
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=tradeeon-nat-eip}]'
```

**2. Create NAT Gateway:**
```bash
# Get your public subnet ID
SUBNET_ID=$(aws ec2 describe-subnets \
  --region us-east-1 \
  --filters "Name=tag:Name,Values=tradeeon-public-subnet" \
  --query "Subnets[0].SubnetId" --output text)

# Get Elastic IP allocation ID
EIP_ALLOC=$(aws ec2 describe-addresses \
  --region us-east-1 \
  --filters "Name=tag:Name,Values=tradeeon-nat-eip" \
  --query "Addresses[0].AllocationId" --output text)

# Create NAT Gateway
aws ec2 create-nat-gateway \
  --subnet-id $SUBNET_ID \
  --allocation-id $EIP_ALLOC \
  --region us-east-1 \
  --tag-specifications 'ResourceType=nat-gateway,Tags=[{Key=Name,Value=tradeeon-nat}]'
```

**3. Update Route Table:**
```bash
# Get route table ID for private subnet
RT_ID=$(aws ec2 describe-route-tables \
  --region us-east-1 \
  --filters "Name=tag:Name,Values=tradeeon-private-rt" \
  --query "RouteTables[0].RouteTableId" --output text)

# Get NAT Gateway ID
NAT_ID=$(aws ec2 describe-nat-gateways \
  --region us-east-1 \
  --filters "Name=tag:Name,Values=tradeeon-nat" \
  --query "NatGateways[0].NatGatewayId" --output text)

# Add route
aws ec2 create-route \
  --route-table-id $RT_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_ID \
  --region us-east-1
```

**4. Get the Static IP:**
```bash
aws ec2 describe-addresses \
  --region us-east-1 \
  --filters "Name=tag:Name,Values=tradeeon-nat-eip" \
  --query "Addresses[0].PublicIp" --output text
```

**This IP is what you whitelist on exchanges!**

---

## ✅ Best Practices

### **For Personal Use:**
1. ✅ Use your home IP
2. ✅ Enable IP restriction
3. ✅ Update when IP changes
4. ✅ Use strong API key permissions

### **For Production Bots:**
1. ✅ Use server/VPS static IP
2. ✅ Enable IP restriction
3. ✅ Use NAT Gateway (if on AWS)
4. ✅ Monitor IP changes
5. ✅ Use minimal API permissions

### **For Development:**
1. ⚠️ Can skip IP restriction for testing
2. ⚠️ Never use production keys
3. ⚠️ Use testnet/test API keys

---

## 🔐 Security Tips

1. **Always Enable IP Restriction** (if possible)
   - Adds significant security layer
   - Even if IP changes, better than no protection

2. **Use Minimal Permissions**
   - Only enable what you need
   - Trading bots: "Enable Trading" + "Enable Reading"
   - Don't enable "Withdraw" unless needed

3. **Rotate Keys Regularly**
   - Update IP whitelist when rotating
   - Remove old/unused IPs

4. **Monitor API Usage**
   - Check exchange logs regularly
   - Alert on unexpected IP access

---

## 📝 Quick Reference

### **Find Your IP:**
- Website: https://whatismyipaddress.com/
- Command: `curl ifconfig.me`

### **Common IP Ranges:**
- Home IP: Usually starts with `203.x.x.x` or `103.x.x.x`
- AWS: Usually starts with `54.x.x.x` or `52.x.x.x`
- DigitalOcean: Usually starts with `159.x.x.x` or `188.x.x.x`

### **Format:**
- IPv4: `203.0.113.42` (most common)
- IPv6: `2001:0db8:85a3:0000:0000:8a2e:0370:7334` (rarely used)

---

## 🆘 Troubleshooting

### **"API Key Invalid" Error:**
- Check if IP changed
- Update IP whitelist
- Wait 1-2 minutes for changes to propagate

### **"IP Not Whitelisted" Error:**
- Verify current IP: https://whatismyipaddress.com/
- Check exchange API settings
- Make sure IP is added correctly (no spaces, correct format)

### **IP Changes Frequently:**
- Consider getting static IP from ISP
- Or use server/VPS with static IP
- Or use NAT Gateway for AWS

---

## 🎯 Summary - FOR TRADEEON USERS

### **✅ CORRECT APPROACH:**

1. **Your backend is on AWS ECS** → Use AWS backend IP
2. **Setup NAT Gateway** → Get static IP (recommended)
3. **Whitelist NAT Gateway IP** on exchanges
4. **Never use your personal IP** - backend doesn't use it!

### **❌ WRONG APPROACH:**

- ❌ Using your home IP (backend doesn't come from your computer)
- ❌ Using your office IP (backend is on AWS)
- ❌ Not using IP restriction (security risk)

### **Quick Checklist:**

- [ ] Check if NAT Gateway exists in AWS
- [ ] Get NAT Gateway Elastic IP address
- [ ] Add that IP to exchange API whitelist
- [ ] Test API connection from Tradeeon
- [ ] If no NAT Gateway, setup one for static IP

### **Current Tradeeon Setup:**

- ✅ Backend: AWS ECS Fargate
- ✅ ALB: `tradeeon-alb-1541120278.us-east-1.elb.amazonaws.com`
- ⚠️ Need to check: NAT Gateway IP or ALB outbound IP
- ✅ Recommendation: Setup NAT Gateway for static IP

**Quick Answer:**
- **Personal use:** Your current IP from https://whatismyipaddress.com/
- **Production:** Your server's static IP or NAT Gateway IP

---

**Need Help?**
- Check your exchange's API documentation
- Contact exchange support for IP whitelist questions
- Update IP whitelist immediately if keys stop working


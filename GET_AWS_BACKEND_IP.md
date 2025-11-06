# How to Get AWS Backend IP for Exchange API Whitelisting

## 🔍 Quick Method

### **Step 1: Check if NAT Gateway Exists**

```powershell
# Check for existing NAT Gateways
aws ec2 describe-nat-gateways --region us-east-1 --query "NatGateways[*].[NatGatewayId,SubnetId,State]" --output table

# If NAT Gateway exists, get its Elastic IP
aws ec2 describe-addresses --region us-east-1 --filters "Name=domain,Values=vpc" --query "Addresses[?AssociationId!=null].[PublicIp,AllocationId]" --output table
```

### **Step 2: If NAT Gateway Exists, Use Its IP**

The Elastic IP shown is what you whitelist on exchanges.

### **Step 3: If No NAT Gateway, Check Current Outbound IP**

**Option A: Add Test Endpoint to Backend**

Add this to `apps/api/main.py`:
```python
@app.get("/my-ip")
async def get_my_ip(request: Request):
    """Get the IP address that external services see"""
    # Try to get real IP from various sources
    client_ip = (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or
        request.headers.get("X-Real-IP") or
        request.client.host if request.client else "unknown"
    )
    
    # Also fetch from external service
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get("https://api.ipify.org?format=json")
            external_ip = response.json().get("ip", "unknown")
    except:
        external_ip = "unknown"
    
    return {
        "request_ip": client_ip,
        "external_ip": external_ip,
        "headers": dict(request.headers)
    }
```

Then call: `https://api.tradeeon.com/my-ip` (or your backend URL)

**Option B: Check Exchange API Logs**

1. Make a test API call from Tradeeon
2. Check exchange API logs (Binance shows source IP)
3. Use that IP

---

## 🚀 Recommended: Setup NAT Gateway

### **Why NAT Gateway?**
- ✅ Static IP (never changes)
- ✅ All ECS tasks use same IP
- ✅ More secure
- ✅ Better for production

### **Setup Script:**

```powershell
# 1. Get your public subnet ID
$subnetId = aws ec2 describe-subnets --region us-east-1 --filters "Name=vpc-id,Values=<your-vpc-id>" --query "Subnets[?MapPublicIpOnLaunch==`true`][0].SubnetId" --output text

# 2. Allocate Elastic IP
$eipAlloc = aws ec2 allocate-address --domain vpc --region us-east-1 --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=tradeeon-nat-eip}]" --query "AllocationId" --output text

# 3. Create NAT Gateway
$natId = aws ec2 create-nat-gateway --subnet-id $subnetId --allocation-id $eipAlloc --region us-east-1 --tag-specifications "ResourceType=nat-gateway,Tags=[{Key=Name,Value=tradeeon-nat}]" --query "NatGatewayId" --output text

# 4. Wait for NAT Gateway to be available
Write-Host "Waiting for NAT Gateway to be available..." -ForegroundColor Yellow
aws ec2 wait nat-gateway-available --nat-gateway-ids $natId --region us-east-1

# 5. Get the Elastic IP (this is what you whitelist!)
$staticIp = aws ec2 describe-addresses --region us-east-1 --allocation-ids $eipAlloc --query "Addresses[0].PublicIp" --output text

Write-Host "`n✅ NAT Gateway Created!" -ForegroundColor Green
Write-Host "`n📋 Static IP to whitelist: $staticIp" -ForegroundColor Cyan
Write-Host "`nAdd this IP to your exchange API whitelist!" -ForegroundColor Yellow

# 6. Update route table for private subnet
$rtId = aws ec2 describe-route-tables --region us-east-1 --filters "Name=vpc-id,Values=<your-vpc-id>" --query "RouteTables[?Routes[?GatewayId==null && NatGatewayId==null]][0].RouteTableId" --output text

aws ec2 create-route --route-table-id $rtId --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $natId --region us-east-1
```

---

## 📋 Quick Checklist

- [ ] Check if NAT Gateway exists
- [ ] If yes → Get Elastic IP → Whitelist on exchanges
- [ ] If no → Setup NAT Gateway → Get Elastic IP → Whitelist
- [ ] Test API connection from Tradeeon
- [ ] Verify IP in exchange API logs

---

## 🎯 Summary

**For Tradeeon Users:**
1. **Backend is on AWS** → Use AWS backend IP
2. **Setup NAT Gateway** → Get static IP
3. **Whitelist NAT Gateway IP** on exchanges
4. **Never use personal IP** - backend doesn't use it!

The IP you whitelist is the IP that **exchanges see** when your AWS backend makes API calls.


# Tradeeon Backend Infrastructure - Architecture Summary

## 🎯 Goal

Deploy backend on AWS ECS Fargate using **public subnets** (no NAT Gateway) to test if Binance accepts AWS public IP addresses. Architecture must allow easy migration to private subnets + NAT Gateway later.

## 📐 Current Architecture (Public Subnets)

### Network Flow

```
User Request:
Internet → ALB (HTTPS) → ECS Task (Public IP) → Response

Outbound API Calls:
ECS Task (Public IP: 54.x.x.x) 
  → Internet Gateway 
  → Internet 
  → Binance API (sees 54.x.x.x)
```

### Components

1. **VPC** (`10.0.0.0/16`)
   - 2 public subnets (us-east-1a, us-east-1b)
   - Internet Gateway attached
   - Route table: `0.0.0.0/0` → IGW

2. **ECS Fargate Service**
   - Launch type: Fargate
   - Network mode: `awsvpc`
   - Subnets: Public subnets
   - **Public IP: ENABLED** ✅
   - Tasks get public IPs automatically

3. **Application Load Balancer**
   - Type: Internet-facing
   - HTTPS listener (port 443) with ACM cert
   - HTTP listener (port 80) redirects to HTTPS
   - Target group: HTTP 8000, health check `/health`

4. **Security Groups**
   - **ALB SG**: Inbound 80/443 from `0.0.0.0/0`, Outbound to ECS tasks
   - **ECS Task SG**: Inbound 8000 from ALB only, Outbound `0.0.0.0/0`

5. **Route 53**
   - A record: `api.tradeeon.com` → ALB (alias)

## 🔍 Why Public Subnets Now?

**Testing Purpose:**
- Test if Binance accepts AWS public IP addresses
- Avoid NAT Gateway cost (~$32/month) until we know it works
- Quick deployment for testing

**Outbound Traffic:**
- Tasks have public IPs (e.g., `54.123.45.67`)
- Traffic flows: Task → IGW → Internet
- Binance sees the task's public IP
- **IP changes** when task restarts (dynamic)

## 🔄 Migration Path (Public → Private + NAT)

### Target Architecture

```
User Request:
Internet → ALB (HTTPS) → ECS Task (Private IP) → Response

Outbound API Calls:
ECS Task (Private IP: 10.0.10.x) 
  → NAT Gateway (Elastic IP: 52.x.x.x - STATIC) 
  → Internet Gateway 
  → Internet 
  → Binance API (sees 52.x.x.x - never changes)
```

### What Changes

1. **Create Private Subnets**
   - 2 private subnets (different CIDR ranges)
   - No IGW route (use NAT Gateway)

2. **Create NAT Gateway**
   - Elastic IP (static, never changes)
   - In public subnet
   - Route: `0.0.0.0/0` → NAT Gateway

3. **Update ECS Service**
   - Change `subnet_ids` to private subnets
   - Set `assign_public_ip = false`
   - **That's it!** Everything else stays the same

### What Stays the Same

✅ ALB configuration  
✅ Security groups  
✅ Target group  
✅ Route 53  
✅ Task definition  
✅ IAM roles  

## 📊 Comparison

| Feature | Public Subnets (Now) | Private Subnets + NAT (Later) |
|---------|---------------------|-------------------------------|
| **Outbound IP** | Task public IP (dynamic) | NAT Gateway Elastic IP (static) |
| **IP Changes** | Yes, when task restarts | No, never changes |
| **Cost** | $0 (no NAT) | ~$32/month (NAT Gateway) |
| **Security** | Tasks directly accessible (via ALB only) | Tasks fully isolated |
| **Exchange Whitelist** | Must update when IP changes | Set once, never change |
| **Setup Complexity** | Simple | Slightly more complex |

## 🎯 Decision Matrix

### Use Public Subnets If:
- ✅ Testing Binance IP acceptance
- ✅ Cost-sensitive (no NAT Gateway)
- ✅ OK with updating IP whitelist when needed
- ✅ Small scale deployment

### Migrate to Private + NAT If:
- ✅ Binance accepts AWS IPs (test successful)
- ✅ Need static IP (never changes)
- ✅ Production deployment
- ✅ Want better security isolation
- ✅ Multiple tasks (share same outbound IP)

## 📝 Migration Steps (Summary)

1. **Add private subnets** to Terraform
2. **Create NAT Gateway** with Elastic IP
3. **Create private route table** (0.0.0.0/0 → NAT)
4. **Update ECS service**:
   - Change `subnets` to private subnet IDs
   - Set `assign_public_ip = false`
5. **Update Binance whitelist**:
   - Remove old public IPs
   - Add NAT Gateway Elastic IP
6. **Deploy**: `terraform apply`

See `migration-guide.md` for detailed instructions.

## 🔐 Security Considerations

### Current (Public Subnets)
- Tasks have public IPs but are **not directly accessible**
- Only accessible via ALB (security group restricts)
- Outbound traffic goes directly to internet
- ALB handles SSL termination

### After Migration (Private Subnets)
- Tasks have **only private IPs**
- No direct internet access
- All outbound traffic through NAT Gateway
- Better network isolation
- Same ALB security (no change)

## 💰 Cost Estimate

### Current (Public Subnets)
- VPC: $0
- IGW: $0
- ALB: ~$20/month
- ECS Fargate: ~$15/month
- **Total: ~$35/month**

### After Migration (Private + NAT)
- Everything above: ~$35/month
- NAT Gateway: +$32/month
- Data transfer: +$0.045/GB
- **Total: ~$67-75/month**

## ✅ Testing Checklist

After deployment:

- [ ] ECS tasks are running
- [ ] Tasks have public IPs
- [ ] Health checks passing (`/health`)
- [ ] API accessible: `https://api.tradeeon.com/health`
- [ ] Test Binance API call from backend
- [ ] Check if Binance accepts the IP
- [ ] Monitor for IP changes on task restart
- [ ] Document IPs for whitelisting

## 🚀 Quick Start

1. **Configure**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

2. **Deploy**:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

3. **Test**:
   ```bash
   curl https://api.tradeeon.com/health
   ```

4. **Get Task IPs** (for Binance whitelist):
   ```bash
   # See README.md for commands
   ```

5. **Monitor** and decide if migration needed

## 📚 Documentation

- **README.md**: Full setup and usage guide
- **migration-guide.md**: Step-by-step migration to private subnets
- **ARCHITECTURE_SUMMARY.md**: This file (high-level overview)

## 🎉 Benefits of This Architecture

1. **Easy Testing**: Quick deployment to test Binance IP acceptance
2. **Cost Effective**: No NAT Gateway initially
3. **Flexible**: Easy migration path when needed
4. **Production Ready**: Can scale to production architecture
5. **Well Documented**: Clear migration path and comments

---

**Ready to deploy?** Start with `README.md` for detailed instructions!


# Migration Guide: Public Subnets → Private Subnets + NAT Gateway

## Current Architecture (Public Subnets)

```
Internet → ALB → ECS Tasks (Public IP) → Internet Gateway → Binance API
```

**Characteristics:**
- ECS tasks in public subnets
- Tasks have public IPs
- Outbound traffic goes directly via Internet Gateway
- Binance sees the task's public IP

## Target Architecture (Private Subnets + NAT Gateway)

```
Internet → ALB → ECS Tasks (Private IP) → NAT Gateway → Internet Gateway → Binance API
```

**Characteristics:**
- ECS tasks in private subnets
- Tasks have private IPs only
- Outbound traffic goes through NAT Gateway
- Binance sees the NAT Gateway's Elastic IP (static, never changes)

## Migration Steps

### Step 1: Create Private Subnets

Add to `main.tf`:

```hcl
# Private Subnet 1 (us-east-1a)
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.tradeeon.id
  cidr_block        = "10.0.10.0/24"  # Different CIDR range
  availability_zone = "${var.aws_region}a"
  map_public_ip_on_launch = false

  tags = {
    Name = "tradeeon-private-subnet-1"
    Type = "private"
  }
}

# Private Subnet 2 (us-east-1b)
resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.tradeeon.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.aws_region}b"
  map_public_ip_on_launch = false

  tags = {
    Name = "tradeeon-private-subnet-2"
    Type = "private"
  }
}
```

### Step 2: Create NAT Gateway

```hcl
# Allocate Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"
  
  tags = {
    Name = "tradeeon-nat-eip"
  }
}

# Create NAT Gateway in public subnet
resource "aws_nat_gateway" "tradeeon" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_1.id  # NAT in public subnet
  
  tags = {
    Name = "tradeeon-nat-gateway"
  }
  
  depends_on = [aws_internet_gateway.tradeeon]
}
```

### Step 3: Create Route Table for Private Subnets

```hcl
# Route table for private subnets
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.tradeeon.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.tradeeon.id  # Route through NAT
  }

  tags = {
    Name = "tradeeon-private-rt"
    Type = "private"
  }
}

# Associate private subnets with private route table
resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private_2.id
  route_table_id = aws_route_table.private.id
}
```

### Step 4: Update ECS Service

**Change this in `main.tf`:**

```hcl
# BEFORE (public subnets):
network_configuration {
  subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
  security_groups  = [aws_security_group.ecs_task.id]
  assign_public_ip = true
}

# AFTER (private subnets):
network_configuration {
  subnets          = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  security_groups  = [aws_security_group.ecs_task.id]
  assign_public_ip = false  # No public IPs in private subnets
}
```

### Step 5: Update Outputs

Add NAT Gateway IP to outputs:

```hcl
output "nat_gateway_ip" {
  description = "NAT Gateway Elastic IP (for exchange API whitelisting)"
  value       = aws_eip.nat.public_ip
}
```

### Step 6: Update Exchange API Whitelist

**Important:** After migration, update Binance API whitelist:

1. Get NAT Gateway Elastic IP:
   ```bash
   terraform output nat_gateway_ip
   ```

2. Go to Binance API settings
3. Remove old public IPs (if any)
4. Add NAT Gateway Elastic IP
5. Save

**This IP will never change!** (Unlike task public IPs)

## What Stays the Same

✅ **ALB configuration** - No changes needed  
✅ **Security groups** - Same rules apply  
✅ **Target group** - No changes  
✅ **Route 53** - No changes  
✅ **Task definition** - No changes  
✅ **IAM roles** - No changes  

## Benefits of Private Subnets + NAT Gateway

1. **Static IP:** NAT Gateway Elastic IP never changes
2. **Security:** Tasks not directly exposed to internet
3. **Cost:** NAT Gateway ~$32/month (but static IP worth it)
4. **Reliability:** No IP changes when tasks restart
5. **Scalability:** All tasks share same outbound IP

## Rollback Plan

If you need to rollback:

1. Change ECS service back to public subnets
2. Set `assign_public_ip = true`
3. Remove NAT Gateway (optional, keep for future)
4. Update exchange whitelist back to public IPs

## Testing Checklist

After migration:

- [ ] ECS tasks are running in private subnets
- [ ] Tasks have private IPs (no public IPs)
- [ ] Health checks are passing
- [ ] API endpoints are accessible via ALB
- [ ] Outbound connections work (test Binance API call)
- [ ] Binance API whitelist updated with NAT Gateway IP
- [ ] Exchange API calls succeed

## Cost Comparison

**Current (Public Subnets):**
- No NAT Gateway cost
- ~$0/month for NAT

**After Migration (Private Subnets + NAT):**
- NAT Gateway: ~$32/month
- Data transfer: ~$0.045/GB
- **Total:** ~$32-40/month

**Worth it for:**
- Static IP (never changes)
- Better security
- Production-grade architecture



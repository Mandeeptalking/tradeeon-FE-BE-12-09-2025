# Multi-Region Deployment Plan for Binance Access

## Problem Statement
- **US East (us-east-1)**: Binance.com is blocked ❌
- **Singapore (ap-southeast-1)**: Binance.com accessible ✅
- **Europe (eu-central-1)**: Binance.com accessible ✅ (fallback)
- **Users**: USA and India need access to Binance

## Solution Architecture

### Region Strategy
```
USA Users → Route to Singapore (ap-southeast-1) backend
India Users → Route to Singapore (ap-southeast-1) backend
Fallback → Europe (eu-central-1) if Singapore fails
```

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    CloudFront (Global CDN)                  │
│              Geo-routing based on user location              │
└─────────────────┬───────────────────┬───────────────────────┘
                  │                   │
        ┌─────────▼─────────┐  ┌─────▼──────────┐
        │   USA Users       │  │  India/Others   │
        │   Route to:       │  │  Route to:      │
        │   Singapore       │  │  Singapore      │
        └─────────┬─────────┘  └─────┬──────────┘
                  │                   │
        ┌─────────▼───────────────────▼──────────┐
        │   Application Load Balancer (ALB)      │
        │   Region: ap-southeast-1 (Singapore)  │
        └─────────┬──────────────────────────────┘
                  │
        ┌─────────▼─────────┐
        │   ECS Cluster     │
        │   Backend API     │
        │   (Can access     │
        │    Binance.com)   │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────┐
        │   Supabase DB     │
        │   (Global, single)│
        └───────────────────┘
```

## Step-by-Step Implementation Plan

### Phase 1: Infrastructure Setup (Week 1)

#### Step 1.1: Create Singapore ECS Cluster
**Location**: `ap-southeast-1` (Singapore)

```bash
# 1. Create ECS Cluster
aws ecs create-cluster \
  --cluster-name tradeeon-backend-sg \
  --region ap-southeast-1 \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1 \
    capacityProvider=FARGATE_SPOT,weight=0

# 2. Create VPC (if not exists)
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --region ap-southeast-1

# 3. Create subnets (2 public, 2 private)
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.1.0/24 --availability-zone ap-southeast-1a
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.2.0/24 --availability-zone ap-southeast-1b
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.3.0/24 --availability-zone ap-southeast-1a --map-public-ip-on-launch
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.4.0/24 --availability-zone ap-southeast-1b --map-public-ip-on-launch

# 4. Create Internet Gateway and NAT Gateway
aws ec2 create-internet-gateway --region ap-southeast-1
aws ec2 create-nat-gateway --subnet-id <public-subnet-id> --allocation-id <eip-id> --region ap-southeast-1
```

#### Step 1.2: Create Application Load Balancer (ALB)
**Location**: `ap-southeast-1`

```bash
# Create ALB in Singapore
aws elbv2 create-load-balancer \
  --name tradeeon-alb-sg \
  --subnets <subnet-1> <subnet-2> \
  --security-groups <sg-id> \
  --region ap-southeast-1 \
  --scheme internet-facing \
  --type application

# Create target group
aws elbv2 create-target-group \
  --name tradeeon-backend-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id <vpc-id> \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --region ap-southeast-1
```

#### Step 1.3: Create Europe Fallback (Optional but Recommended)
**Location**: `eu-central-1` (Frankfurt)

```bash
# Repeat Steps 1.1 and 1.2 for eu-central-1
# This will be used as fallback if Singapore fails
```

### Phase 2: CloudFront Geo-Routing (Week 1-2)

#### Step 2.1: Update CloudFront Distribution
**Purpose**: Route users to appropriate backend based on location

```json
{
  "Origins": [
    {
      "Id": "singapore-backend",
      "DomainName": "tradeeon-alb-sg-123456789.ap-southeast-1.elb.amazonaws.com",
      "CustomOriginConfig": {
        "HTTPPort": 80,
        "HTTPSPort": 443,
        "OriginProtocolPolicy": "https-only"
      }
    },
    {
      "Id": "europe-backend",
      "DomainName": "tradeeon-alb-eu-123456789.eu-central-1.elb.amazonaws.com",
      "CustomOriginConfig": {
        "HTTPPort": 80,
        "HTTPSPort": 443,
        "OriginProtocolPolicy": "https-only"
      }
    }
  ],
  "CacheBehaviors": [
    {
      "PathPattern": "/api/*",
      "TargetOriginId": "singapore-backend",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad", // CachingDisabled
      "OriginRequestPolicyId": "216adef6-5c04-47e4-8448-69f88d76e8d0"
    }
  ],
  "DefaultCacheBehavior": {
    "TargetOriginId": "singapore-backend",
    "ViewerProtocolPolicy": "redirect-to-https"
  }
}
```

#### Step 2.2: Implement Geo-Routing Logic
**Option A: CloudFront Geo Headers** (Simpler)
- CloudFront automatically adds `CloudFront-Viewer-Country` header
- Backend can read this header and route accordingly

**Option B: CloudFront Functions** (More Control)
```javascript
function handler(event) {
    var request = event.request;
    var headers = request.headers;
    var country = headers['cloudfront-viewer-country'];
    
    // Route USA and India to Singapore
    if (country.value === 'US' || country.value === 'IN') {
        request.origin = {
            custom: {
                domainName: 'tradeeon-alb-sg-123456789.ap-southeast-1.elb.amazonaws.com',
                port: 443,
                protocol: 'https'
            }
        };
    }
    
    return request;
}
```

### Phase 3: Code Changes (Week 2)

#### Step 3.1: Update Backend to Support Region Detection

**File**: `apps/api/main.py`

```python
from fastapi import Request, Header
from typing import Optional

@app.middleware("http")
async def region_middleware(request: Request, call_next):
    # Get region from CloudFront header or ALB header
    region = request.headers.get("x-region", "ap-southeast-1")
    request.state.region = region
    response = await call_next(request)
    response.headers["X-Region"] = region
    return response

@app.get("/health")
async def health_check(request: Request):
    region = getattr(request.state, "region", "unknown")
    return {
        "status": "ok",
        "region": region,
        "binance_accessible": True  # Singapore can access Binance
    }
```

#### Step 3.2: Update Binance Client to Use Region-Aware Configuration

**File**: `apps/api/binance_client.py`

```python
import os
from typing import Optional

class BinanceClient:
    def __init__(self, region: Optional[str] = None):
        # Region determines if we can access Binance
        self.region = region or os.getenv("AWS_REGION", "ap-southeast-1")
        
        # Binance is accessible from Singapore and Europe
        self.binance_accessible_regions = [
            "ap-southeast-1",  # Singapore
            "eu-central-1",    # Europe (fallback)
        ]
        
        if self.region not in self.binance_accessible_regions:
            raise ValueError(
                f"Binance not accessible from {self.region}. "
                f"Use one of: {self.binance_accessible_regions}"
            )
        
        self.base_url = "https://api.binance.com"
        self.ws_url = "wss://stream.binance.com:9443/ws"
        self.session: Optional[aiohttp.ClientSession] = None
```

#### Step 3.3: Environment Variables per Region

**Singapore Backend** (`.env.sg`):
```env
AWS_REGION=ap-southeast-1
BINANCE_BASE_URL=https://api.binance.com
BINANCE_WS_URL=wss://stream.binance.com:9443/ws
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-key>
```

**Europe Backend** (`.env.eu`):
```env
AWS_REGION=eu-central-1
BINANCE_BASE_URL=https://api.binance.com
BINANCE_WS_URL=wss://stream.binance.com:9443/ws
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-key>
```

### Phase 4: ECS Task Definitions (Week 2)

#### Step 4.1: Create ECR Repositories

```bash
# Singapore region
aws ecr create-repository \
  --repository-name tradeeon-backend \
  --region ap-southeast-1

# Europe region (if using fallback)
aws ecr create-repository \
  --repository-name tradeeon-backend \
  --region eu-central-1
```

#### Step 4.2: Build and Push Docker Images

```bash
# Build image
docker build -t tradeeon-backend:latest -f Dockerfile .

# Tag for Singapore
docker tag tradeeon-backend:latest \
  123456789.dkr.ecr.ap-southeast-1.amazonaws.com/tradeeon-backend:latest

# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.ap-southeast-1.amazonaws.com

# Push
docker push 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/tradeeon-backend:latest
```

#### Step 4.3: Create Task Definition

**File**: `task-definition-sg.json`

```json
{
  "family": "tradeeon-backend-sg",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "tradeeon-backend",
      "image": "123456789.dkr.ecr.ap-southeast-1.amazonaws.com/tradeeon-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "AWS_REGION",
          "value": "ap-southeast-1"
        },
        {
          "name": "BINANCE_BASE_URL",
          "value": "https://api.binance.com"
        }
      ],
      "secrets": [
        {
          "name": "SUPABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:123456789:secret:supabase-url"
        },
        {
          "name": "SUPABASE_ANON_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:123456789:secret:supabase-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/tradeeon-backend-sg",
          "awslogs-region": "ap-southeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### Step 4.4: Register Task Definition and Create Service

```bash
# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition-sg.json \
  --region ap-southeast-1

# Create ECS Service
aws ecs create-service \
  --cluster tradeeon-backend-sg \
  --service-name tradeeon-backend-service \
  --task-definition tradeeon-backend-sg \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-1,subnet-2],securityGroups=[sg-id],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<target-group-arn>,containerName=tradeeon-backend,containerPort=8000" \
  --region ap-southeast-1
```

### Phase 5: Update GitHub Actions (Week 2-3)

#### Step 5.1: Create Multi-Region Deployment Workflow

**File**: `.github/workflows/deploy-multi-region.yml`

```yaml
name: Deploy Multi-Region Backend

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'Dockerfile'
      - '.github/workflows/deploy-multi-region.yml'

env:
  AWS_REGION_SG: ap-southeast-1
  AWS_REGION_EU: eu-central-1
  ECR_REPOSITORY: tradeeon-backend
  ECS_SERVICE_SG: tradeeon-backend-service
  ECS_CLUSTER_SG: tradeeon-backend-sg

jobs:
  deploy-singapore:
    name: Deploy to Singapore
    runs-on: ubuntu-latest
    environment: production-sg
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION_SG }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build, tag, and push image to Amazon ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -f Dockerfile .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER_SG }} \
            --service ${{ env.ECS_SERVICE_SG }} \
            --force-new-deployment \
            --region ${{ env.AWS_REGION_SG }}

  deploy-europe:
    name: Deploy to Europe (Fallback)
    runs-on: ubuntu-latest
    environment: production-eu
    if: github.ref == 'refs/heads/main'  # Only deploy to EU on main branch
    
    steps:
      # Similar steps as Singapore but with EU region
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION_EU }}
      
      # ... (repeat ECR and ECS steps for EU)
```

### Phase 6: Database Considerations (Week 3)

#### Step 6.1: Supabase is Global
- ✅ **Good News**: Supabase is already global, no replication needed
- ✅ Single database instance serves all regions
- ⚠️ **Latency**: Singapore → Supabase (acceptable)
- ⚠️ **Latency**: Europe → Supabase (acceptable)

#### Step 6.2: Connection Pooling
- Use Supabase connection pooling for better performance
- Configure connection pooler URL in backend

```python
# Use connection pooler for better performance
SUPABASE_URL = os.getenv("SUPABASE_URL")
# Replace .supabase.co with .pooler.supabase.co
if ".supabase.co" in SUPABASE_URL:
    SUPABASE_URL = SUPABASE_URL.replace(".supabase.co", ".pooler.supabase.co")
```

### Phase 7: Testing Plan (Week 3-4)

#### Step 7.1: Regional Testing

```bash
# Test Singapore backend directly
curl https://tradeeon-alb-sg-123456789.ap-southeast-1.elb.amazonaws.com/health

# Test from different locations using VPN/proxy
# USA → Should route to Singapore
# India → Should route to Singapore
# Europe → Can route to Europe or Singapore
```

#### Step 7.2: Binance Connectivity Test

```python
# Test script: test_binance_connectivity.py
import asyncio
import aiohttp

async def test_binance(region):
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get("https://api.binance.com/api/v3/ping") as resp:
                print(f"{region}: Binance accessible - {resp.status}")
                return True
        except Exception as e:
            print(f"{region}: Binance NOT accessible - {e}")
            return False

# Test from different regions
regions = ["us-east-1", "ap-southeast-1", "eu-central-1"]
for region in regions:
    asyncio.run(test_binance(region))
```

#### Step 7.3: Load Testing

```bash
# Use Apache Bench or k6 for load testing
ab -n 1000 -c 10 https://api.tradeeon.com/health

# Test from different geographic locations
# Monitor CloudWatch metrics for latency
```

### Phase 8: Monitoring & Alerts (Week 4)

#### Step 8.1: CloudWatch Dashboards

```bash
# Create dashboard for Singapore region
aws cloudwatch put-dashboard \
  --dashboard-name tradeeon-singapore \
  --dashboard-body file://dashboard-sg.json \
  --region ap-southeast-1
```

**Metrics to Monitor**:
- ECS Service CPU/Memory
- ALB Request Count/Latency
- Binance API response times
- Error rates
- Regional latency

#### Step 8.2: Alarms

```bash
# Create alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name tradeeon-high-error-rate-sg \
  --alarm-description "Alert when error rate exceeds 5%" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --region ap-southeast-1
```

### Phase 9: Cost Optimization (Ongoing)

#### Estimated Monthly Costs

**Singapore (ap-southeast-1)**:
- ECS Fargate (2 tasks, 0.5 vCPU, 1GB): ~$30/month
- ALB: ~$20/month
- NAT Gateway: ~$35/month
- Data Transfer: ~$10/month
- **Total**: ~$95/month

**Europe (eu-central-1)** - Optional:
- Similar costs: ~$95/month

**CloudFront**:
- Already in use for frontend
- API requests: ~$5-10/month

**Total Additional Cost**: ~$100-200/month

#### Cost Optimization Tips
1. Use Fargate Spot for non-critical workloads (50% savings)
2. Use ALB idle timeout to reduce costs
3. Monitor and optimize data transfer
4. Consider Reserved Capacity for predictable workloads

### Phase 10: Rollout Strategy

#### Week 1: Infrastructure Setup
- ✅ Create Singapore ECS cluster
- ✅ Create ALB
- ✅ Set up networking

#### Week 2: Code & Deployment
- ✅ Update code for region awareness
- ✅ Create ECR repositories
- ✅ Set up CI/CD

#### Week 3: Testing
- ✅ Test Binance connectivity
- ✅ Test geo-routing
- ✅ Load testing

#### Week 4: Production Rollout
- ✅ Deploy to Singapore
- ✅ Update CloudFront
- ✅ Monitor and adjust

## Quick Reference Commands

### Check Current Region
```bash
curl https://api.tradeeon.com/health
# Response: {"status": "ok", "region": "ap-southeast-1"}
```

### Test Binance Access
```bash
curl https://api.binance.com/api/v3/ping
# Should return: {}
```

### View ECS Service Status
```bash
aws ecs describe-services \
  --cluster tradeeon-backend-sg \
  --services tradeeon-backend-service \
  --region ap-southeast-1
```

## Troubleshooting

### Issue: Binance still blocked
**Solution**: Verify region is `ap-southeast-1` or `eu-central-1`

### Issue: High latency
**Solution**: 
- Check CloudFront cache settings
- Verify ALB health checks
- Check database connection pooling

### Issue: Service not accessible
**Solution**:
- Check security groups allow traffic
- Verify ALB target group health
- Check ECS task logs

## Next Steps

1. **Review this plan** with your team
2. **Estimate costs** based on your traffic
3. **Start with Phase 1** - Infrastructure setup
4. **Test thoroughly** before production rollout
5. **Monitor closely** after deployment

## Support

For questions or issues:
- Check CloudWatch logs
- Review ECS task definitions
- Verify security group rules
- Test Binance connectivity from each region


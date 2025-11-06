# Tradeeon Backend Infrastructure - Terraform

## Overview

This Terraform configuration deploys the Tradeeon backend on AWS ECS Fargate with:

- **VPC** with 2 public subnets (different AZs)
- **Internet Gateway** for public internet access
- **ECS Fargate** tasks with public IPs enabled
- **Application Load Balancer** (internet-facing, HTTPS)
- **Route 53** A record for `api.tradeeon.com`
- **Security Groups** properly configured

## Architecture

### Current Setup (Public Subnets)

```
┌─────────────────────────────────────────────────────────┐
│                         Internet                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTPS (443)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Application Load Balancer                   │
│              (Internet-facing, HTTPS)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP (8000)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              ECS Tasks (Public IPs)                     │
│              - Subnet: Public (us-east-1a, 1b)          │
│              - Public IP: ENABLED                       │
│              - Security Group: Inbound from ALB only    │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Outbound API calls
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Internet Gateway                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Binance API / Supabase                     │
│              (Sees task's public IP)                    │
└─────────────────────────────────────────────────────────┘
```

### Outbound Traffic Flow

**Current (Public Subnets):**
```
ECS Task (Public IP: 54.x.x.x) 
  → Internet Gateway 
  → Internet 
  → Binance API (sees 54.x.x.x)
```

**After Migration (Private Subnets + NAT):**
```
ECS Task (Private IP: 10.0.10.x) 
  → NAT Gateway (Elastic IP: 52.x.x.x) 
  → Internet Gateway 
  → Internet 
  → Binance API (sees 52.x.x.x - static, never changes)
```

## Prerequisites

1. **AWS CLI** configured with credentials
2. **Terraform** >= 1.0 installed
3. **ACM Certificate** for `api.tradeeon.com` (in us-east-1)
4. **Route 53 Hosted Zone** for `tradeeon.com`
5. **ECR Repository** with backend Docker image
6. **Supabase** credentials

## Setup

### 1. Create `terraform.tfvars`

```hcl
aws_region = "us-east-1"

ecr_repository_url = "531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend"

acm_certificate_arn = "arn:aws:acm:us-east-1:531604848081:certificate/xxxxx"

route53_zone_id = "Z1234567890ABC"

supabase_url = "https://your-project.supabase.co"
supabase_service_role_key = "your-service-role-key"

cors_origins = "https://www.tradeeon.com,https://tradeeon.com"
```

### 2. Initialize Terraform

```bash
cd infra/terraform
terraform init
```

### 3. Review Plan

```bash
terraform plan
```

### 4. Apply Configuration

```bash
terraform apply
```

### 5. Verify Deployment

```bash
# Check ALB DNS
terraform output alb_dns_name

# Test API
curl https://api.tradeeon.com/health

# Check ECS service
aws ecs describe-services \
  --cluster tradeeon-cluster \
  --services tradeeon-backend-service
```

## Configuration

### Variables

See `variables.tf` for all available variables.

Key variables:
- `container_port`: Backend port (default: 8000)
- `task_cpu`: CPU units (default: 512 = 0.5 vCPU)
- `task_memory`: Memory MB (default: 1024 = 1 GB)
- `desired_task_count`: Number of tasks (default: 1)

### Resource Naming

All resources follow the pattern: `tradeeon-<resource-type>`

Examples:
- VPC: `tradeeon-backend-vpc`
- ALB: `tradeeon-backend-alb`
- ECS Cluster: `tradeeon-cluster`
- ECS Service: `tradeeon-backend-service`

## Testing Binance API IP Acceptance

### Current Setup (Public IPs)

1. Deploy infrastructure
2. Check ECS task public IPs:
   ```bash
   aws ecs describe-tasks \
     --cluster tradeeon-cluster \
     --tasks $(aws ecs list-tasks --cluster tradeeon-cluster --query 'taskArns[0]' --output text) \
     --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
     --output text | xargs -I {} aws ec2 describe-network-interfaces \
     --network-interface-ids {} \
     --query 'NetworkInterfaces[0].Association.PublicIp' \
     --output text
   ```

3. Whitelist these IPs on Binance API settings
4. Test API calls from backend
5. Monitor if Binance accepts the IPs

### If Binance Accepts Public IPs

✅ Keep current setup (public subnets)  
✅ Update IP whitelist when tasks restart (IPs may change)

### If Binance Rejects or You Want Static IP

⏭️ Migrate to private subnets + NAT Gateway  
📖 See `migration-guide.md` for detailed steps

## Migration to Private Subnets

See `migration-guide.md` for complete migration instructions.

**Quick Summary:**
1. Create private subnets
2. Create NAT Gateway with Elastic IP
3. Update route table (private subnets → NAT Gateway)
4. Update ECS service (change subnets, disable public IP)
5. Whitelist NAT Gateway Elastic IP on exchanges

## Outputs

After deployment, you'll get:

- `vpc_id`: VPC ID
- `alb_dns_name`: ALB DNS name
- `api_url`: API URL (https://api.tradeeon.com)
- `ecs_cluster_name`: ECS cluster name
- `ecs_service_name`: ECS service name
- `target_group_arn`: Target group ARN

## Security

### Security Groups

**ALB Security Group:**
- Inbound: 80/443 from 0.0.0.0/0
- Outbound: 8000 to ECS tasks, all to internet

**ECS Task Security Group:**
- Inbound: 8000 from ALB only
- Outbound: All to 0.0.0.0/0 (for Binance, Supabase, etc.)

### Network Isolation

- Tasks only accessible via ALB (not directly from internet)
- ALB handles SSL termination
- Tasks can make outbound calls (for exchange APIs)

## Monitoring

### CloudWatch Logs

Logs are automatically sent to CloudWatch:
- Log group: `/ecs/tradeeon-backend`
- Retention: 7 days

### Health Checks

- ALB health check: `/health` endpoint
- Interval: 30 seconds
- Timeout: 5 seconds
- Healthy threshold: 2
- Unhealthy threshold: 3

## Troubleshooting

### Tasks Not Starting

```bash
# Check task status
aws ecs describe-tasks \
  --cluster tradeeon-cluster \
  --tasks $(aws ecs list-tasks --cluster tradeeon-cluster --query 'taskArns[0]' --output text)

# Check logs
aws logs tail /ecs/tradeeon-backend --follow
```

### Health Check Failures

```bash
# Test health endpoint directly
curl https://api.tradeeon.com/health

# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw target_group_arn)
```

### Outbound Connectivity Issues

```bash
# Test from task (if you have exec access)
aws ecs execute-command \
  --cluster tradeeon-cluster \
  --task <task-id> \
  --container tradeeon-backend \
  --command "curl https://api.binance.com/api/v3/ping" \
  --interactive
```

## Cost Estimation

**Monthly Costs (approximate):**

- VPC: $0
- Internet Gateway: $0
- ALB: ~$20/month
- ECS Fargate (0.5 vCPU, 1GB): ~$15/month
- CloudWatch Logs: ~$1-5/month
- Route 53: ~$0.50/month
- **Total:** ~$36-40/month

**If migrating to NAT Gateway:**
- NAT Gateway: +$32/month
- Data transfer: +$0.045/GB
- **New Total:** ~$68-75/month

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

⚠️ **Warning:** This will delete all infrastructure including:
- VPC and subnets
- ALB and target groups
- ECS cluster and service
- Route 53 records
- Security groups

Make sure you have backups and want to proceed!

## Next Steps

1. ✅ Deploy infrastructure
2. ✅ Test Binance API calls
3. ✅ Monitor IP acceptance
4. ⏭️ Migrate to private subnets if needed (see `migration-guide.md`)
5. ✅ Update exchange API whitelists

## Support

For issues or questions:
- Check Terraform state: `terraform show`
- Check AWS Console for resource status
- Review CloudWatch logs
- Check security group rules


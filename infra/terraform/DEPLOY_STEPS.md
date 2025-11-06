# Terraform Deployment Steps

## Step 1: Verify terraform.tfvars

Check that `terraform.tfvars` has all required values:

```bash
# View the file
cat terraform.tfvars
```

**Required values:**
- ✅ `aws_region`
- ✅ `ecr_repository_url`
- ✅ `acm_certificate_arn`
- ✅ `route53_zone_id` (if not filled, see Step 2)
- ✅ `supabase_url`
- ✅ `supabase_service_role_key`
- ✅ `cors_origins`

## Step 2: Get Route 53 Zone ID (if not filled)

### Option A: Using PowerShell Script (Windows)

```powershell
cd infra/terraform
.\get-route53-zone-id.ps1
```

This will automatically fetch and update `terraform.tfvars`.

### Option B: Using AWS CLI

```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].Id" --output text
```

Then update `terraform.tfvars`:
```
route53_zone_id = "Z1234567890ABC"
```

### Option C: Manual (AWS Console)

1. Go to AWS Console → Route 53
2. Click "Hosted zones" in left menu
3. Find and click `tradeeon.com`
4. Copy the "Hosted zone ID" (starts with `Z`)
5. Update `terraform.tfvars`:
   ```
   route53_zone_id = "Z1234567890ABC"
   ```

## Step 3: Initialize Terraform

```bash
cd infra/terraform
terraform init
```

This will:
- Download AWS provider
- Initialize backend
- Create `.terraform/` directory

**Expected output:**
```
Initializing the backend...
Initializing provider plugins...
Terraform has been successfully initialized!
```

## Step 4: Review Terraform Plan

```bash
terraform plan
```

This shows what Terraform will create:
- VPC and subnets
- Internet Gateway
- Security Groups
- ALB and Target Group
- ECS Cluster and Service
- Route 53 record

**Review carefully:**
- Check resource names
- Verify subnet CIDRs
- Confirm container port (8000)
- Check security group rules

**Expected resources:**
- ~15-20 resources will be created

## Step 5: Apply Terraform Configuration

```bash
terraform apply
```

Terraform will:
1. Show the plan again
2. Ask for confirmation: `yes`
3. Create all resources (~5-10 minutes)
4. Show outputs (ALB DNS, VPC ID, etc.)

**Watch for:**
- ✅ All resources created successfully
- ✅ No errors
- ✅ Outputs displayed

## Step 6: Verify Deployment

### Check ECS Service

```bash
aws ecs describe-services \
  --cluster tradeeon-cluster \
  --services tradeeon-backend-service \
  --region us-east-1
```

**Expected:**
- Service status: `ACTIVE`
- Running count: `1` (or your desired count)
- Task definition: `tradeeon-backend:1`

### Check ALB

```bash
aws elbv2 describe-load-balancers \
  --names tradeeon-backend-alb \
  --region us-east-1
```

**Expected:**
- State: `active`
- Type: `application`
- Scheme: `internet-facing`

### Test Health Endpoint

```bash
# Get ALB DNS from Terraform output
terraform output alb_dns_name

# Test health endpoint
curl https://api.tradeeon.com/health
```

**Expected response:**
```json
{"status":"ok","timestamp":1234567890}
```

### Check Route 53

```bash
# Test DNS resolution
nslookup api.tradeeon.com
```

**Expected:**
- Should resolve to ALB DNS name

### Check ECS Tasks

```bash
# List running tasks
aws ecs list-tasks \
  --cluster tradeeon-cluster \
  --region us-east-1

# Get task details
aws ecs describe-tasks \
  --cluster tradeeon-cluster \
  --tasks <task-arn> \
  --region us-east-1
```

**Expected:**
- Task status: `RUNNING`
- Health status: `HEALTHY`
- Public IP assigned (since we're using public subnets)

## Step 7: Get Task Public IPs (for Binance Whitelist)

Since tasks are in public subnets, they have public IPs. Get them:

```bash
# Get task network interface ID
TASK_ARN=$(aws ecs list-tasks --cluster tradeeon-cluster --query 'taskArns[0]' --output text)
NETWORK_ID=$(aws ecs describe-tasks --cluster tradeeon-cluster --tasks $TASK_ARN --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)

# Get public IP
aws ec2 describe-network-interfaces \
  --network-interface-ids $NETWORK_ID \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text
```

**Or use PowerShell:**

```powershell
$taskArn = aws ecs list-tasks --cluster tradeeon-cluster --query 'taskArns[0]' --output text
$networkId = aws ecs describe-tasks --cluster tradeeon-cluster --tasks $taskArn --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text
aws ec2 describe-network-interfaces --network-interface-ids $networkId --query 'NetworkInterfaces[0].Association.PublicIp' --output text
```

**⚠️ Important:** These IPs may change when tasks restart. Whitelist them on Binance, but be aware they can change.

## Step 8: Test Binance API Connection

Test if the backend can make API calls to Binance:

```bash
# Test from your backend
curl https://api.tradeeon.com/api/symbols
```

**Expected:**
- Returns list of Binance symbols
- If fails, check:
  - Security group outbound rules
  - Task logs
  - Binance API whitelist

## Step 9: Monitor Logs

```bash
# View CloudWatch logs
aws logs tail /ecs/tradeeon-backend --follow --region us-east-1
```

**Look for:**
- Application startup messages
- Health check requests
- API calls to Binance
- Any errors

## Troubleshooting

### Terraform Init Fails

**Error:** "Failed to initialize backend"

**Solution:**
- Check AWS credentials: `aws sts get-caller-identity`
- Verify AWS region is correct
- Check internet connection

### Terraform Plan Shows Errors

**Error:** "Resource already exists"

**Solution:**
- Check if resources already exist in AWS
- Use `terraform import` if needed
- Or delete conflicting resources

**Error:** "Invalid certificate ARN"

**Solution:**
- Verify certificate is in `us-east-1`
- Certificate must be `Issued` status
- Check certificate ARN is correct

### ECS Tasks Not Starting

**Check:**
1. Task logs: `aws logs tail /ecs/tradeeon-backend --follow`
2. Task definition: `aws ecs describe-task-definition --task-definition tradeeon-backend`
3. ECR image exists: `aws ecr describe-images --repository-name tradeeon-backend`
4. Security groups allow traffic
5. Subnets have internet access

### Health Checks Failing

**Check:**
1. Container is listening on port 8000
2. `/health` endpoint returns 200
3. Target group health: `aws elbv2 describe-target-health --target-group-arn <arn>`
4. Security group allows ALB → ECS traffic

### Route 53 Not Resolving

**Check:**
1. Route 53 record exists: `aws route53 list-resource-record-sets --hosted-zone-id <zone-id>`
2. DNS propagation (can take 5-60 minutes)
3. Record points to correct ALB

## Next Steps

After successful deployment:

1. ✅ Test API endpoints
2. ✅ Monitor logs for errors
3. ✅ Get task public IPs and whitelist on Binance
4. ✅ Test Binance API calls
5. ⏭️ Decide if migration to private subnets needed
6. ✅ Update documentation with actual IPs

## Cleanup (if needed)

To destroy all resources:

```bash
terraform destroy
```

⚠️ **Warning:** This deletes everything! Make sure you want to proceed.

## Support

If you encounter issues:
1. Check Terraform state: `terraform show`
2. Check AWS Console for resource status
3. Review CloudWatch logs
4. Verify security group rules
5. Check Route 53 DNS propagation



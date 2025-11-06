# Tradeeon Backend Infrastructure - Terraform Configuration
#
# Architecture: Public ECS Tasks (Fargate) with ALB
# Purpose: Test if Binance accepts AWS IP addresses for API calls
# Migration Path: Easy migration to private subnets + NAT Gateway later
#
# Current Setup:
# - VPC with 2 public subnets (different AZs)
# - Internet Gateway for public access
# - ECS Fargate tasks with public IPs enabled
# - ALB (internet-facing) with HTTPS
# - Route 53 for api.tradeeon.com
#
# Future Migration to Private Subnets:
# - Change subnet IDs in ECS service to private subnets
# - Disable public IP assignment in ECS service
# - Create NAT Gateway + Elastic IP
# - Update route table for private subnets
# - No other changes needed (ALB, security groups, etc. stay the same)

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ============================================================================
# VPC & NETWORKING
# ============================================================================

# VPC for Tradeeon backend
resource "aws_vpc" "tradeeon" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "tradeeon-backend-vpc"
  }
}

# Internet Gateway for public subnets
# This allows public subnets to access the internet directly
# For private subnets later, we'll use NAT Gateway instead
resource "aws_internet_gateway" "tradeeon" {
  vpc_id = aws_vpc.tradeeon.id

  tags = {
    Name = "tradeeon-igw"
  }
}

# Public Subnet 1 (us-east-1a)
# This subnet will host ECS tasks with public IPs
# Later, we'll create private subnets and move tasks there
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.tradeeon.id
  cidr_block              = var.public_subnet_1_cidr
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "tradeeon-public-subnet-1"
    Type = "public"
    # Migration note: When moving to private, create private subnets
    # and change ECS service subnet_ids to private subnet IDs
  }
}

# Public Subnet 2 (us-east-1b)
# Second AZ for high availability
resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.tradeeon.id
  cidr_block              = var.public_subnet_2_cidr
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "tradeeon-public-subnet-2"
    Type = "public"
  }
}

# Route table for public subnets
# Routes 0.0.0.0/0 → Internet Gateway
# This allows outbound traffic directly to internet (no NAT needed)
#
# For private subnets later:
# - Create new route table
# - Route 0.0.0.0/0 → NAT Gateway
# - Associate with private subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.tradeeon.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.tradeeon.id
  }

  tags = {
    Name = "tradeeon-public-rt"
    Type = "public"
  }
}

# Associate public subnets with public route table
resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

# ============================================================================
# SECURITY GROUPS
# ============================================================================

# Security Group for ALB
# Allows inbound HTTP/HTTPS from internet
# Allows outbound to ECS tasks
resource "aws_security_group" "alb" {
  name        = "tradeeon-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.tradeeon.id

  # Allow HTTP from anywhere (for redirect to HTTPS)
  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow HTTPS from anywhere
  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow outbound to ECS tasks
  egress {
    description     = "Outbound to ECS tasks"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_task.id]
  }

  # Allow all outbound (for health checks, etc.)
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "tradeeon-alb-sg"
  }
}

# Security Group for ECS Tasks
# Allows inbound only from ALB
# Allows all outbound (for API calls to Binance, etc.)
#
# IMPORTANT: Outbound traffic flows directly to internet via IGW
# This is what we're testing - if Binance accepts AWS public IPs
#
# For private subnets later:
# - Outbound traffic will go through NAT Gateway
# - Same security group rules apply
resource "aws_security_group" "ecs_task" {
  name        = "tradeeon-ecs-task-sg"
  description = "Security group for ECS Fargate tasks"
  vpc_id      = aws_vpc.tradeeon.id

  # Allow inbound only from ALB
  ingress {
    description     = "Inbound from ALB"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow all outbound
  # This enables:
  # - API calls to Binance/exchanges (via public IP)
  # - Calls to Supabase
  # - Any other external services
  #
  # Outbound flow: ECS Task (public IP) → IGW → Internet
  # This is what we're testing - Binance will see the task's public IP
  egress {
    description = "All outbound (to Binance, Supabase, etc.)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "tradeeon-ecs-task-sg"
  }
}

# ============================================================================
# APPLICATION LOAD BALANCER
# ============================================================================

# Application Load Balancer (internet-facing)
# This receives traffic from internet and routes to ECS tasks
resource "aws_lb" "tradeeon" {
  name               = "tradeeon-backend-alb"
  internal           = false # Internet-facing
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  enable_deletion_protection = false
  enable_http2                = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name = "tradeeon-backend-alb"
  }
}

# Target Group for ECS tasks
# Health check on /health endpoint
resource "aws_lb_target_group" "tradeeon" {
  name        = "tradeeon-backend-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.tradeeon.id
  target_type = "ip" # For Fargate

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
    protocol            = "HTTP"
  }

  # Sticky sessions (optional, for stateful apps)
  stickiness {
    enabled = false
    type    = "lb_cookie"
  }

  # Deregistration delay (graceful shutdown)
  deregistration_delay = 30

  tags = {
    Name = "tradeeon-backend-tg"
  }
}

# HTTPS Listener (Primary)
# Uses ACM certificate for api.tradeeon.com
# Redirects HTTP to HTTPS
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.tradeeon.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tradeeon.arn
  }

  tags = {
    Name = "tradeeon-alb-https-listener"
  }
}

# HTTP Listener (Redirects to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.tradeeon.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = {
    Name = "tradeeon-alb-http-listener"
  }
}

# ============================================================================
# ECS CLUSTER & SERVICE
# ============================================================================

# ECS Cluster
resource "aws_ecs_cluster" "tradeeon" {
  name = var.ecs_cluster_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = var.ecs_cluster_name
  }
}

# ECS Task Definition
# Defines the container configuration
resource "aws_ecs_task_definition" "tradeeon" {
  family                   = "tradeeon-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "tradeeon-backend"
      image     = "${var.ecr_repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "SUPABASE_URL"
          value = var.supabase_url
        },
        {
          name  = "SUPABASE_SERVICE_ROLE_KEY"
          value = var.supabase_service_role_key
        },
        {
          name  = "CORS_ORIGINS"
          value = var.cors_origins
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.tradeeon.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.container_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "tradeeon-backend-task"
  }
}

# ECS Service
# IMPORTANT: This is configured for PUBLIC subnets with public IPs
#
# Key configuration:
# - subnet_ids: Public subnets (allows direct internet access)
# - assign_public_ip: true (tasks get public IPs)
# - Outbound traffic: Task → IGW → Internet
#
# MIGRATION TO PRIVATE SUBNETS:
# 1. Create private subnets (see comments below)
# 2. Change subnet_ids to private subnet IDs
# 3. Set assign_public_ip = false
# 4. Create NAT Gateway (see comments below)
# 5. Update private subnet route table: 0.0.0.0/0 → NAT Gateway
# 6. No other changes needed!
resource "aws_ecs_service" "tradeeon" {
  name            = var.ecs_service_name
  cluster         = aws_ecs_cluster.tradeeon.id
  task_definition = aws_ecs_task_definition.tradeeon.arn
  desired_count   = var.desired_task_count
  launch_type     = "FARGATE"

  # PUBLIC SUBNETS - Tasks get public IPs
  # This allows direct outbound access to internet (via IGW)
  # Binance will see the task's public IP address
  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ecs_task.id]
    assign_public_ip = true # CRITICAL: Public IP for direct internet access
  }

  # Load balancer configuration
  load_balancer {
    target_group_arn = aws_lb_target_group.tradeeon.arn
    container_name   = "tradeeon-backend"
    container_port   = var.container_port
  }

  # Deployment configuration
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  # Health check grace period
  health_check_grace_period_seconds = 60

  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy_attachment.ecs_execution
  ]

  tags = {
    Name = var.ecs_service_name
  }
}

# ============================================================================
# CLOUDWATCH LOGS
# ============================================================================

resource "aws_cloudwatch_log_group" "tradeeon" {
  name              = "/ecs/tradeeon-backend"
  retention_in_days = 7

  tags = {
    Name = "tradeeon-backend-logs"
  }
}

# ============================================================================
# IAM ROLES
# ============================================================================

# ECS Execution Role (for pulling images, writing logs)
resource "aws_iam_role" "ecs_execution" {
  name = "tradeeon-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECR read permissions
resource "aws_iam_role_policy" "ecs_execution_ecr" {
  name = "ecs-execution-ecr"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Logs permissions
resource "aws_iam_role_policy" "ecs_execution_logs" {
  name = "ecs-execution-logs"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.tradeeon.arn}:*"
      }
    ]
  })
}

# ECS Task Role (for application permissions)
resource "aws_iam_role" "ecs_task" {
  name = "tradeeon-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Add any additional permissions here (e.g., Secrets Manager, S3, etc.)
# resource "aws_iam_role_policy" "ecs_task_additional" {
#   ...
# }

# ============================================================================
# ROUTE 53
# ============================================================================

# Route 53 A record for api.tradeeon.com
# Points to ALB
resource "aws_route53_record" "api" {
  zone_id = var.route53_zone_id
  name    = "api.tradeeon.com"
  type    = "A"

  alias {
    name                   = aws_lb.tradeeon.dns_name
    zone_id                = aws_lb.tradeeon.zone_id
    evaluate_target_health = true
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.tradeeon.id
}

output "public_subnet_1_id" {
  description = "Public Subnet 1 ID"
  value       = aws_subnet.public_1.id
}

output "public_subnet_2_id" {
  description = "Public Subnet 2 ID"
  value       = aws_subnet.public_2.id
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.tradeeon.dns_name
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.tradeeon.arn
}

output "api_url" {
  description = "API URL (api.tradeeon.com)"
  value       = "https://api.tradeeon.com"
}

output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = aws_ecs_cluster.tradeeon.name
}

output "ecs_service_name" {
  description = "ECS Service name"
  value       = aws_ecs_service.tradeeon.name
}

output "target_group_arn" {
  description = "Target Group ARN"
  value       = aws_lb_target_group.tradeeon.arn
}

output "ecs_task_sg_id" {
  description = "ECS Task Security Group ID"
  value       = aws_security_group.ecs_task.id
}

output "alb_sg_id" {
  description = "ALB Security Group ID"
  value       = aws_security_group.alb.id
}


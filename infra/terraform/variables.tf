# Terraform Variables for Tradeeon Backend Infrastructure

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_1_cidr" {
  description = "CIDR block for public subnet 1 (us-east-1a)"
  type        = string
  default     = "10.0.1.0/24"
}

variable "public_subnet_2_cidr" {
  description = "CIDR block for public subnet 2 (us-east-1b)"
  type        = string
  default     = "10.0.2.0/24"
}

variable "container_port" {
  description = "Container port for backend application"
  type        = number
  default     = 8000 # Backend uses port 8000
}

variable "ecs_cluster_name" {
  description = "Name of ECS cluster"
  type        = string
  default     = "tradeeon-cluster"
}

variable "ecs_service_name" {
  description = "Name of ECS service"
  type        = string
  default     = "tradeeon-backend-service"
}

variable "task_cpu" {
  description = "CPU units for ECS task (1024 = 1 vCPU)"
  type        = number
  default     = 512 # 0.5 vCPU
}

variable "task_memory" {
  description = "Memory (MB) for ECS task"
  type        = number
  default     = 1024 # 1 GB
}

variable "desired_task_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "ecr_repository_url" {
  description = "ECR repository URL for backend image"
  type        = string
  # Example: "531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend"
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for api.tradeeon.com"
  type        = string
  # Example: "arn:aws:acm:us-east-1:531604848081:certificate/xxxxx"
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for tradeeon.com"
  type        = string
  # Example: "Z1234567890ABC"
}

variable "supabase_url" {
  description = "Supabase URL"
  type        = string
  sensitive   = true
}

variable "supabase_service_role_key" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
}

variable "cors_origins" {
  description = "CORS allowed origins (comma-separated)"
  type        = string
  default     = "https://www.tradeeon.com,https://tradeeon.com"
}


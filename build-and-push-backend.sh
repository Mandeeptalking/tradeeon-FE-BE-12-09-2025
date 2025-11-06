#!/bin/bash
# Build and Push Backend Docker Image to ECR
# Run this in AWS CloudShell

set -e

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 531604848081.dkr.ecr.us-east-1.amazonaws.com

echo "🏗️ Building Docker image..."
docker build -t tradeeon-backend .

echo "🏷️ Tagging image..."
docker tag tradeeon-backend:latest 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest

echo "📤 Pushing image to ECR..."
docker push 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest

echo "✅ Image pushed successfully!"
echo "Image URI: 531604848081.dkr.ecr.us-east-1.amazonaws.com/tradeeon-backend:latest"


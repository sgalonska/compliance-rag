#!/bin/bash

# AWS ECS Deployment Script for Compliance RAG

set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-west-2}
CLUSTER_NAME="compliance-rag-cluster"
SERVICE_NAME="compliance-rag-service"
TASK_DEFINITION_NAME="compliance-rag-task"

echo "🚀 Deploying Compliance RAG to AWS ECS..."

# 1. Build and push Docker images
echo "📦 Building and pushing Docker images..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push backend
docker build -t compliance-rag-backend ./backend
docker tag compliance-rag-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compliance-rag-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compliance-rag-backend:latest

# Build and push frontend
docker build -t compliance-rag-frontend ./frontend
docker tag compliance-rag-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compliance-rag-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compliance-rag-frontend:latest

# 2. Create ECS cluster if it doesn't exist
echo "🏗️ Setting up ECS cluster..."
aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION 2>/dev/null || \
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION

# 3. Register task definition
echo "📝 Registering ECS task definition..."
aws ecs register-task-definition \
    --family $TASK_DEFINITION_NAME \
    --network-mode bridge \
    --requires-compatibilities EC2 \
    --cpu 1024 \
    --memory 2048 \
    --execution-role-arn arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole \
    --container-definitions file://deploy/aws/task-definition.json \
    --region $AWS_REGION

# 4. Create or update service
echo "🎯 Creating/updating ECS service..."
aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION 2>/dev/null && \
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --task-definition $TASK_DEFINITION_NAME \
    --region $AWS_REGION || \
aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_DEFINITION_NAME \
    --desired-count 1 \
    --region $AWS_REGION

echo "✅ Deployment complete!"
echo "🌐 Your application will be available at the ALB endpoint"
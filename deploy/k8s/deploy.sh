#!/bin/bash

# Kubernetes Deployment Script for Compliance RAG

set -e

echo "🚀 Deploying Compliance RAG to Kubernetes..."

# Create namespace
kubectl apply -f deploy/k8s/namespace.yaml

# Create secrets (you need to edit these values)
kubectl create secret generic compliance-rag-secrets \
  --from-literal=database-url="postgresql://user:password@postgres:5432/compliance_rag" \
  --from-literal=redis-url="redis://redis:6379" \
  --from-literal=qdrant-url="your_qdrant_url" \
  --from-literal=qdrant-api-key="your_qdrant_api_key" \
  --from-literal=openai-api-key="your_openai_api_key" \
  --from-literal=secret-key="your-super-secret-key" \
  --namespace=compliance-rag \
  --dry-run=client -o yaml | kubectl apply -f -

# Deploy PostgreSQL
kubectl apply -f deploy/k8s/postgres-deployment.yaml

# Deploy Redis
kubectl apply -f deploy/k8s/redis-deployment.yaml

# Deploy Backend
kubectl apply -f deploy/k8s/backend-deployment.yaml

# Deploy Frontend
kubectl apply -f deploy/k8s/frontend-deployment.yaml

# Deploy Ingress
kubectl apply -f deploy/k8s/ingress.yaml

echo "✅ Deployment complete!"
echo "🌐 Check ingress for external IP:"
echo "kubectl get ingress -n compliance-rag"
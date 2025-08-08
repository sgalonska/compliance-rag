# 🚀 Deployment Guide - Compliance RAG System

This guide covers multiple deployment options from simple cloud hosting to enterprise Kubernetes deployment.

## 📋 Prerequisites

### Required Services
- **Qdrant Cloud**: Vector database ([Sign up](https://qdrant.tech/))
- **OpenAI API**: For embeddings and chat ([Get API key](https://platform.openai.com/))

### Optional (for some deployments)
- **Domain name** with DNS control
- **SSL certificate** (Let's Encrypt recommended)

## 🎯 Deployment Options

### Option 1: Railway (Recommended for Beginners)
**⏱️ 5 minutes | 💰 ~$20/month | 🔧 Minimal setup**

1. **Fork the repository** to your GitHub account

2. **Deploy to Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub"
   - Select your forked `compliance-rag` repository
   - Railway will auto-detect and deploy both services

3. **Configure environment variables** in Railway dashboard:
   ```env
   # Security
   SECRET_KEY=generate-a-32-character-secret-key
   
   # Qdrant (from your Qdrant Cloud account)
   QDRANT_URL=https://your-cluster.qdrant.io:6333
   QDRANT_API_KEY=your_qdrant_api_key
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   
   # Database (Railway auto-provides)
   POSTGRES_PASSWORD=auto-generated
   ```

4. **Custom domain** (optional):
   - Add your domain in Railway settings
   - Update DNS to point to Railway

✅ **Pros**: Zero-config databases, automatic SSL, easy scaling  
❌ **Cons**: Higher cost for heavy usage, less control

### Option 2: DigitalOcean Droplet (Cost-Effective)
**⏱️ 15 minutes | 💰 ~$12/month | 🔧 Moderate setup**

1. **Create a DigitalOcean Droplet**:
   ```bash
   # Choose: Ubuntu 22.04, 2GB RAM, $12/month
   # Enable monitoring and backups
   ```

2. **Setup the server**:
   ```bash
   # Connect via SSH
   ssh root@your_server_ip
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Install Docker Compose
   sudo apt install docker-compose
   
   # Clone your repo
   git clone https://github.com/sgalonska/compliance-rag.git
   cd compliance-rag
   ```

3. **Configure environment**:
   ```bash
   # Setup environment
   cp backend/.env.example backend/.env
   nano backend/.env  # Edit with your credentials
   ```

4. **Deploy**:
   ```bash
   # Start production environment
   docker-compose -f docker-compose.prod.yml up -d
   
   # Check status
   docker-compose logs -f
   ```

5. **Setup domain and SSL**:
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Get SSL certificate
   sudo certbot --nginx -d your-domain.com
   ```

✅ **Pros**: Full control, cost-effective, predictable pricing  
❌ **Cons**: Manual server management, no auto-scaling

### Option 3: AWS ECS (Production Scale)
**⏱️ 30 minutes | 💰 ~$50/month | 🔧 Advanced setup**

1. **Prepare AWS resources**:
   ```bash
   # Install AWS CLI
   pip install awscli
   aws configure
   
   # Create ECR repositories
   aws ecr create-repository --repository-name compliance-rag-backend
   aws ecr create-repository --repository-name compliance-rag-frontend
   
   # Create RDS PostgreSQL instance
   # Create ElastiCache Redis cluster
   # Create Application Load Balancer
   ```

2. **Deploy using our script**:
   ```bash
   # Set environment variables
   export AWS_ACCOUNT_ID=your_account_id
   export AWS_REGION=us-west-2
   export DATABASE_URL=your_rds_url
   export REDIS_URL=your_elasticache_url
   
   # Run deployment
   chmod +x deploy/aws/deploy.sh
   ./deploy/aws/deploy.sh
   ```

✅ **Pros**: Auto-scaling, managed databases, enterprise-grade  
❌ **Cons**: Complex setup, higher costs, AWS expertise needed

### Option 4: Google Cloud Run (Serverless)
**⏱️ 20 minutes | 💰 Pay-per-use | 🔧 Moderate setup**

1. **Setup Google Cloud**:
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   gcloud init
   
   # Enable required services
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable sql-component.googleapis.com
   ```

2. **Create managed databases**:
   ```bash
   # Create Cloud SQL PostgreSQL
   gcloud sql instances create compliance-rag-db \
     --database-version=POSTGRES_14 \
     --tier=db-f1-micro \
     --region=us-central1
   
   # Create Memorystore Redis
   gcloud redis instances create compliance-rag-redis \
     --size=1 \
     --region=us-central1
   ```

3. **Deploy with Cloud Build**:
   ```bash
   # Submit build
   gcloud builds submit --config=deploy/gcp/cloudbuild.yaml \
     --substitutions=_DATABASE_URL="your_db_url",_REDIS_URL="your_redis_url"
   ```

✅ **Pros**: Serverless scaling, pay-per-use, Google-managed  
❌ **Cons**: Cold starts, vendor lock-in, complex networking

### Option 5: Kubernetes (Enterprise)
**⏱️ 45 minutes | 💰 Variable | 🔧 Expert setup**

1. **Prepare Kubernetes cluster** (EKS, GKE, or AKS)

2. **Deploy the application**:
   ```bash
   # Edit secrets in deploy/k8s/deploy.sh
   nano deploy/k8s/deploy.sh
   
   # Deploy everything
   chmod +x deploy/k8s/deploy.sh
   ./deploy/k8s/deploy.sh
   
   # Check status
   kubectl get pods -n compliance-rag
   kubectl get ingress -n compliance-rag
   ```

✅ **Pros**: Maximum flexibility, multi-cloud, enterprise features  
❌ **Cons**: Complex management, requires K8s expertise

## 🔧 Configuration

### Environment Variables Reference

**Required Variables**:
```env
# Security
SECRET_KEY=your-super-secret-key-minimum-32-characters
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Database
POSTGRES_SERVER=your_db_host
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=compliance_rag

# Redis
REDIS_URL=redis://your_redis_host:6379

# Qdrant Vector Database
QDRANT_URL=https://your-cluster.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key
COLLECTION_NAME=compliance_documents

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

**Optional Variables**:
```env
# RAG Configuration
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4-turbo-preview

# File Upload
MAX_FILE_SIZE=52428800  # 50MB
UPLOAD_DIR=uploads

# CORS (for production)
ALLOWED_HOSTS=["https://your-domain.com"]
```

## 🛡️ Security Checklist

### Production Security
- [ ] Change default SECRET_KEY to a strong, unique value
- [ ] Use environment variables for all sensitive data
- [ ] Enable HTTPS/SSL for all communication
- [ ] Configure proper CORS settings
- [ ] Use strong database passwords
- [ ] Enable database connection encryption
- [ ] Set up proper firewall rules
- [ ] Regular security updates

### Qdrant Security
- [ ] Use API keys for authentication
- [ ] Enable HTTPS for Qdrant connections
- [ ] Restrict Qdrant access by IP (if possible)
- [ ] Regular backups of vector data

### OpenAI Security
- [ ] Use separate API keys for different environments
- [ ] Monitor API usage and set spending limits
- [ ] Rotate API keys regularly
- [ ] Don't log API responses with sensitive data

## 📊 Monitoring & Maintenance

### Health Checks
All deployments include health endpoints:
- Backend: `GET /health` - Database and external service status
- Frontend: `GET /` - Application availability

### Monitoring Setup
```bash
# Check application health
curl https://your-domain.com/api/v1/health

# Monitor logs (Docker Compose)
docker-compose logs -f backend

# Monitor logs (Kubernetes)
kubectl logs -f deployment/compliance-rag-backend -n compliance-rag
```

### Backup Strategy
1. **Database backups**: Automated daily PostgreSQL dumps
2. **Document backups**: Regular file system backups
3. **Vector data**: Qdrant Cloud handles backups automatically
4. **Configuration**: Version control all configurations

### Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Check health
curl https://your-domain.com/api/v1/health
```

## 🚨 Troubleshooting

### Common Issues

1. **Database connection failed**
   ```bash
   # Check database status
   docker-compose logs postgres
   
   # Test connection
   docker-compose exec backend python -c "from app.core.database import engine; print(engine.execute('SELECT 1'))"
   ```

2. **Qdrant connection issues**
   ```bash
   # Test Qdrant connectivity
   curl -X GET "https://your-cluster.qdrant.io:6333/collections" \
        -H "api-key: your_api_key"
   ```

3. **OpenAI API errors**
   ```bash
   # Test OpenAI API
   curl https://api.openai.com/v1/models \
        -H "Authorization: Bearer your_api_key"
   ```

4. **Frontend build issues**
   ```bash
   # Rebuild frontend
   docker-compose build frontend
   docker-compose up -d frontend
   ```

### Performance Optimization

1. **Database optimization**:
   - Add indexes for frequently queried fields
   - Configure connection pooling
   - Monitor query performance

2. **Redis optimization**:
   - Configure appropriate memory limits
   - Set up persistence if needed
   - Monitor cache hit rates

3. **Application optimization**:
   - Adjust document chunk size based on usage
   - Monitor embedding API usage
   - Implement request rate limiting

## 💰 Cost Estimation

| Platform | Monthly Cost | Setup Time | Scalability |
|----------|-------------|------------|-------------|
| Railway | $20-50 | 5 min | Good |
| DigitalOcean | $12-25 | 15 min | Manual |
| AWS ECS | $50-200 | 30 min | Excellent |
| Google Cloud Run | $10-100 | 20 min | Auto |
| Kubernetes | $100-500 | 45 min | Maximum |

*Costs vary based on usage, storage, and traffic*

## 📞 Support

- **Documentation Issues**: Open an issue on GitHub
- **Deployment Problems**: Check troubleshooting section first
- **Feature Requests**: Submit via GitHub issues
- **Security Issues**: Email privately to maintainers

---

**Choose the deployment option that best fits your needs, budget, and technical expertise!** 🚀
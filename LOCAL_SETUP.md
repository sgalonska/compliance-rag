# 🏠 Local Docker Setup Guide

Get your compliance RAG system running locally in just 5 minutes!

## 📋 Prerequisites

1. **Docker & Docker Compose** installed
   - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
   - Or install Docker Engine + Docker Compose separately

2. **Required API Keys**:
   - **Qdrant Cloud account**: [Sign up free](https://qdrant.tech/)
   - **OpenAI API key**: [Get key](https://platform.openai.com/api-keys)

## 🚀 Quick Start

### Step 1: Setup Environment
```bash
# Copy environment template
make setup-env

# Edit configuration
nano backend/.env
```

### Step 2: Configure Your Keys
Edit `backend/.env` with your credentials:

```env
# Required: Add your API keys
QDRANT_URL=https://your-cluster.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Required: Generate a secure secret key (32+ characters)
SECRET_KEY=your-super-secret-key-minimum-32-characters-long

# Database settings (defaults work for local)
POSTGRES_SERVER=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=compliance_rag

# Other settings (defaults are fine)
REDIS_URL=redis://redis:6379
COLLECTION_NAME=compliance_documents
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4-turbo-preview
```

### Step 3: Start the System
```bash
# Build and start everything
make dev
```

This will:
- ✅ Build Docker images for frontend and backend
- ✅ Start PostgreSQL database
- ✅ Start Redis cache
- ✅ Initialize the database schema
- ✅ Launch the web application

### Step 4: Access Your Application
- 🌐 **Frontend**: http://localhost:3000
- 🔗 **Backend API**: http://localhost:8000
- 📖 **API Documentation**: http://localhost:8000/docs

## 🛠️ Development Commands

### Basic Operations
```bash
make help          # Show all available commands
make dev           # Start development environment
make stop          # Stop all services
make restart       # Restart all services
make logs          # View all logs
make health        # Check service health
```

### Monitoring & Debugging
```bash
make logs-backend   # Backend logs only
make logs-frontend  # Frontend logs only
make shell-backend  # Open backend container shell
make shell-db       # Open database shell
```

### Maintenance
```bash
make clean         # Clean up containers and volumes
make reset         # Complete reset and rebuild
```

## 🧪 Testing Your Setup

### 1. Health Check
```bash
make health
```
Should show:
```
✅ Backend responding
✅ Frontend responding
✅ Database responding
```

### 2. API Test
Visit http://localhost:8000/docs to see the interactive API documentation.

### 3. Frontend Test
1. Go to http://localhost:3000
2. Register a new account
3. Upload a test document (PDF, DOCX, or Excel)
4. Start a chat and ask questions about your document

## 📄 Sample Usage

### Upload Documents
1. **Register/Login** at http://localhost:3000
2. **Go to Documents** page
3. **Drag & drop** or click to upload:
   - PDF files
   - Word documents (.docx)
   - Excel files (.xlsx, .xls)
4. **Wait for processing** - you'll see real-time status updates

### Chat with Documents
1. **Go to Chat** page
2. **Start new conversation**
3. **Ask compliance questions** like:
   - "What are the data retention requirements?"
   - "What GDPR obligations do we have?"
   - "Summarize the key compliance risks"
4. **Get AI responses** with source citations

## 🐛 Troubleshooting

### Common Issues

**1. Port already in use**
```bash
# Stop any existing services
make stop

# Or change ports in docker-compose.yml
```

**2. Docker build fails**
```bash
# Clean and rebuild
make reset
```

**3. Database connection error**
```bash
# Check database status
make logs-backend

# Reset database
make clean
make dev
```

**4. Qdrant connection fails**
- Verify your `QDRANT_URL` and `QDRANT_API_KEY` in `backend/.env`
- Test connection: `curl -H "api-key: YOUR_KEY" YOUR_QDRANT_URL/collections`

**5. OpenAI API errors**
- Check your `OPENAI_API_KEY` is valid
- Verify you have credits in your OpenAI account

### Getting Help
- Check `make logs` for detailed error messages
- Ensure all required environment variables are set
- Verify Docker has enough resources (4GB RAM recommended)

## 🔧 Configuration Options

### Performance Tuning
Edit `backend/.env`:

```env
# For larger documents
CHUNK_SIZE=1500
CHUNK_OVERLAP=300

# For faster responses (less accurate)
EMBEDDING_MODEL=text-embedding-ada-002
LLM_MODEL=gpt-3.5-turbo

# For better quality (slower, more expensive)
LLM_MODEL=gpt-4
```

### File Upload Limits
```env
# 100MB file size limit
MAX_FILE_SIZE=104857600
```

## 📊 System Resources

**Minimum Requirements**:
- 4GB RAM
- 2GB free disk space
- Docker with 2GB memory allocation

**Recommended**:
- 8GB RAM
- 10GB free disk space
- Fast internet (for API calls)

## 🔒 Security Notes

For local development:
- Default passwords are fine
- HTTPS not required
- Firewall rules not needed

**Never use local setup for production!**

## ✅ Next Steps

Once everything is working locally:

1. **Explore the features**:
   - Upload various document types
   - Try different question styles
   - Export chat conversations

2. **Customize for your needs**:
   - Adjust chunk sizes for your documents
   - Modify the AI prompts in `backend/app/services/rag_service.py`
   - Brand the frontend in `frontend/src`

3. **Deploy to production**:
   - See `DEPLOYMENT.md` for cloud deployment options
   - Consider Railway, DigitalOcean, or AWS

Happy compliance chatting! 🏛️✨
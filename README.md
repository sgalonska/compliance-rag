# Compliance RAG System 🏛️

A modern, enterprise-grade Retrieval-Augmented Generation (RAG) system designed for compliance officers to chat with and query compliance documents. Built with **FastAPI**, **React TypeScript**, **PostgreSQL**, and **Qdrant** vector database.

## ✨ Features

### 🔐 **Authentication & Security**
- JWT-based authentication with automatic refresh
- Role-based access control (User/Admin)
- Secure password management with strength validation
- Environment-based configuration

### 📄 **Document Management**
- **Drag & Drop Upload**: Modern file upload with progress tracking
- **Multi-Format Support**: PDF, DOCX, Excel files with intelligent parsing
- **Processing Status**: Real-time document processing status tracking
- **Smart Chunking**: Configurable document splitting for optimal retrieval
- **Metadata Extraction**: Automatic file metadata extraction and tagging

### 💬 **AI-Powered Chat**
- **Streaming Responses**: Real-time AI responses with typing indicators
- **Source Citations**: Transparent source attribution with relevance scores
- **Chat History**: Persistent conversation management
- **Export Options**: Export chats in multiple formats (JSON, Markdown, TXT)
- **Context-Aware**: Compliance-focused AI responses

### 🎨 **Modern UI/UX**
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode Support**: Professional dark/light mode toggle
- **Accessible Components**: WCAG-compliant UI using Radix UI
- **Real-time Updates**: Live status updates and notifications
- **Professional Design**: Clean, compliance-officer focused interface

### 🚀 **Enterprise Features**
- **Scalable Architecture**: Microservices with Docker containerization
- **Database Integration**: PostgreSQL with Redis caching
- **Health Monitoring**: Comprehensive health checks and monitoring
- **Background Processing**: Celery for async document processing
- **Production Ready**: Docker Compose for easy deployment

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │    FastAPI      │    │   PostgreSQL    │
│   Frontend      │◄──►│    Backend      │◄──►│   Database      │
│   (TypeScript)  │    │   (Python)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       
         │                       ▼                       
         │              ┌─────────────────┐              
         │              │     Qdrant      │              
         │              │ Vector Database │              
         │              └─────────────────┘              
         │                       │                       
         ▼                       ▼                       
┌─────────────────┐    ┌─────────────────┐              
│     Redis       │    │     Celery      │              
│     Cache       │    │   Background    │              
│                 │    │    Workers      │              
└─────────────────┘    └─────────────────┘              
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/sgalonska/compliance-rag.git
   cd compliance-rag
   ```

2. **Setup environment variables**
   ```bash
   make setup-env
   # Edit backend/.env with your Qdrant and OpenAI credentials
   ```

3. **Start the application**
   ```bash
   make dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Option 2: Local Development

1. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your configuration
   uvicorn app.main:app --reload
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   ```

## 🛠️ Configuration

### Environment Variables

**Backend (.env)**
```env
# Database
POSTGRES_SERVER=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=compliance_rag

# Security
SECRET_KEY=your-super-secret-key-32-chars-minimum
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Qdrant Vector Database
QDRANT_URL=https://your-cluster.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key
COLLECTION_NAME=compliance_documents

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# RAG Settings
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4-turbo-preview
```

### Customizable Settings

- **Document Processing**: Adjust chunk size, overlap, and supported file types
- **AI Models**: Configure OpenAI models for embeddings and chat completion
- **UI Themes**: Customize colors, fonts, and branding
- **Security**: Configure token expiration, CORS settings, and access controls

## 📁 Project Structure

```
compliance-rag/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/               # API routes and endpoints
│   │   ├── core/              # Configuration and utilities
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── schemas/           # Pydantic request/response models
│   │   └── services/          # Business logic layer
│   ├── migrations/            # Database migrations
│   └── tests/                 # Backend tests
├── frontend/                  # Next.js Frontend
│   └── src/
│       ├── app/              # Next.js 13+ App Router
│       ├── components/       # React components
│       ├── hooks/            # Custom React hooks
│       ├── lib/              # Utility functions
│       ├── stores/           # Zustand state management
│       └── types/            # TypeScript definitions
├── docker-compose.yml         # Development environment
├── docker-compose.prod.yml    # Production environment
└── Makefile                  # Development commands
```

## 🐳 Docker Deployment

### Development
```bash
make dev        # Start development environment
make logs       # View logs
make stop       # Stop services
```

### Production
```bash
make build      # Build images
make start      # Start production environment
```

## 🧪 Testing

```bash
# Run all tests
make test

# Backend tests only
make test-backend

# Frontend tests only  
make test-frontend
```

## 📊 Monitoring & Health

The system includes comprehensive health checks:

- **API Health**: `/health` endpoint with database and external service checks
- **Service Monitoring**: Individual service health checks in Docker Compose
- **Logging**: Structured logging with different levels
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 🔧 Development Commands

```bash
make help           # Show available commands
make install        # Install dependencies
make dev           # Start development environment
make dev-backend   # Start backend only
make dev-frontend  # Start frontend only
make build         # Build Docker images
make start         # Start production
make stop          # Stop all services
make clean         # Clean up containers
make db-migrate    # Run database migrations
make backup        # Backup database
make health        # Check service health
```

## 🤝 Usage Examples

### Document Upload
- Drag and drop PDF, DOCX, or Excel files
- Real-time processing status updates
- Automatic metadata extraction
- Bulk upload support

### Compliance Chat
```
User: "What are the data retention requirements for customer information?"

AI: "Based on your compliance documents, data retention requirements for customer information include:

1. **GDPR Compliance** (Article 5): Personal data should be kept for no longer than necessary for the purposes for which it's processed.

2. **Industry Standards**: Customer account data should be retained for 7 years after account closure.

3. **Transaction Records**: Payment and transaction data must be kept for 10 years for audit purposes.

Sources:
- GDPR_Compliance_Guide.pdf (relevance: 0.94)
- Data_Retention_Policy.docx (relevance: 0.89)
"
```

### Document Search
- Vector similarity search across all documents
- Filter by file type, upload date, or tags
- Relevance scoring and ranking

## 🛡️ Security

- **Authentication**: JWT tokens with automatic refresh
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive input validation with Pydantic
- **File Security**: File type validation and size limits
- **Database Security**: SQL injection prevention with SQLAlchemy
- **CORS**: Configurable CORS settings for production

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```bash
   make db-reset  # Reset database
   ```

2. **Qdrant Connection Issues**
   - Check your QDRANT_URL and QDRANT_API_KEY in .env
   - Verify network connectivity to Qdrant cluster

3. **OpenAI API Errors**
   - Verify OPENAI_API_KEY is valid
   - Check API usage limits

4. **File Upload Issues**
   - Ensure file size is under 50MB
   - Check supported formats: PDF, DOCX, XLSX

5. **Frontend Build Issues**
   ```bash
   cd frontend && npm install
   npm run build
   ```

### Performance Optimization

- **Document Chunking**: Adjust CHUNK_SIZE based on document types
- **Vector Search**: Tune search parameters for accuracy vs speed
- **Database**: Add indexes for frequently queried fields
- **Caching**: Configure Redis for optimal performance

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Qdrant**: Vector database for efficient similarity search
- **OpenAI**: GPT models for intelligent responses
- **FastAPI**: High-performance Python web framework
- **Next.js**: React framework for production-ready frontend
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework

---

**Built with ❤️ for compliance professionals**
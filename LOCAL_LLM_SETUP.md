# 🤖 Local LLM Setup Guide

Your compliance RAG system now runs **completely locally** with no external API dependencies! This guide will help you set up local LLMs with Ollama.

## 🎯 What Changed

### ✅ **No More API Keys Required**
- ❌ No OpenAI API key needed
- ❌ No Qdrant Cloud required (uses in-memory storage)
- ✅ Everything runs on your local machine
- ✅ Complete privacy and control

### 🔧 **New Local Architecture**
- **Ollama**: Runs local LLMs (Llama 2, Mistral, etc.)
- **Sentence Transformers**: Local embeddings
- **In-memory Qdrant**: Local vector storage
- **Docker**: Everything containerized

## 🚀 Quick Start

### Step 1: Start the System
```bash
# This will start Ollama + all services
make dev
```

### Step 2: Setup Models (Automatic)
```bash
# Download and setup default models
./scripts/setup-models.sh
```

This will:
- ✅ Download Llama 2 (7B model ~4GB)
- ✅ Setup text embeddings
- ✅ Test the models
- ✅ Configure your system

### Step 3: Access Your App
- 🌐 **Frontend**: http://localhost:3000
- 🔗 **Backend**: http://localhost:8000
- 📖 **Ollama**: http://localhost:11434

## 🛠️ Manual Model Setup

### Choose Your Models

**LLM Options:**
```bash
# Fast & Good Quality (Recommended)
./scripts/setup-models.sh interactive
# Then select: llama2 (7B, ~4GB)

# Better Quality (Slower)
./scripts/setup-models.sh interactive  
# Then select: llama2:13b (13B, ~7GB)

# Lightweight Option
./scripts/setup-models.sh interactive
# Then select: phi (2.7B, ~1.6GB)

# Code-Optimized
./scripts/setup-models.sh interactive
# Then select: codellama (7B, ~4GB)
```

**Available Models:**
| Model | Size | RAM Needed | Best For |
|-------|------|------------|----------|
| `phi` | 1.6GB | 4GB | Lightweight, fast |
| `llama2` | 4GB | 8GB | **Recommended balance** |
| `mistral` | 4GB | 8GB | Fast, efficient |
| `codellama` | 4GB | 8GB | Code & documents |
| `llama2:13b` | 7GB | 16GB | Best quality |

### Manual Commands
```bash
# List available models
./scripts/setup-models.sh list

# Interactive selection
./scripts/setup-models.sh interactive

# Check what's installed
./scripts/setup-models.sh status

# Test your models
./scripts/setup-models.sh test
```

## 📊 System Requirements

### Minimum Requirements
- **RAM**: 8GB (for Llama 2 7B)
- **Storage**: 10GB free space
- **CPU**: Multi-core recommended

### Recommended Setup
- **RAM**: 16GB+ (for better performance)
- **Storage**: 20GB+ (for multiple models)
- **CPU**: 8+ cores
- **GPU**: Optional (CUDA support available)

### GPU Support (Optional)
If you have an NVIDIA GPU:
```bash
# Edit backend/.env
LOCAL_EMBEDDING_DEVICE=cuda

# The system will automatically use GPU if available
```

## 🔧 Configuration

### Model Configuration
Edit `backend/.env`:
```env
# Choose your LLM provider
LLM_PROVIDER=ollama

# Ollama settings
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama2  # Change this to your preferred model

# Local embeddings
LOCAL_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
LOCAL_EMBEDDING_DEVICE=cpu  # or 'cuda' for GPU

# Vector storage (leave empty for in-memory)
QDRANT_URL=
QDRANT_API_KEY=
```

### Performance Tuning
```env
# For better quality (slower)
OLLAMA_MODEL=llama2:13b

# For faster responses (lower quality)
OLLAMA_MODEL=phi

# Larger chunks for better context
CHUNK_SIZE=1500
CHUNK_OVERLAP=300
```

## 🧪 Testing Your Setup

### Health Check
```bash
make health
```
Should show:
```
✅ Backend responding
✅ Frontend responding  
✅ Database responding
✅ Ollama responding
```

### Manual Testing
```bash
# Test Ollama directly
curl http://localhost:11434/api/tags

# Test model generation
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama2","prompt":"Hello!","stream":false}'
```

### Application Test
1. **Upload a document** (PDF, DOCX, Excel)
2. **Wait for processing** (may take 30-60 seconds first time)
3. **Ask a question** about your document
4. **Get local AI response** with sources

## 🐛 Troubleshooting

### Common Issues

**1. Models not downloading**
```bash
# Check Ollama logs
docker-compose logs ollama

# Restart Ollama
docker-compose restart ollama

# Manual model pull
docker-compose exec ollama ollama pull llama2
```

**2. Out of memory errors**
```bash
# Try smaller model
OLLAMA_MODEL=phi

# Or increase Docker memory limit to 8GB+
```

**3. Slow responses**
- First response is always slower (model loading)
- Subsequent responses are much faster
- Consider using smaller model (phi, mistral)

**4. Model not found**
```bash
# Check available models
./scripts/setup-models.sh status

# Re-run setup
./scripts/setup-models.sh default
```

### Performance Issues

**Slow document processing:**
- First upload takes longer (embedding model loading)
- Use smaller chunks: `CHUNK_SIZE=500`
- Consider GPU acceleration

**Slow chat responses:**
- First question is slow (LLM loading)
- Use smaller model: `OLLAMA_MODEL=phi`
- Increase Docker memory allocation

## 📈 Performance Comparison

### Response Time
| Model | First Response | Subsequent | Quality |
|-------|----------------|------------|---------|
| phi | ~5-10 seconds | ~1-3 seconds | Good |
| llama2 | ~10-15 seconds | ~3-5 seconds | **Excellent** |
| mistral | ~8-12 seconds | ~2-4 seconds | Very Good |
| llama2:13b | ~15-30 seconds | ~5-10 seconds | Best |

### Resource Usage
| Model | RAM Usage | CPU Usage | Storage |
|-------|-----------|-----------|---------|
| phi | ~3GB | Medium | 1.6GB |
| llama2 | ~6GB | High | 4GB |
| mistral | ~5GB | Medium-High | 4GB |
| llama2:13b | ~10GB | Very High | 7GB |

## 🔄 Switching Models

### Change LLM Model
```bash
# Edit backend/.env
OLLAMA_MODEL=mistral

# Restart system
make restart

# Download new model if needed
./scripts/setup-models.sh
```

### Back to OpenAI (if needed)
```bash
# Edit backend/.env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_api_key

# Restart
make restart
```

## 📚 Available Models

### Language Models
- **llama2**: Meta's Llama 2 (7B) - Best balance
- **llama2:13b**: Larger Llama 2 (13B) - Best quality
- **mistral**: Mistral AI (7B) - Fast & efficient
- **phi**: Microsoft Phi-2 (2.7B) - Lightweight
- **codellama**: Code Llama (7B) - Code-optimized
- **orca-mini**: Orca Mini (3B) - Lightweight
- **neural-chat**: Intel Neural Chat (7B) - Conversation-focused

### Embedding Models
- **nomic-embed-text**: Good for documents
- **all-minilm**: Lightweight, fast embeddings

## 💡 Tips & Best Practices

### First-Time Setup
- Start with default models (`llama2` + `nomic-embed-text`)
- Test with small documents first
- Allow extra time for first responses
- Monitor resource usage

### Production Use
- Use dedicated GPU if available
- Consider model size vs. quality tradeoff
- Set up monitoring for resource usage
- Regular model updates

### Privacy & Security
- ✅ All data stays local
- ✅ No external API calls
- ✅ Complete offline operation
- ✅ Full control over models and data

## 🎉 Success!

Your compliance RAG system now runs **100% locally** with:
- 🤖 Local LLM for intelligent responses
- 🔍 Local embeddings for document search
- 💾 Local vector storage
- 🔒 Complete privacy and control
- 🆓 No ongoing API costs

**Next steps:**
1. Upload your compliance documents
2. Start asking questions
3. Enjoy private, local AI assistance!

---

**Need help?** Check the troubleshooting section or open an issue on GitHub.
# Compliance RAG System

A Retrieval-Augmented Generation (RAG) system designed for compliance officers to chat with and query compliance documents stored in Qdrant vector database.

## Features

- **Document Processing**: Supports PDF, DOCX, and Excel files
- **Vector Storage**: Uses Qdrant for efficient document retrieval
- **Smart Chunking**: Intelligently splits documents for optimal retrieval
- **Chat Interface**: Streamlit-based web interface for asking compliance questions
- **CLI Tool**: Command-line interface for batch operations
- **Source Attribution**: Shows which documents were used to generate answers

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your details:
```
QDRANT_URL=your_qdrant_cluster_url
QDRANT_API_KEY=your_qdrant_api_key
OPENAI_API_KEY=your_openai_api_key
COLLECTION_NAME=compliance_documents
```

### 3. Initialize Collection

```bash
python cli_tool.py setup
```

## Usage

### Web Interface

Launch the Streamlit app:
```bash
streamlit run streamlit_app.py
```

Features:
- **Chat Tab**: Ask compliance questions
- **Upload Tab**: Add new documents to the system
- **Stats Tab**: View collection statistics and setup instructions

### Command Line Interface

Upload documents:
```bash
python cli_tool.py upload path/to/document.pdf
python cli_tool.py upload path/to/documents/  # Upload entire directory
```

Query documents:
```bash
python cli_tool.py query "What are the data retention requirements?"
python cli_tool.py query "GDPR compliance requirements" --limit 7
```

Check collection stats:
```bash
python cli_tool.py stats
```

## File Structure

```
qdrant-compliance-rag/
├── config.py              # Configuration and environment variables
├── document_processor.py  # Document parsing and chunking
├── qdrant_client.py       # Qdrant vector database integration
├── embedding_manager.py   # Document embedding and storage orchestration
├── rag_pipeline.py        # Main RAG pipeline for Q&A
├── streamlit_app.py       # Web interface
├── cli_tool.py           # Command-line interface
├── requirements.txt      # Python dependencies
├── .env.example         # Environment variables template
└── README.md           # This file
```

## How It Works

1. **Document Processing**: Documents are parsed and split into chunks with overlap for context preservation
2. **Embedding Generation**: Text chunks are converted to embeddings using OpenAI's embedding model
3. **Vector Storage**: Embeddings are stored in Qdrant with metadata for retrieval
4. **Question Answering**: User questions are embedded and matched against stored documents
5. **Answer Generation**: Retrieved context is used to generate compliance-focused answers

## Supported File Types

- **PDF**: Text extraction from PDF documents
- **DOCX**: Microsoft Word documents
- **XLSX/XLS**: Excel spreadsheets (converts tables to text format)

## Configuration Options

Edit `config.py` to adjust:
- `CHUNK_SIZE`: Size of document chunks (default: 1000)
- `CHUNK_OVERLAP`: Overlap between chunks (default: 200)
- `EMBEDDING_MODEL`: OpenAI embedding model (default: text-embedding-3-small)
- `LLM_MODEL`: OpenAI chat model (default: gpt-4-turbo-preview)

## Troubleshooting

1. **Collection not found**: Run `python cli_tool.py setup` to initialize
2. **API key errors**: Check your `.env` file configuration
3. **Document processing errors**: Ensure files are not corrupted and are in supported formats
4. **Memory issues**: Reduce `CHUNK_SIZE` in `config.py` for large documents
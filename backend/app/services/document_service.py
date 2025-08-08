import os
import shutil
from pathlib import Path
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException, status
from datetime import datetime
import uuid

from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentStatus, DocumentProcessingStatus
from app.core.config import settings
from app.core.integration import setup_backend_path
from app.services.embedding_service import EmbeddingService

# Setup backend path for importing existing modules
setup_backend_path()
from document_processor import DocumentProcessor

class DocumentService:
    def __init__(self):
        self.processor = DocumentProcessor(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )
        self.embedding_service = EmbeddingService()
        
    def get_documents(
        self, 
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[DocumentStatus] = None
    ) -> tuple[List[Document], int]:
        """Get user documents with pagination"""
        query = db.query(Document).filter(Document.user_id == user_id)
        
        if status:
            query = query.filter(Document.status == status)
            
        total = query.count()
        documents = query.offset(skip).limit(limit).all()
        
        return documents, total
    
    def get_document(self, db: Session, document_id: int, user_id: int) -> Optional[Document]:
        """Get a single document by ID for a user"""
        return db.query(Document).filter(
            Document.id == document_id, 
            Document.user_id == user_id
        ).first()
    
    def create_document_record(
        self, 
        db: Session, 
        file: UploadFile, 
        user_id: int
    ) -> Document:
        """Create a document record in the database"""
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        # Ensure upload directory exists
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        # Create document record
        document = Document(
            filename=file.filename,
            original_filename=file.filename,
            file_path=file_path,
            file_type=file_extension.lower().replace('.', ''),
            file_size=0,  # Will be updated after saving
            status=DocumentStatus.PROCESSING,
            user_id=user_id
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        return document
    
    async def save_uploaded_file(self, file: UploadFile, file_path: str) -> int:
        """Save uploaded file to disk and return file size"""
        try:
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
                return len(content)
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}"
            )
    
    async def upload_document(
        self, 
        db: Session, 
        file: UploadFile, 
        user_id: int
    ) -> Document:
        """Upload and process a document"""
        # Validate file type
        allowed_types = ['.pdf', '.docx', '.xlsx', '.xls']
        file_extension = Path(file.filename).suffix.lower()
        
        if file_extension not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_extension} not supported. Allowed types: {', '.join(allowed_types)}"
            )
        
        # Check file size
        if hasattr(file, 'size') and file.size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE} bytes"
            )
        
        # Create document record
        document = self.create_document_record(db, file, user_id)
        
        try:
            # Save file
            file_size = await self.save_uploaded_file(file, document.file_path)
            
            # Update file size
            document.file_size = file_size
            db.commit()
            
            # Process document asynchronously (in a real app, use Celery or similar)
            await self.process_document_async(db, document.id)
            
            return document
            
        except Exception as e:
            # Update status to failed
            document.status = DocumentStatus.FAILED
            db.commit()
            raise
    
    async def process_document_async(self, db: Session, document_id: int):
        """Process document and extract text chunks"""
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return
        
        try:
            # Process file and extract chunks
            chunks = self.processor.process_file(document.file_path)
            
            # Store embeddings in Qdrant
            await self.store_document_embeddings(document, chunks)
            
            # Update document status
            document.status = DocumentStatus.COMPLETED
            document.chunk_count = len(chunks)
            document.processed_at = datetime.utcnow()
            db.commit()
            
        except Exception as e:
            document.status = DocumentStatus.FAILED
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process document: {str(e)}"
            )
    
    async def store_document_embeddings(self, document: Document, chunks: List[Any]):
        """Store document chunks as embeddings in Qdrant"""
        try:
            # Prepare documents for embedding
            documents_for_embedding = []
            for chunk in chunks:
                # Add document metadata to chunk metadata
                chunk.metadata.update({
                    "document_id": document.id,
                    "user_id": document.user_id,
                    "filename": document.filename,
                    "file_type": document.file_type
                })
                documents_for_embedding.append(chunk)
            
            # Store in vector database
            result = await self.embedding_service.add_documents(documents_for_embedding)
            return result
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to store embeddings: {str(e)}"
            )
    
    async def delete_document(self, db: Session, document_id: int, user_id: int) -> bool:
        """Delete a document and its associated data"""
        document = self.get_document(db, document_id, user_id)
        if not document:
            return False
        
        try:
            # Delete file from disk
            if os.path.exists(document.file_path):
                os.remove(document.file_path)
            
            # Delete embeddings from Qdrant
            await self.embedding_service.delete_documents_by_metadata({"document_id": document_id})
            
            # Delete from database
            db.delete(document)
            db.commit()
            
            return True
            
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete document: {str(e)}"
            )
    
    def get_document_status(self, db: Session, document_id: int, user_id: int) -> Optional[DocumentProcessingStatus]:
        """Get document processing status"""
        document = self.get_document(db, document_id, user_id)
        if not document:
            return None
        
        return DocumentProcessingStatus(
            document_id=document.id,
            status=document.status,
            chunk_count=document.chunk_count,
            processed_at=document.processed_at
        )
    
    def get_user_document_stats(self, db: Session, user_id: int) -> Dict[str, Any]:
        """Get document statistics for a user"""
        query = db.query(Document).filter(Document.user_id == user_id)
        
        total = query.count()
        processing = query.filter(Document.status == DocumentStatus.PROCESSING).count()
        completed = query.filter(Document.status == DocumentStatus.COMPLETED).count()
        failed = query.filter(Document.status == DocumentStatus.FAILED).count()
        
        total_chunks = db.query(Document.chunk_count).filter(
            Document.user_id == user_id,
            Document.status == DocumentStatus.COMPLETED
        ).all()
        
        chunk_sum = sum([count[0] for count in total_chunks if count[0]])
        
        return {
            "total_documents": total,
            "processing_documents": processing,
            "completed_documents": completed,
            "failed_documents": failed,
            "total_chunks": chunk_sum
        }
    
    async def search_documents(
        self, 
        query: str, 
        user_id: Optional[int] = None, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search documents using vector similarity"""
        try:
            # Use embedding service to search
            results = await self.embedding_service.search_documents(
                query, 
                limit=limit,
                filter_metadata={"user_id": user_id} if user_id else None
            )
            
            return results
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Search failed: {str(e)}"
            )
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class DocumentStatus(str, Enum):
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class DocumentFileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    XLSX = "xlsx"

class DocumentBase(BaseModel):
    filename: str = Field(..., description="Display name of the document")
    original_filename: str = Field(..., description="Original filename when uploaded")
    file_type: DocumentFileType = Field(..., description="Type of the document file")

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    filename: Optional[str] = None
    status: Optional[DocumentStatus] = None
    chunk_count: Optional[int] = None
    processed_at: Optional[datetime] = None

class DocumentInDB(DocumentBase):
    id: int
    file_path: str
    file_size: int
    status: DocumentStatus
    chunk_count: int
    user_id: int
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Document(DocumentInDB):
    pass

class DocumentResponse(DocumentInDB):
    """Response schema for document operations"""
    pass

class DocumentListResponse(BaseModel):
    documents: List[Document]
    total: int
    page: int = Field(ge=1)
    size: int = Field(ge=1, le=100)
    pages: int

class DocumentProcessingStatus(BaseModel):
    document_id: int
    status: DocumentStatus
    chunk_count: int
    message: Optional[str] = None
    processed_at: Optional[datetime] = None

class DocumentStats(BaseModel):
    total_documents: int
    processing_documents: int
    completed_documents: int
    failed_documents: int
    total_chunks: int

class DocumentSource(BaseModel):
    """Schema for document sources in chat responses"""
    document_id: int
    filename: str
    chunk_id: int
    relevance_score: float
    content_preview: Optional[str] = None

class DocumentSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(default=5, ge=1, le=20)
    user_id: Optional[int] = None

class DocumentSearchResponse(BaseModel):
    query: str
    documents: List[DocumentSource]
    total_found: int
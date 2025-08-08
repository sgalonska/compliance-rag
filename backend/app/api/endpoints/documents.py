from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
import math

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.document import (
    Document, DocumentResponse, DocumentListResponse, DocumentProcessingStatus,
    DocumentStats, DocumentSearchRequest, DocumentSearchResponse, DocumentStatus
)
from app.services.document_service import DocumentService

router = APIRouter()
document_service = DocumentService()

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and process a document"""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )
    
    document = await document_service.upload_document(db, file, current_user.id)
    return document

@router.get("/", response_model=DocumentListResponse)
def get_documents(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    status: Optional[DocumentStatus] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's documents with pagination"""
    skip = (page - 1) * size
    documents, total = document_service.get_documents(
        db, current_user.id, skip=skip, limit=size, status=status
    )
    
    pages = math.ceil(total / size) if total > 0 else 1
    
    return DocumentListResponse(
        documents=documents,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific document"""
    document = document_service.get_document(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return document

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a document"""
    success = document_service.delete_document(db, document_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

@router.get("/{document_id}/status", response_model=DocumentProcessingStatus)
def get_document_status(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get document processing status"""
    status_info = document_service.get_document_status(db, document_id, current_user.id)
    if not status_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return status_info

@router.get("/stats/overview", response_model=DocumentStats)
def get_document_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get document statistics for the current user"""
    stats = document_service.get_user_document_stats(db, current_user.id)
    return DocumentStats(**stats)

@router.post("/search", response_model=DocumentSearchResponse)
async def search_documents(
    search_request: DocumentSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search documents using vector similarity"""
    try:
        results = await document_service.search_documents(
            query=search_request.query,
            user_id=current_user.id,
            limit=search_request.limit
        )
        
        # Convert results to DocumentSource format
        document_sources = []
        for result in results:
            source = {
                "document_id": result.get("metadata", {}).get("document_id", 0),
                "filename": result.get("metadata", {}).get("filename", "Unknown"),
                "chunk_id": result.get("metadata", {}).get("chunk_id", 0),
                "relevance_score": result.get("score", 0.0),
                "content_preview": result.get("content", "")[:200] if result.get("content") else None
            }
            document_sources.append(source)
        
        return DocumentSearchResponse(
            query=search_request.query,
            documents=document_sources,
            total_found=len(document_sources)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

@router.post("/reprocess/{document_id}", response_model=DocumentResponse)
async def reprocess_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reprocess a failed document"""
    document = document_service.get_document(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.status != DocumentStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed documents can be reprocessed"
        )
    
    # Reset status and reprocess
    document.status = DocumentStatus.PROCESSING
    db.commit()
    
    # Trigger reprocessing
    await document_service.process_document_async(db, document_id)
    
    db.refresh(document)
    return document
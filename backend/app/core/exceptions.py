"""Custom exceptions for the Compliance RAG API"""

from fastapi import HTTPException, status
from typing import Any, Dict, Optional

class ComplianceRAGException(Exception):
    """Base exception for the Compliance RAG API"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)

class DocumentProcessingException(ComplianceRAGException):
    """Exception raised when document processing fails"""
    pass

class DocumentNotFoundError(ComplianceRAGException):
    """Exception raised when a document is not found"""
    pass

class UserNotFoundError(ComplianceRAGException):
    """Exception raised when a user is not found"""
    pass

class ChatNotFoundError(ComplianceRAGException):
    """Exception raised when a chat is not found"""
    pass

class InsufficientPermissionsError(ComplianceRAGException):
    """Exception raised when user lacks required permissions"""
    pass

class VectorStoreError(ComplianceRAGException):
    """Exception raised when vector store operations fail"""
    pass

class RAGPipelineError(ComplianceRAGException):
    """Exception raised when RAG pipeline operations fail"""
    pass

# HTTP Exception helpers
def create_http_exception(
    status_code: int,
    message: str,
    details: Optional[Dict[str, Any]] = None
) -> HTTPException:
    """Create an HTTPException with optional details"""
    detail = {"message": message}
    if details:
        detail.update(details)
    
    return HTTPException(status_code=status_code, detail=detail)

def document_not_found() -> HTTPException:
    """Standard document not found exception"""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Document not found"
    )

def chat_not_found() -> HTTPException:
    """Standard chat not found exception"""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Chat not found"
    )

def user_not_found() -> HTTPException:
    """Standard user not found exception"""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )

def insufficient_permissions() -> HTTPException:
    """Standard insufficient permissions exception"""
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not enough permissions"
    )

def invalid_credentials() -> HTTPException:
    """Standard invalid credentials exception"""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

def validation_error(message: str, field: str = None) -> HTTPException:
    """Standard validation error exception"""
    detail = {"message": message}
    if field:
        detail["field"] = field
    
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=detail
    )

def server_error(message: str = "Internal server error") -> HTTPException:
    """Standard server error exception"""
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=message
    )
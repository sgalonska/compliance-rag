from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import asyncio

from app.api.deps import get_db
from app.services.embedding_service import EmbeddingService
from app.core.config import settings

router = APIRouter()

@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "Compliance RAG API"
    }

@router.get("/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check including dependencies"""
    health_status = {
        "status": "healthy",
        "version": "1.0.0",
        "service": "Compliance RAG API",
        "checks": {}
    }
    
    # Database health check
    try:
        # Try a simple database query
        result = db.execute("SELECT 1")
        health_status["checks"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }
    
    # Vector store health check
    try:
        embedding_service = EmbeddingService()
        vector_health = embedding_service.health_check()
        health_status["checks"]["vector_store"] = vector_health
        
        if vector_health.get("status") != "healthy":
            health_status["status"] = "unhealthy"
            
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["vector_store"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Configuration check
    config_issues = []
    if not settings.OPENAI_API_KEY:
        config_issues.append("OpenAI API key not configured")
    if not settings.DATABASE_URL:
        config_issues.append("Database URL not configured")
    
    if config_issues:
        health_status["status"] = "degraded"
        health_status["checks"]["configuration"] = {
            "status": "degraded",
            "issues": config_issues
        }
    else:
        health_status["checks"]["configuration"] = {
            "status": "healthy",
            "message": "All required configuration present"
        }
    
    # Return appropriate HTTP status
    if health_status["status"] == "unhealthy":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=health_status
        )
    elif health_status["status"] == "degraded":
        raise HTTPException(
            status_code=status.HTTP_200_OK,  # Still return 200 for degraded
            detail=health_status
        )
    
    return health_status

@router.get("/ready")
async def readiness_check(db: Session = Depends(get_db)):
    """Readiness check for Kubernetes/deployment"""
    try:
        # Check database
        db.execute("SELECT 1")
        
        # Check vector store
        embedding_service = EmbeddingService()
        vector_health = embedding_service.health_check()
        
        if vector_health.get("status") != "healthy":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Vector store not ready"
            )
        
        return {"status": "ready"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service not ready: {str(e)}"
        )

@router.get("/live")
def liveness_check():
    """Liveness check for Kubernetes/deployment"""
    return {"status": "alive"}
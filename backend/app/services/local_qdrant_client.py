from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from qdrant_client.http import models
from typing import List, Dict, Any, Optional
import uuid
import logging
from app.core.config import settings
from app.services.local_embedding_service import embedding_service

logger = logging.getLogger(__name__)

class LocalQdrantVectorStore:
    def __init__(self):
        # Initialize Qdrant client
        if settings.QDRANT_URL:
            self.client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY,
            )
        else:
            # Use in-memory Qdrant for development
            self.client = QdrantClient(":memory:")
        
        self.collection_name = settings.COLLECTION_NAME
        self.embedding_service = embedding_service
        
    def create_collection(self, vector_size: Optional[int] = None):
        """Create collection with proper vector dimensions"""
        if vector_size is None:
            vector_size = self.embedding_service.embedding_dimension
            
        try:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
            logger.info(f"Collection '{self.collection_name}' created successfully with dimension {vector_size}")
        except Exception as e:
            if "already exists" in str(e).lower():
                logger.info(f"Collection '{self.collection_name}' already exists")
            else:
                logger.error(f"Error creating collection: {str(e)}")
                raise e
    
    def get_embedding(self, text: str) -> List[float]:
        """Get embedding using local embedding service"""
        return self.embedding_service.get_embedding(text)
    
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for multiple texts"""
        return self.embedding_service.get_embeddings(texts)
    
    def add_documents(self, documents: List[Dict[str, Any]]):
        """Add documents to vector store with batch embedding"""
        try:
            # Extract content for batch embedding
            contents = [doc['content'] for doc in documents]
            embeddings = self.get_embeddings(contents)
            
            points = []
            for doc, embedding in zip(documents, embeddings):
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        "content": doc['content'],
                        "metadata": doc['metadata']
                    }
                )
                points.append(point)
            
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            logger.info(f"Added {len(points)} documents to collection")
            
        except Exception as e:
            logger.error(f"Error adding documents: {str(e)}")
            raise
    
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        try:
            query_embedding = self.get_embedding(query)
            
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=limit,
                with_payload=True
            )
            
            results = []
            for result in search_result:
                results.append({
                    "content": result.payload["content"],
                    "metadata": result.payload["metadata"],
                    "score": result.score
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            raise
    
    def delete_collection(self):
        """Delete the collection"""
        try:
            self.client.delete_collection(collection_name=self.collection_name)
            logger.info(f"Collection '{self.collection_name}' deleted")
        except Exception as e:
            logger.error(f"Error deleting collection: {str(e)}")
            raise
    
    def get_collection_info(self):
        """Get collection information"""
        try:
            info = self.client.get_collection(collection_name=self.collection_name)
            return info
        except Exception as e:
            logger.error(f"Collection info error: {e}")
            return None
    
    def health_check(self) -> bool:
        """Check if Qdrant and embedding service are healthy"""
        try:
            # Check if we can list collections
            collections = self.client.get_collections()
            
            # Check embedding service
            embedding_health = self.embedding_service.health_check()
            
            return embedding_health and collections is not None
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return False

# Global instance
vector_store = LocalQdrantVectorStore()
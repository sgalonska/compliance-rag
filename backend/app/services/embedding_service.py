from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.integration import setup_backend_path

# Setup backend path for importing existing modules
setup_backend_path()
from document_processor import DocumentProcessor
from qdrant_client import QdrantVectorStore

class EmbeddingService:
    def __init__(self):
        self.document_processor = DocumentProcessor(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )
        self.vector_store = QdrantVectorStore()
        
    def setup_collection(self):
        """Setup the Qdrant collection"""
        try:
            self.vector_store.create_collection()
            return {"success": True, "message": "Collection setup successfully"}
        except Exception as e:
            return {"success": False, "error": str(e)}
        
    async def add_documents(self, documents: List[Any]) -> Dict[str, Any]:
        """Add documents to the vector store"""
        try:
            # Convert langchain documents to dict format
            doc_dicts = []
            for doc in documents:
                doc_dict = {
                    "content": doc.page_content,
                    "metadata": doc.metadata
                }
                doc_dicts.append(doc_dict)
            
            # Add to vector store
            self.vector_store.add_documents(doc_dicts)
            
            return {
                "success": True,
                "documents_added": len(documents),
                "message": f"Successfully added {len(documents)} document chunks"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to add documents: {str(e)}"
            }
    
    async def search_documents(
        self, 
        query: str, 
        limit: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search documents using vector similarity"""
        try:
            # For now, use the basic search without metadata filtering
            # TODO: Implement metadata filtering in QdrantVectorStore
            results = self.vector_store.search(query, limit)
            
            # If filter_metadata is provided, filter results
            if filter_metadata:
                filtered_results = []
                for result in results:
                    metadata = result.get("metadata", {})
                    # Check if all filter conditions match
                    match = True
                    for key, value in filter_metadata.items():
                        if metadata.get(key) != value:
                            match = False
                            break
                    
                    if match:
                        filtered_results.append(result)
                
                return filtered_results
            
            return results
            
        except Exception as e:
            print(f"Search error: {str(e)}")
            return []
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        try:
            info = self.vector_store.get_collection_info()
            if info:
                return {
                    "collection_name": info.name,
                    "vectors_count": info.vectors_count,
                    "indexed_vectors_count": info.indexed_vectors_count,
                    "points_count": info.points_count,
                    "status": info.status
                }
            else:
                return {"error": "Collection not found"}
        except Exception as e:
            return {"error": str(e)}
    
    async def delete_documents_by_metadata(
        self, 
        filter_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Delete documents based on metadata filter"""
        try:
            # TODO: Implement in QdrantVectorStore
            # For now, return a placeholder response
            return {
                "success": True,
                "message": "Document deletion by metadata filter needs to be implemented"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def process_and_store_file(
        self, 
        file_path: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process a file and store its chunks in the vector store"""
        try:
            # Process the file
            documents = self.document_processor.process_file(file_path)
            
            # Add metadata to each document
            if metadata:
                for doc in documents:
                    doc.metadata.update(metadata)
            
            # Store in vector store
            result = await self.add_documents(documents)
            
            if result["success"]:
                result.update({
                    "file_processed": file_path,
                    "chunks_created": len(documents)
                })
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to process and store file {file_path}: {str(e)}"
            }
    
    async def update_document_metadata(
        self, 
        document_id: int,
        metadata_updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update metadata for documents with a specific document_id"""
        try:
            # TODO: Implement metadata update in QdrantVectorStore
            return {
                "success": True,
                "message": "Metadata update feature needs to be implemented"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def health_check(self) -> Dict[str, Any]:
        """Health check for the embedding service"""
        try:
            # Check if we can get collection info
            stats = self.get_collection_stats()
            
            if "error" not in stats:
                return {
                    "status": "healthy",
                    "collection_accessible": True,
                    "stats": stats
                }
            else:
                return {
                    "status": "unhealthy",
                    "collection_accessible": False,
                    "error": stats["error"]
                }
                
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
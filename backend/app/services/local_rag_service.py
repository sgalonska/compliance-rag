from typing import List, Dict, Any, Optional, AsyncGenerator
from sqlalchemy.orm import Session
import logging

from app.core.config import settings
from app.services.document_service import DocumentService
from app.services.local_llm_service import llm_service
from app.services.local_qdrant_client import vector_store

logger = logging.getLogger(__name__)

class LocalRAGService:
    def __init__(self):
        self.vector_store = vector_store
        self.llm_service = llm_service
        self.document_service = DocumentService()
        
    def setup(self):
        """Initialize the RAG service"""
        try:
            self.vector_store.create_collection()
            logger.info("RAG service setup completed")
        except Exception as e:
            logger.error(f"Error setting up RAG service: {str(e)}")
            raise
        
    async def generate_compliance_answer(
        self, 
        question: str, 
        user_id: Optional[int] = None,
        context_limit: int = 5,
        stream: bool = False
    ) -> Dict[str, Any]:
        """Generate compliance answer using local RAG pipeline"""
        try:
            # Search for relevant documents
            relevant_docs = await self.search_documents(
                query=question,
                user_id=user_id,
                limit=context_limit
            )
            
            if not relevant_docs:
                return {
                    "answer": "I don't have enough information in the compliance documents to answer this question. Please upload relevant compliance documents first.",
                    "sources": [],
                    "confidence": "low",
                    "context_used": 0
                }
            
            # Build context from relevant documents
            context = self._build_context(relevant_docs)
            
            # Generate answer using local LLM
            if stream:
                answer = self._generate_answer_stream(question, context)
            else:
                answer = self._generate_answer(question, context)
            
            # Format sources
            sources = self._format_sources(relevant_docs)
            
            return {
                "answer": answer,
                "sources": sources,
                "confidence": self._determine_confidence(relevant_docs),
                "context_used": len(relevant_docs)
            }
            
        except Exception as e:
            logger.error(f"Error generating compliance answer: {str(e)}")
            return {
                "answer": f"Error generating answer: {str(e)}",
                "sources": [],
                "confidence": "error",
                "context_used": 0
            }
    
    async def generate_compliance_answer_stream(
        self, 
        question: str, 
        user_id: Optional[int] = None,
        context_limit: int = 5
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate streaming compliance answer using local RAG pipeline"""
        try:
            # Search for relevant documents
            relevant_docs = await self.search_documents(
                query=question,
                user_id=user_id,
                limit=context_limit
            )
            
            if not relevant_docs:
                yield {
                    "type": "answer",
                    "content": "I don't have enough information in the compliance documents to answer this question. Please upload relevant compliance documents first.",
                    "sources": [],
                    "confidence": "low",
                    "context_used": 0,
                    "finished": True
                }
                return
            
            # Send sources first
            sources = self._format_sources(relevant_docs)
            yield {
                "type": "sources",
                "sources": sources,
                "context_used": len(relevant_docs),
                "confidence": self._determine_confidence(relevant_docs)
            }
            
            # Build context and stream answer
            context = self._build_context(relevant_docs)
            
            # Stream the answer
            for chunk in self._generate_answer_stream(question, context):
                yield {
                    "type": "answer_chunk",
                    "content": chunk
                }
            
            # Send final message
            yield {
                "type": "finished",
                "finished": True
            }
            
        except Exception as e:
            logger.error(f"Error generating streaming answer: {str(e)}")
            yield {
                "type": "error",
                "content": f"Error generating answer: {str(e)}",
                "finished": True
            }
    
    async def search_documents(
        self, 
        query: str, 
        user_id: Optional[int] = None, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search documents using vector similarity"""
        try:
            return self.vector_store.search(query, limit)
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            return []
    
    def _build_context(self, documents: List[Dict[str, Any]]) -> str:
        """Build context string from relevant documents"""
        context = "Based on the following compliance documents:\n\n"
        
        for i, doc in enumerate(documents, 1):
            metadata = doc.get("metadata", {})
            file_name = metadata.get("file_name", metadata.get("filename", "Unknown document"))
            content = doc.get("content", "")
            
            # Truncate content if too long
            if len(content) > 800:
                content = content[:800] + "..."
            
            context += f"Document {i} ({file_name}):\n{content}\n\n"
        
        return context
    
    def _generate_answer(self, question: str, context: str) -> str:
        """Generate answer using local LLM"""
        system_prompt = """You are a compliance expert assistant. Your role is to provide accurate, helpful answers based on the compliance documents provided.

Guidelines:
- Only use information from the provided documents
- Be specific and cite relevant regulations or requirements when possible
- If the documents don't contain enough information, clearly state this
- Provide actionable guidance when possible
- Use professional, clear language appropriate for compliance officers
- If there are conflicting requirements, highlight them
- Always prioritize accuracy over completeness
- Structure your response clearly with bullet points or numbered lists when appropriate
- Keep responses concise but comprehensive"""
        
        user_prompt = f"""Context from compliance documents:
{context}

Question: {question}

Please provide a comprehensive answer based on the compliance documents provided above."""
        
        try:
            return self.llm_service.generate_response(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.1,
                max_tokens=1000
            )
        except Exception as e:
            logger.error(f"Error generating LLM response: {str(e)}")
            return f"Error generating answer: {str(e)}"
    
    def _generate_answer_stream(self, question: str, context: str):
        """Generate streaming answer using local LLM"""
        system_prompt = """You are a compliance expert assistant. Your role is to provide accurate, helpful answers based on the compliance documents provided.

Guidelines:
- Only use information from the provided documents
- Be specific and cite relevant regulations or requirements when possible
- If the documents don't contain enough information, clearly state this
- Provide actionable guidance when possible
- Use professional, clear language appropriate for compliance officers
- If there are conflicting requirements, highlight them
- Always prioritize accuracy over completeness
- Structure your response clearly with bullet points or numbered lists when appropriate"""
        
        user_prompt = f"""Context from compliance documents:
{context}

Question: {question}

Please provide a comprehensive answer based on the compliance documents provided above."""
        
        try:
            return self.llm_service.generate_response_stream(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.1,
                max_tokens=1000
            )
        except Exception as e:
            logger.error(f"Error generating streaming LLM response: {str(e)}")
            yield f"Error generating answer: {str(e)}"
    
    def _format_sources(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format document sources for response"""
        sources = []
        for doc in documents:
            metadata = doc.get("metadata", {})
            source = {
                "document_id": metadata.get("document_id", 0),
                "filename": metadata.get("file_name", metadata.get("filename", "Unknown")),
                "chunk_id": metadata.get("chunk_id", 0),
                "relevance_score": doc.get("score", 0.0),
                "file_type": metadata.get("file_type", "unknown"),
                "content_preview": doc.get("content", "")[:200] if doc.get("content") else None
            }
            sources.append(source)
        
        return sources
    
    def _determine_confidence(self, documents: List[Dict[str, Any]]) -> str:
        """Determine confidence level based on document relevance scores"""
        if not documents:
            return "low"
        
        # Get average relevance score
        avg_score = sum(doc.get("score", 0) for doc in documents) / len(documents)
        
        if avg_score >= 0.8:
            return "high"
        elif avg_score >= 0.6:
            return "medium"
        else:
            return "low"
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        try:
            info = self.vector_store.get_collection_info()
            if info:
                return {
                    "collection_name": self.vector_store.collection_name,
                    "vector_count": info.points_count if hasattr(info, 'points_count') else 0,
                    "status": "healthy",
                    "embedding_model": settings.LOCAL_EMBEDDING_MODEL,
                    "llm_model": settings.OLLAMA_MODEL
                }
            else:
                return {
                    "collection_name": self.vector_store.collection_name,
                    "status": "not_found",
                    "error": "Collection not found"
                }
        except Exception as e:
            logger.error(f"Error getting collection stats: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def add_documents_to_collection(self, documents: List[Any]) -> Dict[str, Any]:
        """Add documents to the vector collection"""
        try:
            # Convert langchain documents to the format expected by vector store
            doc_dicts = []
            for doc in documents:
                doc_dict = {
                    "content": doc.page_content,
                    "metadata": doc.metadata
                }
                doc_dicts.append(doc_dict)
            
            # Add documents using vector store
            self.vector_store.add_documents(doc_dicts)
            
            return {
                "success": True,
                "documents_added": len(documents),
                "message": f"Successfully added {len(documents)} document chunks to collection"
            }
            
        except Exception as e:
            logger.error(f"Error adding documents to collection: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to add documents to collection: {str(e)}"
            }
    
    def health_check(self) -> Dict[str, Any]:
        """Check health of all RAG components"""
        try:
            vector_health = self.vector_store.health_check()
            llm_health = self.llm_service.health_check()
            
            return {
                "status": "healthy" if vector_health and llm_health else "degraded",
                "vector_store": "healthy" if vector_health else "unhealthy",
                "llm_service": "healthy" if llm_health else "unhealthy",
                "embedding_model": settings.LOCAL_EMBEDDING_MODEL,
                "llm_model": settings.OLLAMA_MODEL
            }
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

# Global instance
rag_service = LocalRAGService()
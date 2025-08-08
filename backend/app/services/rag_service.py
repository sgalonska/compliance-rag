import openai
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.document_service import DocumentService
from qdrant_store import QdrantVectorStore
from embedding_manager import EmbeddingManager

class RAGService:
    def __init__(self):
        self.embedding_manager = EmbeddingManager()
        self.document_service = DocumentService()
        openai.api_key = settings.OPENAI_API_KEY
        
    def setup(self):
        """Initialize the RAG service"""
        self.embedding_manager.setup_collection()
        
    async def generate_compliance_answer(
        self, 
        question: str, 
        user_id: Optional[int] = None,
        context_limit: int = 5
    ) -> Dict[str, Any]:
        """Generate compliance answer using RAG pipeline"""
        try:
            # Search for relevant documents
            relevant_docs = await self.search_documents(
                query=question,
                user_id=user_id,
                limit=context_limit
            )
            
            if not relevant_docs:
                return {
                    "answer": "I don't have enough information in the compliance documents to answer this question.",
                    "sources": [],
                    "confidence": "low",
                    "context_used": 0
                }
            
            # Build context from relevant documents
            context = self._build_context(relevant_docs)
            
            # Generate answer using LLM
            answer = await self._generate_answer(question, context)
            
            # Format sources
            sources = self._format_sources(relevant_docs)
            
            return {
                "answer": answer,
                "sources": sources,
                "confidence": self._determine_confidence(relevant_docs),
                "context_used": len(relevant_docs)
            }
            
        except Exception as e:
            return {
                "answer": f"Error generating answer: {str(e)}",
                "sources": [],
                "confidence": "error",
                "context_used": 0
            }
    
    async def search_documents(
        self, 
        query: str, 
        user_id: Optional[int] = None, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search documents using vector similarity"""
        return await self.document_service.search_documents(
            query=query,
            user_id=user_id,
            limit=limit
        )
    
    def _build_context(self, documents: List[Dict[str, Any]]) -> str:
        """Build context string from relevant documents"""
        context = "Based on the following compliance documents:\n\n"
        
        for i, doc in enumerate(documents, 1):
            metadata = doc.get("metadata", {})
            file_name = metadata.get("filename", "Unknown document")
            content = doc.get("content", "")
            
            # Truncate content if too long
            if len(content) > 500:
                content = content[:500] + "..."
            
            context += f"Document {i} ({file_name}):\n{content}\n\n"
        
        return context
    
    async def _generate_answer(self, question: str, context: str) -> str:
        """Generate answer using OpenAI LLM"""
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
            response = openai.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=1000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"Error generating answer: {str(e)}"
    
    def _format_sources(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format document sources for response"""
        sources = []
        for doc in documents:
            metadata = doc.get("metadata", {})
            source = {
                "document_id": metadata.get("document_id", 0),
                "filename": metadata.get("filename", "Unknown"),
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
            return self.embedding_manager.get_collection_stats()
        except Exception as e:
            return {"error": str(e)}
    
    async def add_documents_to_collection(self, documents: List[Any]) -> Dict[str, Any]:
        """Add documents to the vector collection"""
        try:
            # Convert langchain documents to the format expected by embedding manager
            doc_dicts = []
            for doc in documents:
                doc_dict = {
                    "content": doc.page_content,
                    "metadata": doc.metadata
                }
                doc_dicts.append(doc_dict)
            
            # Add documents using embedding manager
            result = self.embedding_manager.vector_store.add_documents(doc_dicts)
            
            return {
                "success": True,
                "documents_added": len(documents),
                "message": f"Successfully added {len(documents)} document chunks to collection"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to add documents to collection: {str(e)}"
            }
    
    async def remove_documents_by_metadata(
        self, 
        filter_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Remove documents from collection based on metadata filter"""
        try:
            # This would need to be implemented in the QdrantVectorStore class
            # For now, return a placeholder
            return {
                "success": True,
                "message": "Document removal feature needs to be implemented in QdrantVectorStore"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_similar_documents(
        self, 
        document_id: int,
        db: Session,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Find documents similar to a given document"""
        try:
            # Get the document content
            document = self.document_service.get_document(db, document_id, None)  # Need to handle user_id properly
            if not document:
                return []
            
            # Use the document's filename as query to find similar documents
            similar_docs = await self.search_documents(
                query=document.filename,
                limit=limit + 1  # +1 to exclude the original document
            )
            
            # Filter out the original document
            filtered_docs = [
                doc for doc in similar_docs 
                if doc.get("metadata", {}).get("document_id") != document_id
            ]
            
            return filtered_docs[:limit]
            
        except Exception as e:
            return []
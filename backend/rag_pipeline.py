import openai
from typing import List, Dict, Any
from embedding_manager import EmbeddingManager
from config import OPENAI_API_KEY, LLM_MODEL

class ComplianceRAG:
    def __init__(self):
        self.embedding_manager = EmbeddingManager()
        openai.api_key = OPENAI_API_KEY
        
    def setup(self):
        self.embedding_manager.setup_collection()
        
    def add_documents(self, file_paths: List[str]):
        return self.embedding_manager.process_and_store_documents(file_paths)
    
    def generate_compliance_answer(self, question: str, context_limit: int = 5) -> Dict[str, Any]:
        relevant_docs = self.embedding_manager.search_documents(question, limit=context_limit)
        
        if not relevant_docs:
            return {
                "answer": "I don't have enough information in the compliance documents to answer this question.",
                "sources": [],
                "confidence": "low"
            }
        
        context = self._build_context(relevant_docs)
        answer = self._generate_answer(question, context)
        
        sources = []
        for doc in relevant_docs:
            sources.append({
                "file_name": doc["metadata"].get("file_name", "Unknown"),
                "chunk_id": doc["metadata"].get("chunk_id", 0),
                "relevance_score": doc["score"]
            })
        
        return {
            "answer": answer,
            "sources": sources,
            "context_used": len(relevant_docs)
        }
    
    def _build_context(self, documents: List[Dict[str, Any]]) -> str:
        context = "Based on the following compliance documents:\n\n"
        
        for i, doc in enumerate(documents, 1):
            file_name = doc["metadata"].get("file_name", "Unknown document")
            content = doc["content"][:500] + "..." if len(doc["content"]) > 500 else doc["content"]
            context += f"Document {i} ({file_name}):\n{content}\n\n"
        
        return context
    
    def _generate_answer(self, question: str, context: str) -> str:
        system_prompt = """You are a compliance expert assistant. Your role is to provide accurate, helpful answers based on the compliance documents provided. 

Guidelines:
- Only use information from the provided documents
- Be specific and cite relevant regulations or requirements when possible
- If the documents don't contain enough information, clearly state this
- Provide actionable guidance when possible
- Use professional, clear language appropriate for compliance officers
- If there are conflicting requirements, highlight them
- Always prioritize accuracy over completeness"""
        
        user_prompt = f"""Context from compliance documents:
{context}

Question: {question}

Please provide a comprehensive answer based on the compliance documents provided above."""
        
        try:
            response = openai.chat.completions.create(
                model=LLM_MODEL,
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
    
    def get_collection_stats(self):
        return self.embedding_manager.get_collection_stats()
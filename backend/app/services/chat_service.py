import json
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime

from app.models.chat import Chat, ChatMessage
from app.schemas.chat import (
    ChatCreate, ChatUpdate, ChatQueryRequest, ChatQueryResponse, 
    ChatMessageCreate, MessageRole, DocumentReference
)
from app.services.document_service import DocumentService
from app.services.rag_service import RAGService

class ChatService:
    def __init__(self):
        self.document_service = DocumentService()
        self.rag_service = RAGService()
        
    def get_user_chats(
        self, 
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> tuple[List[Chat], int]:
        """Get user chats with pagination"""
        query = db.query(Chat).filter(Chat.user_id == user_id).order_by(Chat.updated_at.desc())
        total = query.count()
        chats = query.offset(skip).limit(limit).all()
        return chats, total
    
    def get_chat(self, db: Session, chat_id: int, user_id: int) -> Optional[Chat]:
        """Get a specific chat for a user"""
        return db.query(Chat).filter(
            Chat.id == chat_id,
            Chat.user_id == user_id
        ).first()
    
    def create_chat(self, db: Session, chat_data: ChatCreate, user_id: int) -> Chat:
        """Create a new chat"""
        chat = Chat(
            title=chat_data.title,
            user_id=user_id
        )
        db.add(chat)
        db.commit()
        db.refresh(chat)
        return chat
    
    def update_chat(
        self, 
        db: Session, 
        chat_id: int, 
        chat_data: ChatUpdate, 
        user_id: int
    ) -> Optional[Chat]:
        """Update a chat"""
        chat = self.get_chat(db, chat_id, user_id)
        if not chat:
            return None
        
        if chat_data.title is not None:
            chat.title = chat_data.title
        
        chat.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(chat)
        return chat
    
    def delete_chat(self, db: Session, chat_id: int, user_id: int) -> bool:
        """Delete a chat and all its messages"""
        chat = self.get_chat(db, chat_id, user_id)
        if not chat:
            return False
        
        # Delete all messages first
        db.query(ChatMessage).filter(ChatMessage.chat_id == chat_id).delete()
        
        # Delete the chat
        db.delete(chat)
        db.commit()
        return True
    
    def get_chat_messages(
        self, 
        db: Session, 
        chat_id: int, 
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> List[ChatMessage]:
        """Get messages for a specific chat"""
        # Verify user owns the chat
        chat = self.get_chat(db, chat_id, user_id)
        if not chat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat not found"
            )
        
        messages = db.query(ChatMessage).filter(
            ChatMessage.chat_id == chat_id
        ).order_by(ChatMessage.created_at.asc()).offset(skip).limit(limit).all()
        
        # Parse sources JSON for each message
        for message in messages:
            if message.sources:
                try:
                    message.sources_parsed = json.loads(message.sources)
                except json.JSONDecodeError:
                    message.sources_parsed = []
            else:
                message.sources_parsed = []
        
        return messages
    
    def create_message(
        self, 
        db: Session, 
        message_data: ChatMessageCreate
    ) -> ChatMessage:
        """Create a new chat message"""
        sources_json = None
        if message_data.sources:
            sources_json = json.dumps(message_data.sources)
        
        message = ChatMessage(
            chat_id=message_data.chat_id,
            role=message_data.role,
            content=message_data.content,
            sources=sources_json
        )
        
        db.add(message)
        db.commit()
        db.refresh(message)
        
        # Update chat's updated_at timestamp
        chat = db.query(Chat).filter(Chat.id == message_data.chat_id).first()
        if chat:
            chat.updated_at = datetime.utcnow()
            db.commit()
        
        return message
    
    async def process_chat_query(
        self, 
        db: Session, 
        query_request: ChatQueryRequest, 
        user_id: int
    ) -> ChatQueryResponse:
        """Process a chat query using RAG pipeline"""
        try:
            # Get or create chat
            chat_id = query_request.chat_id
            if not chat_id:
                # Create new chat with auto-generated title
                title = self._generate_chat_title(query_request.message)
                chat_data = ChatCreate(title=title)
                chat = self.create_chat(db, chat_data, user_id)
                chat_id = chat.id
            else:
                # Verify chat exists and belongs to user
                chat = self.get_chat(db, chat_id, user_id)
                if not chat:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Chat not found"
                    )
            
            # Create user message
            user_message_data = ChatMessageCreate(
                chat_id=chat_id,
                role=MessageRole.USER,
                content=query_request.message
            )
            user_message = self.create_message(db, user_message_data)
            
            # Get RAG response
            rag_response = await self.rag_service.generate_compliance_answer(
                question=query_request.message,
                user_id=user_id,
                context_limit=query_request.context_limit
            )
            
            # Convert sources to DocumentReference format
            document_references = []
            for source in rag_response.get("sources", []):
                doc_ref = DocumentReference(
                    document_id=source.get("document_id", 0),
                    filename=source.get("file_name", "Unknown"),
                    chunk_id=source.get("chunk_id", 0),
                    relevance_score=source.get("relevance_score", 0.0),
                    content_preview=source.get("content_preview")
                )
                document_references.append(doc_ref.dict())
            
            # Create assistant message
            assistant_message_data = ChatMessageCreate(
                chat_id=chat_id,
                role=MessageRole.ASSISTANT,
                content=rag_response["answer"],
                sources=document_references
            )
            assistant_message = self.create_message(db, assistant_message_data)
            
            return ChatQueryResponse(
                chat_id=chat_id,
                message_id=assistant_message.id,
                answer=rag_response["answer"],
                sources=document_references,
                context_used=rag_response.get("context_used", 0),
                confidence=rag_response.get("confidence")
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process chat query: {str(e)}"
            )
    
    def _generate_chat_title(self, message: str) -> str:
        """Generate a chat title based on the first message"""
        # Simple title generation - truncate message to reasonable length
        title = message.strip()
        if len(title) > 50:
            title = title[:47] + "..."
        return title
    
    def get_chat_with_messages(
        self, 
        db: Session, 
        chat_id: int, 
        user_id: int
    ) -> Optional[Dict[str, Any]]:
        """Get chat with all its messages"""
        chat = self.get_chat(db, chat_id, user_id)
        if not chat:
            return None
        
        messages = self.get_chat_messages(db, chat_id, user_id, limit=1000)
        
        # Convert to response format
        message_responses = []
        for message in messages:
            sources = []
            if message.sources:
                try:
                    sources = json.loads(message.sources)
                except json.JSONDecodeError:
                    sources = []
            
            message_responses.append({
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "sources": sources,
                "created_at": message.created_at
            })
        
        return {
            "id": chat.id,
            "title": chat.title,
            "user_id": chat.user_id,
            "created_at": chat.created_at,
            "updated_at": chat.updated_at,
            "messages": message_responses
        }
    
    def get_user_chat_stats(self, db: Session, user_id: int) -> Dict[str, Any]:
        """Get chat statistics for a user"""
        total_chats = db.query(Chat).filter(Chat.user_id == user_id).count()
        
        total_messages = db.query(ChatMessage).join(Chat).filter(
            Chat.user_id == user_id
        ).count()
        
        # Recent chats (last 10)
        recent_chats = db.query(Chat).filter(Chat.user_id == user_id).order_by(
            Chat.updated_at.desc()
        ).limit(10).all()
        
        avg_messages = total_messages / total_chats if total_chats > 0 else 0
        
        return {
            "total_chats": total_chats,
            "total_messages": total_messages,
            "recent_chats": [
                {
                    "id": chat.id,
                    "title": chat.title,
                    "created_at": chat.created_at,
                    "updated_at": chat.updated_at
                }
                for chat in recent_chats
            ],
            "avg_messages_per_chat": round(avg_messages, 2)
        }
    
    def search_chats(
        self, 
        db: Session, 
        user_id: int, 
        query: str,
        limit: int = 20
    ) -> List[Chat]:
        """Search chats by title or message content"""
        # Search in chat titles
        title_matches = db.query(Chat).filter(
            Chat.user_id == user_id,
            Chat.title.ilike(f"%{query}%")
        ).limit(limit // 2).all()
        
        # Search in message content
        message_matches = db.query(Chat).join(ChatMessage).filter(
            Chat.user_id == user_id,
            ChatMessage.content.ilike(f"%{query}%")
        ).distinct().limit(limit // 2).all()
        
        # Combine and deduplicate
        all_matches = {chat.id: chat for chat in title_matches + message_matches}
        return list(all_matches.values())[:limit]
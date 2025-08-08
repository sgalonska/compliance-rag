from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"

class ChatBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)

class ChatCreate(ChatBase):
    pass

class ChatUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)

class ChatInDB(ChatBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Chat(ChatInDB):
    pass

class ChatResponse(ChatInDB):
    """Response schema for chat operations"""
    message_count: Optional[int] = None

class ChatListResponse(BaseModel):
    chats: List[ChatResponse]
    total: int
    page: int = Field(ge=1)
    size: int = Field(ge=1, le=100)
    pages: int

# Message schemas
class ChatMessageBase(BaseModel):
    role: MessageRole
    content: str = Field(..., min_length=1)

class ChatMessageCreate(ChatMessageBase):
    chat_id: int
    sources: Optional[List[Dict[str, Any]]] = None

class ChatMessageUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1)
    sources: Optional[List[Dict[str, Any]]] = None

class ChatMessageInDB(ChatMessageBase):
    id: int
    chat_id: int
    sources: Optional[str] = None  # JSON string in DB
    created_at: datetime

    class Config:
        from_attributes = True

class ChatMessage(ChatMessageInDB):
    sources_parsed: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

class ChatMessageResponse(BaseModel):
    id: int
    role: MessageRole
    content: str
    sources: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

# Chat interaction schemas
class ChatQueryRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    context_limit: int = Field(default=5, ge=1, le=10)
    chat_id: Optional[int] = None  # If None, creates new chat

class DocumentReference(BaseModel):
    document_id: int
    filename: str
    chunk_id: int
    relevance_score: float
    content_preview: Optional[str] = None

class ChatQueryResponse(BaseModel):
    chat_id: int
    message_id: int
    answer: str
    sources: List[DocumentReference]
    context_used: int
    confidence: Optional[str] = None

class ChatWithMessages(BaseModel):
    id: int
    title: str
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    messages: List[ChatMessageResponse]

    class Config:
        from_attributes = True

class ChatStats(BaseModel):
    total_chats: int
    total_messages: int
    recent_chats: List[ChatResponse]
    avg_messages_per_chat: float

class ChatExportRequest(BaseModel):
    chat_id: int
    format: str = Field(default="json", pattern="^(json|txt|pdf)$")

class ChatExportResponse(BaseModel):
    chat_id: int
    format: str
    export_url: str
    created_at: datetime
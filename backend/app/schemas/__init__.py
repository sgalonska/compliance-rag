"""Schemas package for the Compliance RAG API"""

from .auth import Token, UserBase, UserCreate, UserResponse
from .user import User, UserUpdate, UserPasswordUpdate, UserProfile, UserStats
from .document import (
    Document, DocumentCreate, DocumentUpdate, DocumentResponse,
    DocumentListResponse, DocumentProcessingStatus, DocumentStats,
    DocumentSearchRequest, DocumentSearchResponse, DocumentSource
)
from .chat import (
    Chat, ChatCreate, ChatUpdate, ChatResponse, ChatListResponse,
    ChatMessage, ChatMessageCreate, ChatMessageResponse,
    ChatQueryRequest, ChatQueryResponse, ChatWithMessages, ChatStats
)

__all__ = [
    # Auth schemas
    "Token", "UserBase", "UserCreate", "UserResponse",
    # User schemas
    "User", "UserUpdate", "UserPasswordUpdate", "UserProfile", "UserStats",
    # Document schemas
    "Document", "DocumentCreate", "DocumentUpdate", "DocumentResponse",
    "DocumentListResponse", "DocumentProcessingStatus", "DocumentStats",
    "DocumentSearchRequest", "DocumentSearchResponse", "DocumentSource",
    # Chat schemas
    "Chat", "ChatCreate", "ChatUpdate", "ChatResponse", "ChatListResponse",
    "ChatMessage", "ChatMessageCreate", "ChatMessageResponse",
    "ChatQueryRequest", "ChatQueryResponse", "ChatWithMessages", "ChatStats"
]
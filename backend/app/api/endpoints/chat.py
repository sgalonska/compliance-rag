from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import math

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.chat import (
    Chat, ChatCreate, ChatUpdate, ChatResponse, ChatListResponse,
    ChatQueryRequest, ChatQueryResponse, ChatWithMessages, ChatStats,
    ChatMessageResponse
)
from app.services.chat_service import ChatService

router = APIRouter()
chat_service = ChatService()

@router.post("/", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
def create_chat(
    chat_data: ChatCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chat"""
    chat = chat_service.create_chat(db, chat_data, current_user.id)
    return ChatResponse(**chat.__dict__)

@router.get("/", response_model=ChatListResponse)
def get_chats(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's chats with pagination"""
    skip = (page - 1) * size
    chats, total = chat_service.get_user_chats(db, current_user.id, skip=skip, limit=size)
    
    pages = math.ceil(total / size) if total > 0 else 1
    
    # Convert to response format and add message counts
    chat_responses = []
    for chat in chats:
        message_count = len(chat.messages) if hasattr(chat, 'messages') else 0
        chat_response = ChatResponse(**chat.__dict__)
        chat_response.message_count = message_count
        chat_responses.append(chat_response)
    
    return ChatListResponse(
        chats=chat_responses,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/{chat_id}", response_model=ChatWithMessages)
def get_chat_with_messages(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific chat with all its messages"""
    chat_data = chat_service.get_chat_with_messages(db, chat_id, current_user.id)
    if not chat_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    return ChatWithMessages(**chat_data)

@router.put("/{chat_id}", response_model=ChatResponse)
def update_chat(
    chat_id: int,
    chat_data: ChatUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a chat"""
    chat = chat_service.update_chat(db, chat_id, chat_data, current_user.id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    return ChatResponse(**chat.__dict__)

@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chat and all its messages"""
    success = chat_service.delete_chat(db, chat_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )

@router.get("/{chat_id}/messages", response_model=List[ChatMessageResponse])
def get_chat_messages(
    chat_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get messages for a specific chat"""
    skip = (page - 1) * size
    messages = chat_service.get_chat_messages(db, chat_id, current_user.id, skip=skip, limit=size)
    
    # Convert to response format
    message_responses = []
    for message in messages:
        sources = message.sources_parsed if hasattr(message, 'sources_parsed') else []
        message_response = ChatMessageResponse(
            id=message.id,
            role=message.role,
            content=message.content,
            sources=sources,
            created_at=message.created_at
        )
        message_responses.append(message_response)
    
    return message_responses

@router.post("/query", response_model=ChatQueryResponse)
async def process_chat_query(
    query_request: ChatQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Process a chat query using RAG pipeline"""
    try:
        response = await chat_service.process_chat_query(db, query_request, current_user.id)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process query: {str(e)}"
        )

@router.get("/stats/overview", response_model=ChatStats)
def get_chat_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get chat statistics for the current user"""
    stats = chat_service.get_user_chat_stats(db, current_user.id)
    
    # Convert recent chats to response format
    recent_chats = []
    for chat_data in stats.get("recent_chats", []):
        recent_chats.append(ChatResponse(**chat_data))
    
    return ChatStats(
        total_chats=stats["total_chats"],
        total_messages=stats["total_messages"],
        recent_chats=recent_chats,
        avg_messages_per_chat=stats["avg_messages_per_chat"]
    )

@router.get("/search/{query}", response_model=List[ChatResponse])
def search_chats(
    query: str,
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search chats by title or message content"""
    chats = chat_service.search_chats(db, current_user.id, query, limit=limit)
    
    # Convert to response format
    chat_responses = []
    for chat in chats:
        chat_response = ChatResponse(**chat.__dict__)
        chat_responses.append(chat_response)
    
    return chat_responses

@router.post("/{chat_id}/regenerate", response_model=ChatQueryResponse)
async def regenerate_response(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Regenerate the last assistant response in a chat"""
    # Get the chat
    chat = chat_service.get_chat(db, chat_id, current_user.id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Get the last two messages (user and assistant)
    messages = chat_service.get_chat_messages(db, chat_id, current_user.id, limit=2)
    if len(messages) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No messages to regenerate"
        )
    
    # Get the last user message
    user_message = None
    for message in reversed(messages):
        if message.role == "user":
            user_message = message
            break
    
    if not user_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No user message found to regenerate response for"
        )
    
    # Delete the last assistant message if it exists
    last_message = messages[0]  # Most recent message
    if last_message.role == "assistant":
        db.delete(last_message)
        db.commit()
    
    # Create new query request and process it
    query_request = ChatQueryRequest(
        message=user_message.content,
        chat_id=chat_id,
        context_limit=5
    )
    
    response = await chat_service.process_chat_query(db, query_request, current_user.id)
    return response
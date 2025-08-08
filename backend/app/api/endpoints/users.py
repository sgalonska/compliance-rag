from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import math

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.user import (
    User as UserSchema, UserCreate, UserUpdate, UserPasswordUpdate,
    UserResponse, UserListResponse, UserStats, UserProfile
)
from app.services.user_service import UserService

router = APIRouter()
user_service = UserService()

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new user (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = user_service.create_user(db, user_data)
    
    # Get additional stats for response
    profile = user_service.get_user_profile(db, user.id)
    user_response = UserResponse(**user.__dict__)
    if profile:
        user_response.document_count = profile["document_count"]
        user_response.chat_count = profile["chat_count"]
    
    return user_response

@router.get("/", response_model=UserListResponse)
def get_users(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    is_active: bool = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get users with pagination (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    skip = (page - 1) * size
    users, total = user_service.get_users(db, skip=skip, limit=size, is_active=is_active)
    
    pages = math.ceil(total / size) if total > 0 else 1
    
    # Convert to response format with additional stats
    user_responses = []
    for user in users:
        profile = user_service.get_user_profile(db, user.id)
        user_response = UserResponse(**user.__dict__)
        if profile:
            user_response.document_count = profile["document_count"]
            user_response.chat_count = profile["chat_count"]
        user_responses.append(user_response)
    
    return UserListResponse(
        users=user_responses,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/me", response_model=UserProfile)
def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile"""
    profile = user_service.get_user_profile(db, current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    return UserProfile(**profile)

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific user"""
    # Users can only view their own profile unless they're admin
    if user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get additional stats for response
    profile = user_service.get_user_profile(db, user_id)
    user_response = UserResponse(**user.__dict__)
    if profile:
        user_response.document_count = profile["document_count"]
        user_response.chat_count = profile["chat_count"]
    
    return user_response

@router.put("/me", response_model=UserResponse)
def update_current_user(
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile"""
    user = user_service.update_user(
        db, current_user.id, user_data, current_user.id, current_user.is_superuser
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get additional stats for response
    profile = user_service.get_user_profile(db, user.id)
    user_response = UserResponse(**user.__dict__)
    if profile:
        user_response.document_count = profile["document_count"]
        user_response.chat_count = profile["chat_count"]
    
    return user_response

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a user (admin only or own profile)"""
    user = user_service.update_user(
        db, user_id, user_data, current_user.id, current_user.is_superuser
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get additional stats for response
    profile = user_service.get_user_profile(db, user.id)
    user_response = UserResponse(**user.__dict__)
    if profile:
        user_response.document_count = profile["document_count"]
        user_response.chat_count = profile["chat_count"]
    
    return user_response

@router.put("/me/password")
def update_password(
    password_data: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's password"""
    success = user_service.update_password(db, current_user.id, password_data, current_user.id)
    if success:
        return {"message": "Password updated successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a user and all associated data"""
    success = user_service.delete_user(db, user_id, current_user.id, current_user.is_superuser)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

@router.post("/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivate a user account (admin only)"""
    success = user_service.deactivate_user(db, user_id, current_user.is_superuser)
    if success:
        return {"message": "User deactivated successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

@router.post("/{user_id}/activate")
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activate a user account (admin only)"""
    success = user_service.activate_user(db, user_id, current_user.is_superuser)
    if success:
        return {"message": "User activated successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

@router.get("/stats/overview", response_model=UserStats)
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user statistics (admin only)"""
    stats = user_service.get_user_stats(db, current_user.is_superuser)
    
    # Convert recent users to response format
    recent_users = []
    for user_data in stats.get("recent_users", []):
        user_response = UserResponse(**user_data)
        recent_users.append(user_response)
    
    return UserStats(
        total_users=stats["total_users"],
        active_users=stats["active_users"],
        inactive_users=stats["inactive_users"],
        superusers=stats["superusers"],
        recent_users=recent_users
    )

@router.get("/search/{query}", response_model=List[UserResponse])
def search_users(
    query: str,
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search users by email or name (admin only)"""
    users = user_service.search_users(db, query, current_user.is_superuser, limit=limit)
    
    # Convert to response format
    user_responses = []
    for user in users:
        profile = user_service.get_user_profile(db, user.id)
        user_response = UserResponse(**user.__dict__)
        if profile:
            user_response.document_count = profile["document_count"]
            user_response.chat_count = profile["chat_count"]
        user_responses.append(user_response)
    
    return user_responses
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserInDB(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class User(UserInDB):
    pass

class UserResponse(UserInDB):
    """Response schema for user operations"""
    document_count: Optional[int] = None
    chat_count: Optional[int] = None

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int = Field(ge=1)
    size: int = Field(ge=1, le=100)
    pages: int

class UserStats(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    superusers: int
    recent_users: List[UserResponse]

class UserProfile(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    document_count: int
    chat_count: int
    last_activity: Optional[datetime] = None

    class Config:
        from_attributes = True
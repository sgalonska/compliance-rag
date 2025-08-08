from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime

from app.models.user import User
from app.models.document import Document
from app.models.chat import Chat
from app.schemas.user import UserCreate, UserUpdate, UserPasswordUpdate
from app.core.security import get_password_hash, verify_password

class UserService:
    def get_user(self, db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()
    
    def get_users(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> tuple[List[User], int]:
        """Get users with pagination"""
        query = db.query(User)
        
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        total = query.count()
        users = query.offset(skip).limit(limit).all()
        
        return users, total
    
    def create_user(self, db: Session, user_data: UserCreate) -> User:
        """Create a new user"""
        # Check if user with email already exists
        existing_user = self.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            is_active=True,
            is_superuser=False
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user
    
    def update_user(
        self, 
        db: Session, 
        user_id: int, 
        user_data: UserUpdate,
        requesting_user_id: int,
        is_superuser: bool = False
    ) -> Optional[User]:
        """Update user information"""
        user = self.get_user(db, user_id)
        if not user:
            return None
        
        # Check permissions - users can only update themselves unless superuser
        if not is_superuser and user_id != requesting_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        # Check if email is being changed to an existing email
        if user_data.email and user_data.email != user.email:
            existing_user = self.get_user_by_email(db, user_data.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            user.email = user_data.email
        
        # Update fields
        if user_data.full_name is not None:
            user.full_name = user_data.full_name
        
        # Only superusers can change active status
        if user_data.is_active is not None and is_superuser:
            user.is_active = user_data.is_active
        
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        return user
    
    def update_password(
        self, 
        db: Session, 
        user_id: int, 
        password_data: UserPasswordUpdate,
        requesting_user_id: int
    ) -> bool:
        """Update user password"""
        # Users can only change their own password
        if user_id != requesting_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        user = self.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not verify_password(password_data.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password"
            )
        
        # Update password
        user.hashed_password = get_password_hash(password_data.new_password)
        user.updated_at = datetime.utcnow()
        db.commit()
        
        return True
    
    def delete_user(
        self, 
        db: Session, 
        user_id: int,
        requesting_user_id: int,
        is_superuser: bool = False
    ) -> bool:
        """Delete user and all associated data"""
        user = self.get_user(db, user_id)
        if not user:
            return False
        
        # Check permissions
        if not is_superuser and user_id != requesting_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        try:
            # Delete user's documents and their files
            documents = db.query(Document).filter(Document.user_id == user_id).all()
            for doc in documents:
                # Delete physical file
                import os
                if os.path.exists(doc.file_path):
                    os.remove(doc.file_path)
                
                # Delete document record
                db.delete(doc)
            
            # Delete user's chats (messages will be cascade deleted)
            db.query(Chat).filter(Chat.user_id == user_id).delete()
            
            # Delete user
            db.delete(user)
            db.commit()
            
            return True
            
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete user: {str(e)}"
            )
    
    def deactivate_user(
        self, 
        db: Session, 
        user_id: int,
        is_superuser: bool = False
    ) -> bool:
        """Deactivate user account"""
        if not is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        user = self.get_user(db, user_id)
        if not user:
            return False
        
        user.is_active = False
        user.updated_at = datetime.utcnow()
        db.commit()
        
        return True
    
    def activate_user(
        self, 
        db: Session, 
        user_id: int,
        is_superuser: bool = False
    ) -> bool:
        """Activate user account"""
        if not is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        user = self.get_user(db, user_id)
        if not user:
            return False
        
        user.is_active = True
        user.updated_at = datetime.utcnow()
        db.commit()
        
        return True
    
    def get_user_profile(self, db: Session, user_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed user profile with statistics"""
        user = self.get_user(db, user_id)
        if not user:
            return None
        
        # Count user's documents
        document_count = db.query(Document).filter(Document.user_id == user_id).count()
        
        # Count user's chats
        chat_count = db.query(Chat).filter(Chat.user_id == user_id).count()
        
        # Get last activity (most recent document or chat)
        last_doc_activity = db.query(Document.created_at).filter(
            Document.user_id == user_id
        ).order_by(Document.created_at.desc()).first()
        
        last_chat_activity = db.query(Chat.updated_at).filter(
            Chat.user_id == user_id
        ).order_by(Chat.updated_at.desc()).first()
        
        last_activity = None
        if last_doc_activity and last_chat_activity:
            last_activity = max(last_doc_activity[0], last_chat_activity[0])
        elif last_doc_activity:
            last_activity = last_doc_activity[0]
        elif last_chat_activity:
            last_activity = last_chat_activity[0]
        
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "document_count": document_count,
            "chat_count": chat_count,
            "last_activity": last_activity
        }
    
    def get_user_stats(self, db: Session, is_superuser: bool = False) -> Dict[str, Any]:
        """Get user statistics (superuser only)"""
        if not is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        inactive_users = db.query(User).filter(User.is_active == False).count()
        superusers = db.query(User).filter(User.is_superuser == True).count()
        
        # Recent users (last 10)
        recent_users = db.query(User).order_by(User.created_at.desc()).limit(10).all()
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": inactive_users,
            "superusers": superusers,
            "recent_users": [
                {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "is_active": user.is_active,
                    "created_at": user.created_at
                }
                for user in recent_users
            ]
        }
    
    def search_users(
        self, 
        db: Session, 
        query: str,
        is_superuser: bool = False,
        limit: int = 20
    ) -> List[User]:
        """Search users by email or name (superuser only)"""
        if not is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        users = db.query(User).filter(
            (User.email.ilike(f"%{query}%")) |
            (User.full_name.ilike(f"%{query}%"))
        ).limit(limit).all()
        
        return users
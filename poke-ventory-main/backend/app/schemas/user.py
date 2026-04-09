from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    """Schéma de base partagé"""
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    """
    Tous les champs sont optionnels
    """
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    """
    Schéma de réponse
    """
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

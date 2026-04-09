"""
Schémas Pydantic pour UserCard
"""
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
from app.models.user_card import CardCondition


class UserCardBase(BaseModel):
    """Schéma de base"""
    card_id: str
    quantity: int = 1
    condition: str = CardCondition.near_mint.value
    price_paid: Optional[float] = None
    acquired_at: Optional[date] = None
    source: Optional[str] = None
    notes: Optional[str] = None


class UserCardCreate(UserCardBase):
    """Schéma pour créer une user_card"""
    pass


class UserCardUpdate(BaseModel):
    """Schéma pour mettre à jour une user_card"""
    quantity: Optional[int] = None
    condition: Optional[str] = None
    price_paid: Optional[float] = None
    acquired_at: Optional[date] = None
    source: Optional[str] = None
    notes: Optional[str] = None


class UserCardResponse(UserCardBase):
    """Schéma de réponse"""
    id: str
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserCardWithCardResponse(UserCardResponse):
    """Schéma de réponse avec les détails de la carte"""
    card: Optional[dict] = None

    class Config:
        from_attributes = True


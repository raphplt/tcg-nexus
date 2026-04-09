"""
Schémas Pydantic pour Set
"""
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class SetBase(BaseModel):
    """Schéma de base"""
    name: str
    logo: Optional[str] = None
    symbol: Optional[str] = None
    card_count_official: Optional[int] = None
    card_count_total: Optional[int] = None
    release_date: Optional[date] = None
    series_id: str


class SetCreate(SetBase):
    """Schéma pour créer un set"""
    id: str


class SetUpdate(BaseModel):
    """Schéma pour mettre à jour un set"""
    name: Optional[str] = None
    logo: Optional[str] = None
    symbol: Optional[str] = None
    card_count_official: Optional[int] = None
    card_count_total: Optional[int] = None
    release_date: Optional[date] = None
    series_id: Optional[str] = None


class SetResponse(SetBase):
    """Schéma de réponse"""
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

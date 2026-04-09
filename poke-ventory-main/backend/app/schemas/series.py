"""
Schémas Pydantic pour Series
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SeriesBase(BaseModel):
    """Schéma de base"""
    name: str
    logo: Optional[str] = None


class SeriesCreate(SeriesBase):
    """Schéma pour créer une série"""
    id: str


class SeriesUpdate(BaseModel):
    """Schéma pour mettre à jour une série"""
    name: Optional[str] = None
    logo: Optional[str] = None


class SeriesResponse(SeriesBase):
    """Schéma de réponse"""
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

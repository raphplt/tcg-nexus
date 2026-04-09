"""
Schémas Pydantic pour Card
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class CardBase(BaseModel):
    """Schéma de base"""
    local_id: str
    name: str
    image: Optional[str] = None
    hp: Optional[int] = None
    types: Optional[List[str]] = None
    evolves_from: Optional[str] = None
    stage: Optional[str] = None
    rarity: Optional[str] = None
    category: Optional[str] = None
    illustrator: Optional[str] = None
    set_id: str


class CardCreate(CardBase):
    """Schéma pour créer une carte"""
    id: str


class CardUpdate(BaseModel):
    """Schéma pour mettre à jour une carte"""
    local_id: Optional[str] = None
    name: Optional[str] = None
    image: Optional[str] = None
    hp: Optional[int] = None
    types: Optional[List[str]] = None
    evolves_from: Optional[str] = None
    stage: Optional[str] = None
    rarity: Optional[str] = None
    category: Optional[str] = None
    illustrator: Optional[str] = None
    set_id: Optional[str] = None


class CardResponse(CardBase):
    """Schéma de réponse"""
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CardsListResponse(BaseModel):
    """Schéma de réponse pour la liste paginée de cartes"""
    items: List[CardResponse]
    total: int
    skip: int
    limit: int
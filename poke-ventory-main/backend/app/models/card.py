"""
Modèle Card - Représente une carte Pokémon individuelle
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Card(Base):
    """
    Carte Pokémon individuelle
    
    Relations:
    - Une carte appartient à un set
    """
    __tablename__ = "cards"

    id = Column(String, primary_key=True)  # Ex: "sv3pt5-1"
    local_id = Column(String, nullable=False)  # Numéro dans le set (ex: "001")
    name = Column(String, nullable=False, index=True)
    image = Column(String, nullable=True)
    
    # Informations de la carte
    hp = Column(Integer, nullable=True)
    types = Column(JSON, nullable=True)  # Liste des types ["Fire", "Water"]
    evolves_from = Column(String, nullable=True)
    stage = Column(String, nullable=True)  # "Basic", "Stage1", "Stage2"
    
    # Rareté et catégorie
    rarity = Column(String, nullable=True, index=True)
    category = Column(String, nullable=True)  # "Pokemon", "Trainer", "Energy"
    
    # Illustrateur
    illustrator = Column(String, nullable=True)
    
    # Variantes
    variants = Column(JSON, nullable=True)  # normal, reverse, holo, etc.
    
    # Relation avec Set
    set_id = Column(String, ForeignKey("sets.id"), nullable=False)
    set = relationship("Set", back_populates="cards")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Card(id={self.id}, name={self.name}, set={self.set_id})>"
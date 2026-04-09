"""
Modèle Set - Représente un set/extension de cartes (ex: Écarlate et Violet - 151)
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Set(Base):
    """
    Set/Extension de cartes Pokémon
    
    Relations:
    - Un set appartient à une série
    - Un set contient plusieurs cartes
    """
    __tablename__ = "sets"

    id = Column(String, primary_key=True)  # Ex: "sv3pt5"
    name = Column(String, nullable=False)
    logo = Column(String, nullable=True)
    symbol = Column(String, nullable=True)
    card_count_official = Column(Integer, nullable=True)  # Nombre officiel de cartes
    card_count_total = Column(Integer, nullable=True)     # Total avec cartes secrètes
    release_date = Column(Date, nullable=True)
    
    # Relation avec Series
    series_id = Column(String, ForeignKey("series.id"), nullable=False)
    series = relationship("Series", back_populates="sets")
    
    # Relations avec Cards
    cards = relationship("Card", back_populates="set", cascade="all, delete-orphan")
    # Relations avec SealedItems
    sealed_items = relationship("SealedItem", back_populates="set", cascade="all, delete-orphan")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Set(id={self.id}, name={self.name}, series={self.series_id})>"

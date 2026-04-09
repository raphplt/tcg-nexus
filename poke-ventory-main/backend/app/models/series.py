"""
Modèle Series : Représente une série de cartes Pokémon (ex: Écarlate et Violet)
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Series(Base):
    """
    Série de cartes Pokémon
    
    Relations:
    - Une série contient plusieurs sets
    """
    __tablename__ = "series"

    id = Column(String, primary_key=True)  # Ex: "sv", "swsh"
    name = Column(String, nullable=False)
    logo = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    sets = relationship("Set", back_populates="series", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Series(id={self.id}, name={self.name})>"

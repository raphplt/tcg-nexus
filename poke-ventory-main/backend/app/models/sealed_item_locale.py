"""
Modèle SealedItemLocale - Représente une variante localisée d'un produit scellé
"""
from sqlalchemy import Column, String, ForeignKey, DateTime, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SealedItemLocale(Base):
	"""
	Variante localisée d'un produit scellé
	
	"""
	__tablename__ = "sealed_item_locales"

	id = Column(Integer, primary_key=True, autoincrement=True)
	sealed_id = Column(String, ForeignKey("sealed_items.id"), nullable=False)
	locale = Column(String, nullable=False, index=True)  # "en", "fr", "ja", "de", ...
	name = Column(String, nullable=False)

	sealed_item = relationship("SealedItem", back_populates="locales")

	created_at = Column(DateTime(timezone=True), server_default=func.now())

	def __repr__(self):
		return f"<SealedItemLocale(sealed_id={self.sealed_id}, locale={self.locale})>"



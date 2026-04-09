"""
Modèle SealedItem - Représente un produit scellé Pokémon (booster, ETB, display, coffret, etc.)
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SealedItem(Base):
	"""
	Produit scellé Pokémon
	
	La table représente la version "canon" du produit,
	généralement en anglais (source globale).
	"""
	__tablename__ = "sealed_items"

	id = Column(String, primary_key=True)  # Ex: "sv04-etb-001"

	# Nom canon (souvent anglais)
	name_en = Column(String, nullable=False, index=True)

	# Type de produit scellé
	product_type = Column(
		String,
		nullable=False,
		index=True
	)  # "booster", "etb", "display", "tripack", "collection_box", ...

	# Set associé (optionnel)
	set_id = Column(String, ForeignKey("sets.id"), nullable=True)
	set = relationship("Set", back_populates="sealed_items")

	# Contenu détaillé du produit
	# Ex: {"booster_count": 8, "promos": ["sv4-12"], "accessories": true}
	contents = Column(JSON, nullable=True)

	# Informations additionnelles
	sku = Column(String, nullable=True, index=True)
	upc = Column(String, nullable=True, index=True)
	image = Column(String, nullable=True)

	# Localisations (FR, JA, DE, ...)
	locales = relationship("SealedItemLocale", back_populates="sealed_item", cascade="all, delete-orphan")

	created_at = Column(DateTime(timezone=True), server_default=func.now())
	updated_at = Column(DateTime(timezone=True), onupdate=func.now())

	def __repr__(self):
		return f"<SealedItem(id={self.id}, type={self.product_type}, name_en={self.name_en})>"



import uuid
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class UserSealedItem(Base):
    __tablename__ = "user_sealed_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sealed_item_id = Column(String, ForeignKey("sealed_items.id"), nullable=False, index=True)

    quantity = Column(Integer, nullable=False, default=1)
    condition = Column(String, nullable=True)  # e.g., "sealed", "damaged_box"
    price_paid = Column(Numeric(10, 2), nullable=True)
    acquired_at = Column(Date, nullable=True)
    source = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())



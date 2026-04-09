import enum
import uuid
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class CardCondition(str, enum.Enum):
    mint = "mint"
    near_mint = "near_mint"
    excellent = "excellent"
    light_played = "light_played"
    played = "played"
    poor = "poor"


class UserCard(Base):
    __tablename__ = "user_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    card_id = Column(String, ForeignKey("cards.id"), nullable=False, index=True)
    draft_id = Column(UUID(as_uuid=True), ForeignKey("card_drafts.id"), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    condition = Column(String, nullable=False, default=CardCondition.near_mint.value)
    price_paid = Column(Numeric(10, 2), nullable=True)
    acquired_at = Column(Date, nullable=True)
    source = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    source_draft = relationship("CardDraft", back_populates="selection")

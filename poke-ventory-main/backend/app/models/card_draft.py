import enum
import uuid
from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, Float, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class CardDraftStatus(str, enum.Enum):
    pending = "pending"
    awaiting_validation = "awaiting_validation"
    validated = "validated"
    rejected = "rejected"
    expired = "expired"


class DraftSubject(str, enum.Enum):
    cards = "cards"
    sealed = "sealed"


class CardDraft(Base):
    __tablename__ = "card_drafts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    image_id = Column(UUID(as_uuid=True), ForeignKey("analysis_images.id"), nullable=False)
    status = Column(String, nullable=False, default=CardDraftStatus.awaiting_validation.value)
    candidates = Column(JSON, nullable=False, default=list)
    top_candidate_id = Column(String, nullable=True)
    top_candidate_score = Column(Float, nullable=True)
    selected_card_id = Column(String, ForeignKey("cards.id"), nullable=True)
    detected_metadata = Column(JSON, nullable=True)
    subject_type = Column(String, nullable=False, default=DraftSubject.cards.value)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    image = relationship("AnalysisImage", back_populates="drafts")
    selection = relationship("UserCard", back_populates="source_draft", uselist=False)

    def mark_validated(self, card_id: str) -> None:
        self.selected_card_id = card_id
        self.status = CardDraftStatus.validated.value

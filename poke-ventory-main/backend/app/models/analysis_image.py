import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class AnalysisImage(Base):
    """
    Métadonnées d'une image stockée temporairement dans Redis.
    """

    __tablename__ = "analysis_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    redis_key = Column(String, nullable=False, unique=True)
    filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False, default="image/jpeg")
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    ttl_seconds = Column(Integer, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, nullable=False, default="stored")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    drafts = relationship("CardDraft", back_populates="image")

    def mark_analyzed(self) -> None:
        self.status = "analyzed"
        self.updated_at = datetime.utcnow()

    def refresh_ttl(self) -> None:
        self.expires_at = datetime.utcnow() + timedelta(seconds=self.ttl_seconds)

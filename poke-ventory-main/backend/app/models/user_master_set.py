import uuid
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class UserMasterSet(Base):
    __tablename__ = "user_master_set"
    __table_args__ = (
        UniqueConstraint("user_id", "set_id", name="user_master_set_user_set_key"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    set_id = Column(String, ForeignKey("sets.id"), nullable=False, index=True)
    tracked_card_count = Column(Integer, nullable=False, default=0)
    owned_card_count = Column(Integer, nullable=False, default=0)
    completion_rate = Column(Float, nullable=False, default=0.0)
    status = Column(String, nullable=False, default="active")
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CardCandidate(BaseModel):
    card_id: str
    name: str
    set_id: str
    set_name: str
    local_id: str
    rarity: Optional[str]
    score: float


class DetectedMetadata(BaseModel):
    bounding_box: Optional[List[int]] = None
    raw_text: Optional[str] = None
    probable_name: Optional[str] = None
    local_number: Optional[str] = None
    set_hint: Optional[str] = None
    hp_hint: Optional[str] = None
    type_hint: Optional[List[str]] = None
    attacks: Optional[List[str]] = None
    illustrator_hint: Optional[str] = None
    release_year: Optional[str] = None
    raw_lines: Optional[List[str]] = None


class CardDraftResponse(BaseModel):
    id: UUID
    batch_id: UUID
    image_id: UUID
    image_url: str
    status: str
    subject_type: str
    candidates: List[CardCandidate]
    top_candidate_id: Optional[str]
    top_candidate_score: Optional[float]
    detected_metadata: Optional[DetectedMetadata] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ImageBatchResponse(BaseModel):
    batch_id: UUID
    drafts: List[CardDraftResponse]
    report_path: Optional[str] = None


class CardSelectionRequest(BaseModel):
    card_id: str
    quantity: int = Field(default=1, ge=1)
    condition: Optional[str] = Field(default="near_mint")
    price_paid: Optional[float] = None
    acquired_at: Optional[date] = None
    notes: Optional[str] = None


class UserCardResponse(BaseModel):
    id: UUID
    card_id: str
    user_id: int
    quantity: int
    condition: str
    price_paid: Optional[float] = None
    acquired_at: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserMasterSetResponse(BaseModel):
    id: UUID
    user_id: int
    set_id: str
    tracked_card_count: int
    owned_card_count: int
    completion_rate: float
    status: str

    class Config:
        from_attributes = True


class CardSelectionResponse(BaseModel):
    draft: CardDraftResponse
    user_card: UserCardResponse
    master_set: Optional[UserMasterSetResponse] = None

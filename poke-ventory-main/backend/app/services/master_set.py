"""
Gestion de la progression des master sets utilisateur.
"""
from __future__ import annotations

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from app.models.card import Card
from app.models.user_card import UserCard
from app.models.user_master_set import UserMasterSet
from app.models.set import Set


class MasterSetProgressService:
    def __init__(self, db: Session):
        self.db = db

    def sync_progress(self, user_id: int, set_id: str) -> UserMasterSet:
        set_obj = self.db.query(Set).filter(Set.id == set_id).first()
        tracked_count = set_obj.card_count_total or set_obj.card_count_official or 0

        master_set = (
            self.db.query(UserMasterSet)
            .filter(UserMasterSet.user_id == user_id, UserMasterSet.set_id == set_id)
            .first()
        )

        if not master_set:
            master_set = UserMasterSet(
                user_id=user_id,
                set_id=set_id,
                tracked_card_count=tracked_count,
                owned_card_count=0,
                completion_rate=0.0,
            )
            self.db.add(master_set)
            self.db.flush()

        owned_cards = (
            self.db.query(func.count(distinct(UserCard.card_id)))
            .join(Card, Card.id == UserCard.card_id)
            .filter(UserCard.user_id == user_id, Card.set_id == set_id)
            .scalar()
        ) or 0

        completion = (owned_cards / tracked_count) if tracked_count else 0.0
        master_set.owned_card_count = owned_cards
        master_set.completion_rate = round(completion, 4)
        master_set.last_synced_at = datetime.utcnow()
        return master_set

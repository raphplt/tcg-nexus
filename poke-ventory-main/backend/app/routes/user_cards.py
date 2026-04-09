"""
Routes CRUD pour UserCards
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.database import get_db
from app.models.user_card import UserCard, CardCondition
from app.models.card import Card
from app.schemas.user_card import (
    UserCardCreate,
    UserCardResponse,
    UserCardUpdate,
    UserCardWithCardResponse
)
from app.utils.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/user-cards",
    tags=["user-cards"]
)


@router.get("/", response_model=dict)
def get_user_cards(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    card_id: Optional[str] = None,
    set_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer les cartes de l'utilisateur avec pagination
    """
    query = db.query(UserCard).filter(UserCard.user_id == current_user.id)
    
    if card_id:
        query = query.filter(UserCard.card_id == card_id)
    if set_id:
        query = query.join(Card).filter(Card.set_id == set_id)
    
    # Compter le total avant pagination
    total = query.count()
    
    # Charger les relations avec les cartes
    user_cards = query.options(joinedload(UserCard.source_draft)).offset(skip).limit(limit).all()
    
    # Charger les détails des cartes
    card_ids = [uc.card_id for uc in user_cards]
    cards_dict = {}
    if card_ids:
        cards_list = db.query(Card).filter(Card.id.in_(card_ids)).all()
        cards_dict = {c.id: c for c in cards_list}
    
    # Construire la réponse avec les détails des cartes
    items = []
    for uc in user_cards:
        card_data = None
        if uc.card_id in cards_dict:
            card = cards_dict[uc.card_id]
            card_data = {
                "id": card.id,
                "name": card.name,
                "local_id": card.local_id,
                "image": card.image,
                "set_id": card.set_id,
                "rarity": card.rarity,
                "category": card.category,
            }
        
        item = {
            "id": str(uc.id),
            "user_id": uc.user_id,
            "card_id": uc.card_id,
            "quantity": uc.quantity,
            "condition": uc.condition,
            "price_paid": float(uc.price_paid) if uc.price_paid else None,
            "acquired_at": uc.acquired_at.isoformat() if uc.acquired_at else None,
            "source": uc.source,
            "notes": uc.notes,
            "created_at": uc.created_at.isoformat(),
            "updated_at": uc.updated_at.isoformat() if uc.updated_at else None,
            "card": card_data
        }
        items.append(item)
    
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/", response_model=UserCardResponse, status_code=status.HTTP_201_CREATED)
def create_user_card(
    user_card: UserCardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ajouter une carte à la collection de l'utilisateur
    """
    # Vérifier que la carte existe
    card = db.query(Card).filter(Card.id == user_card.card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Carte non trouvée")
    
    # Vérifier si l'utilisateur a déjà cette carte
    existing = db.query(UserCard).filter(
        UserCard.user_id == current_user.id,
        UserCard.card_id == user_card.card_id
    ).first()
    
    if existing:
        # Mettre à jour la quantité si la carte existe déjà
        existing.quantity += user_card.quantity
        if user_card.condition:
            existing.condition = user_card.condition
        if user_card.price_paid is not None:
            existing.price_paid = user_card.price_paid
        if user_card.acquired_at:
            existing.acquired_at = user_card.acquired_at
        if user_card.source:
            existing.source = user_card.source
        if user_card.notes:
            existing.notes = user_card.notes
        
        db.commit()
        db.refresh(existing)
        return existing
    
    # Créer une nouvelle entrée
    db_user_card = UserCard(
        user_id=current_user.id,
        card_id=user_card.card_id,
        quantity=user_card.quantity,
        condition=user_card.condition,
        price_paid=user_card.price_paid,
        acquired_at=user_card.acquired_at,
        source=user_card.source,
        notes=user_card.notes
    )
    db.add(db_user_card)
    db.commit()
    db.refresh(db_user_card)
    
    return db_user_card


@router.post("/batch", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_user_cards_batch(
    user_cards: List[UserCardCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ajouter plusieurs cartes à la collection de l'utilisateur en une seule requête
    """
    created = []
    updated = []
    errors = []
    
    for user_card_data in user_cards:
        try:
            # Vérifier que la carte existe
            card = db.query(Card).filter(Card.id == user_card_data.card_id).first()
            if not card:
                errors.append({"card_id": user_card_data.card_id, "error": "Carte non trouvée"})
                continue
            
            # Vérifier si l'utilisateur a déjà cette carte
            existing = db.query(UserCard).filter(
                UserCard.user_id == current_user.id,
                UserCard.card_id == user_card_data.card_id
            ).first()
            
            if existing:
                # Mettre à jour la quantité
                existing.quantity += user_card_data.quantity
                if user_card_data.condition:
                    existing.condition = user_card_data.condition
                if user_card_data.price_paid is not None:
                    existing.price_paid = user_card_data.price_paid
                if user_card_data.acquired_at:
                    existing.acquired_at = user_card_data.acquired_at
                if user_card_data.source:
                    existing.source = user_card_data.source
                if user_card_data.notes:
                    existing.notes = user_card_data.notes
                
                db.commit()
                db.refresh(existing)
                updated.append(existing)
            else:
                # Créer une nouvelle entrée
                db_user_card = UserCard(
                    user_id=current_user.id,
                    card_id=user_card_data.card_id,
                    quantity=user_card_data.quantity,
                    condition=user_card_data.condition,
                    price_paid=user_card_data.price_paid,
                    acquired_at=user_card_data.acquired_at,
                    source=user_card_data.source,
                    notes=user_card_data.notes
                )
                db.add(db_user_card)
                created.append(db_user_card)
        except Exception as e:
            errors.append({"card_id": user_card_data.card_id, "error": str(e)})
    
    db.commit()
    
    # Rafraîchir les objets créés
    for uc in created:
        db.refresh(uc)
    
    return {
        "created": len(created),
        "updated": len(updated),
        "errors": len(errors),
        "details": {
            "created": [str(uc.id) for uc in created],
            "updated": [str(uc.id) for uc in updated],
            "errors": errors
        }
    }


@router.get("/{user_card_id}", response_model=UserCardWithCardResponse)
def get_user_card(
    user_card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer une carte spécifique de l'utilisateur
    """
    user_card = db.query(UserCard).filter(
        UserCard.id == user_card_id,
        UserCard.user_id == current_user.id
    ).first()
    
    if not user_card:
        raise HTTPException(status_code=404, detail="Carte non trouvée dans votre collection")
    
    # Charger les détails de la carte
    card = db.query(Card).filter(Card.id == user_card.card_id).first()
    card_data = None
    if card:
        card_data = {
            "id": card.id,
            "name": card.name,
            "local_id": card.local_id,
            "image": card.image,
            "set_id": card.set_id,
            "rarity": card.rarity,
            "category": card.category,
        }
    
    response = {
        "id": str(user_card.id),
        "user_id": user_card.user_id,
        "card_id": user_card.card_id,
        "quantity": user_card.quantity,
        "condition": user_card.condition,
        "price_paid": float(user_card.price_paid) if user_card.price_paid else None,
        "acquired_at": user_card.acquired_at.isoformat() if user_card.acquired_at else None,
        "source": user_card.source,
        "notes": user_card.notes,
        "created_at": user_card.created_at.isoformat(),
        "updated_at": user_card.updated_at.isoformat() if user_card.updated_at else None,
        "card": card_data
    }
    
    return response


@router.put("/{user_card_id}", response_model=UserCardResponse)
def update_user_card(
    user_card_id: str,
    user_card_update: UserCardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mettre à jour une carte de la collection de l'utilisateur
    """
    db_user_card = db.query(UserCard).filter(
        UserCard.id == user_card_id,
        UserCard.user_id == current_user.id
    ).first()
    
    if not db_user_card:
        raise HTTPException(status_code=404, detail="Carte non trouvée dans votre collection")
    
    if user_card_update.quantity is not None:
        db_user_card.quantity = user_card_update.quantity
    if user_card_update.condition is not None:
        db_user_card.condition = user_card_update.condition
    if user_card_update.price_paid is not None:
        db_user_card.price_paid = user_card_update.price_paid
    if user_card_update.acquired_at is not None:
        db_user_card.acquired_at = user_card_update.acquired_at
    if user_card_update.source is not None:
        db_user_card.source = user_card_update.source
    if user_card_update.notes is not None:
        db_user_card.notes = user_card_update.notes
    
    db.commit()
    db.refresh(db_user_card)
    return db_user_card


@router.delete("/{user_card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_card(
    user_card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Supprimer une carte de la collection de l'utilisateur
    """
    db_user_card = db.query(UserCard).filter(
        UserCard.id == user_card_id,
        UserCard.user_id == current_user.id
    ).first()
    
    if not db_user_card:
        raise HTTPException(status_code=404, detail="Carte non trouvée dans votre collection")
    
    db.delete(db_user_card)
    db.commit()
    return None


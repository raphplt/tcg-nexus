"""
Routes CRUD pour Cards
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import List, Optional

from app.database import get_db
from app.models.card import Card
from app.models.set import Set
from app.schemas.card import CardCreate, CardResponse, CardUpdate, CardsListResponse
from app.utils.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/cards",
    tags=["cards"]
)


@router.get("/", response_model=CardsListResponse)
def get_all_cards(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    set_id: Optional[str] = None,
    series_id: Optional[str] = None,
    name: Optional[str] = None,
    rarity: Optional[str] = None,
    category: Optional[str] = None,
    type: Optional[str] = Query(None, description="Type Pokémon (Fire, Water, etc.)"),
    stage: Optional[str] = None,
    local_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Récupérer toutes les cartes avec filtres optionnels et pagination (public)
    
    Filtres disponibles :
    - set_id : Filtrer par set
    - series_id : Filtrer par série (via le set)
    - name : Recherche par nom (insensible à la casse)
    - rarity : Filtrer par rareté
    - category : Filtrer par catégorie (Pokemon, Trainer, Energy)
    - type : Filtrer par type Pokémon
    - stage : Filtrer par stage (Basic, Stage1, Stage2)
    - local_id : Recherche par numéro dans le set
    """
    query = db.query(Card).options(joinedload(Card.set))
    
    # Filtres
    if set_id:
        query = query.filter(Card.set_id == set_id)
    if series_id:
        query = query.join(Set).filter(Set.series_id == series_id)
    if name:
        query = query.filter(Card.name.ilike(f"%{name}%"))
    if rarity:
        query = query.filter(Card.rarity == rarity)
    if category:
        query = query.filter(Card.category == category)
    if type:
        # Recherche dans le JSON array
        query = query.filter(Card.types.contains([type]))
    if stage:
        query = query.filter(Card.stage == stage)
    if local_id:
        query = query.filter(Card.local_id.ilike(f"%{local_id}%"))
    
    # Compter le total avant pagination
    total = query.count()
    
    # Appliquer pagination
    cards = query.offset(skip).limit(limit).all()
    
    # Convertir les objets SQLAlchemy en schémas Pydantic
    card_responses = [CardResponse.model_validate(card) for card in cards]
    
    return CardsListResponse(
        items=card_responses,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{card_id}", response_model=CardResponse)
def get_card(card_id: str, db: Session = Depends(get_db)):
    """
    Récupérer une carte par son ID (public)
    """
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Carte non trouvée")
    return card


@router.post("/", response_model=CardResponse, status_code=status.HTTP_201_CREATED)
def create_card(
    card: CardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Créer une nouvelle carte (authentification requise)
    """
    # Vérifier si la carte existe déjà
    existing = db.query(Card).filter(Card.id == card.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cette carte existe déjà")
    
    db_card = Card(
        id=card.id,
        local_id=card.local_id,
        name=card.name,
        image=card.image,
        hp=card.hp,
        types=card.types,
        evolves_from=card.evolves_from,
        stage=card.stage,
        rarity=card.rarity,
        category=card.category,
        illustrator=card.illustrator,
        set_id=card.set_id
    )
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    
    return db_card


@router.put("/{card_id}", response_model=CardResponse)
def update_card(
    card_id: str,
    card_update: CardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mettre à jour une carte (authentification requise)
    """
    db_card = db.query(Card).filter(Card.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Carte non trouvée")
    
    if card_update.local_id is not None:
        db_card.local_id = card_update.local_id
    if card_update.name is not None:
        db_card.name = card_update.name
    if card_update.image is not None:
        db_card.image = card_update.image
    if card_update.hp is not None:
        db_card.hp = card_update.hp
    if card_update.types is not None:
        db_card.types = card_update.types
    if card_update.evolves_from is not None:
        db_card.evolves_from = card_update.evolves_from
    if card_update.stage is not None:
        db_card.stage = card_update.stage
    if card_update.rarity is not None:
        db_card.rarity = card_update.rarity
    if card_update.category is not None:
        db_card.category = card_update.category
    if card_update.illustrator is not None:
        db_card.illustrator = card_update.illustrator
    if card_update.set_id is not None:
        db_card.set_id = card_update.set_id
    
    db.commit()
    db.refresh(db_card)
    return db_card


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Supprimer une carte (authentification requise)
    """
    db_card = db.query(Card).filter(Card.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Carte non trouvée")
    
    db.delete(db_card)
    db.commit()
    return None
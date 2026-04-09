"""
Routes CRUD pour Sets
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.set import Set
from app.schemas.set import SetCreate, SetResponse, SetUpdate
from app.utils.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/sets",
    tags=["sets"]
)


@router.get("/", response_model=List[SetResponse])
def get_all_sets(
    skip: int = 0,
    limit: int = 100,
    series_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Récupérer tous les sets (public)
    Filtre optionnel par series_id
    """
    query = db.query(Set)
    
    if series_id:
        query = query.filter(Set.series_id == series_id)
    
    sets = query.offset(skip).limit(limit).all()
    return sets


@router.get("/{set_id}", response_model=SetResponse)
def get_set(set_id: str, db: Session = Depends(get_db)):
    """
    Récupérer un set par son ID (public)
    """
    set_obj = db.query(Set).filter(Set.id == set_id).first()
    if not set_obj:
        raise HTTPException(status_code=404, detail="Set non trouvé")
    return set_obj


@router.post("/", response_model=SetResponse, status_code=status.HTTP_201_CREATED)
def create_set(
    set_data: SetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Créer un nouveau set (authentification requise)
    """
    # Vérifier si le set existe déjà
    existing = db.query(Set).filter(Set.id == set_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ce set existe déjà")
    
    db_set = Set(
        id=set_data.id,
        name=set_data.name,
        logo=set_data.logo,
        symbol=set_data.symbol,
        card_count_official=set_data.card_count_official,
        card_count_total=set_data.card_count_total,
        release_date=set_data.release_date,
        series_id=set_data.series_id
    )
    db.add(db_set)
    db.commit()
    db.refresh(db_set)
    
    return db_set


@router.put("/{set_id}", response_model=SetResponse)
def update_set(
    set_id: str,
    set_update: SetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mettre à jour un set (authentification requise)
    """
    db_set = db.query(Set).filter(Set.id == set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Set non trouvé")
    
    if set_update.name is not None:
        db_set.name = set_update.name
    if set_update.logo is not None:
        db_set.logo = set_update.logo
    if set_update.symbol is not None:
        db_set.symbol = set_update.symbol
    if set_update.card_count_official is not None:
        db_set.card_count_official = set_update.card_count_official
    if set_update.card_count_total is not None:
        db_set.card_count_total = set_update.card_count_total
    if set_update.release_date is not None:
        db_set.release_date = set_update.release_date
    if set_update.series_id is not None:
        db_set.series_id = set_update.series_id
    
    db.commit()
    db.refresh(db_set)
    return db_set


@router.delete("/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(
    set_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Supprimer un set (authentification requise)
    """
    db_set = db.query(Set).filter(Set.id == set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Set non trouvé")
    
    db.delete(db_set)
    db.commit()
    return None

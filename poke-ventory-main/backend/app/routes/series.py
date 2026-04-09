"""
Routes CRUD pour Series
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.series import Series
from app.schemas.series import SeriesCreate, SeriesResponse, SeriesUpdate
from app.utils.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/series",
    tags=["series"]
)


@router.get("/", response_model=List[SeriesResponse])
def get_all_series(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Récupérer toutes les séries (public)
    """
    series = db.query(Series).offset(skip).limit(limit).all()
    return series


@router.get("/{series_id}", response_model=SeriesResponse)
def get_series(series_id: str, db: Session = Depends(get_db)):
    """
    Récupérer une série par son ID (public)
    """
    series = db.query(Series).filter(Series.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Série non trouvée")
    return series


@router.post("/", response_model=SeriesResponse, status_code=status.HTTP_201_CREATED)
def create_series(
    series: SeriesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Créer une nouvelle série (authentification requise)
    """
    # Vérifier si la série existe déjà
    existing = db.query(Series).filter(Series.id == series.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cette série existe déjà")
    
    db_series = Series(
        id=series.id,
        name=series.name,
        logo=series.logo
    )
    db.add(db_series)
    db.commit()
    db.refresh(db_series)
    
    return db_series


@router.put("/{series_id}", response_model=SeriesResponse)
def update_series(
    series_id: str,
    series_update: SeriesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mettre à jour une série (authentification requise)
    """
    db_series = db.query(Series).filter(Series.id == series_id).first()
    if not db_series:
        raise HTTPException(status_code=404, detail="Série non trouvée")
    
    if series_update.name is not None:
        db_series.name = series_update.name
    if series_update.logo is not None:
        db_series.logo = series_update.logo
    
    db.commit()
    db.refresh(db_series)
    return db_series


@router.delete("/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_series(
    series_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Supprimer une série (authentification requise)
    """
    db_series = db.query(Series).filter(Series.id == series_id).first()
    if not db_series:
        raise HTTPException(status_code=404, detail="Série non trouvée")
    
    db.delete(db_series)
    db.commit()
    return None

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.utils.security import hash_password
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Créer un nouveau user
    """
    # Vérifier si l'email existe déjà
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email déjà enregistré")
    
    # Vérifier si le username existe déjà
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username déjà pris")
    
    # Créer le nouveau user
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hash_password(user.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.get("/", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer la liste des users (avec pagination) - Authentification requise
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer un user par son ID - Authentification requise
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User non trouvé")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mettre à jour un user - Authentification requise
    """
    # Vérifier que l'utilisateur modifie son propre profil
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez modifier que votre propre profil"
        )
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User non trouvé")
    
    # Mettre à jour uniquement les champs fournis
    if user_update.email is not None:
        db_user.email = user_update.email
    if user_update.username is not None:
        db_user.username = user_update.username
    if user_update.password is not None:
        db_user.hashed_password = hash_password(user_update.password)
    
    db.commit()
    db.refresh(db_user)
    return db_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Supprimer un user - Authentification requise
    """
    # Vérifier que l'utilisateur supprime son propre compte
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez supprimer que votre propre compte"
        )
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User non trouvé")
    
    db.delete(db_user)
    db.commit()
    return None

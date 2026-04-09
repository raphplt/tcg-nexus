"""
Dépendances réutilisables pour les routes
"""
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.jwt import verify_token

security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Session = Depends(get_db)
) -> User:
    """
    Dépendance pour récupérer l'utilisateur courant à partir du JWT
    À utiliser pour protéger les routes nécessitant une authentification
    
    Usage:
        @router.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            return {"user_id": current_user.id}
    """
    token = credentials.credentials
    
    # Vérifier le token
    payload = verify_token(token, token_type="access")
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dépendance pour vérifier que l'utilisateur est actif
    Optionnel : ajoutez un champ 'is_active' dans votre modèle User si nécessaire
    """
    # Si vous avez un champ is_active dans votre modèle
    # if not current_user.is_active:
    #     raise HTTPException(status_code=400, detail="Utilisateur inactif")
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dépendance pour vérifier que l'utilisateur est un administrateur
    Nécessite un champ 'role' ou 'is_admin' dans votre modèle User
    
    Usage:
        @router.delete("/admin/users/{user_id}")
        def delete_user(user_id: int, admin: User = Depends(require_admin)):
            # Seuls les admins peuvent supprimer des utilisateurs
            pass
    """
    # Exemple si vous avez un champ role
    # if current_user.role != "admin":
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Droits administrateur requis"
    #     )
    
    # Exemple avec is_admin
    # if not getattr(current_user, 'is_admin', False):
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Droits administrateur requis"
    #     )
    
    return current_user

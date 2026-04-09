from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import os

# Configuration JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crée un access token JWT
    
    Args:
        data: Données à encoder dans le token (généralement {"sub": user_id})
        expires_delta: Durée de validité personnalisée (optionnel)
        
    Returns:
        Token JWT signé
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    Crée un refresh token JWT
    
    Args:
        data: Données à encoder dans le token
        
    Returns:
        Refresh token JWT signé
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "type": "refresh"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """
    Vérifie et décode un JWT
    
    Args:
        token: Token JWT à vérifier
        token_type: Type attendu ("access" ou "refresh")
        
    Returns:
        Payload du token si valide, None sinon
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != token_type:
            return None
            
        return payload
        
    except JWTError:
        return None

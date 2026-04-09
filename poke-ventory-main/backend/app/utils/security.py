"""
Utilitaires de sécurité pour le hachage des mots de passe
"""
from passlib.context import CryptContext

# Configuration du contexte de hachage avec Argon2id
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,      # 64 MB (recommandé OWASP)
    argon2__time_cost=3,             # 3 itérations (recommandé OWASP)
    argon2__parallelism=4,           # 4 threads parallèles
    argon2__type="id"                # Argon2id (hybride, le plus sécurisé)
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

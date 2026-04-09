import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

# URL de connexion PostgreSQL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError(
        "DATABASE_URL n'est pas défini. "
        "Créez un fichier .env dans le dossier backend avec :\n"
        "DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/dbname"
    )

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Base moderne (SQLAlchemy 2.0)
class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

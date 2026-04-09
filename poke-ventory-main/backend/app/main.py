from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routes import users_router
from app.routes.auth import router as auth_router
from app.routes.series import router as series_router
from app.routes.sets import router as sets_router
from app.routes.cards import router as cards_router
from app.routes.imports import router as imports_router
from app.routes.user_cards import router as user_cards_router
from app.database import engine, Base
from app.scheduler import start_scheduler

# Créer les tables au démarrage
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):

    scheduler = start_scheduler()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="PokeVault API",
    description="API de gestion de collection Pokémon",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(series_router)
app.include_router(sets_router)
app.include_router(cards_router)
app.include_router(imports_router)
app.include_router(user_cards_router)

@app.get("/health")
def health():
    return {"status": "ok"}

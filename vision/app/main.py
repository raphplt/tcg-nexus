from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .match import match
from .pipeline import preprocess, preprocess_many

app = FastAPI(title="TCG Nexus Vision Service", version="1.0")


class PreprocessRequest(BaseModel):
    image: str  # base64 (jpeg/png)


class PreprocessBatchRequest(BaseModel):
    images: list[str]  # plusieurs frames base64 d'une même carte (rafale)


class MatchCandidate(BaseModel):
    id: str
    url: str  # URL complète de l'image catalogue (ex. .../low.png)


class MatchRequest(BaseModel):
    image: str  # base64 de la photo scannée
    candidates: list[MatchCandidate]


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/preprocess")
def preprocess_endpoint(req: PreprocessRequest) -> dict:
    try:
        return preprocess(req.image)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/preprocess-batch")
def preprocess_batch_endpoint(req: PreprocessBatchRequest) -> dict:
    """Best-of-N : prétraite/OCRise plusieurs frames en parallèle et fusionne
    le meilleur nom + le meilleur numéro."""
    try:
        return preprocess_many(req.images)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/match")
def match_endpoint(req: MatchRequest) -> dict:
    candidates = [c.model_dump() for c in req.candidates]
    return {"results": match(req.image, candidates)}

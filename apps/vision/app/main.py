from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .embed import embed_artwork
from .match import match
from .pipeline import _decode, preprocess, preprocess_many

app = FastAPI(title="TCG Nexus Vision Service", version="1.0")


class PreprocessRequest(BaseModel):
    image: str


class PreprocessBatchRequest(BaseModel):
    images: list[str]


class MatchCandidate(BaseModel):
    id: str
    url: str


class MatchRequest(BaseModel):
    image: str
    candidates: list[MatchCandidate]


class EmbedRequest(BaseModel):
    images: list[str]


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


@app.post("/embed")
def embed_endpoint(req: EmbedRequest) -> dict:
    """Vecteurs CLIP des images fournies (pré-calcul catalogue + requête scan)."""
    try:
        imgs = [_decode(i) for i in req.images]
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {"embeddings": embed_artwork(imgs)}

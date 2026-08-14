import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .embed import embed_artwork
from .match import match
from .pipeline import _decode, preprocess, preprocess_many

app = FastAPI(title="TCG Nexus Vision Service", version="1.0")

# images base64 : une requête légitime dépasse rarement quelques Mo
MAX_BODY_BYTES = int(os.getenv("VISION_MAX_BODY_BYTES", 32 * 1024 * 1024))

# secret partagé optionnel : non défini = service ouvert (dev, réseau interne)
_API_KEY = os.getenv("VISION_API_KEY", "").strip()

_PUBLIC_PATHS = {"/health"}


@app.middleware("http")
async def guard_request(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_BYTES:
        return JSONResponse({"detail": "Payload too large"}, status_code=413)

    if _API_KEY and request.url.path not in _PUBLIC_PATHS:
        if request.headers.get("x-vision-key") != _API_KEY:
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)

    return await call_next(request)


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

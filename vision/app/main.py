from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .pipeline import preprocess

app = FastAPI(title="TCG Nexus Vision Service", version="1.0")


class PreprocessRequest(BaseModel):
    image: str  # base64 (jpeg/png)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/preprocess")
def preprocess_endpoint(req: PreprocessRequest) -> dict:
    try:
        return preprocess(req.image)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

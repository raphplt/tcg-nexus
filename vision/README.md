# Service Vision (TCG Nexus)

Microservice de prétraitement d'image (workstream B) appelé par l'API NestJS
avant l'OCR. Détecte la carte, corrige la perspective, normalise l'image et
extrait les zones d'intérêt (nom, numéro, HP).

## Endpoints

- `GET /health` — sonde de disponibilité.
- `POST /preprocess` — corps `{ "image": "<base64>" }`, renvoie l'image
  normalisée + les ROI (image base64 + boîte normalisée) + un drapeau `detected`.

## Lancer en local (sans Docker)

```bash
cd vision
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Lancer via Docker

```bash
# depuis la racine du repo
docker compose up -d vision
```

L'API NestJS pointe sur ce service via la variable `VISION_SERVICE_URL`
(`http://localhost:8000` en local, `http://vision:8000` en docker-compose).
Si le service est indisponible, l'API bascule automatiquement sur l'image brute
(fallback B) : la chaîne de scan continue de fonctionner.

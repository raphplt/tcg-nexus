---
title: Microservice Vision (OCR)
---

Microservice Python (FastAPI) de prétraitement d'image appelé par l'API NestJS pour le [scan de cartes](../backend/scan). Détecte la carte, corrige la perspective, et OCRise les zones d'intérêt (nom, numéro) avec Tesseract natif, en essayant plusieurs variantes de binarisation et en sélectionnant le résultat le plus confiant.

Dépendance système : `tesseract-ocr` (+ `tesseract-ocr-eng`, `tesseract-ocr-fra`), installée par le `Dockerfile`. Sans Tesseract, le service répond sans texte de ROI et l'API bascule sur son repli OCR (`tesseract.js`) — le scan continue de fonctionner en mode dégradé.

## Endpoints

- `GET /health` : sonde de disponibilité.
- `POST /preprocess` : corps `{ "image": "<base64>" }`. Renvoie l'image normalisée, les ROI (image base64 + boîte + `text` + `conf`), et `detected`.
- `POST /preprocess-batch` : corps `{ "images": ["<base64>", …] }` — rafale de photos d'une même carte. OCRise toutes les frames **en parallèle** et fusionne le meilleur nom + le meilleur numéro (best-of-N), avec `best_index` indiquant la frame retenue. C'est cet endpoint qu'utilise `POST /scan/recognize` côté API.

## Démarrer en local (sans Docker)

```bash
cd apps/vision
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Démarrer via Docker

```bash
# depuis la racine du repo
docker compose up -d vision
```

L'API NestJS pointe sur ce service via `VISION_SERVICE_URL` (`http://localhost:8000` en local, `http://vision:8000` en docker-compose). Si le service est indisponible, l'API bascule automatiquement sur l'image brute : la chaîne de scan continue de fonctionner.

# Service Vision (TCG Nexus)

Microservice de prétraitement d'image appelé par l'API NestJS. Détecte la carte,
corrige la perspective, et **OCRise les zones d'intérêt** (nom, numéro) avec
tesseract natif + multi-variantes de binarisation + sélection par confiance.

> Dépendance système : `tesseract-ocr` (+ `tesseract-ocr-eng`, `tesseract-ocr-fra`),
> installé par le Dockerfile. En local, installer tesseract et les langues
> `eng`/`fra`. Sans tesseract, le service répond sans texte ROI et l'API bascule
> sur son repli OCR (tesseract.js).

## Endpoints

- `GET /health` — sonde de disponibilité.
- `POST /preprocess` — corps `{ "image": "<base64>" }`, renvoie l'image
  normalisée + les ROI (image base64 + boîte + `text` + `conf`) + `detected`.
- `POST /preprocess-batch` — corps `{ "images": ["<base64>", …] }` (rafale d'une
  même carte). OCRise toutes les frames **en parallèle** et fusionne le meilleur
  nom + le meilleur numéro (best-of-N), avec `best_index` de la frame retenue.

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

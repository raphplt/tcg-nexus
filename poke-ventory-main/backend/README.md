# Backend

API FastAPI pour Poke-ventory – gestion complète d'une collection Pokémon, incluant l'import d'images et l'analyse automatique.

---

## Stack & dossiers

```text
backend/
├── app/
│   ├── models/               # Modèles SQLAlchemy (cards, user_cards, card_drafts…)
│   ├── routes/               # Routes FastAPI (auth, cards, imports…)
│   ├── schemas/              # Schémas Pydantic exposés au frontend
│   ├── services/             # Services (storage Redis, analyse d'image, matching…)
│   └── config.py             # Paramètres runtime
├── migrations/               # Alembic (env + versions)
├── docs/IMAGE_PIPELINE.md    # Documentation détaillée du pipeline import/analysis
├── requirements.{in,txt}
└── README.md
```

---

## Prérequis

- Python 3.10+
- PostgreSQL (DATABASE_URL)
- Redis (stockage temporaire des images)
- Tesseract (pour `pytesseract`, installer le binaire correspondant à votre OS)

## Installation

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # ou .venv\Scripts\Activate.ps1 sous Windows
pip install -r requirements.txt
```

Puis appliquer les migrations :

```bash
alembic upgrade head
```

---

## Variables d'environnement

Créer `.env` dans `backend/` avec (exemple) :

```
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/pokeventory
REDIS_URL=redis://localhost:6379/0
IMAGE_TTL_SECONDS=900
ANALYSIS_MAX_CANDIDATES=5
ANALYSIS_CONFIDENCE_THRESHOLD=0.82
ANALYSIS_OUTPUT_DIR=output
ANALYSIS_LANGUAGES=fr,en
ANALYSIS_VISUAL_MATCHING=1
CARD_ASSET_BASE_URL=https://static.pokemoncards.com
```

`IMAGE_TTL_SECONDS` contrôle le temps de conservation des octets en Redis ; `ANALYSIS_*` ajuste les suggestions retournées au frontend. `ANALYSIS_OUTPUT_DIR` indique où stocker les rapports JSON détaillant chaque batch (utile pour l'audit et le debug). `ANALYSIS_LANGUAGES` pilote EasyOCR (FR/EN par défaut), `ANALYSIS_VISUAL_MATCHING` active la comparaison visuelle ORB avec les artworks officiels, `CARD_ASSET_BASE_URL` sert de fallback si `card.image` est absent.

---

## Lancement

```bash
uvicorn app.main:app --reload
```

Swagger UI : <http://localhost:8000/docs>  
ReDoc : <http://localhost:8000/redoc>

---

## Environnement Docker Compose

Un `docker-compose.yml` à la racine du monorepo démarre Postgres, Redis, le backend FastAPI (avec hot reload) et le frontend Nuxt :

```bash
docker compose up --build
```

Services exposés :

| Service | Port host | Description |
| --- | --- | --- |
| postgres | 5432 | Base de données `pokeventory` (user/pass `pokeventory`). |
| redis | 6379 | Cache temporaire pour les images. |
| backend | 8000 | API FastAPI (`DATABASE_URL` déjà renseignée pour le service). |
| frontend | 3000 | UI Nuxt, configurée pour appeler l'API via `http://localhost:8000`. |

Les dossiers `backend/` et `frontend/` sont montés dans leurs conteneurs respectifs, ce qui permet le rechargement à chaud pendant le développement.

---

## Pipeline d'import & d'analyse

Les endpoints FilePond → FastAPI sont documentés dans [`docs/IMAGE_PIPELINE.md`](docs/IMAGE_PIPELINE.md). Rappel rapide :

| Endpoint | Description |
| --- | --- |
| `POST /imports/batches` | Upload multipart (une ou plusieurs images) + analyse immédiate (`subject_type=cards|sealed`). |
| `GET /imports/images/{id}` | Récupération d'une image stockée en Redis (TTL refresh). |
| `GET /imports/batches/{id}` | Récupérer les drafts d'un lot. |
| `GET /imports/drafts/{id}` | Récupérer le détail d'un draft. |
| `POST /imports/drafts/{id}/select` | Valider une carte candidate pour créer un `user_card`. |

L'analyse s'appuie sur :

- OpenCV (multi-rotations, CLAHE, découpe adaptative) pour séparer toutes les cartes d'une photo (classeur, scans, rotations 90°/180°).
- EasyOCR (fallback pytesseract) pour lire les zones structurées FR (nom, PV, illustrateur, code set, année).
- RapidFuzz + signaux additionnels (HP, type, illustrator, année) pour scorer les candidats grâce à la base `cards`.
- Matching visuel ORB (configurable via `ANALYSIS_VISUAL_MATCHING`) pour comparer le crop et l'artwork officiel.
- Redis pour stocker temporairement les octets d'image.
- Un rapport JSON horodaté est généré dans `ANALYSIS_OUTPUT_DIR` à chaque batch.

---

## Développement & migrations

### Ajouter une dépendance

Modifier `requirements.in`, puis mettre à jour `requirements.txt` (pip-compile ou édition manuelle).

### Créer une migration

```bash
alembic revision -m "message"
# éditer migrations/versions/<revision>.py
alembic upgrade head
```

---

## Notes production

- Prévoir un worker (Celery/RQ) si vous souhaitez déporter l'analyse dans une tâche async.
- Nettoyer Redis avec un TTL court (env `IMAGE_TTL_SECONDS`).
- Le top 1 est considéré “sûr” quand `score >= ANALYSIS_CONFIDENCE_THRESHOLD` (utilisé côté frontend pour l'UX).

Consultez `docs/IMAGE_PIPELINE.md` pour les payloads complets et le flux détaillé.

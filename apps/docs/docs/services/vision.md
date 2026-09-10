---
title: Microservice Vision (OCR & CLIP)
---

Le microservice **Vision** (`apps/vision`) est un service haute performance développé en **Python 3.12** avec le framework **FastAPI**. Il est dédié au traitement d'image par ordinateur, à l'OCR multi-passes, à la comparaison de caractéristiques visuelles ORB et à la génération d'embeddings vectoriels **CLIP**.

Il est consommé principalement par l'API NestJS pour le [Scan de cartes](../backend/scan) et pour le [Module IA & Similarité](../backend/ai).

---

## 1. Fonctionnalités & Endpoints

### A. Prétraitement géométrique & OCR (`/preprocess`, `/preprocess-batch`)
- **Détection de contour** : isole la carte Pokémon sur un fond quelconque et applique une transformation homographique pour redresser la perspective.
- **Extraction des régions d'intérêt (ROI)** : recadre automatiquement le bandeau supérieur (nom du Pokémon) et le coin inférieur (numéro et code d'extension).
- **OCR adaptatif multi-passes** : applique plusieurs algorithmes de binarisation d'image (Otsu, seuillage adaptatif) et extrait le texte via **Tesseract OCR**.
- **Mode Batch (Best-of-N)** (`POST /preprocess-batch`) : reçoit une rafale de photos capturées lors d'un scan mobile, traite l'ensemble des images en parallèle, et fusionne la meilleure lecture de nom et de numéro de série avec indication de la meilleure frame (`best_index`).

### B. Matching visuel ORB (`POST /match`)
- Calcule les descripteurs de points clés ORB (*Oriented FAST and Rotated BRIEF*) sur l'illustration de la photo scannée.
- Télécharge les visuels officiels des cartes candidates du catalogue et compare les descripteurs géométriques pour départager avec certitude les cartes partageant un nom identique (variantes d'illustrations alternatives, rééditions).

### C. Vectorisation CLIP (`POST /embed`)
- Génère les vecteurs d'embeddings de **512 dimensions** pour les illustrations de cartes Pokémon à l'aide d'un réseau de neurones pré-entraîné CLIP.
- Ces vecteurs sont ensuite stockés dans PostgreSQL via l'extension `pgvector` pour alimenter le calcul d'archétypes de decks.

---

## 2. Sécurité & Protection réseau

Le service intègre plusieurs garde-fous de sécurité stricts :

- **Protection anti-SSRF (`url_guard.py`)** : lors du téléchargement d'illustrations de cartes candidates pour le matching ORB, chaque URL fait l'objet d'un contrôle rigoureux d'adresse IP. Les adresses privées (RFC 1918), de bouclage local (`127.0.0.1`, `localhost`), de métadonnées cloud (`169.254.169.254`) ou non HTTP(S) sont immédiatement bloquées.
- **Authentification par clé partagée (`x-vision-key`)** : si la variable `VISION_API_KEY` est configurée, toute requête vers les endpoints non publics doit fournir l'en-tête HTTP `x-vision-key`.
- **Limitation de taille de payload** : middleware rejetant les requêtes dépassant `VISION_MAX_BODY_BYTES` (32 Mo par défaut) avec une erreur `413 Payload Too Large`.

---

## 3. Table des Endpoints

| Méthode | Route | Accès | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Sonde de disponibilité du service. |
| `POST` | `/preprocess` | Clé API | Normalisation d'une image unique et OCR des zones d'intérêt. |
| `POST` | `/preprocess-batch` | Clé API | Analyse parallèle d'une rafale de frames et fusion Best-of-N. |
| `POST` | `/match` | Clé API | Comparaison visuelle ORB entre une image et des cartes candidates. |
| `POST` | `/embed` | Clé API | Calcul des vecteurs d'embedding CLIP (512 dimensions). |

---

## 4. Démarrage en local & Docker

### Via Docker (Recommandé)
Depuis la racine du monorepo :
```bash
docker compose up -d vision
```
Le service est alors joignable sur `http://localhost:8000`. L'API NestJS s'y connecte via `VISION_SERVICE_URL=http://localhost:8000`.

### Démarrage Python manuel
Nécessite Python 3.12 et les bibliothèques système Tesseract :
```bash
# Ubuntu / Debian
sudo apt-get install tesseract-ocr tesseract-ocr-eng tesseract-ocr-fra libgl1

cd apps/vision
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

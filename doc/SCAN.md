# Scan & Collect — pipeline de reconnaissance de cartes

Reconnaissance de cartes Pokémon à partir d'une photo : la carte est cadrée,
nettoyée, lue par OCR, puis appariée à la base, avec un **niveau de confiance**
qui pilote l'expérience mobile (présélection, confirmation, ou saisie manuelle).

Tout le traitement vit **côté backend** : le mobile envoie juste l'image. Aucune
clé d'API n'est exposée dans l'app.

---

## 1. Vue d'ensemble

```
┌─ Mobile (Expo) ─────────────────────────────────────────────┐
│ caméra → optimizeImage (recadrage + resize)                  │
│        → POST /scan/recognize  (multipart, JWT)              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌─ API NestJS · module scan ▼──────────────────────────────────┐
│ ScanController → ScanService.recognize(image)                 │
│                                                               │
│  1. VisionService ──HTTP──▶ Service Vision (FastAPI + OpenCV) │
│        détection carte + perspective, normalisation, ROI      │
│  2. OcrService (Tesseract) : OCR carte entière + OCR par ROI  │
│  3. Parsing : nom + numéro/dénominateur (ROI d'abord)         │
│  4. Matching : fuzzy nom + numéro exact + set → candidats     │
│  5. Confiance : score 0..1 → niveau high / medium / low       │
│                                                               │
│            ▼ ScanRecognizeResponse (contrat partagé)          │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌─ Mobile ▼────────────────────────────────────────────────────┐
│ bandeau de confiance + carte trouvée + candidats             │
│ → ajout à une collection                                      │
└──────────────────────────────────────────────────────────────┘
```

Trois services, un contrat partagé :

| Brique | Emplacement | Rôle |
|---|---|---|
| App mobile | `apps/mobile` | capture, envoi image, UX selon la confiance |
| API scan | `apps/api/src/scan` | orchestration OCR + matching + confiance |
| Service vision | `vision/` | prétraitement image (OpenCV), Python/FastAPI |
| Contrat | `packages/scan-contract` | types request/response partagés API ↔ mobile |

---

## 2. Le contrat d'API

`POST /scan/recognize` — protégé par JWT (guard global), corps **multipart**
avec l'image dans le champ `image` et un champ optionnel `game`.

Réponse (`ScanRecognizeResponse`) :

```jsonc
{
  "rawText": "Pikachu\n...\n58/102",   // texte OCR brut (debug / banc d'essai)
  "lines": ["Pikachu", "58/102"],
  "parsed": {                           // champs structurés extraits
    "cardName": "Pikachu",
    "setCode": "58/102",
    "setNumber": "58",
    "setTotal": "102",
    "setName": "Set de Base"
  },
  "rois": [                             // zones d'intérêt (image normalisée)
    { "key": "name",   "text": "Pikachu", "box": { "x": 0.06, "y": 0.045, "width": 0.7, "height": 0.075 } },
    { "key": "number", "text": "58/102",  "box": { "x": 0.05, "y": 0.915, "width": 0.42, "height": 0.06 } }
  ],
  "candidates": [                       // triés par score décroissant
    { "id": "uuid", "name": "Pikachu", "localId": "58", "setName": "Set de Base", "score": 0.986 }
  ],
  "bestCard": { "id": "uuid", "name": "Pikachu", "score": 0.986 },
  "confidence": 0.986,                  // 0..1
  "confidenceLevel": "high",            // high | medium | low
  "engine": "opencv+tesseract"         // moteurs utilisés
}
```

Le contrat est défini une seule fois dans `packages/scan-contract` et importé
des deux côtés (`import type`), ce qui évite toute désynchro entre l'API et le
mobile.

---

## 3. Le pipeline, étape par étape

### Étape 1 — Prétraitement vision (`vision/`)

Service Python (FastAPI + OpenCV), endpoint `POST /preprocess` (image base64) :

1. **Détection de la carte** : contours (Canny) → on garde le plus grand
   quadrilatère dont l'aire dépasse 20 % de l'image.
2. **Correction de perspective** : `warpPerspective` redresse la carte vers un
   cadre normalisé (600×838, ratio carte Pokémon).
3. **Normalisation** : niveaux de gris → CLAHE (rattrape les éclairages
   inégaux) → débruitage.
4. **Extraction des ROI** : découpe du nom (haut-gauche), du HP (haut-droite) et
   du numéro (bas-gauche) selon des proportions fixes du layout.

Si aucune carte n'est détectée, l'image entière redimensionnée est utilisée
(`detected: false`).

### Étape 2 — OCR (`apps/api/src/scan/ocr`)

Moteur **Tesseract** (`tesseract.js`, in-process). L'OCR tourne sur l'image
normalisée pour le texte global, **et sur chaque ROI** avec des paramètres
adaptés (« profils ») :

| Profil | PSM | Whitelist |
|---|---|---|
| `full` | auto | — |
| `name` | ligne unique | — |
| `number` | ligne unique | `0-9` et `/` |

### Étape 3 — Parsing (`apps/api/src/scan/parsing`)

On privilégie le texte des ROI (plus fiable que le texte plein) :
- **nom** : ROI `name` nettoyée, sinon première ligne plausible du texte plein ;
- **numéro/dénominateur** : regex `NN/MMM` sur la ROI `number`, sinon texte plein.

### Étape 4 — Matching tolérant (`apps/api/src/scan/matching`)

Recherche des candidats en base (ILIKE) à partir du nom/numéro, puis score
**0..1** par carte :

```
score = 0.55 · similarité_nom        (Jaro-Winkler, tolère les fautes d'OCR)
      + 0.30 · numéro_exact          (+ bonus si le dénominateur correspond)
      + 0.15 · similarité_set
```

### Étape 5 — Confiance (`apps/api/src/scan/matching`)

Le score du meilleur candidat devient la confiance, traduite en niveau :

| Niveau | Score | UX mobile |
|---|---|---|
| `high` | ≥ 0.75 | carte présélectionnée, ajout après confirmation |
| `medium` | ≥ 0.45 | liste de candidats à confirmer |
| `low` | < 0.45 | recherche manuelle |

**Garde-fou ambiguïté** : si les deux meilleurs candidats sont au coude-à-coude
(écart < 0.08), un `high` est rétrogradé en `medium` pour forcer la confirmation
(cas des homonymes / sets multiples).

---

## 4. Fallbacks (la chaîne ne casse jamais)

| Étape risquée | Repli |
|---|---|
| Service vision indisponible | OCR sur l'image brute envoyée par le mobile |
| Pas de carte détectée | image entière redimensionnée |
| Tesseract en échec | `OCR_ENGINE=vision` (Google Vision côté serveur) |
| OCR totalement KO | mode mock (texte vide, `engine: "mock"`) |

---

## 5. Configuration (API, `apps/api/.env`)

| Variable | Défaut | Rôle |
|---|---|---|
| `VISION_SERVICE_URL` | `http://localhost:8000` | URL du service vision |
| `OCR_ENGINE` | `tesseract` | moteur OCR : `tesseract` ou `vision` |
| `OCR_LANGS` | `eng+fra` | langues Tesseract |
| `OCR_LANG_PATH` | — | dossier local des traineddata (offline) |
| `GOOGLE_VISION_API_KEY` | — | clé Vision, requise si `OCR_ENGINE=vision` |

Côté mobile, seule `EXPO_PUBLIC_API_URL` est nécessaire (plus aucune clé OCR).

---

## 6. Lancer en local

```bash
# 1. Service vision
cd vision
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload

# 2. API (Postgres + Nest)
cd apps/api
npm run dev:full

# 3. Mobile
cd apps/mobile
npm run start
```

Ou tout via Docker : `docker compose up -d` (Postgres + service vision).
L'image API de déploiement (`docker/api.Dockerfile`) embarque les traineddata
Tesseract → OCR fonctionnel sans réseau.

---

## 7. Sécurité

- L'endpoint est protégé par le **JWT global** de l'API.
- Les clés OCR (Google Vision) restent **côté serveur**, jamais dans le bundle
  mobile. Le mobile n'envoie qu'une image.

---

## 8. Limites & évolutions

- **Banc d'essai chiffré** (workstream E) : mesurer top-1 / top-3, précision,
  latence sur un échantillon — le pipeline complet est prêt pour ça.
- **Appariement par image** (workstream D4, stretch) : hash perceptuel (pHash)
  de l'artwork fusionné au score OCR ; pourrait vivre dans le service vision.
- Les proportions des ROI sont fixes ; elles varient un peu selon les époques de
  cartes et pourraient être affinées.
```

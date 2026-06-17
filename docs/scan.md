# Scan & reconnaissance de cartes — fonctionnement global

Ce document décrit de bout en bout le pipeline de scan d'une carte Pokémon :
de la prise de vue sur mobile jusqu'à la carte reconnue et ajoutée en
collection. Il couvre l'architecture, chaque étape, les algorithmes clés, la
configuration et les limites connues.

---

## 1. Vue d'ensemble

L'objectif : photographier une carte et retrouver automatiquement la bonne
entrée du catalogue (bonne carte, bon set), avec un niveau de confiance.

Le système repose sur **trois services** et un **contrat partagé** :

| Brique | Stack | Rôle |
|---|---|---|
| **Mobile** | Expo / React Native | Capture rafale, optimisation, UI selon la confiance |
| **API** | NestJS (port 3001) | Orchestration : OCR plein-texte, parsing, matching BDD, ORB, confiance, logs |
| **Vision** | Python FastAPI + OpenCV (port 8000, Docker) | Détection/redressement de la carte, OCR ciblé des ROI, comparaison visuelle ORB |
| **Contrat** | `@repo/scan-contract` | Types TypeScript partagés mobile ↔ API |

```
┌─────────┐  5 frames    ┌─────────┐  base64       ┌──────────┐
│ Mobile  │ ───────────► │   API   │ ────────────► │  Vision  │
│ (Expo)  │  multipart   │ (Nest)  │  /preprocess  │ (OpenCV) │
│         │ ◄─────────── │         │ ◄──────────── │          │
└─────────┘  réponse     └─────────┘  ROI + img     └──────────┘
                              │  OCR plein-texte (tesseract.js, repli)
                              │  parsing + matching PostgreSQL (pg_trgm)
                              │  /match ORB (départage visuel)
                              ▼
                         réponse : candidats + bestCard + confiance
```

---

## 2. Le contrat partagé (`packages/scan-contract`)

Type-only, mirroré entre mobile et API. Les structures clés :

- `ScanRecognizeResponse` : `rawText`, `lines`, `parsed`, `rois`, `candidates`,
  `bestCard`, `confidence` (0..1), `confidenceLevel` (`high` | `medium` | `low`),
  `engine`.
- `ScanParsedFields` : `cardName`, `setCode` (`"NN/MMM"`), `setNumber` (`"NN"`),
  `setTotal` (`"MMM"`), `setName`.
- `ScanCardCandidate` : `id`, `name`, `image`, `localId`, `rarity`, `setName`,
  `score`.

> **Clé métier importante** : le dénominateur imprimé `NN/MMM` correspond à
> `pokemon_set.cardCountOfficial` (et **non** `cardCountTotal`). `localId` = `NN`.

---

## 3. Le flux étape par étape

### 3.1 Mobile — capture (`apps/mobile`)

Fichiers : `hooks/useScanFlow.ts`, `components/scan/*`, `constants/scan.ts`,
`services/ocr.service.ts`, `services/scan.service.ts`.

1. **Cadre guide** type scanner d'identité (ratio carte `63/88`) pour aligner la
   carte bien à plat et remplie.
2. **Rafale best-of-N** (`BURST_FRAMES = 5`) : on capture la 1ʳᵉ frame, on
   affiche **immédiatement** l'overlay d'analyse figé (masque les micro-gels du
   preview), puis on prend les 4 frames restantes derrière l'overlay.
3. **Optimisation séquentielle** : chaque frame est redimensionnée
   (`MAX_WIDTH = 1600`) et recompressée en JPEG, **une par une**.
   - ⚠️ Séquentiel obligatoire : optimiser les 5 frames en parallèle décode 5
     bitmaps pleine résolution (~48 Mo chacun) → dépassement du pool mémoire
     natif Android (~192 Mo) → crash *« Pool hard cap violation »*.
4. **Envoi** : les 5 frames partent en `multipart/form-data` dans le champ
   `images` (timeout 60 s).

### 3.2 API — réception (`scan.controller.ts`)

`POST /scan/recognize`, protégé JWT. Accepte `images[]` (rafale, max
`MAX_FRAMES = 8`, 8 Mo/frame) + champ `image` legacy mono-frame. Délègue à
`ScanService.recognize(buffers, game)`.

### 3.3 API — orchestration (`scan.service.ts`)

`recognize()` enchaîne :

1. **Prétraitement vision** (`visionService.preprocessBatch`) → carte redressée,
   ROI OCRisées, image normalisée, `bestIndex`.
2. **OCR plein-texte de repli** (`ocrService.recognize(target, "full")`,
   tesseract.js) sur l'image normalisée — sert de filet quand les ROI ratent.
3. **Construction des champs** (`buildFields`) : priorité aux ROI nom/numéro,
   sinon repli sur le texte plein parsé.
4. **Candidats de nom** (`extractNameCandidates`).
5. **Matching BDD** (`matchCandidates`).
6. **Départage visuel ORB** (`visualDisambiguate`) si le texte est ambigu.
7. **Réponse** + **log** du scan.

### 3.4 Vision — prétraitement (`vision/app/pipeline.py`)

#### Détection & redressement de la carte
- `_find_card_box` : combine **deux indices** complémentaires
  (`_card_contours`) — bords (Canny + morpho) **et** saturation (une carte
  colorée ressort d'un fond neutre). On garde le contour **grand ET centré**
  (`score = aire − 0.6·distance_au_centre`), seuil d'aire mini
  `MIN_CARD_AREA_RATIO = 0.08` (tolère une carte tenue un peu loin).
- `_warp_card` : perspective + remise en portrait, plein résolution
  (largeur bornée à `MAX_WARP_W = 1024`). Pas de carte trouvée → on redresse au
  moins l'image en portrait.

#### Sélection de la meilleure frame (best-of-N)
`preprocess_many` ne fait **plus** l'OCR des 5 frames. À la place :
1. Étape légère **sans OCR** en parallèle (`_prepare_frame`) : redressement +
   note de **netteté** (`_sharpness` = variance du Laplacien sur la zone du nom),
   avec gros bonus si la carte est détectée.
2. On garde **une seule** frame (la plus nette, carte détectée) et on ne fait
   l'OCR **que sur celle-là**.

> Pourquoi : avec 8 cœurs, OCRiser 5 frames en parallèle prenait ~11,5 s
> (= le coût d'une frame, mais à plein régime) et donnait des résultats
> incohérents (nom d'une frame, numéro d'une autre). La sélection préalable rend
> le scan ~6× plus rapide (~1,5 s), cohérent, et avec des logs complets.

#### Extraction des ROI (`_extract_rois`)
Bandes en coordonnées relatives : `name` (haut), `number` (bas-gauche, cartes
récentes), `number_right` (bas-droite, cartes anciennes), `hp`. La bande
`number_right` n'est OCRisée **qu'en repli** si le bas-gauche ne donne rien
(évite 6 appels OCR inutiles dans le cas courant).

### 3.5 Vision — OCR ciblé (`vision/app/ocr.py`)

OCR au plus près du pixel (tesseract natif via `pytesseract`), avec
**multi-variantes de binarisation** parce qu'aucun prétraitement unique ne
marche sur toutes les cartes (holo, bandeau coloré, texte blanc/sombre) :

- `_variants` produit 4 images : **Otsu**, **Otsu inversé**, **CLAHE**, et
  **blackhat** (morphologie qui isole le texte sombre d'un fond
  holographique/dégradé — indispensable pour les titres des cartes **ex**, là où
  Otsu/CLAHE s'effondrent).
- Pour chaque ROI, on lance **toutes les variantes × PSM (11 et 7) en parallèle**
  (`_best_attempt` + pool de threads ; tesseract = sous-process, libère le GIL)
  et on garde la meilleure confiance.
- **Nom** (`read_name`) : tokens alphabétiques pertinents (filtre
  `BASE`/`PV`/`NIV`…), confiance pondérée par la longueur, langue `eng+fra`.
- **Numéro** (`read_number`) : OCR chiffres-et-slash + regex `NN/MMM`, langue
  **`eng` seule** (les chiffres n'ont pas de langue → ~2× plus rapide).

### 3.6 API — parsing (`parsing/scan-parser.ts`)
- `parseNumber` : extrait `NN/MMM` (ROI ou texte plein).
- `cleanName` : nettoie le nom sans toucher aux accents.
- `extractNameCandidates` : le nom propre figure souvent en clair dans le texte
  plein même quand la ROI nom échoue → on garde plusieurs candidats (mots),
  filtrés des stopwords ; le scoring prendra le meilleur.

### 3.7 API — matching (`matching/scan-matcher.ts` + `card/card.service.ts`)

**Collecte des cartes candidates** (`matchCandidates`) par deux voies, fusionnées :
- **Par numéro** : `findByLocalId(setNumber, setTotal)` — robuste au bruit du nom,
  tolère les zéros de tête, filtre sur `cardCount.official = MMM OR cardCount.total = MMM`.
- **Par nom fuzzy** : `findByNameFuzzy(term)` via PostgreSQL **`pg_trgm`**
  (`card.name % :term`, index GIN). La BDD stocke les noms **sans accents** →
  recherche tolérante (« Félicanis » → « Felicanis »).

**Scoring** (`scoreCard`), somme pondérée :

```
score = NAME_W·nameScore + NUMBER_W·numberSignal + SET_W·setSignal
        (0.55)            (0.50)                  (0.15)
```

- `nameScore` : meilleure similarité **Jaro-Winkler** entre candidats de nom et
  le nom de la carte (candidats < 4 caractères écartés).
- `numberSignal` : `1` si **localId ET dénominateur officiel** exacts (quasi-clé :
  localId unique par set, `/MMM` identifie le set) ; `0.5` si numéro exact sans
  dénominateur lu ; sinon `0`.
- **Garde-fou relatif anti « confident-wrong »** : si une **autre** carte matche
  nettement mieux le nom (`bestName − name > NAME_MARGIN = 0.2`, avec un nom
  exploitable `bestName ≥ 0.5`), le numéro de cette carte est jugé coïncident →
  `numberSignal = 0`. Empêche un numéro mal lu de faire remonter la mauvaise carte.

> Le poids numéro (`0.5`) est volontairement assez fort : un numéro + dénominateur
> bien lu **suffit** à proposer la carte (> seuil candidat `0.4`) et à atteindre
> *medium*, même si le nom est illisible (titres holo/ex). Cela permet à l'ORB de
> prendre le relais au lieu de jeter un signal pourtant quasi-parfait.

Les candidats sont filtrés (`score ≥ MIN_CANDIDATE_SCORE = 0.4`), triés, limités
à `MAX_CANDIDATES = 10`.

### 3.8 API — départage visuel ORB (`vision/app/match.py`)

Quand le texte est ambigu (pas déjà *high* et ≥ 2 candidats), on compare
**l'artwork** de la photo aux images catalogue des meilleurs candidats :

- Features **ORB** (OpenCV) + `BFMatcher` Hamming + **test de Lowe** (ratio 0.75),
  sur la fenêtre artwork (haut/milieu de la carte). Aucun précalcul : les images
  candidates sont téléchargées à la volée.
- Le gagnant n'est promu (**confiance 0.95, high**) que s'il est **net** :
  `bestScore ≥ VISUAL_MIN_GOOD (12)` **et** `bestScore ≥ 2 × second`.
- Robuste au gap photo ↔ catalogue, contrairement aux hash perceptuels
  (dHash/pHash testés et **non viables** sur ce domaine).

### 3.9 API — confiance (`computeConfidence`)

À partir du meilleur score :

| Niveau | Condition |
|---|---|
| **high** | `best ≥ 0.75` |
| **medium** | `best ≥ 0.45` |
| **low** | sinon |

Garde-fou d'ambiguïté : deux candidats au coude-à-coude (`best − second < 0.08`)
→ un *high* est rétrogradé en *medium* (on fait confirmer).

### 3.10 Mobile — UI selon la confiance

- **high** : carte présélectionnée, autres correspondances repliées (« Ce n'est
  pas la bonne carte ? »). En mode rafale, ajout automatique à la collection.
- **medium / low** : liste « Choisis la bonne carte » dépliée + comparaison photo
  vs carte trouvée (images affichées en `low.png`).
- Recherche manuelle toujours disponible en repli.

---

## 4. Logging / debug (`logging/scan-logger.ts`)

Chaque scan écrit un dossier `apps/api/scan-logs/<timestamp>_<id>/` :
`input.jpg`, `normalized.png`, `roi_*.png`, `scan.json` (champs parsés, ROI +
texte/confiance, candidats, timings, engine). Un `index.csv` global récapitule
chaque scan (carte lue, bestCard, confiance, niveau, ms, nb candidats, détectée).
Désactivable avec `SCAN_LOG=false`. Le dossier est gitignoré.

---

## 5. Configuration (variables d'environnement, API)

| Variable | Défaut | Rôle |
|---|---|---|
| `VISION_SERVICE_URL` | `http://localhost:8000` | URL du service vision |
| `OCR_ENGINE` | `tesseract` | `tesseract` (tesseract.js) ou `vision` (Google Vision) |
| `OCR_LANGS` | `eng+fra` | langues tesseract.js |
| `OCR_LANG_PATH` | — | dossier des `traineddata` embarquées (offline Docker) |
| `GOOGLE_VISION_API_KEY` | — | requis si `OCR_ENGINE=vision` |
| `SCAN_LOG` | (activé) | `false` pour couper les logs de scan |

> ⚠️ Sécurité : ne jamais committer de clé Google Vision. La clé doit rester
> côté API (jamais dans le bundle mobile).

---

## 6. Lancer en local

```bash
# service vision (Docker)
docker compose up -d --build vision
curl http://localhost:8000/health      # {"status":"ok"}

# API + mobile : via les workspaces du monorepo (turbo / npm)
```

Endpoints vision : `/health`, `/preprocess`, `/preprocess-batch`, `/match`.

---

## 7. Performance (ordres de grandeur)

- Prétraitement vision (rafale 5 frames) : **~1,3–1,9 s** (sélection de la
  meilleure frame + OCR parallélisé d'une seule).
- OCR plein-texte de repli : ~0,7 s. Matching : quelques dizaines de ms à ~1 s.
- Total typique : **~1,5–3 s** par scan.

---

## 8. Limites connues & pistes

- **Cartes très petites / floues / hors cadre** : la détection peut échouer
  (repli sur image redressée brute). Le cadre guide invite à remplir l'écran.
- **Qualité brute de l'OCR du nom** : certains bandeaux stylisés restent durs ;
  le matching fuzzy + l'ORB compensent en partie.
- **Reprints à artwork identique** (ex. mêmes illustrations sur plusieurs sets) :
  l'ORB ne peut pas les départager ; on s'appuie alors sur le numéro/dénominateur.
- **Pas de recherche image plein-catalogue** : l'ORB ne re-classe que des
  candidats déjà trouvés par le texte ; si l'OCR ne sort **aucun** champ
  exploitable, il n'y a pas de candidat à départager.
- **Banc d'essai / métriques** (workstream E) : à formaliser à partir de
  `index.csv` pour mesurer précision/rappel sur un jeu de cartes étiqueté.
```

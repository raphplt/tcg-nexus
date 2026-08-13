---
title: Scan de cartes
---

Reconnaissance d'une carte physique à partir d'une ou plusieurs photos prises sur mobile. Deux chemins coexistent côté client (`apps/mobile`), avec deux endpoints API différents.

## Pipeline serveur complet — `POST /scan/recognize`

- **Base path** : `/scan`
- Reçoit une rafale de photos brutes en `multipart/form-data` (champ `images`, jusqu'à 8 frames ; `image` gardé pour compatibilité mono-frame), taille max 8 Mo/fichier.

Étapes (`ScanService.recognize`) :

1. **Prétraitement + OCR par région** : les frames sont envoyées au microservice [Vision](../services/vision) (`preprocessBatch`) qui détecte la carte, corrige la perspective, OCRise les zones d'intérêt (nom, numéro) en parallèle sur toutes les frames et retient le meilleur résultat (`bestIndex`). Si Vision est indisponible, repli automatique sur l'image brute — la chaîne continue de fonctionner en mode dégradé.
2. **OCR texte intégral** (`OcrService`) sur la frame sélectionnée, en secours des régions d'intérêt.
3. **Extraction des champs** (`scan-parser.ts`) : nom, code/numéro/total de set à partir du texte OCR et des ROI.
4. **Matching catalogue** (`scan-matcher.ts`) : score chaque carte candidate du catalogue par similarité de nom + correspondance numéro/set, avec un plancher de score (`MIN_CANDIDATE_SCORE = 0.4`) et un top 10 (`MAX_CANDIDATES`).
5. **Départage visuel** (embeddings + ORB) quand le texte seul ne suffit pas à distinguer les meilleurs candidats (marge de confiance insuffisante) — compare l'image de la carte scannée aux images du catalogue.

Réponse (`ScanRecognizeResponse`, type partagé via `@repo/scan-contract`) : candidats scorés + niveau de confiance (`ScanConfidenceLevel`) + ROI détectées, localisés dans la langue de la requête via `CatalogLocalizationService` (voir [Traductions](./translations)).

## Matching léger — `POST /pokemon-card/scan-match`

Endpoint public, plus simple : reçoit des champs déjà extraits côté client (`cardName`, `localId`, `setName`, `setNumber`, `setTotal`) et renvoie uniquement les cartes candidates scorées, sans refaire d'OCR ni de prétraitement image. Utilisé par le pipeline de scan **on-device** du mobile (détection/rectification/OCR/comparaison visuelle exécutées localement — `apps/mobile/services/scanner/`), qui n'a besoin du serveur que pour la recherche texte dans le catalogue.

## Journalisation

`ScanLogger` peut journaliser chaque scan (image + infos extraites) dans `apps/api/scan-logs`, activé/désactivé via `SCAN_LOG` (voir [Installation](../guides/installation)). Utile pour diagnostiquer les échecs de reconnaissance sans avoir à reproduire manuellement une photo.

## Configuration

| Variable | Rôle |
|---|---|
| `OCR_ENGINE` | `tesseract` (défaut, local) ou `vision` (Google Cloud Vision, nécessite `GOOGLE_VISION_API_KEY`) |
| `OCR_LANGS` | langues Tesseract chargées (ex. `eng+fra`) |
| `VISION_SERVICE_URL` | URL du microservice de prétraitement image (`http://localhost:8000` en local) |
| `SCAN_LOG` | active/désactive la journalisation des scans |

---
title: Mobile (Expo)
---

Application **Expo / React Native** (`apps/mobile`), centrée sur le scan de cartes en conditions réelles (appareil photo) et un accès nomade à la collection, aux decks et aux tournois.

## Stack

- **Expo 56** + **React Native 0.85** + **React 19**, routing via `expo-router` (file-based, comme le App Router web).
- État : **zustand**.
- HTTP : **axios** (`services/api.ts`), tokens stockés via `expo-secure-store` (`services/secureApi.ts`, `services/tokenStorage.ts`).
- Caméra : `expo-camera` ; retouche image (recadrage/compression) : `expo-image-manipulator`.
- Notifications push : `expo-notifications` + `expo-device` (enregistrement de token, voir [Notifications](../backend/notifications)).
- Types de scan partagés avec l'API via le package interne `@repo/scan-contract`.

## Routing

- `app/(auth)/auth` et `app/auth` : écrans de connexion/inscription.
- `app/(protected)/(tabs)` : navigation par onglets une fois connecté — `index` (accueil), `scan`, `collection`, `decks`, `tournaments`, `profile`.

## Scan de cartes

Deux pipelines coexistent (`services/scan.service.ts` vs `services/scanner/`), voir [Scan de cartes](../backend/scan) côté API pour le détail serveur :

1. **Pipeline serveur** (`scan.service.ts`) : envoie la/les photo(s) brute(s) à `POST /scan/recognize` — l'API délègue le prétraitement et l'OCR au microservice [Vision](../services/vision).
2. **Pipeline client** (`services/scanner/` : `card-detector`, `zone-ocr`, `visual-matcher`, `candidate-ranker`, orchestré par `card-resolver.ts`) : détection/recadrage de la carte et **OCR effectués côté mobile** via une API cloud (Google Cloud Vision ou OCR.space, selon la clé configurée — `EXPO_PUBLIC_GOOGLE_VISION_API_KEY` / `EXPO_PUBLIC_OCR_SPACE_API_KEY`), un score de correspondance visuelle local, puis un appel à `POST /pokemon-card/scan-match` pour ne faire matcher que le texte déjà extrait contre le catalogue.

## Configuration

```bash
# apps/mobile/.env
EXPO_PUBLIC_API_URL=http://localhost:3001/api

# Une option OCR au choix pour le pipeline client :
EXPO_PUBLIC_OCR_SPACE_API_KEY=      # gratuit, 25 000 req/mois, sans CB
EXPO_PUBLIC_GOOGLE_VISION_API_KEY=  # nécessite facturation GCP active
```

## Démarrage & build

```bash
cd apps/mobile
npm run dev       # Expo (Metro), scanner le QR code avec Expo Go ou un dev client
npm run android    # build + lancement natif Android
npm run ios        # build + lancement natif iOS
npm run build      # renvoie vers EAS Build (pas de build local packagée)
```

## Qualité

- Lint : `npm run lint` (Biome)
- Types : `npm run check-types`

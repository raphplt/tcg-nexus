---
title: Architecture du monorepo
---

Le projet s’appuie sur **npm workspaces** et **Turborepo** pour orchestrer les builds, le lint et le dev en parallèle.

```
apps/
  api/      -> API NestJS (PostgreSQL + TypeORM + Swagger)
  web/      -> Front Next.js (App Router, i18n next-intl) + Tailwind CSS
  mobile/   -> App Expo/React Native (scan de cartes, notifications push)
  fetch/    -> Microservice Express pour TCGdex
  vision/   -> Microservice Python (FastAPI) de prétraitement image + OCR pour le scan
  docs/     -> Documentation Docusaurus
packages/
  ui/               -> Librairie de composants partagés (web)
  typescript-config/-> tsconfig commun
  scan-contract/    -> Types TypeScript partagés entre l'API et le mobile pour le pipeline de scan
  effect-parser/    -> Parseur des effets de cartes (texte -> représentation structurée), alimente le seed `sync:effects`
  pokemon-dataset/  -> Package de données du catalogue Pokémon versionné avec le repo
```

### Flux applicatif

- **API (3001)** : expose les données Pokémon/TCG (cartes, decks, tournois, marketplace, traductions, notifications, parties en ligne) et sécurise les accès via JWT. Utilise PostgreSQL et TypeORM avec `autoLoadEntities`.
- **Front web (3000)** : consomme l’API via `NEXT_PUBLIC_API_URL`, gère l’authentification, les collections, decks, marketplace, tournois, une zone admin, et sert le site en plusieurs langues via `next-intl` (routes préfixées `/[locale]`).
- **Mobile (Expo)** : scanne des cartes via l'appareil photo (voir [Scan de cartes](../backend/scan)), gère collection/wishlist en déplacement et reçoit des notifications push.
- **Microservice fetch (3005)** : source de vérité pour les données TCGdex (cartes, séries, sets) que l’API ou des scripts peuvent consommer.
- **Microservice vision (8000, Python)** : prétraite les photos de cartes (détection, correction de perspective, OCR tesseract) pour le pipeline de scan ; l'API bascule sur un repli si le service est indisponible.

### Dossiers notables

- `apps/web/app/[locale]/(main)` : pages publiques localisées (collection, decks, marketplace, tournois...) ; `(main)/(protected)` regroupe les pages authentifiées (dashboard, admin, etc.).
- `apps/api/src/*` : modules métier (auth, marketplace, deck, tournament, search, collection, translation, match, scan, notification, etc.).
- `docker-compose.yml` (racine) : Postgres + vision pour le dev local. `docker-compose.deploy.yml` (racine) : stack complète orientée déploiement (postgres, vision, api, web, docs).

### Pipeline Turborepo

- `dev` : services persistants (Next.js + NestJS).
- `build` : dépendances hiérarchiques (`^build`), cache pour `.next` et `dist`.
- `lint` / `check-types` : mutualisés via workspaces.

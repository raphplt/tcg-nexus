---
title: Architecture du monorepo
---

Le projet s’appuie sur **npm workspaces** et **Turborepo** pour orchestrer les builds, le lint et le dev en parallèle.

```
apps/
  api/      -> API NestJS (PostgreSQL + TypeORM + Swagger)
  web/      -> Front Next.js (App Router) + Tailwind CSS
  fetch/    -> Microservice Express pour TCGdex
  docs/     -> Documentation Docusaurus
packages/
  ui/               -> Librairie de composants partagés
  typescript-config/-> tsconfig commun
```

### Flux applicatif

- **API (3001)** : expose les données Pokémon/TCG (cartes, decks, tournois, marketplace) et sécurise les accès via JWT. Utilise PostgreSQL et TypeORM avec `autoLoadEntities`.
- **Front (3000)** : consomme l’API via `NEXT_PUBLIC_API_URL`, gère l’authentification, les collections, decks, marketplace, tournois et une zone admin.
- **Microservice fetch (3005)** : source de vérité pour les données TCGdex (cartes, séries, sets) que l’API ou des scripts peuvent consommer.

### Dossiers notables

- `apps/web/app/(protected)` : pages authentifiées (dashboard, admin, etc.).
- `apps/api/src/*` : modules métier (auth, marketplace, deck, tournament, search, collection, etc.).
- `doc/README-Docker.md` : guide Docker simplifié repris dans la section Ops.

### Pipeline Turborepo

- `dev` : services persistants (Next.js + NestJS).
- `build` : dépendances hiérarchiques (`^build`), cache pour `.next` et `dist`.
- `lint` / `check-types` : mutualisés via workspaces.

---
title: Architecture du monorepo
---

Le projet s’appuie sur les **workspaces npm** et **Turborepo** pour orchestrer le build, le lint, les tests et le développement en parallèle au sein d'un dépôt unique.

```
tcg-nexus/
├── apps/
│   ├── api/       -> API NestJS (PostgreSQL + TypeORM + pgvector + WebSocket)
│   ├── web/       -> Front Next.js 16 (App Router, Tailwind CSS 4, next-intl)
│   ├── mobile/    -> App nomade Expo / React Native (scan de cartes, push)
│   ├── vision/    -> Microservice Python (FastAPI) d'OCR, matching ORB et CLIP
│   ├── fetch/     -> Microservice Express proxifiant TCGdex
│   └── docs/      -> Documentation technique Docusaurus 3
└── packages/
    ├── scan-contract/     -> Types et DTOs partagés pour le pipeline de scan
    ├── effect-parser/     -> Moteur de parsing et structuration des effets de cartes
    ├── pokemon-dataset/   -> Dataset et seeds versionnés du catalogue Pokémon
    ├── ui/                -> Bibliothèque de composants React partagés
    └── typescript-config/ -> Bases de configuration TypeScript partagées
```

---

## Flux applicatif & Ports des services

```
                     ┌──────────────────┐
                     │   Navigateur     │
                     │ (Desktop/Mobile) │
                     └────────┬─────────┘
                              │ HTTP / WS
                              ▼
  ┌───────────────────────────────────────────────────────┐
  │                 Front Web (Next.js)                   │
  │                      Port 3000                        │
  └───────────────────────────┬───────────────────────────┘
                              │
                    REST / WS │ (Bearer JWT / Cookies)
                              ▼
  ┌───────────────────────────────────────────────────────┐
  │                   API Core (NestJS)                   │
  │                       Port 3001                       │
  └─────────────┬─────────────────┬───────────────────────┘
                │                 │
      HTTP/JSON │       HTTP/JSON │
                ▼                 ▼
  ┌───────────────────┐     ┌───────────────────┐
  │ Microservice      │     │ Microservice      │
  │ Vision (FastAPI)  │     │ Fetch (Express)   │
  │ Port 8000         │     │ Port 3005         │
  └─────────────┬─────┘     └─────────┬─────────┘
                │                     │
          CLIP  │                     │ TCGdex
          OCR   ▼                     ▼ API Externe
  ┌───────────────────────────────────────────────────────┐
  │              Base PostgreSQL + pgvector               │
  │                       Port 5432                       │
  └───────────────────────────────────────────────────────┘
```

- **API Core (Port 3001)** : exposée sur `/api`, elle héberge l'ensemble des règles métier, la sécurité JWT, les transactions marketplace, la gestion des tournois, le moteur d'analyse IA et les passerelles temps réel (Socket.IO).
- **Front Web (Port 3000)** : consomme l'API via `NEXT_PUBLIC_API_URL`. Gère le routage internationalisé `/[locale]`, l'état avec React Query & Zustand, le paiement Stripe Elements et l'affichage plein écran pour les matches en direct.
- **Mobile Expo** : interface nomade pour les collectionneurs et joueurs. Elle utilise l'appareil photo pour scanner les cartes physiques (pipeline local on-device ou pipeline serveur) et reçoit les alertes push.
- **Microservice Vision (Port 8000)** : service Python spécialisé dans le traitement d'image haute performance (OpenCV, Tesseract OCR, matching de descripteurs ORB et calcul d'embeddings CLIP 512 dimensions).
- **Microservice Fetch (Port 3005)** : passerelle de synchronisation avec l'API publique TCGdex.
- **Documentation (Port 3002 en production / Port 3000 en dev)** : portail Docusaurus autonome.

---

## Dossiers notables

- `apps/web/app/[locale]/(main)` : pages publiques et protégées de l'application (catalogue, tournois, decks, marketplace, collection, dashboard, profil, espace d'administration).
- `apps/web/app/[locale]/(match)/play` : layout immersif dédié aux affrontements en ligne temps réel.
- `apps/api/src/*` : modules métier NestJS indépendants et découplés (`auth`, `card`, `deck`, `marketplace`, `tournament`, `match`, `ai`, `mini-game`, `scan`, `notification`, `collection`, `translation`, etc.).
- `docker-compose.yml` (racine) : orchestration locale pour le développement (PostgreSQL avec extension vectorielle et microservice Vision).
- `docker-compose.deploy.yml` (racine) : pile complète de production pour le déploiement Coolify (PostgreSQL, Vision, API, Web, Docs).

---

## Pipeline Turborepo

Le fichier `turbo.json` à la racine orchestre les tâches entre les workspaces :

- **`dev`** : démarre les services persistants en mode écoute/rechargement à chaud (`start:dev` pour l'API, `next dev` pour le Web) ;
- **`build`** : compile les applications et packages avec gestion des dépendances d'ordre (`^build`) et mise en cache des artefacts (`.next/`, `dist/`, `build/`) ;
- **`lint`** : vérifie la conformité du code via Biome et ESLint ;
- **`check-types`** : contrôle strict des types TypeScript (`tsc --noEmit`) sur l'intégralité du monorepo ;
- **`test`** : exécute les suites de tests unitaires et d'intégration.

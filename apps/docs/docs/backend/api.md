---
title: API NestJS
---

## Stack & principes

- **NestJS 11** + **TypeORM** (PostgreSQL)
- Authentification JWT (`JwtAuthGuard` global) + throttling (`@nestjs/throttler`)
- Validation DTO via `ValidationPipe` (whitelist + transformation) et sérialisation (`ClassSerializerInterceptor`)
- Swagger auto-généré sur `/api` en mode non-prod

## Configuration

Variables clés (`apps/api/.env`) :

```bash
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=tcg_nexus
JWT_SECRET=...
JWT_REFRESH_SECRET=...
PORT=3001
NODE_ENV=development
```

TypeORM est configuré avec `autoLoadEntities` et `synchronize` activé pour faciliter le dev.

## Démarrage local

```bash
cd apps/api
npm run docker:db      # Postgres via docker-compose.yml
npm run start:dev      # http://localhost:3001
```

Swagger : `http://localhost:3001/api`

## Modules principaux

- `auth` : stratégies JWT/local, refresh tokens, guards.
- `user`, `player` : gestion des comptes et profils joueurs.
- `pokemon-card`, `pokemon-set`, `pokemon-series` : catalogue TCG (alimenté par TCGdex).
- `collection`, `collection-item`, `card-state`, `user_cart` : gestion des collections utilisateur et états de cartes.
- `deck`, `deck-card`, `deck-format` : construction et formatage de decks.
- `marketplace` : annonces/transactions et intégration Stripe.
- `tournament`, `match`, `ranking`, `statistics` : tournois, matchs et stats associées.
- `article`, `search`, `ai` : contenu éditorial, recherche et assistants IA.

## Seed & scripts

```bash
npm run seed           # importData.ts (données principales)
npm run seed:users     # utilisateurs de test
npm run seed:cardstates
npm run test           # Jest
npm run test:e2e       # tests end-to-end
```

## CORS & sécurité

- CORS autorisé pour `http://localhost:3000` en dev (ou `FRONTEND_URL` en prod)
- Rate limiting : 10 requêtes/minute par défaut
- Filtre d’exceptions personnalisé (`AllExceptionsFilter`) pour un format d’erreur homogène

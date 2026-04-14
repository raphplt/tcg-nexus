# TCG Nexus

Plateforme TCG (Trading Card Game) Pokémon : marketplace, deck building, matchs en ligne, tournois, collections.

## Architecture

Monorepo Turborepo avec npm workspaces :

- `apps/api` — Backend NestJS 11 (TypeORM, PostgreSQL, Socket.io, Stripe)
- `apps/web` — Frontend Next.js 16 (React 19, Tailwind, Zustand, TanStack Query)
- `apps/mobile` — App mobile Expo SDK 55 (React Native)
- `apps/fetch-service` — Microservice Express pour import de données (AWS S3)
- `packages/ui` — Composants UI partagés
- `packages/typescript-config` — Configs TypeScript partagées

## Commandes

```bash
npm run dev           # Lancer tous les apps en dev (Turbo)
npm run build         # Build all
npm run lint          # Biome lint
npm run format        # Biome format
npm run check-types   # TypeScript check
npm run test:cov      # Tests avec couverture
npm run seed          # Seed base de données
```

### API uniquement (`apps/api`)

```bash
npm run start:dev     # NestJS watch mode
npm run test          # Jest unit tests
npm run test:e2e      # Jest E2E tests
npm run seed:users    # Seed utilisateurs
```

### Web uniquement (`apps/web`)

```bash
npm run dev           # Next.js dev
npm run test          # Vitest
npm run test:cov      # Vitest + couverture
```

## Stack technique

| Couche     | Techno                                                  |
| ---------- | ------------------------------------------------------- |
| Backend    | NestJS 11, TypeORM 0.3, PostgreSQL, Passport JWT, Swagger |
| Frontend   | Next.js 16, React 19, Tailwind 4, Zustand, React Query |
| Mobile     | Expo 55, React Native 0.79                              |
| Temps réel | Socket.io 4                                             |
| Paiements  | Stripe                                                  |
| Linter     | Biome 2.4 (pas ESLint/Prettier)                         |
| Tests      | Jest (API), Vitest (Web)                                |
| CI/CD      | GitHub Actions → Docker Compose sur VM                  |
| Build      | Turborepo 2.6                                           |

## Conventions de code

- **Formatter/Linter** : Biome — indent 2 espaces, line width 80, trailing commas
- **API modules NestJS** : `{feature}.module.ts`, `.controller.ts`, `.service.ts`, `dto/`, `entities/`
- **Tests API** : `*.spec.ts` à côté du source, `*.e2e-spec.ts` dans `test/`
- **Tests Web** : `test/**/*.{test,spec}.{ts,tsx}`
- **Composants React** : PascalCase (`PokemonCard.tsx`)
- **Hooks** : prefix `use*`
- **Stores Zustand** : dans `store/`
- **Routes Next.js** : `app/(main)/`, `app/(protected)/`, `app/auth/`

## Base de données

- PostgreSQL 15 via Docker (`docker-compose.yml` pour dev)
- TypeORM avec synchronize activé en dev
- ~43 entités (User, Card, Deck, Match, Tournament, Marketplace, etc.)
- Variables : `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`

## Docker

```bash
# Dev : PostgreSQL seul
docker compose up -d

# Déploiement : stack complète
docker compose -f docker-compose.deploy.yml up -d --build
```

## Variables d'environnement

Voir `apps/api/.env.example` et `apps/web/.env.example`.

Clés principales :
- `DATABASE_*` — connexion PostgreSQL
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — auth
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — paiements
- `NEXT_PUBLIC_API_URL` — URL de l'API côté client
- `R2_PUBLIC_URL` — CDN images

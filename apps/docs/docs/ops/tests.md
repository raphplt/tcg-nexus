---
title: Tests & qualité
---

## API (NestJS)

- Unitaires : `npm run test`
- Watch : `npm run test:watch`
- Couverture : `npm run test:cov`
- E2E : `npm run test:e2e`
- Lint : `npm run lint`

## Front (Next.js)

- Tests unitaires : `npm run test`
- Lint : `npm run lint` ou `npm run lint:fix`
- Types : `npm run check-types`

## Monorepo

- `npm run lint` / `npm run check-types` à la racine orchestrent les workspaces via Turborepo.

## Données & seeds

Après une installation fraîche ou un `docker-compose down -v`, relancez `npm run seed` (et variantes) pour garantir des fixtures cohérentes lors des tests manuels.

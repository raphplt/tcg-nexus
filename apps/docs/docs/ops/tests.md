---
title: Tests & qualité
---

## API (NestJS)

- Unitaires : `npm run test`
- Watch : `npm run test:watch`
- Couverture : `npm run test:cov`
- E2E : `npm run test:e2e`
- E2E tournoi sur PostgreSQL éphémère : `npm run test:e2e:tournament`
- Lint : `npm run lint`

Le script E2E tournoi démarre une base dédiée sur le port `55432`, attend son
état de santé, exécute les scénarios séquentiels et concurrents, puis détruit
le conteneur et ses données même si Jest échoue. Il nécessite Docker, mais ne
touche jamais à la base de développement configurée dans `.env`.

## Front (Next.js)

- Tests unitaires : `npm run test`
- Lint : `npm run lint` ou `npm run lint:fix`
- Types : `npm run check-types`

## Monorepo

- `npm run lint` / `npm run check-types` à la racine orchestrent les workspaces via Turborepo.
- `check-types` couvre API, web, mobile, fetch, docs et les quatre packages TypeScript exécutables. `packages/typescript-config` contient uniquement la configuration partagée. L’ancien script docs `typecheck` reste disponible.
- Les modifications de `biome.json` et des configurations TypeScript partagées invalident le cache Turbo.
- Si votre shell exporte `NODE_ENV=production`, utilisez `NODE_ENV=test npm test -w web` pour le runtime JSX de test.
- La CI exécute les tests web, API, fetch, mobile, effect-parser, pokemon-dataset et vision. Elle lance aussi les E2E marketplace/commandes/collections et tournois sur PostgreSQL jetable.
- Les règles Biome activées détectent code inaccessible, debugger et paramètres/propriétés/props JSX dupliqués. Ce socle ne constitue pas encore un audit complet des commentaires, TSDoc ou du code inutilisé.

## PostgreSQL et migrations

Depuis la racine :

```bash
npm run test:e2e:postgres -w api -- test/collection.e2e-spec.ts test/marketplace.e2e-spec.ts test/order-flow.e2e-spec.ts
```

Le runner utilise actuellement `DATABASE_SYNCHRONIZE=true`. Ces tests ne prouvent
pas la compatibilité des migrations avec une base historique. La première
migration suppose des tables existantes ; le bootstrap de schéma et les fixtures
de mise à niveau restent des travaux FND-04 du plan de maturité.

## Vision (Python 3.12)

Depuis la racine, installez les dépendances dans un environnement dédié :

```bash
python3.12 -m venv .venv-vision
.venv-vision/bin/pip install -r apps/vision/requirements.txt
.venv-vision/bin/python scripts/run-vision-tests.py
```

Le lanceur échoue si aucun test n’est découvert ou si une dépendance manquante
fait ignorer un test requis. Il n’est donc pas équivalent à un succès de
`unittest` accompagné de `skipped`. Activez cet environnement pour `npm test` à
la racine, dont la dernière étape utilise `python3`.


## Données & seeds

Après une installation fraîche ou un `docker-compose down -v`, relancez `npm run seed` (et variantes) pour garantir des fixtures cohérentes lors des tests manuels.

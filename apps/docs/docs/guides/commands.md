---
title: Commandes utiles
---

### Racine (Turborepo)

- `npm run dev` : lance les scripts `dev` de chaque app (Next.js + NestJS).
- `npm run build` : build orchestré via Turborepo.
- `npm run lint` / `npm run check-types` : linting/TS sur les workspaces.
- `npm run seed` : exécute le script de seed de l’API.

### API (`apps/api`)

- `npm run start:dev` : NestJS en mode watch.
- `npm run start:prod` : démarre la version compilée (`dist`).
- `npm run build` : build TypeScript -> `dist/`.
- `npm run seed` / `npm run seed:users` / `npm run seed:cardstates` : remplissage des données.
- `npm run docker:db` / `docker:db-down` / `docker:db-logs` : cycle de vie Postgres via `docker-compose.yml`.
- `npm run docker:up` / `docker:down` : stack API + DB via `docker-compose-with-api.yml`.
- `npm run test` / `test:watch` / `test:cov` / `test:e2e` : tests Jest.

### Front-end (`apps/web`)

- `npm run dev` : serveur Next.js (App Router) sur le port 3000.
- `npm run build` puis `npm start` : build + serveur de prod.
- `npm run lint` / `npm run lint:fix` : linting ESLint.
- `npm run check-types` : vérification TypeScript.
- `npm run test` : tests unitaires Vitest.

### Microservice Fetch (`apps/fetch`)

- `npm start` : lance l’API Express (port 3005 par défaut).
- `npm run update-data` : script `update-data.ts` (mise à jour des données TCGdex).

### Documentation (`apps/docs`)

- `npm start` : serveur Docusaurus en dev (port 3000 par défaut).
- `npm run build` : génération statique.
- `npm run serve` : sert le build localement.

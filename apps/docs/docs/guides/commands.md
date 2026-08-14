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
- `npm run docker:db` / `docker:db-down` / `docker:db-logs` : cycle de vie Postgres (+ vision) via `docker-compose.yml` (racine).
- `npm run docker:up` / `docker:down` / `docker:logs` : stack complète (postgres, vision, api, web, docs) via `docker-compose.deploy.yml` (racine), orientée déploiement.
- `npm run test` / `test:watch` / `test:cov` / `test:e2e` : tests Jest.

### Front-end (`apps/web`)

- `npm run dev` : serveur Next.js (App Router) sur le port 3000.
- `npm run build` puis `npm start` : build + serveur de prod.
- `npm run lint` / `npm run lint:fix` : linting Biome.
- `npm run check-types` : vérification TypeScript.
- `npm run test` : tests unitaires Vitest.

### Microservice Fetch (`apps/fetch`)

- `npm start` : lance l’API Express (port 3005 par défaut).
- `npm run update-data` : script `update-data.ts` (mise à jour des données TCGdex).

### Documentation (`apps/docs`)

- `npm start` : serveur Docusaurus en dev (port 3000 par défaut).
- `npm run build` : génération statique.
- `npm run serve` : sert le build localement.

### Mobile (`apps/mobile`)

- `npm run dev` : lance Expo (Metro bundler).
- `npm run android` / `npm run ios` : build + lancement natif via Expo.
- `npm run web` : Expo en mode web.
- `npm run build` : build de production via EAS Build (pas de build local).

### Vision (`apps/vision`, Python/FastAPI)

- `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` : lance le microservice OCR en local (nécessite `pip install -r requirements.txt` et `tesseract-ocr`).
- `docker compose up -d vision` (depuis la racine) : lance le service via Docker.

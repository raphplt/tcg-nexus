---
title: Référence des Commandes Utiles
---

Cette page récapitule l'ensemble des commandes disponibles dans le monorepo, classées par application et par domaine fonctionnel.

---

## 1. Racine du Monorepo (Turborepo)

| Commande | Action |
|---|---|
| `npm run dev` | Lance en parallèle les serveurs de développement (Next.js + NestJS). |
| `npm run build` | Compile l'ensemble des applications et packages du monorepo. |
| `npm run check-types` | Contrôle strict des types TypeScript (`tsc --noEmit`) sur tous les workspaces. |
| `npm run lint` | Exécute le linter Biome sur l'ensemble du code source. |
| `npm run lint:fix` | Corrige automatiquement les erreurs de linting détectées. |
| `npm run format` | Formate l'ensemble des fichiers selon les règles du projet. |
| `npm test` | Exécute les suites de tests unitaires sur tous les workspaces. |

---

## 2. API Backend (`apps/api`)

### Cycle de vie & Démarrage
- `npm run start:dev` : démarre NestJS en mode écoute/rechargement à chaud.
- `npm run start:prod` : exécute la version compilée en production (`dist/`).
- `npm run build` : compile le code TypeScript vers le dossier `dist/`.

### Base de données & Docker
- `npm run docker:db` : démarre les conteneurs locaux PostgreSQL (avec `pgvector`) et Vision.
- `npm run docker:db-logs` : affiche les journaux de PostgreSQL et Vision.
- `npm run docker:db-down` : arrête les conteneurs de développement.
- `npm run docker:up` : lance l'intégralité de la pile de production (`docker-compose.deploy.yml`).
- `npm run docker:down` : arrête la pile de production.

### Migrations TypeORM
- `npm run migration:show` : affiche l'état des migrations (appliquées ou en attente).
- `npm run migration:run` : applique les migrations en attente.
- `npm run migration:baseline` : aligne l'historique des migrations pour une base synchronisée.
- `npm run schema:drift` : vérifie l'absence de dérive entre les entités et le schéma physique.

### Données & Seeds
- `npm run seed` : peuple le catalogue de cartes, les séries, les sets et les tournois.
- `npm run seed:users` : génère les comptes utilisateurs de démonstration (admin, modérateur, joueurs).
- `npm run seed:cardstates` : initialise le référentiel des états d'usure des cartes.
- `npm run sync:effects` : parse et synchronise les effets structurés des cartes.
- `npm run embed:cards` : calcule les vecteurs d'embeddings d'illustrations via CLIP.
- `npm run embed:decks` : calcule les vecteurs d'archétypes de decks pour `pgvector`.
- `npm run seed:prod` : procédure de seed sécurisée pour la production (requiert `ALLOW_DEMO_SEED=true`).

### Tests
- `npm run test` : exécute les tests unitaires avec Jest.
- `npm run test:watch` : lance Jest en mode interactif.
- `npm run test:cov` : génère le rapport de couverture de code.
- `npm run test:e2e` : lance les tests End-to-End.
- `npm run test:e2e:tournament` : lance les scénarios E2E de tournois sur une base Postgres isolée.

---

## 3. Front-end Web (`apps/web`)

- `npm run dev` : démarre le serveur de développement Next.js sur `http://localhost:3000`.
- `npm run build` : prépare le build de production optimisé dans `.next/`.
- `npm start` : démarre le serveur de production Next.js.
- `npm run test` : exécute les tests unitaires et de composants avec Vitest.
- `npm run test:watch` : exécute Vitest en mode écoute continue.
- `npm run lint` / `npm run lint:fix` : contrôle et correction automatique du code avec Biome.
- `npm run check-types` : vérification des types TypeScript.

---

## 4. Documentation Docusaurus (`apps/docs`)

- `npm start` : démarre le serveur de documentation en local (avec rechargement à chaud).
- `npm run build` : génère le site statique prêt pour le déploiement dans `build/`.
- `npm run serve` : sert localement le dossier statique généré pour vérification.
- `npm run check-types` : vérifie la validité des types TypeScript dans la documentation.

---

## 5. Application Mobile (`apps/mobile`)

- `npm run dev` : lance le serveur de bundling Metro via Expo.
- `npm run android` : compile et exécute sur un émulateur ou appareil Android connecté.
- `npm run ios` : compile et exécute sur le simulateur iOS (sous macOS).
- `npm run check-types` : vérification des types TypeScript.
- `npm run lint` : contrôle du code avec Biome.

---

## 6. Microservices & Packages

### Microservice Vision (`apps/vision`)
- `docker compose up -d vision` : démarre le microservice dans Docker sur le port `8000`.
- `.venv-vision/bin/python scripts/run-vision-tests.py` : exécute la suite de tests unitaires Python.

### Microservice Fetch (`apps/fetch`)
- `npm start` : lance le serveur Express sur le port `3005`.
- `npm run update-data` : synchronise les données récentes depuis TCGdex.

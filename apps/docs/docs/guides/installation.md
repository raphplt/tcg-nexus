---
title: Installation & Prise en main
---

Ce guide vous accompagne pas à pas pour installer et exécuter l'ensemble de la plateforme **TCG Nexus** sur votre poste de développement.

---

## 1. Prérequis système

- **Node.js 20+** (LTS recommandé)
- **npm 10+**
- **Docker & Docker Compose** (pour PostgreSQL avec `pgvector` et le microservice Vision)
- **Python 3.12** (optionnel, uniquement si vous développez sur le microservice Vision hors Docker)

---

## 2. Cloner le dépôt et installer les dépendances

```bash
git clone https://github.com/raphplt/tcg-nexus.git
cd tcg-nexus

# Installer toutes les dépendances des applications et packages du monorepo
npm install
```

---

## 3. Configuration des variables d'environnement

Copiez les fichiers d'exemples dans chaque application concernée :

```bash
# Variables Docker racine
cp env.example .env

# Configuration de l'API NestJS
cp apps/api/.env.example apps/api/.env

# Configuration du Front Web Next.js
cp apps/web/.env.example apps/web/.env

# Configuration de l'App Mobile Expo (optionnel)
cp apps/mobile/.env.example apps/mobile/.env
```

### Paramètres clés pour le développement local

Dans `apps/api/.env` :
- `DATABASE_HOST=localhost`
- `DATABASE_PORT=5432`
- `DATABASE_USER=postgres`
- `DATABASE_PASSWORD=postgres`
- `DATABASE_NAME=tcg_nexus`
- `DATABASE_MIGRATIONS_RUN=false` (en développement, la synchronisation TypeORM initialise les entités)
- `JWT_SECRET=votre-secret-de-dev`
- `JWT_REFRESH_SECRET=votre-secret-refresh-de-dev`
- `PORT=3001`
- `FRONTEND_URL=http://localhost:3000`

Dans `apps/web/.env` :
- `NEXT_PUBLIC_API_URL=http://localhost:3001`

---

## 4. Démarrer l'environnement de développement

### Option A : Démarrage complet via Turborepo (Recommandé)

1. Lancez les services d'infrastructure Docker (PostgreSQL et Vision) :
   ```bash
   cd apps/api && npm run docker:db
   ```
2. Revenez à la racine et démarrez toutes les applications en parallèle :
   ```bash
   npm run dev
   ```
   Cette commande lance simultanément le serveur de dev Next.js (port 3000) et l'API NestJS en mode watch (port 3001).

### Option B : Démarrage ciblé service par service

Dans des terminaux séparés :
```bash
# Terminal 1 : Base de données + Vision
cd apps/api && npm run docker:db

# Terminal 2 : API NestJS
cd apps/api && npm run start:dev

# Terminal 3 : Front-end Next.js
cd apps/web && npm run dev

# Terminal 4 : Documentation Docusaurus
cd apps/docs && npm start
```

---

## 5. Initialiser les données de démonstration (Seeds)

Une fois PostgreSQL et l'API démarrés, alimentez la base avec les données de référence :

```bash
cd apps/api

# Initialiser le catalogue Pokémon complet et les tournois de test
npm run seed

# Créer les comptes utilisateurs de démonstration
npm run seed:users

# Initialiser le référentiel des états de cartes (NM, Played...)
npm run seed:cardstates

# Synchroniser les effets de cartes parsés pour l'IA
npm run sync:effects

# Calculer les vecteurs d'archétypes pour la similarité pgvector
npm run embed:decks
```

---

## 6. URLs d'accès aux services locaux

| Service | URL locale | Identifiants / Remarques |
|---|---|---|
| **Application Web** | `http://localhost:3000` | Accès public et espace membre |
| **API Backend** | `http://localhost:3001` | Préfixe des routes : `/api` |
| **Swagger API** | `http://localhost:3001/api/docs` | Documentation interactive des endpoints |
| **Documentation** | `http://localhost:3000` (ou 3002) | Portail technique Docusaurus |
| **Microservice Vision** | `http://localhost:8000/health` | Sonde de santé FastAPI |
| **Base PostgreSQL** | `localhost:5432` | `postgres` / `postgres` (base: `tcg_nexus`) |

---

## 7. Gestion de la base de données : Synchronize vs Migrations

- En développement, TypeORM utilise `synchronize: true` pour générer automatiquement les tables à partir des entités TypeScript.
- Si vous rencontrez une erreur de schéma lors d'une mise à jour de branche, exécutez la mise à niveau :
  ```bash
  cd apps/api
  npm run migration:baseline   # Enregistre les migrations déjà existantes
  npm run migration:run        # Exécute les migrations incrémentales
  ```
